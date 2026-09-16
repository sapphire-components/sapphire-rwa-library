export const SapphireSizes = {
	None: 'none',
	XS: 'xs',
	S: 's',
	Base: 'base',
	M: 'm',
	L: 'l',
	XL: 'xl',
	Full: 'full',
} as const;

export type SapphireSize = (typeof SapphireSizes)[keyof typeof SapphireSizes];

export function isSapphireSize(value: string): value is SapphireSize {
	return (Object.values(SapphireSizes) as string[]).includes(value);
}

export function resolveSapphireSize(value: string | null | undefined, fallback: SapphireSize = SapphireSizes.M): SapphireSize {
	const normalized = String(value ?? '')
		.trim()
		.toLowerCase();
	if (isSapphireSize(normalized)) {
		return normalized;
	}

	return fallback;
}
