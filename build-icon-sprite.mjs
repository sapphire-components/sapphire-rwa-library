import { promises as fs } from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const ICONS_DIR = path.join(ROOT_DIR, 'src', '00-assets', 'icons');
const ASSETS_DIR = path.join(ROOT_DIR, 'src', '10-export');
const SPRITE_PATH = path.join(ASSETS_DIR, 'icons-sprite.svg');
const ICONS_LIST_PATH = path.join(ASSETS_DIR, 'icons-sprite.txt');

async function ensureIconsDir() {
	try {
		const stat = await fs.stat(ICONS_DIR);
		if (!stat.isDirectory()) {
			throw new Error(`Icons path exists but is not a directory: ${ICONS_DIR}`);
		}
	} catch (err) {
		if (err && err.code === 'ENOENT') {
			throw new Error(`Icons directory does not exist: ${ICONS_DIR}`);
		}
		throw err;
	}
}

function extractViewBox(svg) {
	const match = svg.match(/viewBox="([^"]+)"/i);
	return match ? match[1] : null;
}

function extractInnerSvg(svg) {
	const match = svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
	if (match) {
		return match[1].trim();
	}
	return svg.trim();
}

async function buildSprite() {
	await ensureIconsDir();
	await fs.mkdir(ASSETS_DIR, { recursive: true });

	const entries = await fs.readdir(ICONS_DIR, { withFileTypes: true });
	const svgFiles = entries
		.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.svg'))
		.map((entry) => entry.name)
		.sort();

	if (svgFiles.length === 0) {
		console.warn(`No SVG files found in ${ICONS_DIR}. Nothing to do.`);
		return;
	}

	const symbols = [];

	for (const filename of svgFiles) {
		const filePath = path.join(ICONS_DIR, filename);
		const name = path.basename(filename, '.svg');
		const raw = await fs.readFile(filePath, 'utf8');

		const viewBox = extractViewBox(raw) || '0 0 256 256';
		const inner = extractInnerSvg(raw);

		const symbol = `<symbol id="svg-icon-${name}" viewBox="${viewBox}">\n${inner}\n</symbol>`;
		symbols.push(symbol);
	}

	const sprite = ['<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">', ...symbols, '</svg>', ''].join('\n');

	await fs.writeFile(SPRITE_PATH, sprite, 'utf8');

	const iconNames = svgFiles.map((f) => path.basename(f, '.svg'));
	const escapedNames = iconNames.map((name) => `'${name.replace(/'/g, "\\'")}'`);
	const innerList = `[${escapedNames.join(', ')}]`;
	const iconsListContent = JSON.stringify(innerList);
	await fs.writeFile(ICONS_LIST_PATH, iconsListContent, 'utf8');

	console.log(`SVG sprite written to ${SPRITE_PATH}`);
	console.log(`Icons list written to ${ICONS_LIST_PATH}`);
	console.log(`Included symbols: ${iconNames.join(', ')}`);
}

buildSprite().catch((err) => {
	console.error('Failed to build SVG sprite:', err);
	process.exitCode = 1;
});
