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
const DOCS_DIRS = ['03-core', '05-helpers', '06-components'];
const DOCS_OUT_FILE = 'sapphire-rwa-documentation.js';

// Static entity folders scanned for `enumerables.md` reference tables.
const STATIC_ENTITIES_DIR = '01-foundations/staticentities';
const STATIC_ENTITIES_OUT_FILE = 'sapphire-rwa-static-entities.js';
const STATIC_ENTITIES_ROUTE = '/RW_DesignSystem/StaticEntities';

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig(({ command, mode }) => {
	const isProdBuild = command === 'build' && mode === 'prod';
	const sourcemap = !isProdBuild;
	const banner = makeBanner(mode);

	const srcDir = path.resolve(process.cwd(), 'src');

	return {
		resolve: {
			alias: {
				'@': srcDir,
				'@core': path.resolve(srcDir, 'core'),
				'@utils': path.resolve(srcDir, '09-utils'),
				'@components': path.resolve(srcDir, '06-components'),
				'@helpers': path.resolve(srcDir, '05-helpers'),
			},
		},
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
			// Keep sibling bundles (e.g. sapphire-rwa-icons.js) when rebuilding in watch mode.
			emptyOutDir: false,
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
			lookupDocsBundle({
				name: 'docs-bundle',
				srcDir: 'src',
				scanDirs: DOCS_DIRS,
				docFileName: 'documentation.md',
				outFile: DOCS_OUT_FILE,
				globalName: 'SapphireRWADocumentation',
				linkStaticEntities: true,
			}),
			lookupDocsBundle({
				name: 'static-entities-bundle',
				srcDir: 'src',
				scanDirs: [STATIC_ENTITIES_DIR],
				docFileName: 'enumerables.md',
				outFile: STATIC_ENTITIES_OUT_FILE,
				globalName: 'SapphireRWAStaticEntities',
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

// Scans folders for markdown docs, renders each to HTML at build time (no
// runtime markdown parser needed), and emits standalone IIFE bundles alongside
// the library JS/CSS:
//
//   sapphire-rwa-documentation.js     -> SapphireRWADocumentation (components)
//   sapphire-rwa-static-entities.js -> SapphireRWAStaticEntities (enumerables)
//
//   new SapphireRWADocumentation('Overlay').html       // component docs HTML
//   new SapphireRWAStaticEntities('SapphireScale').html // records table HTML
//
// Lookup is case- and separator-insensitive ('SapphireScale', 'sapphire-scale'
// -> sapphirescale). Missing docs -> ''.
function lookupDocsBundle({ name, srcDir, scanDirs, docFileName, outFile, globalName, linkStaticEntities = false }) {
	const collect = (cwd) => {
		const srcRoot = path.resolve(cwd, srcDir);
		const files = [];
		for (const dir of scanDirs) {
			const base = path.resolve(srcRoot, dir);
			if (!fs.existsSync(base)) continue;
			walkMarkdownDocs(base, docFileName, (p) => files.push(p));
		}
		files.sort();
		return files;
	};

	return {
		name,
		apply: 'build',
		buildStart() {
			const cwd = process.cwd();
			const srcRoot = path.resolve(cwd, srcDir);
			for (const dir of scanDirs) {
				const base = path.resolve(srcRoot, dir);
				if (fs.existsSync(base)) this.addWatchFile(base);
			}
			for (const p of collect(cwd)) this.addWatchFile(p);
		},
		async generateBundle() {
			const cwd = process.cwd();
			const files = collect(cwd);
			const staticEntities = linkStaticEntities ? collectStaticEntityNames(cwd, srcDir) : [];

			const docs = {};
			for (const filePath of files) {
				const key = normalizeDocKey(path.basename(path.dirname(filePath)));
				if (!key) continue;
				let md = fs.readFileSync(filePath, 'utf8');
				if (staticEntities.length) md = linkStaticEntitiesInMarkdown(md, staticEntities);
				docs[key] = marked.parse(md, { async: false }).trim();
			}

			this.emitFile({ type: 'asset', fileName: outFile, source: buildLookupIife(globalName, docs) });
		},
	};
}

function normalizeDocKey(name) {
	return String(name || '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

function buildLookupIife(globalName, docs) {
	return `(function () {
	var DOCS = ${JSON.stringify(docs)};
	function normalize(name) {
		return String(name == null ? '' : name).toLowerCase().replace(/[^a-z0-9]/g, '');
	}
	function ${globalName}(name) {
		if (!(this instanceof ${globalName})) return new ${globalName}(name);
		this.name = name;
		this.html = DOCS[normalize(name)] || '';
	}
	${globalName}.has = function (name) { return normalize(name) in DOCS; };
	${globalName}.names = function () { return Object.keys(DOCS); };
	window.${globalName} = ${globalName};
})();
`;
}

function walkMarkdownDocs(dir, docFileName, cb) {
	const target = docFileName.toLowerCase();
	for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, d.name);
		if (d.isDirectory()) walkMarkdownDocs(p, docFileName, cb);
		else if (d.name.toLowerCase() === target) cb(p);
	}
}

function collectStaticEntityNames(cwd, srcDir) {
	const base = path.resolve(cwd, srcDir, STATIC_ENTITIES_DIR);
	if (!fs.existsSync(base)) return [];
	return fs
		.readdirSync(base, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.sort((a, b) => b.length - a.length);
}

function linkStaticEntitiesInMarkdown(md, entityNames) {
	let result = md;
	for (const entity of entityNames) {
		const escaped = entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const re = new RegExp('(?<!\\[)`' + escaped + '`', 'g');
		const url = `${STATIC_ENTITIES_ROUTE}#${entity}`;
		result = result.replace(re, '[`' + entity + '`](' + url + ')');
	}
	return result;
}
