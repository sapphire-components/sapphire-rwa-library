import { promises as fs } from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const TOKENS_SOURCE = path.join(ROOT_DIR, 'src', '00-tokens', 'design-tokens.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'src', '01-foundations', 'tokens');

const HEADER = [
	'// Generated from src/00-tokens/design-tokens.json',
	'// Do not edit manually. Run: npm run build:tokens',
	'',
].join('\n');

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function tokenNameParts(pathParts) {
	const parts = pathParts.slice(1);
	if (parts.at(-1) === 'regular') {
		return parts.slice(0, -1);
	}
	return parts;
}

function flattenTokens(node, pathParts = []) {
	const tokens = [];

	for (const [key, value] of Object.entries(node)) {
		const nextPath = [...pathParts, key];

		if (isPlainObject(value)) {
			tokens.push(...flattenTokens(value, nextPath));
			continue;
		}

		if (typeof value !== 'string' && typeof value !== 'number') {
			throw new Error(`Unsupported token value at "${nextPath.join('.')}": ${String(value)}`);
		}

		const category = nextPath[0];
		const nameParts = tokenNameParts(nextPath);
		const cssName = `--${category}-${nameParts.join('-')}`;
		const scssName = `$${category}-${nameParts.join('-')}`;
		const mapKey = category === 'color' ? nameParts.join('-') : null;

		tokens.push({
			path: nextPath,
			category,
			cssName,
			scssName,
			mapKey,
			value: String(value),
		});
	}

	return tokens;
}

function buildCssVariables(tokens) {
	const lines = tokens.map((token) => `\t${token.cssName}: ${token.value};`);
	return `${HEADER}:root {\n${lines.join('\n')}\n}\n`;
}

function buildScssVariables(tokens) {
	const lines = tokens.map((token) => `${token.scssName}: ${token.value};`);
	return `${HEADER}${lines.join('\n')}\n`;
}

function buildColorMap(tokens) {
	const colorTokens = tokens.filter((token) => token.category === 'color');
	const lines = colorTokens.map((token) => `\t${token.mapKey}: var(${token.cssName}),`);

	return [
		HEADER,
		'// Utility class map — references generated CSS custom properties.',
		'$colors: (',
		...lines,
		'\ttransparent: transparent,',
		');',
		'',
	].join('\n');
}

async function buildTokens() {
	const raw = await fs.readFile(TOKENS_SOURCE, 'utf8');
	const source = JSON.parse(raw);
	const tokens = flattenTokens(source).sort((a, b) => a.cssName.localeCompare(b.cssName));

	if (tokens.length === 0) {
		console.warn(`No tokens found in ${TOKENS_SOURCE}. Nothing to do.`);
		return;
	}

	await fs.mkdir(OUTPUT_DIR, { recursive: true });

	const outputs = [
		['_css-variables.scss', buildCssVariables(tokens)],
		['_scss-variables.scss', buildScssVariables(tokens)],
		['_color-map.scss', buildColorMap(tokens)],
	];

	for (const [filename, content] of outputs) {
		await fs.writeFile(path.join(OUTPUT_DIR, filename), content, 'utf8');
	}

	console.log(`Design tokens written to ${OUTPUT_DIR}`);
	console.log(`Generated ${tokens.length} tokens from ${path.relative(ROOT_DIR, TOKENS_SOURCE)}`);
}

buildTokens().catch((err) => {
	console.error('Failed to build design tokens:', err);
	process.exitCode = 1;
});
