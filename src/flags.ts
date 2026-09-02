// Flag SVGs from lipis/flag-icons (MIT), 4x3, ISO 3166-1 alpha-2 filenames.

const modules = import.meta.glob('./00-assets/flags/*.svg', {
	eager: true,
	query: '?raw',
	import: 'default',
}) as Record<string, string>;

const BY_CODE: Record<string, string> = {};
for (const [path, svg] of Object.entries(modules)) {
	const file = path.slice(path.lastIndexOf('/') + 1);
	const code = file.replace(/\.svg$/i, '').toLowerCase();
	BY_CODE[code] = svg;
}

const ALIASES: Record<string, string> = { uk: 'gb' };

function normalize(code: string): string | undefined {
	const key = String(code ?? '')
		.trim()
		.toLowerCase();
	if (!/^[a-z]{2}$/.test(key)) return undefined;
	return ALIASES[key] ?? key;
}

function get(code: string): string | undefined {
	const key = normalize(code);
	if (!key) return undefined;
	return BY_CODE[key];
}

const style = 'color: #FFA500; font-weight: bold;';
console.log(`%cSapphireRWAFlags | ${__APP_VERSION__} | ${window.location.pathname}`, style);

window.SapphireRWAFlags = { get };
