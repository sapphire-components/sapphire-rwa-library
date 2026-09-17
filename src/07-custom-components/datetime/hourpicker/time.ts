export const TimePrecisions = {
	hour: 'hour',
	minute: 'minute',
	second: 'second',
} as const;

export type TimePrecision = (typeof TimePrecisions)[keyof typeof TimePrecisions];

export const TimeFormats = {
	h12: '12h',
	h24: '24h',
} as const;

export type TimeFormat = (typeof TimeFormats)[keyof typeof TimeFormats];

export type Period = 'am' | 'pm';

export type TimeParts = {
	hours: number;
	minutes: number;
	seconds: number;
};

export const START_DEFAULT: TimeParts = { hours: 0, minutes: 0, seconds: 0 };
export const END_DEFAULT: TimeParts = { hours: 23, minutes: 59, seconds: 59 };

const EMPTY_OPTION = '';

export function isTimePrecision(value: string): value is TimePrecision {
	return (Object.values(TimePrecisions) as string[]).includes(value);
}

export function resolveTimePrecision(value: string | null | undefined, fallback: TimePrecision = TimePrecisions.minute): TimePrecision {
	const normalized = String(value ?? '')
		.trim()
		.toLowerCase();
	if (isTimePrecision(normalized)) {
		return normalized;
	}
	return fallback;
}

export function isTimeFormat(value: string): value is TimeFormat {
	return (Object.values(TimeFormats) as string[]).includes(value);
}

export function resolveTimeFormat(value: string | null | undefined, fallback: TimeFormat = TimeFormats.h24): TimeFormat {
	const normalized = String(value ?? '')
		.trim()
		.toLowerCase();
	if (isTimeFormat(normalized)) {
		return normalized;
	}

	const byName = (Object.entries(TimeFormats) as [string, TimeFormat][]).find(([name]) => name.toLowerCase() === normalized);
	return byName?.[1] ?? fallback;
}

export function defaultStep(precision: TimePrecision): number {
	return precision === TimePrecisions.hour ? 1 : 30;
}

export function resolveStep(step: number | null | undefined, precision: TimePrecision): number {
	// Hours are always listed one-by-one. Step only applies to minutes / seconds.
	if (precision === TimePrecisions.hour) {
		return 1;
	}

	const value = Number(step);
	if (!Number.isFinite(value) || value < 1) {
		return defaultStep(precision);
	}
	return Math.min(59, Math.floor(value));
}

export function pad2(value: number): string {
	return String(value).padStart(2, '0');
}

export function toSeconds(time: TimeParts): number {
	return time.hours * 3600 + time.minutes * 60 + time.seconds;
}

export function withPrecision(time: TimeParts, precision: TimePrecision): TimeParts {
	if (precision === TimePrecisions.hour) {
		return { hours: time.hours, minutes: 0, seconds: 0 };
	}
	if (precision === TimePrecisions.minute) {
		return { hours: time.hours, minutes: time.minutes, seconds: 0 };
	}
	return { hours: time.hours, minutes: time.minutes, seconds: time.seconds };
}

export function formatTime(time: TimeParts | null, precision: TimePrecision = TimePrecisions.second): string {
	if (!time) {
		return EMPTY_OPTION;
	}
	if (precision === TimePrecisions.hour) {
		return pad2(time.hours);
	}
	if (precision === TimePrecisions.minute) {
		return `${pad2(time.hours)}:${pad2(time.minutes)}`;
	}
	return `${pad2(time.hours)}:${pad2(time.minutes)}:${pad2(time.seconds)}`;
}

export function parseTime(raw: string | null | undefined): TimeParts | null {
	if (raw == null) {
		return null;
	}
	const trimmed = String(raw).trim();
	if (!trimmed) {
		return null;
	}

	const match = trimmed.match(/^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?$/);
	if (!match) {
		return null;
	}

	const hours = Number(match[1]);
	const minutes = match[2] != null ? Number(match[2]) : 0;
	const seconds = match[3] != null ? Number(match[3]) : 0;
	if (!isClockUnit(hours, 23) || !isClockUnit(minutes, 59) || !isClockUnit(seconds, 59)) {
		return null;
	}

	return { hours, minutes, seconds };
}

export function resolveBound(raw: string | null | undefined, fallback: TimeParts): TimeParts {
	return parseTime(raw) ?? fallback;
}

// OutSystems Time defaults to 00:00:00 when unset. Treat that as "no upper bound"
// so an untouched End does not collapse the picker to midnight.
export function resolveEnd(raw: string | null | undefined): TimeParts {
	const parsed = parseTime(raw);
	if (!parsed || toSeconds(parsed) === 0) {
		return END_DEFAULT;
	}
	return parsed;
}

export function hour12(hours24: number): number {
	const mod = hours24 % 12;
	return mod === 0 ? 12 : mod;
}

