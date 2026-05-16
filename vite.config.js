import * as sass from 'sass';
import fs from 'node:fs';
import mkcert from 'vite-plugin-mkcert';
import path from 'node:path';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { SourceMapConsumer, SourceMapGenerator } from 'source-map-js';

const SCSS_PARTIAL_DIRS = [
	'01-foundations',
	'02-core',
	'03-designsystem',
	'04-outsystems',
	'05-helpers',
	'06-components',
	'09-utils',
];

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig(({ command, mode }) => {
	const isProdBuild = command === 'build' && mode === 'prod';
	const sourcemap = !isProdBuild;
	const banner = makeBanner(mode);

	return {
		appType: 'custom', //spa, mpa
		define: {
			__APP_VERSION__: JSON.stringify(pkg.version),
		},
		base: './', // '/'
		clearScreen: true,
		logLevel: 'info', //warn, debug, info
		publicDir: 'public',
		root: process.cwd(),
		preview: {
			https: true,
			host: 'localhost',
			port: 4173,
		},
		build: {
			assetsDir: 'assets',
			assetsInlineLimit: 4096,
			chunkSizeWarningLimit: 500,
			copyPublicDir: true,
			cssCodeSplit: false, // false when using lib
			cssMinify: false,
			emptyOutDir: true,
			lib: {
				entry: 'src/index.ts',
				name: 'SapphireRWALibrary',
				formats: ['iife'],
				fileName: () => 'sapphire-rwa-library.js',
			},
			minify: isProdBuild ? 'esbuild' : false,
			modulePreload: { polyfill: true },
			outDir: 'dist',
			reportCompressedSize: true,
			rollupOptions: {
				treeshake: false,
				output: {
					assetFileNames: 'sapphire-rwa-library.css',
				},
			},
			// Dev/watch + preview: emit maps so DevTools map bundled output to sources.
			// Prod stays without maps (smaller, no shipped sources).
			sourcemap,
			target: 'baseline-widely-available',
			write: true,
		},
		plugins: [
			scssBundle({
				srcDir: 'src',
				partialDirs: SCSS_PARTIAL_DIRS,
				outFile: 'sapphire-rwa-library.css',
				banner,
				sourcemap,
			}),
			bannerOnDisk(banner),
			mkcert(),
		],
	};
});

function makeBanner(mode) {
	return `/*!  SapphireRWALibrary ${mode.toUpperCase()} v${pkg.version} ${new Date().toISOString()} */\n`;
}

function bannerOnDisk(banner) {
	return {
		name: 'banner-on-disk',
		apply: 'build',
		enforce: 'post',
		writeBundle(options) {
			const outDir = options.dir ?? 'dist';
			const root = path.resolve(process.cwd(), outDir);

			const walk = (dir) =>
				fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
					const p = path.join(dir, d.name);
					return d.isDirectory() ? walk(p) : [p];
				});

			for (const filePath of walk(root)) {
				if (!filePath.endsWith('.js') && !filePath.endsWith('.css')) continue;

				const content = fs.readFileSync(filePath, 'utf8');
				if (content.startsWith('/*!')) continue; // avoid double-banner in watch mode
				fs.writeFileSync(filePath, banner + content, 'utf8');
			}
		},
	};
}

