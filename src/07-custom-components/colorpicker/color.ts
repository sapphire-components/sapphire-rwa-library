export type HSV = { h: number; s: number; v: number };
export type RGB = { r: number; g: number; b: number };

export const DEFAULT_HSV: HSV = { h: 0, s: 1, v: 1 };

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/** Keeps `#` + up to 6 lowercase hex digits. Empty when there are no digits. */
export function sanitizeTypedHex(raw: string): string {
	const digits = String(raw)
		.replace(/[^0-9a-f]/gi, '')
		.toLowerCase()
		.slice(0, 6);
	return digits === '' ? '' : `#${digits}`;
}

/** Empty string when blank; `#rrggbb` when valid; `null` when malformed. */
export function parseHex(raw: string | null | undefined): string | null {
	if (raw == null) return null;

	const trimmed = String(raw).trim();
	if (trimmed === '') return '';

	const match = trimmed.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
	if (!match) return null;

	let hex = match[1].toLowerCase();
	if (hex.length === 3) {
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
	}

	return `#${hex}`;
}

export function hexToRgb(hex: string): RGB {
	const normalized = parseHex(hex);
	if (!normalized) {
		return { r: 0, g: 0, b: 0 };
	}

	return {
		r: Number.parseInt(normalized.slice(1, 3), 16),
		g: Number.parseInt(normalized.slice(3, 5), 16),
		b: Number.parseInt(normalized.slice(5, 7), 16),
	};
}

export function rgbToHex({ r, g, b }: RGB): string {
	const toHex = (channel: number): string => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0');
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
	const hue = ((h % 360) + 360) % 360;
	const chroma = v * s;
	const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
	const m = v - chroma;

	let r = 0;
	let g = 0;
	let b = 0;

	if (hue < 60) [r, g, b] = [chroma, x, 0];
	else if (hue < 120) [r, g, b] = [x, chroma, 0];
	else if (hue < 180) [r, g, b] = [0, chroma, x];
	else if (hue < 240) [r, g, b] = [0, x, chroma];
	else if (hue < 300) [r, g, b] = [x, 0, chroma];
	else [r, g, b] = [chroma, 0, x];

	return {
		r: Math.round((r + m) * 255),
		g: Math.round((g + m) * 255),
		b: Math.round((b + m) * 255),
	};
}

export function rgbToHsv({ r, g, b }: RGB, fallbackHue = 0): HSV {
	const red = r / 255;
	const green = g / 255;
	const blue = b / 255;
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	const delta = max - min;

	let h = fallbackHue;
	if (delta !== 0) {
		if (max === red) h = ((green - blue) / delta) % 6;
		else if (max === green) h = (blue - red) / delta + 2;
		else h = (red - green) / delta + 4;
		h *= 60;
		if (h < 0) h += 360;
	}

	return {
		h,
		s: max === 0 ? 0 : delta / max,
		v: max,
	};
}

export function hsvToHex(hsv: HSV): string {
	return rgbToHex(hsvToRgb(hsv));
}

export function hexToHsv(hex: string, fallbackHue = 0): HSV {
	const normalized = parseHex(hex);
	if (!normalized) return { ...DEFAULT_HSV, h: fallbackHue };
	return rgbToHsv(hexToRgb(normalized), fallbackHue);
}

export function hueToHex(hue: number): string {
	return hsvToHex({ h: hue, s: 1, v: 1 });
}

export function isValidDraft(raw: string, allowEmpty: boolean): boolean {
	const parsed = parseHex(raw);
	if (parsed === '') return allowEmpty;
	return parsed !== null;
}
