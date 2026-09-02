import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

function makeBanner(mode) {
	return `/*!  SapphireRWAFlags ${mode.toUpperCase()} v${pkg.version} ${new Date().toISOString()} */\n`;
}

function bannerOnDisk(banner) {
	return {
		name: 'banner-on-disk',
		apply: 'build',
		enforce: 'post',
		writeBundle(options) {
			const outDir = options.dir ?? 'dist';
			const filePath = path.resolve(process.cwd(), outDir, 'sapphire-rwa-flags.js');
			if (!fs.existsSync(filePath)) return;

			const content = fs.readFileSync(filePath, 'utf8');
			if (content.startsWith('/*!')) return;
			fs.writeFileSync(filePath, banner + content, 'utf8');
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
			},
		},
		define: {
			__APP_VERSION__: JSON.stringify(pkg.version),
		},
		build: {
			emptyOutDir: false,
			lib: {
				entry: 'src/flags.ts',
				name: 'SapphireRWAFlags',
				formats: ['iife'],
				fileName: () => 'sapphire-rwa-flags.js',
			},
			minify: isProdBuild ? 'esbuild' : false,
			outDir: 'dist',
			rollupOptions: {
				treeshake: false,
			},
			sourcemap,
			target: 'baseline-widely-available',
			write: true,
		},
		plugins: [bannerOnDisk(banner)],
	};
});
