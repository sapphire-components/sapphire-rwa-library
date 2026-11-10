import { pad2, parseTime, type TimeParts } from '../hourpicker/time';

// Calendar dates are plain y/m/d triples. No Date objects cross the API, so
// time zones never shift a picked day.
export type DateParts = {
	year: number;
	/** 1–12 */
	month: number;
	day: number;
};

export type DateTimeParts = {
	date: DateParts;
	time: TimeParts | null;
};

export const NULL_YEAR = 1900;

export function daysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidDate(year: number, month: number, day: number): boolean {
	return Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day) && year >= 1 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/** Days since 0001-01-01 style ordinal, good for comparing and stepping. */
export function toOrdinal(date: DateParts): number {
	return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / 86400000);
}

export function fromOrdinal(ordinal: number): DateParts {
	const d = new Date(ordinal * 86400000);
	return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function compareDates(a: DateParts, b: DateParts): number {
	return toOrdinal(a) - toOrdinal(b);
}

export function sameDate(a: DateParts | null | undefined, b: DateParts | null | undefined): boolean {
	return !!a && !!b && a.year === b.year && a.month === b.month && a.day === b.day;
}

export function addDays(date: DateParts, days: number): DateParts {
	return fromOrdinal(toOrdinal(date) + days);
}

/** Moves by whole months and clamps the day to the target month (31 Jan + 1 → 28/29 Feb). */
export function addMonths(date: DateParts, months: number): DateParts {
	const index = date.year * 12 + (date.month - 1) + months;
	const year = Math.floor(index / 12);
	const month = (index % 12) + 1;
	return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
}

/** ISO weekday: 1 Monday … 7 Sunday. */
export function isoWeekday(date: DateParts): number {
	const day = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
	return day === 0 ? 7 : day;
}

export function today(): DateParts {
	const now = new Date();
	return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

export function formatDate(date: DateParts): string {
	return `${String(date.year).padStart(4, '0')}-${pad2(date.month)}-${pad2(date.day)}`;
}

const DATE_RE = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}(?::\d{1,2}){0,2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?\s*$/i;

/**
 * Parses `YYYY-MM-DD`, `YYYY-MM-DD HH:mm[:ss]`, or ISO `YYYY-MM-DDTHH:mm:ss[.sss][Z|±hh:mm]`.
 *
 * Without a zone the parts are read as written. With a zone (what OutSystems'
 * JSON Serialize produces for a DateTime) the instant is converted to local time,
 * so a value round-trips to the same local day and hour it had in the app.
 *
 * The OutSystems null date (`1900-01-01`, which can land on `1899-12-31` after zone
 * conversion) and anything earlier is treated as empty.
 */
export function parseDateTime(raw: unknown): DateTimeParts | null {
	if (raw == null) {
		return null;
	}

	if (raw instanceof Date) {
		return fromJsDate(raw);
	}

	const text = String(raw).trim();
	if (!text) {
		return null;
	}

	const match = DATE_RE.exec(text);
	if (!match) {
		return null;
	}

	let result: DateTimeParts | null;

	if (match[5] && match[4]) {
		result = fromJsDate(new Date(text.replace(' ', 'T')));
	} else {
		const year = Number(match[1]);
		const month = Number(match[2]);
		const day = Number(match[3]);
		result = isValidDate(year, month, day) ? { date: { year, month, day }, time: match[4] ? parseTime(match[4]) : null } : null;
	}

	if (!result || isNullDate(result.date)) {
		return null;
	}

	return result;
}

function fromJsDate(value: Date): DateTimeParts | null {
	if (Number.isNaN(value.getTime())) {
		return null;
	}
	const result = {
		date: { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() },
		time: { hours: value.getHours(), minutes: value.getMinutes(), seconds: value.getSeconds() },
	};
	return isNullDate(result.date) ? null : result;
}

function isNullDate(date: DateParts): boolean {
	return date.year < NULL_YEAR || (date.year === NULL_YEAR && date.month === 1 && date.day === 1);
}

export function parseDate(raw: unknown): DateParts | null {
	return parseDateTime(raw)?.date ?? null;
}

/**
 * ISO instant for a local date (and time), as OutSystems' JSON Deserialize expects
 * for a DateTime. No time means local midnight.
 */
export function toIsoDateTime(date: DateParts, time: TimeParts | null): string {
	return new Date(date.year, date.month - 1, date.day, time?.hours ?? 0, time?.minutes ?? 0, time?.seconds ?? 0).toISOString();
}

/**
 * The `Selected` input: an array of DateTime values (ISO strings from JSON Serialize),
 * or the same as a JSON string / comma-separated list. Invalid and null dates are
 * skipped, duplicate days removed (first wins), result sorted by date.
 */
export function parseSelected(raw: unknown): DateTimeParts[] {
	let items: unknown[] = [];

	if (Array.isArray(raw)) {
		items = raw;
	} else if (raw != null) {
		const text = String(raw).trim();
		if (text.startsWith('[')) {
			try {
				const parsed = JSON.parse(text);
				items = Array.isArray(parsed) ? parsed : [];
			} catch {
				items = [];
			}
		} else if (text) {
			items = text.split(/[,;\n]/);
		}
	}

	const result: DateTimeParts[] = [];
	for (const item of items) {
		// Tolerate lists of structures shaped like { Date: '...' } / { Value: '...' }.
		const value = item && typeof item === 'object' && !(item instanceof Date) ? ((item as Record<string, unknown>).Date ?? (item as Record<string, unknown>).Value) : item;
		const parsed = parseDateTime(value);
		if (parsed && !result.some((existing) => sameDate(existing.date, parsed.date))) {
			result.push(parsed);
		}
	}

	return result.sort((a, b) => compareDates(a.date, b.date));
}

export type MonthCell = {
	date: DateParts;
	outside: boolean;
};

/** Always six weeks so the panel height never jumps between months. */
export function monthGrid(year: number, month: number, weekStart: number): MonthCell[] {
	const first: DateParts = { year, month, day: 1 };
	const lead = (isoWeekday(first) - weekStart + 7) % 7;
	const start = addDays(first, -lead);
	const cells: MonthCell[] = [];

	for (let i = 0; i < 42; i++) {
		const date = addDays(start, i);
		cells.push({ date, outside: date.month !== month || date.year !== year });
	}

	return cells;
}

/** ISO weekdays in display order for a given week start (1 Monday … 7 Sunday). */
export function orderedWeekdays(weekStart: number): number[] {
	return Array.from({ length: 7 }, (_, i) => ((weekStart - 1 + i) % 7) + 1);
}

export function inDateRange(date: DateParts, min: DateParts | null, max: DateParts | null): boolean {
	if (min && compareDates(date, min) < 0) {
		return false;
	}
	if (max && compareDates(date, max) > 0) {
		return false;
	}
	return true;
}

export function clampDate(date: DateParts, min: DateParts | null, max: DateParts | null): DateParts {
	if (min && compareDates(date, min) < 0) {
		return min;
	}
	if (max && compareDates(date, max) > 0) {
		return max;
	}
	return date;
}

/** First year of the 12-year page that contains `year` (e.g. 2026 → 2016… for page of 12 aligned to 0). */
export function yearPageStart(year: number): number {
	return year - (((year % 12) + 12) % 12);
}

/** `Date` at local noon for Intl formatting; noon keeps DST edges from shifting the day. */
export function toLocalDate(date: DateParts, time?: TimeParts | null): Date {
	return new Date(date.year, date.month - 1, date.day, time?.hours ?? 12, time?.minutes ?? 0, time?.seconds ?? 0);
}
