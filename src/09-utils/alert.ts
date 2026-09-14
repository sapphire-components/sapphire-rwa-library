import { SapphireColors, type SapphireColor } from '@utils/color';

export const AlertTypes = {
	Info: 'alert-info',
	Warning: 'alert-warning',
	Success: 'alert-success',
	Error: 'alert-error',
} as const;

export type AlertType = (typeof AlertTypes)[keyof typeof AlertTypes];

export type AlertAppearance = {
	color: SapphireColor;
	icon: string;
};

export const AlertAppearances: Record<AlertType, AlertAppearance> = {
	[AlertTypes.Info]: { color: SapphireColors.Info, icon: 'info-bold' },
	[AlertTypes.Warning]: { color: SapphireColors.Warning, icon: 'warning-bold' },
	[AlertTypes.Success]: { color: SapphireColors.Success, icon: 'check-circle-bold' },
	[AlertTypes.Error]: { color: SapphireColors.Error, icon: 'x-circle-bold' },
};

export function isAlertType(value: string): value is AlertType {
	return (Object.values(AlertTypes) as string[]).includes(value);
}

export function resolveAlertType(value: string | null | undefined): AlertType {
	if (value && isAlertType(value)) {
		return value;
	}

	return AlertTypes.Info;
}

export function getAlertAppearance(value: string | null | undefined): AlertAppearance {
	return AlertAppearances[resolveAlertType(value)];
}
