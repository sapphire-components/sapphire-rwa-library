import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const OUT_FILE = 'sapphire-rwa-texteditor.js';

function makeBanner(mode) {
	return `/*!  SapphireRWATextEditor ${mode.toUpperCase()} v${pkg.version} ${new Date().toISOString()} */\n`;
}

function bannerOnDisk(banner) {
	return {
		name: 'banner-on-disk',
		apply: 'build',
		enforce: 'post',
		writeBundle(options) {
			const outDir = options.dir ?? 'dist';
			const filePath = path.resolve(process.cwd(), outDir, OUT_FILE);
			if (!fs.existsSync(filePath)) return;

			let content = fs.readFileSync(filePath, 'utf8');
			if (content.startsWith('/*!  SapphireRWATextEditor')) return;
			// A sibling build may have stamped a different `/*!` banner onto an
			// in-progress write. Drop a foreign banner, then stamp our own.
			content = content.replace(/^\/\*!.*\*\/\r?\n/, '');
			fs.writeFileSync(filePath, banner + content, 'utf8');
		},
	};
}

// Quill and quill-table-better import CSS. Lib-mode Vite would emit a sibling
// .css file; fold it into the IIFE so screens that skip this script also skip
// the styles.
function inlineCssIntoJs() {
	return {
		name: 'inline-css-into-js',
		apply: 'build',
		enforce: 'post',
		generateBundle(_options, bundle) {
			const cssChunks = Object.entries(bundle).filter(([, chunk]) => chunk.type === 'asset' && chunk.fileName.endsWith('.css'));
			if (!cssChunks.length) return;

			const css = cssChunks.map(([, chunk]) => String(chunk.source)).join('\n');
			const inject =
				`(function(){if(document.getElementById('sapphire-rwa-texteditor-extra-css'))return;var s=document.createElement('style');s.id='sapphire-rwa-texteditor-extra-css';s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();\n`;

			for (const chunk of Object.values(bundle)) {
				if (chunk.type === 'chunk' && chunk.isEntry && chunk.fileName.endsWith('.js')) {
					chunk.code = inject + chunk.code;
				}
			}

			for (const [fileName] of cssChunks) {
				delete bundle[fileName];
			}
		},
	};
}

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
			},
		},
		define: {
			__APP_VERSION__: JSON.stringify(pkg.version),
		},
		build: {
			cssCodeSplit: false,
			emptyOutDir: false,
			lib: {
				entry: 'src/texteditor.ts',
				name: 'SapphireRWATextEditor',
				formats: ['iife'],
				fileName: () => OUT_FILE,
			},
			minify: isProdBuild ? 'esbuild' : false,
			outDir: 'dist',
			rollupOptions: {
				output: {
					inlineDynamicImports: true,
				},
			},
			sourcemap,
			target: 'baseline-widely-available',
			write: true,
		},
		plugins: [inlineCssIntoJs(), bannerOnDisk(banner)],
	};
});