export function periodOf(hours24: number): Period {
	return hours24 < 12 ? 'am' : 'pm';
}

export function to24Hour(clockHour: number, period: Period): number {
	const hour = clockHour % 12;
	return period === 'pm' ? hour + 12 : hour;
}

export function inRange(time: TimeParts, start: TimeParts, end: TimeParts): boolean {
	const value = toSeconds(time);
	return value >= toSeconds(start) && value <= toSeconds(end);
}

export function clampTime(time: TimeParts, start: TimeParts, end: TimeParts): TimeParts {
	const value = toSeconds(time);
	if (value < toSeconds(start)) {
		return { ...start };
	}
	if (value > toSeconds(end)) {
		return { ...end };
	}
	return time;
}

export function snapToRange(time: TimeParts, precision: TimePrecision, step: number, start: TimeParts, end: TimeParts): TimeParts {
	const normalized = withPrecision(clampTime(time, start, end), precision);
	if (inRange(normalized, start, end)) {
		return normalized;
	}

	const hours = hourCandidates(precision, step, start, end, TimeFormats.h24, 'am');
	if (hours.length === 0) {
		return normalized;
	}

	if (toSeconds(normalized) < toSeconds(start)) {
		return alignToHour(hours[0], null, precision, step, start, end) ?? normalized;
	}

	const lastHour = hours[hours.length - 1];
	if (precision === TimePrecisions.hour) {
		return { hours: lastHour, minutes: 0, seconds: 0 };
	}

	const minutes = minuteCandidates(lastHour, precision, step, start, end);
	const lastMinute = minutes[minutes.length - 1] ?? 0;
	if (precision === TimePrecisions.minute) {
		return { hours: lastHour, minutes: lastMinute, seconds: 0 };
	}

	const seconds = secondCandidates(lastHour, lastMinute, step, start, end);
	return { hours: lastHour, minutes: lastMinute, seconds: seconds[seconds.length - 1] ?? 0 };
}

export function formatDisplay(time: TimeParts | null, format: TimeFormat, precision: TimePrecision): string {
	if (!time) {
		return EMPTY_OPTION;
	}
	const hours = format === TimeFormats.h12 ? hour12(time.hours) : time.hours;
	if (precision === TimePrecisions.hour) {
		return pad2(hours);
	}
	if (precision === TimePrecisions.minute) {
		return `${pad2(hours)}:${pad2(time.minutes)}`;
	}
	return `${pad2(hours)}:${pad2(time.minutes)}:${pad2(time.seconds)}`;
}

export function placeholderFor(format: TimeFormat, precision: TimePrecision): string {
	const hours = format === TimeFormats.h12 ? 'hh' : 'HH';
	if (precision === TimePrecisions.hour) {
		return hours;
	}
	if (precision === TimePrecisions.minute) {
		return `${hours}:mm`;
	}
	return `${hours}:mm:ss`;
}

export function maskTyped(raw: string, format: TimeFormat, precision: TimePrecision): string {
	const maxDigits = precision === TimePrecisions.hour ? 2 : precision === TimePrecisions.minute ? 4 : 6;
	const digits = String(raw).replace(/\D/g, '').slice(0, maxDigits);
	if (!digits) {
		return EMPTY_OPTION;
	}

	const maxHour = format === TimeFormats.h12 ? 12 : 23;
	let hour = digits;
	let rest = '';

	if (digits.length >= 2) {
		const two = Number(digits.slice(0, 2));
		if (two > maxHour) {
			hour = digits[0];
			rest = digits.slice(1);
		} else {
			hour = digits.slice(0, 2);
			rest = digits.slice(2);
		}
	}

	if (precision === TimePrecisions.hour || rest.length === 0) {
		return hour;
	}

	const minutes = rest.slice(0, 2);
	const seconds = rest.slice(2, 4);
	let next = `${hour}:${minutes}`;
	if (precision === TimePrecisions.second && seconds.length > 0) {
		next += `:${seconds}`;
	}
	return next;
}

export function parseDisplay(text: string, format: TimeFormat, precision: TimePrecision, period: Period): TimeParts | null {
	const trimmed = text.trim();
	if (!trimmed) {
		return null;
	}

	const parts = trimmed.split(':');
	if (parts.length < 1 || parts.length > 3 || parts.some((part) => !/^\d{1,2}$/.test(part))) {
		return null;
	}

	let hours = Number(parts[0]);
	const minutes = parts[1] != null ? Number(parts[1]) : 0;
	const seconds = parts[2] != null ? Number(parts[2]) : 0;

	if (!isClockUnit(minutes, 59) || !isClockUnit(seconds, 59)) {
		return null;
	}

	if (format === TimeFormats.h12) {
		if (!Number.isInteger(hours) || hours < 1 || hours > 12) {
			return null;
		}
		hours = to24Hour(hours, period);
	} else if (!isClockUnit(hours, 23)) {
		return null;
	}

	return withPrecision({ hours, minutes, seconds }, precision);
}

