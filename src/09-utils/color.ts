export const SapphireColors = {
	Primary: 'primary',
	Secondary: 'secondary',
	Background: 'background',
	Interactive: 'interactive',
	Surface: 'surface',
	Neutral: 'neutral',
	Info: 'info',
	Success: 'success',
	Warning: 'warning',
	Error: 'error',
	Transparent: 'transparent',
	Neutral0: 'neutral_0',
	Neutral1: 'neutral_1',
} as const;

export type SapphireColor = (typeof SapphireColors)[keyof typeof SapphireColors];

export function isSapphireColor(value: string): value is SapphireColor {
	return (Object.values(SapphireColors) as string[]).includes(value);
}

export function resolveSapphireColor(value: string | null | undefined): SapphireColor {
	if (value && isSapphireColor(value)) {
		return value;
	}

	return SapphireColors.Primary;
}
