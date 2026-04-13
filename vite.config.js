import fs from 'node:fs';
import mkcert from 'vite-plugin-mkcert';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ command, mode }) => {
	const isProdBuild = command === 'build' && mode === 'prod';

	return {
		appType: 'custom', //spa, mpa
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
			sourcemap: !isProdBuild,
			target: 'baseline-widely-available',
			write: true,
		},
		plugins: [bannerOnDisk(mode), mkcert()],
	};
});

function bannerOnDisk(mode) {
	const banner = `/*!  SapphireRWALibrary ${mode.toUpperCase()} v${process.env.npm_package_version ?? '0.0.0'} ${new Date().toISOString()} */\n`;
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