export function hourCandidates(precision: TimePrecision, step: number, start: TimeParts, end: TimeParts, format: TimeFormat, period: Period): number[] {
	const hours: number[] = [];

	if (format === TimeFormats.h12) {
		for (let clock = 1; clock <= 12; clock++) {
			const hour = to24Hour(clock, period);
			if (isHourAvailable(hour, precision, step, start, end)) {
				hours.push(hour);
			}
		}
		return hours;
	}

	for (let hour = 0; hour <= 23; hour++) {
		if (isHourAvailable(hour, precision, step, start, end)) {
			hours.push(hour);
		}
	}
	return hours;
}

export function minuteCandidates(hour: number, precision: TimePrecision, step: number, start: TimeParts, end: TimeParts): number[] {
	const minuteStep = precision === TimePrecisions.minute ? step : 1;
	const minutes: number[] = [];
	for (let minute = 0; minute < 60; minute += minuteStep) {
		if (minuteHasValidTime(hour, minute, precision, step, start, end)) {
			minutes.push(minute);
		}
	}
	return minutes;
}

export function secondCandidates(hour: number, minute: number, step: number, start: TimeParts, end: TimeParts): number[] {
	const seconds: number[] = [];
	for (let second = 0; second < 60; second += step) {
		if (inRange({ hours: hour, minutes: minute, seconds: second }, start, end)) {
			seconds.push(second);
		}
	}
	return seconds;
}

export function ensureIncluded(values: number[], extra: number | null | undefined, format: TimeFormat = TimeFormats.h24): number[] {
	if (extra == null || values.includes(extra)) {
		return values;
	}
	const next = [...values, extra];
	if (format === TimeFormats.h12) {
		return next.sort((a, b) => hour12(a) - hour12(b));
	}
	return next.sort((a, b) => a - b);
}

export function alignToHour(hour: number, current: TimeParts | null, precision: TimePrecision, step: number, start: TimeParts, end: TimeParts): TimeParts | null {
	if (precision === TimePrecisions.hour) {
		const time = { hours: hour, minutes: 0, seconds: 0 };
		return inRange(time, start, end) ? time : null;
	}

	const minutes = minuteCandidates(hour, precision, step, start, end);
	if (minutes.length === 0) {
		return null;
	}

	const minute = current && minutes.includes(current.minutes) ? current.minutes : minutes[0];
	if (precision === TimePrecisions.minute) {
		return { hours: hour, minutes: minute, seconds: 0 };
	}

	return alignToMinute(hour, minute, current, step, start, end);
}

export function alignToMinute(hour: number, minute: number, current: TimeParts | null, step: number, start: TimeParts, end: TimeParts): TimeParts | null {
	const seconds = secondCandidates(hour, minute, step, start, end);
	if (seconds.length === 0) {
		return null;
	}
	const second = current && seconds.includes(current.seconds) ? current.seconds : seconds[0];
	return { hours: hour, minutes: minute, seconds: second };
}

export function hourLabel(hour24: number, format: TimeFormat): string {
	if (format === TimeFormats.h12) {
		return String(hour12(hour24));
	}
	return pad2(hour24);
}

function isHourAvailable(hour: number, precision: TimePrecision, step: number, start: TimeParts, end: TimeParts): boolean {
	if (precision === TimePrecisions.hour) {
		return inRange({ hours: hour, minutes: 0, seconds: 0 }, start, end);
	}
	return hourHasValidTime(hour, precision, step, start, end);
}

function hourHasValidTime(hour: number, precision: TimePrecision, step: number, start: TimeParts, end: TimeParts): boolean {
	if (precision === TimePrecisions.minute) {
		for (let minute = 0; minute < 60; minute += step) {
			if (inRange({ hours: hour, minutes: minute, seconds: 0 }, start, end)) {
				return true;
			}
		}
		return false;
	}

	for (let minute = 0; minute < 60; minute++) {
		if (minuteHasValidTime(hour, minute, precision, step, start, end)) {
			return true;
		}
	}
	return false;
}

function minuteHasValidTime(hour: number, minute: number, precision: TimePrecision, step: number, start: TimeParts, end: TimeParts): boolean {
	if (precision === TimePrecisions.minute) {
		return inRange({ hours: hour, minutes: minute, seconds: 0 }, start, end);
	}

	for (let second = 0; second < 60; second += step) {
		if (inRange({ hours: hour, minutes: minute, seconds: second }, start, end)) {
			return true;
		}
	}
	return false;
}

function isClockUnit(value: number, max: number): boolean {
	return Number.isInteger(value) && value >= 0 && value <= max;
}