// Compiles every .scss partial under `srcDir/partialDirs/**/*.scss` and emits a
// single bundled CSS file with a unified source map. Vite's own CSS pipeline
// drops source maps when `build.cssCodeSplit: false` is combined with lib mode
// (it concatenates chunk CSS strings without ever touching sourcemap data —
// see `cssPostPlugin.generateBundle` in vite/dist/node/chunks/config.js), so
// we take ownership of CSS extraction here. The SCSS imports were also removed
// from src/index.ts so Vite no longer emits its own (mapless) CSS asset.
//
// We compile each partial independently (mirroring what Vite was doing) so
// each file's `@use` statements stay scoped to that file, then merge the
// per-file CSS + maps via source-map-js's SourceMapGenerator/Consumer.
function scssBundle({ srcDir, partialDirs, outFile, banner, sourcemap }) {
	// Tracks every file Sass touched on the previous compile (entry partials +
	// anything they `@use`/`@forward`/`@import`). Used in `buildStart` so
	// Rollup's watcher rebuilds when transitive partials change.
	const watchedScss = new Set();

	return {
		name: 'scss-bundle',
		apply: 'build',
		buildStart() {
			const cwd = process.cwd();
			const srcRoot = path.resolve(cwd, srcDir);

			// Always watch every .scss under the entry dirs so newly added
			// files are picked up even before the first compile records them.
			for (const dir of partialDirs) {
				const base = path.resolve(srcRoot, dir);
				if (!fs.existsSync(base)) continue;
				walkScss(base, (p) => this.addWatchFile(p));
			}
			// Plus anything Sass loaded last time (transitive @use targets,
			// shared partials in other folders, etc.).
			for (const p of watchedScss) this.addWatchFile(p);
		},
		async generateBundle() {
			const cwd = process.cwd();
			const srcRoot = path.resolve(cwd, srcDir);
			const outDir = path.resolve(cwd, 'dist');

			const files = [];
			for (const dir of partialDirs) {
				const base = path.resolve(srcRoot, dir);
				if (!fs.existsSync(base)) continue;
				walkScss(base, (p) => files.push(p));
			}
			watchedScss.clear();
			// Match the previous JS-side load order: sorted by full path with
			// numeric directory prefixes (01-foundations, 02-core, ...).
			files.sort();

			const bannerStr = banner ?? '';
			const bannerLines = (bannerStr.match(/\n/g) || []).length;

			const generator = sourcemap ? new SourceMapGenerator({ file: outFile }) : null;
			const sourceContents = sourcemap ? new Map() : null;
			const cssParts = [];
			// Generated lines are 1-indexed; banner sits before all chunks.
			let lineOffset = bannerLines;

			for (const filePath of files) {
				const result = sass.compile(filePath, {
					sourceMap: sourcemap,
					sourceMapIncludeSources: sourcemap,
					style: 'expanded',
				});

				watchedScss.add(filePath);
				if (Array.isArray(result.loadedUrls)) {
					for (const u of result.loadedUrls) {
						const abs = typeof u === 'string' ? u : u.href;
						if (abs && abs.startsWith('file://')) {
							watchedScss.add(fileURLToPath(abs));
						}
					}
				}

				let chunk = result.css;
				if (!chunk.endsWith('\n')) chunk += '\n';
				cssParts.push(chunk);

				if (sourcemap && result.sourceMap && generator) {
					const map = result.sourceMap;
					// Relativize sources so DevTools shows e.g.
					// "../src/01-foundations/styles/_acessibility.scss" and
					// pre-rewrite the map so the consumer hands us those paths
					// directly via `m.source`.
					const resolvedSources = map.sources.map((src) => {
						const abs = src.startsWith('file://')
							? fileURLToPath(src)
							: path.resolve(path.dirname(filePath), src);
						return path.relative(outDir, abs).replace(/\\/g, '/');
					});
					const adjustedMap = { ...map, sources: resolvedSources, sourceRoot: '' };

					if (adjustedMap.sourcesContent) {
						resolvedSources.forEach((s, i) => {
							const c = adjustedMap.sourcesContent[i];
							if (c != null && !sourceContents.has(s)) sourceContents.set(s, c);
						});
					}

					const consumer = new SourceMapConsumer(adjustedMap);
					consumer.eachMapping((m) => {
						if (m.originalLine == null || !m.source) return;
						generator.addMapping({
							generated: { line: m.generatedLine + lineOffset, column: m.generatedColumn },
							original: { line: m.originalLine, column: m.originalColumn },
							source: m.source,
							name: m.name || undefined,
						});
					});
				}

				lineOffset += (chunk.match(/\n/g) || []).length;
			}

			if (generator && sourceContents) {
				for (const [s, c] of sourceContents) generator.setSourceContent(s, c);
			}

			let css = bannerStr + cssParts.join('');

			if (sourcemap && generator) {
				css += `/*# sourceMappingURL=${outFile}.map */\n`;
				this.emitFile({
					type: 'asset',
					fileName: `${outFile}.map`,
					source: generator.toString(),
				});
			}

			this.emitFile({ type: 'asset', fileName: outFile, source: css });
		},
	};
}

function walkScss(dir, cb) {
	for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, d.name);
		if (d.isDirectory()) walkScss(p, cb);
		else if (p.endsWith('.scss')) cb(p);
	}
}
