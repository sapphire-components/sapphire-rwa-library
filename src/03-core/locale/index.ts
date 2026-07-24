export default class Locale {
	static DateTimeFormat({
		dateTime,
		locale,
		dateStyle,
		timeStyle,
		additionalOptions,
	}: {
		dateTime: Date;
		dateStyle?: Intl.DateTimeFormatOptions['dateStyle'];
		timeStyle?: Intl.DateTimeFormatOptions['timeStyle'];
		locale: string;
		additionalOptions: any;
	}): string {
		// console.log('Locale.DateTimeFormat args:', {
		// 	dateTime,
		// 	dateStyle,
		// 	timeStyle,
		// 	locale,
		// 	additionalOptions,
		// });

		if (!dateTime) {
			dateTime = new Date();
		}

		if (!locale) {
			locale = window.SapphireRWALibrary.State.locale;
		}

		const options: Intl.DateTimeFormatOptions = {};
		if (dateStyle) {
			options.dateStyle = dateStyle;
		}
		if (timeStyle) {
			options.timeStyle = timeStyle;
		}

		if (additionalOptions) {
			Object.assign(options, additionalOptions);
		}

		try {
			return new Intl.DateTimeFormat(locale, options).format(dateTime);
		} catch (error) {
			return 'ERROR: ' + (error as Error).message || 'Unknown error';
		}
	}
}
