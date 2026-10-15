import { AsYouType, getCountries, getCountryCallingCode, isSupportedCountry, isValidPhoneNumber, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import metadata from 'libphonenumber-js/min/metadata';

export type PhoneCountry = {
	code: CountryCode;
	callingCode: string;
	dialCode: number;
};

export type InterpretedPhone = {
	countryCode: CountryCode;
	formatted: string;
	international: boolean;
	nationalDigits: string;
};

const MAX_DIGITS = 16;

const catalog: PhoneCountry[] = getCountries().map((code) => {
	const callingCode = getCountryCallingCode(code);
	return {
		code,
		callingCode,
		dialCode: Number(callingCode),
	};
});

const byCode = new Map<CountryCode, PhoneCountry>(catalog.map((country) => [country.code, country]));

const displayNamesCache = new Map<string, Intl.DisplayNames>();

export function getPhoneCountries(): readonly PhoneCountry[] {
	return catalog;
}

export function countryByCode(code: CountryCode): PhoneCountry | undefined {
	return byCode.get(code);
}

export function normalizeCountryCode(code: string | null | undefined): CountryCode | undefined {
	const normalized = String(code ?? '')
		.trim()
		.toUpperCase();
	const aliased = normalized === 'UK' ? 'GB' : normalized;
	return isSupportedCountry(aliased) ? aliased : undefined;
}

export function resolveLocale(locale: string | null | undefined): string {
	const incoming = String(locale ?? '').trim();
	if (incoming && localeExists(incoming)) return incoming;

	const stateLocale = typeof window === 'undefined' ? undefined : window.SapphireRWALibrary?.State?.locale;
	if (stateLocale != null && String(stateLocale).trim() !== '') {
		const fromState = String(stateLocale).trim();
		if (localeExists(fromState)) return fromState;
	}

	return 'en-US';
}

export function parseFavoriteCountries(raw: string | null | undefined): CountryCode[] {
	if (!raw) return [];

	const trimmed = String(raw).trim();
	if (!trimmed) return [];

	let tokens: string[] = [];
	if (trimmed.startsWith('[')) {
		try {
			const parsed: unknown = JSON.parse(trimmed);
			if (Array.isArray(parsed)) {
				tokens = parsed.map((item) => String(item));
			}
		} catch {
			tokens = [];
		}
	}

	if (tokens.length === 0) {
		tokens = trimmed.split(/[,;\s|]+/);
	}

	const favorites: CountryCode[] = [];
	const seen = new Set<CountryCode>();
	for (const token of tokens) {
		const code = normalizeCountryCode(token);
		if (!code || seen.has(code)) continue;
		seen.add(code);
		favorites.push(code);
	}
	return favorites;
}

export function countryName(code: CountryCode, locale: string): string {
	try {
		return displayNamesFor(locale).of(code) || code;
	} catch {
		return code;
	}
}

export function defaultCountry(favorites: readonly CountryCode[], locale: string): CountryCode {
	if (favorites.length > 0) return favorites[0];

	const region = localeRegion(locale);
	if (region) return region;

	if (byCode.has('US')) return 'US';
	return catalog[0]?.code ?? 'US';
}

export function countryForDialCode(dialCode: number, favorites: readonly CountryCode[], locale: string): PhoneCountry | undefined {
	if (!Number.isFinite(dialCode) || dialCode <= 0) return undefined;

	const callingCode = String(Math.trunc(dialCode));
	const codes = metadata.country_calling_codes[callingCode];
	if (!codes || codes.length === 0) return undefined;

	const region = localeRegion(locale);
	if (region && codes.includes(region)) return byCode.get(region);

	for (const favorite of favorites) {
		if (codes.includes(favorite)) return byCode.get(favorite);
	}

	return byCode.get(codes[0]);
}

export function resolveCountry(countryCode: string | null | undefined, dialCode: number | null | undefined, favorites: readonly CountryCode[], locale: string, fallback: CountryCode): CountryCode {
	const explicit = normalizeCountryCode(countryCode);
	if (explicit) return explicit;

	if (dialCode != null && Number.isFinite(dialCode) && dialCode > 0) {
		return countryForDialCode(dialCode, favorites, locale)?.code ?? fallback;
	}

	return fallback;
}

export function orderCountries(locale: string, favorites: readonly CountryCode[]): { countries: PhoneCountry[]; favoriteCount: number } {
	const favoriteCountries: PhoneCountry[] = [];
	const favoriteSet = new Set<CountryCode>();
	for (const code of favorites) {
		const country = byCode.get(code);
		if (!country || favoriteSet.has(code)) continue;
		favoriteSet.add(code);
		favoriteCountries.push(country);
	}

	const rest = catalog.filter((country) => !favoriteSet.has(country.code)).sort((a, b) => countryName(a.code, locale).localeCompare(countryName(b.code, locale), locale, { sensitivity: 'base' }));

	return {
		countries: [...favoriteCountries, ...rest],
		favoriteCount: favoriteCountries.length,
	};
}

export function isPhoneValid(country: CountryCode, nationalDigits: string): boolean {
	const digits = nationalDigits.replace(/\D/g, '');
	if (!digits) return false;
	return isValidPhoneNumber(digits, country);
}

export function formatNational(country: CountryCode, nationalDigits: string): string {
	const digits = nationalDigits.replace(/\D/g, '').slice(0, MAX_DIGITS);
	if (!digits) return '';
	return new AsYouType(country).input(digits);
}

// National storage keeps the digits the user sees, including a trunk prefix.
// libphonenumber's nationalNumber drops that prefix, and feeding it back does not restore the national format.
export function interpretPhone(raw: string, countryCode: CountryCode, favorites: readonly CountryCode[], locale: string): InterpretedPhone {
	const value = String(raw ?? '').trim();
	const internationalSource = toInternationalSource(value);

	if (internationalSource != null) {
		const formatter = new AsYouType();
		const formatted = formatter.input(capInternational(internationalSource));
		const nextCountry = countryFromInternational(formatter, countryCode, favorites, locale);
		return {
			countryCode: nextCountry,
			formatted,
			international: true,
			nationalDigits: nationalDigitsFromInternational(formatted),
		};
	}

	const digits = value.replace(/\D/g, '').slice(0, MAX_DIGITS);
	return {
		countryCode,
		formatted: digits ? new AsYouType(countryCode).input(digits) : '',
		international: false,
		nationalDigits: digits,
	};
}

export function readExternalPhone(value: string, countryCode: CountryCode, favorites: readonly CountryCode[], locale: string): { countryCode: CountryCode; nationalDigits: string } {
	const interpreted = interpretPhone(value, countryCode, favorites, locale);
	return {
		countryCode: interpreted.countryCode,
		nationalDigits: interpreted.nationalDigits,
	};
}

function countryFromInternational(formatter: AsYouType, countryCode: CountryCode, favorites: readonly CountryCode[], locale: string): CountryCode {
	const detected = formatter.getCountry();
	if (detected) return detected;

	const calling = formatter.getCallingCode();
	if (!calling) return countryCode;

	const current = byCode.get(countryCode);
	if (current && current.callingCode === calling) return countryCode;

	return countryForDialCode(Number(calling), favorites, locale)?.code ?? countryCode;
}

function nationalDigitsFromInternational(formatted: string): string {
	const parsed = parsePhoneNumberFromString(formatted);
	if (parsed?.country) {
		const national = parsed.formatNational().replace(/\D/g, '');
		if (national) return national.slice(0, MAX_DIGITS);
	}
	if (parsed?.nationalNumber) return parsed.nationalNumber.slice(0, MAX_DIGITS);

	const formatter = new AsYouType();
	formatter.input(formatted);
	return formatter.getNationalNumber().slice(0, MAX_DIGITS);
}

function capInternational(source: string): string {
	const digits = source.replace(/\D/g, '').slice(0, MAX_DIGITS);
	return source.trim().startsWith('+') ? `+${digits}` : digits;
}

function toInternationalSource(value: string): string | null {
	if (value.startsWith('+')) return value;

	const compact = value.replace(/[\s()-]/g, '');
	if (compact.startsWith('00') && compact.length > 2) {
		return `+${compact.slice(2)}`;
	}

	return null;
}

function localeRegion(locale: string): CountryCode | undefined {
	try {
		return normalizeCountryCode(new Intl.Locale(locale).region);
	} catch {
		return undefined;
	}
}

function localeExists(tag: string): boolean {
	try {
		new Intl.DisplayNames([tag], { type: 'region' });
		return true;
	} catch {
		return false;
	}
}

function displayNamesFor(locale: string): Intl.DisplayNames {
	let names = displayNamesCache.get(locale);
	if (!names) {
		names = new Intl.DisplayNames([locale], { type: 'region' });
		displayNamesCache.set(locale, names);
	}
	return names;
}
