import Helpers from '@utils/helpers';
import { LocalStorageKeys } from '@utils/local-storage-keys';

interface StoredLocale {
	isRTL?: boolean;
	localeCode?: string;
}

export function SetApplicationLocale(): void {
	const stored = Helpers.readFromLocalStorage<StoredLocale>(LocalStorageKeys.locale);
	if (!stored || typeof stored !== 'object') return;

	const isRTL = stored.isRTL === true;
	window.SapphireRWALibrary.State.locale = stored.localeCode ?? '';
	window.SapphireRWALibrary.State.isRTL = isRTL;
	document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
}
