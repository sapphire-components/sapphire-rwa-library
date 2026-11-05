import { translate, type MessageKey } from './messages';

export type { MessageKey };

export default class Locale {
	static translate(key: MessageKey, locale?: string | null): string {
		return translate(key, locale);
	}
}
