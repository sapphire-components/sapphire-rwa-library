import type { MessageKey } from './messages/en-US';

const modules = import.meta.glob('./messages/*.ts', {
	eager: true,
	import: 'default',
}) as Record<string, Record<MessageKey, string>>;

const messages: Record<string, Record<MessageKey, string>> = {};
for (const [path, catalog] of Object.entries(modules)) {
	const file = path.split(/[/\\]/).pop() ?? '';
	const code = file.replace(/\.ts$/, '').toLowerCase();
	if (code) messages[code] = catalog;
}

const FALLBACK = 'en-us';

// When a language has more than one regional file, this is the one a bare code uses.
const REPRESENTATIVE: Record<string, string> = {
	en: 'en-us',
	pt: 'pt-pt',
};

function representativeFor(language: string): string | undefined {
	const preferred = REPRESENTATIVE[language];
	if (preferred && messages[preferred]) return preferred;

	const regional = Object.keys(messages).filter((code) => code.startsWith(`${language}-`));
	return regional.length === 1 ? regional[0] : undefined;
}

function matchLocale(locale: string | null | undefined): string | undefined {
	const code = String(locale ?? '')
		.trim()
		.toLowerCase();
	if (!code) return undefined;
	if (messages[code]) return code;
	if (code.includes('-')) return undefined;
	return representativeFor(code);
}

function resolveLocale(locale?: string | null): string {
	const stored = typeof window === 'undefined' ? '' : window.SapphireRWALibrary?.State?.locale;
	return matchLocale(locale) ?? matchLocale(stored) ?? FALLBACK;
}

export function translate(key: MessageKey, locale?: string | null): string {
	const catalog = messages[resolveLocale(locale)] ?? messages[FALLBACK];
	return catalog?.[key] ?? messages[FALLBACK]?.[key] ?? key;
}

export type { MessageKey };
