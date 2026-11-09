export interface DateTimeFormatArgs {
	dateStyle?: Intl.DateTimeFormatOptions['dateStyle'];
	dateTime: Date;
	locale: string;
	maskPattern?: string;
	options?: Intl.DateTimeFormatOptions;
	timeStyle?: Intl.DateTimeFormatOptions['timeStyle'];
}

export function DateTimeFormat(config: DateTimeFormatArgs): string {
	const dateTime = resolveDateTime(config.dateTime);
	const locale = config.locale || window.SapphireRWALibrary.State.locale;
	const maskPattern = typeof config.maskPattern === 'string' ? config.maskPattern : '';

	try {
		if (maskPattern.trim() !== '') {
			return formatMask(dateTime, maskPattern, locale, config.options?.timeZone);
		}

		const { dateStyle, timeStyle, options } = config;
		const customOptions: Intl.DateTimeFormatOptions = {};
		if (dateStyle) {
			customOptions.dateStyle = dateStyle;
		}
		if (timeStyle) {
			customOptions.timeStyle = timeStyle;
		}

		if (options) {
			Object.assign(customOptions, options);
		}

		return new Intl.DateTimeFormat(locale, customOptions).format(dateTime);
	} catch (error) {
		return 'ERROR: ' + (error as Error).message || 'Unknown error';
	}
}

function resolveDateTime(value: Date | string | null | undefined): Date {
	if (value == null || value === '') return new Date();

	const date = value instanceof Date ? value : new Date(value);
	if (!Number.isNaN(date.getTime()) && isOutSystemsNullDate(date)) return new Date();

	return date;
}

function isOutSystemsNullDate(date: Date): boolean {
	return (
		isNullDateParts(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()) ||
		isNullDateParts(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
	);
}

function isNullDateParts(year: number, month: number, day: number, hour: number, minute: number, second: number): boolean {
	return year === 1900 && month === 0 && day === 1 && hour === 0 && minute === 0 && second === 0;
}

interface CalendarParts {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
	weekday: number;
}

function formatMask(date: Date, pattern: string, locale: string, timeZone?: string): string {
	const parts = calendarParts(date, timeZone);
	let result = '';

	for (let index = 0; index < pattern.length; index++) {
		const char = pattern[index];
		if (char === '\\') {
			index += 1;
			if (index < pattern.length) {
				result += pattern[index];
			}
			continue;
		}

		const token = maskToken(char, date, parts, locale, timeZone);
		result += token === undefined ? char : token;
	}

	return result;
}

function maskToken(char: string, date: Date, parts: CalendarParts, locale: string, timeZone?: string): string | undefined {
	switch (char) {
		case 'd':
			return pad(parts.day);
		case 'D':
			return localized(date, locale, timeZone, { weekday: 'short' });
		case 'l':
			return localized(date, locale, timeZone, { weekday: 'long' });
		case 'j':
			return String(parts.day);
		case 'J':
			return ordinalDay(parts.day);
		case 'w':
			return String(parts.weekday);
		case 'W':
			return String(isoWeek(parts.year, parts.month, parts.day));
		case 'F':
			return localized(date, locale, timeZone, { month: 'long' });
		case 'm':
			return pad(parts.month);
		case 'n':
			return String(parts.month);
		case 'M':
			return localized(date, locale, timeZone, { month: 'short' });
		case 'U':
			return String(Math.floor(date.getTime() / 1000));
		case 'y':
			return pad(parts.year, 4).slice(-2);
		case 'Y':
			return pad(parts.year, 4);
		case 'Z':
			return date.toISOString();
		case 'H':
			return pad(parts.hour);
		case 'h':
			return String(hour12(parts.hour));
		case 'G':
			return pad(hour12(parts.hour));
		case 'i':
			return pad(parts.minute);
		case 'S':
			return pad(parts.second);
		case 's':
			return String(parts.second);
		case 'K':
			return dayPeriod(date, locale, timeZone, parts.hour);
		default:
			return undefined;
	}
}

function calendarParts(date: Date, timeZone?: string): CalendarParts {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});

	const values: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
	for (const part of formatter.formatToParts(date)) {
		values[part.type] = part.value;
	}

	const year = Number(values.year);
	const month = Number(values.month);
	const day = Number(values.day);
	let hour = Number(values.hour);
	if (hour === 24) hour = 0;

	return {
		year,
		month,
		day,
		hour,
		minute: Number(values.minute),
		second: Number(values.second),
		weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
	};
}

function localized(date: Date, locale: string, timeZone: string | undefined, options: Intl.DateTimeFormatOptions): string {
	return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
}

function dayPeriod(date: Date, locale: string, timeZone: string | undefined, hour: number): string {
	const parts = new Intl.DateTimeFormat(locale, {
		timeZone,
		hour: 'numeric',
		hourCycle: 'h12',
	}).formatToParts(date);

	return parts.find((part) => part.type === 'dayPeriod')?.value ?? (hour < 12 ? 'AM' : 'PM');
}

function hour12(hour: number): number {
	const value = hour % 12;
	return value === 0 ? 12 : value;
}

function ordinalDay(day: number): string {
	const mod100 = day % 100;
	if (mod100 >= 11 && mod100 <= 13) return `${day}th`;

	switch (day % 10) {
		case 1:
			return `${day}st`;
		case 2:
			return `${day}nd`;
		case 3:
			return `${day}rd`;
		default:
			return `${day}th`;
	}
}

function isoWeek(year: number, month: number, day: number): number {
	const date = new Date(Date.UTC(year, month - 1, day));
	const dayNum = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function pad(value: number, length = 2): string {
	return String(value).padStart(length, '0');
}
