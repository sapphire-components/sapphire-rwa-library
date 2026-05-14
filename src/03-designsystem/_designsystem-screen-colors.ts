export default class DesignSystemColors {
	private observer: MutationObserver | null = null;

	constructor() {
		const colorsContainer = document.querySelector<HTMLElement>('.colors-list');
		if (!colorsContainer) return;

		const writeHexToPres = () => {
			const pres = colorsContainer.querySelectorAll<HTMLElement>('pre');
			for (const pre of pres) {
				const computedBg = getEffectiveBackgroundColor(pre);
				const hex = rgbStringToHex(computedBg);
				if (!hex) continue;
				pre.textContent = hex;
				pre.removeAttribute('class');
			}
		};

		writeHexToPres();

		this.observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type !== 'childList') continue;
				for (const node of mutation.addedNodes) {
					if (!(node instanceof HTMLElement)) continue;
					if (!node.classList.contains('row')) continue;
					writeHexToPres();
					return;
				}
			}
		});

		this.observer?.observe(colorsContainer, { childList: true });
	}

	destroy() {
		this.observer?.disconnect();
		this.observer = null;
	}
}

function rgbStringToHex(rgbString: string): string | null {
	// Expected: "rgb(r, g, b)" or "rgba(r, g, b, a)"
	const normalized = rgbString.trim();
	if (normalized.toLowerCase() === 'transparent') return '#FFFFFF';

	const match = normalized
		.replace(/\s+/g, '')
		.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([01](?:\.\d+)?))?\)$/i);

	if (!match) return null;

	const r = clampByte(Number(match[1]));
	const g = clampByte(Number(match[2]));
	const b = clampByte(Number(match[3]));
	const a = match[4] !== undefined ? clampUnit(Number(match[4])) : 1;

	// If we still got fully transparent, treat as white (effective bg is handled upstream,
	// but this protects against edge cases like detached nodes).
	if (a <= 0) return '#FFFFFF';

	const rr = r.toString(16).padStart(2, '0');
	const gg = g.toString(16).padStart(2, '0');
	const bb = b.toString(16).padStart(2, '0');

	if (a >= 1) return `#${rr}${gg}${bb}`.toUpperCase();

	const aa = Math.round(a * 255)
		.toString(16)
		.padStart(2, '0');
	return `#${rr}${gg}${bb}${aa}`.toUpperCase();
}

function getEffectiveBackgroundColor(element: HTMLElement): string {
	let current: HTMLElement | null = element;

	while (current) {
		const bg = window.getComputedStyle(current).backgroundColor;
		const alpha = parseCssColorAlpha(bg);
		if (alpha > 0) return bg;
		current = current.parentElement;
	}

	// Fall back to document background
	const bodyBg = document.body ? window.getComputedStyle(document.body).backgroundColor : '';
	if (parseCssColorAlpha(bodyBg) > 0) return bodyBg;

	const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
	if (parseCssColorAlpha(htmlBg) > 0) return htmlBg;

	return 'rgb(255,255,255)';
}

function parseCssColorAlpha(cssColor: string): number {
	const normalized = cssColor.trim();
	if (!normalized) return 0;
	if (normalized.toLowerCase() === 'transparent') return 0;

	const match = normalized
		.replace(/\s+/g, '')
		.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([01](?:\.\d+)?))?\)$/i);

	if (!match) return 1; // non-rgb formats (e.g., gradients) treat as opaque
	if (match[4] === undefined) return 1;
	return clampUnit(Number(match[4]));
}

function clampByte(value: number): number {
	if (Number.isNaN(value)) return 0;
	return Math.max(0, Math.min(255, Math.round(value)));
}

function clampUnit(value: number): number {
	if (Number.isNaN(value)) return 1;
	return Math.max(0, Math.min(1, value));
}
