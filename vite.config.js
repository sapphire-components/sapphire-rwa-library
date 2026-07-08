import * as sass from 'sass';
import fs from 'node:fs';
import mkcert from 'vite-plugin-mkcert';
import path from 'node:path';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { SourceMapConsumer, SourceMapGenerator } from 'source-map-js';

const SCSS_PARTIAL_DIRS = ['01-foundations', '02-designsystem', '03-core', '04-outsystems', '05-helpers', '06-components', '09-utils'];

// Dirs scanned for per-component `documentation.md` files.
const DOCS_DIRS = ['06-components'];
const DOCS_OUT_FILE = 'sapphire-rwa-documentation.js';

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
			docsBundle({
				srcDir: 'src',
				docsDirs: DOCS_DIRS,
				outFile: DOCS_OUT_FILE,
			}),
			bannerOnDisk(banner),
			cssHotSwap({ outDir: 'dist', outFile: 'sapphire-rwa-library.css' }),
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

// Dev-only CSS hot-swap for consumers that load the built stylesheet from the
// preview server (e.g. an OutSystems page pointing at https://localhost:4173).
// The page is not served by Vite, so Vite's own HMR client is unavailable.
// Instead the preview server watches the emitted CSS and pushes a Server-Sent
// Event on change; a tiny client script (served at /__css_hmr_client.js) swaps
// the <link> in place — no page reload. Add this once to the dev page:
//   <script src="https://localhost:4173/__css_hmr_client.js"></script>
function cssHotSwap({ outDir, outFile }) {
	const SSE_PATH = '/__css_hmr';
	const CLIENT_PATH = '/__css_hmr_client.js';
	const CLIENT_SCRIPT = `(function () {
	var self = document.currentScript;
	var origin = self ? new URL(self.src).origin : location.origin;
	var es = new EventSource(origin + ${JSON.stringify(SSE_PATH)});
	es.addEventListener('css-update', function () {
		document.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
			var href;
			try { href = new URL(link.href, location.href); } catch (e) { return; }
			if (href.origin !== origin) return;
			href.searchParams.set('t', Date.now());
			var next = link.cloneNode();
			next.href = href.href;
			next.addEventListener('load', function () { link.remove(); });
			next.addEventListener('error', function () { next.remove(); });
			link.parentNode.insertBefore(next, link.nextSibling);
		});
		console.debug('[css-hmr] stylesheet reloaded');
	});
	console.info('[css-hmr] connected to', origin);
})();
`;

	return {
		name: 'css-hot-swap',
		apply: 'serve', // preview + dev server only; excluded from builds
		configurePreviewServer(server) {
			const clients = new Set();
			const absOutDir = path.resolve(process.cwd(), outDir);

			const broadcast = () => {
				const payload = `event: css-update\ndata: ${Date.now()}\n\n`;
				for (const res of clients) res.write(payload);
			};

			// Watch the output dir (not the file itself) so we survive the file
			// being replaced on each rebuild. Retry until the dir exists, since
			// `build:watch` and `serve:dist` start concurrently.
			let debounce;
			const startWatch = () => {
				if (!fs.existsSync(absOutDir)) {
					setTimeout(startWatch, 500);
					return;
				}
				fs.watch(absOutDir, (_event, filename) => {
					if (filename && path.basename(filename) !== outFile) return;
					clearTimeout(debounce);
					debounce = setTimeout(broadcast, 120);
				});
				server.config.logger.info(`  \x1b[36m➜\x1b[0m  css-hmr: watching ${outFile}, client at ${CLIENT_PATH}`);
			};
			startWatch();

			server.middlewares.use((req, res, next) => {
				const url = (req.url || '').split('?')[0];

				if (url === CLIENT_PATH) {
					res.writeHead(200, {
						'Content-Type': 'application/javascript; charset=utf-8',
						'Cache-Control': 'no-cache',
						'Access-Control-Allow-Origin': '*',
					});
					res.end(CLIENT_SCRIPT);
					return;
				}

				if (url === SSE_PATH) {
					res.writeHead(200, {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						Connection: 'keep-alive',
						'Access-Control-Allow-Origin': '*',
					});
					res.write('retry: 1000\n\n');
					clients.add(res);
					const heartbeat = setInterval(() => res.write(':\n\n'), 20000);
					req.on('close', () => {
						clearInterval(heartbeat);
						clients.delete(res);
					});
					return;
				}

				next();
			});
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
						const abs = src.startsWith('file://') ? fileURLToPath(src) : path.resolve(path.dirname(filePath), src);
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

// Scans component folders for `documentation.md`, renders each to HTML at build
// time (no runtime markdown parser needed), and emits a standalone IIFE
// `sapphire-rwa-documentation.js` alongside the library JS/CSS. The file exposes
// a global `SapphireRWADocumentation`:
//
//   new SapphireRWADocumentation('Overlay').html  // -> rendered HTML string
//
// Lookup is case- and separator-insensitive, so the PascalCase library name
// ('Overlay', 'SapphirePopupContent', 'ResponsiveGrid') resolves to its folder
// ('overlay', 'sapphirepopupcontent', 'responsive-grid'). Missing docs -> ''.
function docsBundle({ srcDir, docsDirs, outFile }) {
	const watchedDocs = new Set();

	const collect = (cwd) => {
		const srcRoot = path.resolve(cwd, srcDir);
		const files = [];
		for (const dir of docsDirs) {
			const base = path.resolve(srcRoot, dir);
			if (!fs.existsSync(base)) continue;
			walkDocs(base, (p) => files.push(p));
		}
		files.sort();
		return files;
	};

	return {
		name: 'docs-bundle',
		apply: 'build',
		buildStart() {
			// Watch existing docs plus their dirs so added/edited files rebuild.
			const cwd = process.cwd();
			const srcRoot = path.resolve(cwd, srcDir);
			for (const dir of docsDirs) {
				const base = path.resolve(srcRoot, dir);
				if (fs.existsSync(base)) this.addWatchFile(base);
			}
			for (const p of collect(cwd)) this.addWatchFile(p);
		},
		async generateBundle() {
			const cwd = process.cwd();
			const files = collect(cwd);

			watchedDocs.clear();
			const docs = {};
			for (const filePath of files) {
				const key = normalizeDocKey(path.basename(path.dirname(filePath)));
				if (!key) continue;
				const md = fs.readFileSync(filePath, 'utf8');
				docs[key] = marked.parse(md, { async: false }).trim();
				watchedDocs.add(filePath);
			}

			this.emitFile({ type: 'asset', fileName: outFile, source: buildDocsIife(docs) });
		},
	};
}

function normalizeDocKey(name) {
	return String(name || '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

function buildDocsIife(docs) {
	return `(function () {
	var DOCS = ${JSON.stringify(docs)};
	function normalize(name) {
		return String(name == null ? '' : name).toLowerCase().replace(/[^a-z0-9]/g, '');
	}
	function SapphireRWADocumentation(name) {
		if (!(this instanceof SapphireRWADocumentation)) return new SapphireRWADocumentation(name);
		this.name = name;
		this.html = DOCS[normalize(name)] || '';
	}
	SapphireRWADocumentation.has = function (name) { return normalize(name) in DOCS; };
	SapphireRWADocumentation.names = function () { return Object.keys(DOCS); };
	window.SapphireRWADocumentation = SapphireRWADocumentation;
})();
`;
}

function walkDocs(dir, cb) {
	for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, d.name);
		if (d.isDirectory()) walkDocs(p, cb);
		else if (d.name.toLowerCase() === 'documentation.md') cb(p);
	}
}
