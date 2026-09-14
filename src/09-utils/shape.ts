export const ShapeTypes = {
	Rounded: 'rounded',
	Sharp: 'none',
	SoftRounded: 'soft',
} as const;

export type ShapeType = (typeof ShapeTypes)[keyof typeof ShapeTypes];

export function isShapeType(value: string): value is ShapeType {
	return (Object.values(ShapeTypes) as string[]).includes(value);
}

export function resolveShapeType(value: string | null | undefined): ShapeType {
	if (value && isShapeType(value)) {
		return value;
	}

	return ShapeTypes.Rounded;
}
