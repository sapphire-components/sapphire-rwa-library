/**
 * Single source of truth for localStorage keys used by this library.
 * Add new keys here and import `LocalStorageKeys` where needed.
 */
export const LocalStorageKeys = {
	locale: '$OS_Users$CurrentLocale',
	showDocumentation: 'sph-designsystem-show-documentation',

	dropdownMenu(storageId: string): string {
		return `sph-dropdownmenu-${storageId}`;
	},
} as const;
