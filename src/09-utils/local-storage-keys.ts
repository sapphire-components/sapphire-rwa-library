/**
 * Single source of truth for localStorage keys used by this library.
 * Add new keys here and import `LocalStorageKeys` where needed.
 */
export const LocalStorageKeys = {
	locale: '$OS_Users$CurrentLocale',

	dropdownMenu(runtimeId: string): string {
		return `dropdownmenu-${runtimeId}`;
	},
} as const;
