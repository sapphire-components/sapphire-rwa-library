import { promises as fs } from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const ICONS_DIR = path.join(ROOT_DIR, 'src', '00-assets', 'icons');
const ASSETS_DIR = path.join(ROOT_DIR, 'src', '10-export');
const SPRITE_PATH = path.join(ASSETS_DIR, 'icons-sprite.svg');

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

async function readSvgFilesInDir(dirPath) {
	const entries = await fs.readdir(dirPath, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.svg'))
		.map((entry) => entry.name)
		.sort();
}

async function buildSprite() {
	await ensureIconsDir();
	await fs.mkdir(ASSETS_DIR, { recursive: true });

	const entries = await fs.readdir(ICONS_DIR, { withFileTypes: true });

	const iconNamesByFolder = new Map(); // folderName -> string[]
	const svgFileRecords = []; // { folderName: string, filename: string, filePath: string, name: string }

	// Root-level SVGs (if any)
	const rootSvgFiles = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.svg')).map((e) => e.name).sort();
	if (rootSvgFiles.length > 0) {
		const folderName = 'root';
		const iconNames = rootSvgFiles.map((f) => path.basename(f, '.svg'));
		iconNamesByFolder.set(folderName, iconNames);
		for (const filename of rootSvgFiles) {
			svgFileRecords.push({
				folderName,
				filename,
				filePath: path.join(ICONS_DIR, filename),
				name: path.basename(filename, '.svg'),
			});
		}
	}

	// One level of subfolders (e.g. "arrows", "generic")
	const subfolders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
	for (const folderName of subfolders) {
		const dirPath = path.join(ICONS_DIR, folderName);
		const svgFiles = await readSvgFilesInDir(dirPath);
		if (svgFiles.length === 0) continue;

		const iconNames = svgFiles.map((f) => path.basename(f, '.svg'));
		iconNamesByFolder.set(folderName, iconNames);

		for (const filename of svgFiles) {
			svgFileRecords.push({
				folderName,
				filename,
				filePath: path.join(dirPath, filename),
				name: path.basename(filename, '.svg'),
			});
		}
	}

	if (svgFileRecords.length === 0) {
		console.warn(`No SVG files found in ${ICONS_DIR}. Nothing to do.`);
		return;
	}

	// Ensure symbol IDs don't collide. We keep the current ID scheme (`svg-icon-${name}`)
	// to avoid breaking consumers, so duplicate filenames across folders must be avoided.
	const duplicates = new Map(); // name -> string[] folderNames
	for (const rec of svgFileRecords) {
		const prev = duplicates.get(rec.name) || [];
		prev.push(rec.folderName);
		duplicates.set(rec.name, prev);
	}
	const duplicateNames = [...duplicates.entries()].filter(([, folders]) => new Set(folders).size > 1);
	if (duplicateNames.length > 0) {
		const details = duplicateNames
			.map(([name, folders]) => `${name}: ${[...new Set(folders)].sort().join(', ')}`)
			.join('\n');
		throw new Error(
			`Duplicate icon names found across folders (would create duplicate <symbol id="svg-icon-...">):\n${details}\n\nRename one of the files so icon names are unique.`
		);
	}

	const symbols = [];

	const sortedRecords = [...svgFileRecords].sort((a, b) => a.name.localeCompare(b.name) || a.folderName.localeCompare(b.folderName));
	for (const rec of sortedRecords) {
		const raw = await fs.readFile(rec.filePath, 'utf8');

		const viewBox = extractViewBox(raw) || '0 0 256 256';
		const inner = extractInnerSvg(raw);

		const symbol = `<symbol id="svg-icon-${rec.name}" viewBox="${viewBox}">\n${inner}\n</symbol>`;
		symbols.push(symbol);
	}

	const sprite = ['<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">', ...symbols, '</svg>', ''].join('\n');

	await fs.writeFile(SPRITE_PATH, sprite, 'utf8');

	for (const [folderName, iconNames] of iconNamesByFolder.entries()) {
		const listPath = path.join(ASSETS_DIR, `icons-sprite-${folderName}.txt`);
		const escapedNames = iconNames.map((name) => `'${name.replace(/'/g, "\\'")}'`);
		const innerList = `[${escapedNames.join(', ')}]`;
		const iconsListContent = JSON.stringify(innerList);
		await fs.writeFile(listPath, iconsListContent, 'utf8');
	}

	console.log(`SVG sprite written to ${SPRITE_PATH}`);
	console.log(`Icons lists written to ${ASSETS_DIR}${path.sep}icons-sprite-<folder>.txt`);
	console.log(`Included symbols: ${sortedRecords.map((r) => r.name).join(', ')}`);
}

buildSprite().catch((err) => {
	console.error('Failed to build SVG sprite:', err);
	process.exitCode = 1;
});
