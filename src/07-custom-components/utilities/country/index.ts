import { BaseComponent, type BaseComponentInit } from '@core/base';

interface ICountry extends BaseComponentInit {
	actions: {};
	countryCode: string; //ISO 3166-1 alpha-2
	locale: string; // BCP 47
	showFlag: boolean;
	showName: boolean;
}

let warnedMissingFlags = false;

function normalizeCode(code: string | undefined): string {
	const normalized = String(code ?? '')
		.trim()
		.toUpperCase();
	return normalized === 'UK' ? 'GB' : normalized;
}

function localeExists(tag: string): boolean {
	try {
		new Intl.DisplayNames([tag], { type: 'region' });
		return true;
	} catch {
		return false;
	}
}

export default class Country extends BaseComponent {
	#countryCode = '';
	#locale = 'en-US';
	#showFlag = false;
	#showName = false;

	constructor(config: ICountry) {
		super(config);

		if (!this.widgetEl) {
			console.warn('Country: root element not found for runtimeId', config.runtimeId);
			return;
		}

		this.#countryCode = normalizeCode(config.countryCode);
		this.#locale = this.resolveLocale(config.locale);
		this.#showFlag = Boolean(config.showFlag);
		this.#showName = Boolean(config.showName);
		this.render();
	}

	parametersChanged(payload: ICountry): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) return;

		if (this.widgetEl !== liveEl) {
			this.widgetEl = liveEl;
		}

		if (payload.countryCode !== undefined) {
			this.#countryCode = normalizeCode(payload.countryCode);
		}
		if (payload.locale !== undefined) {
			this.#locale = this.resolveLocale(payload.locale);
		}
		if (payload.showFlag !== undefined) {
			this.#showFlag = Boolean(payload.showFlag);
		}
		if (payload.showName !== undefined) {
			this.#showName = Boolean(payload.showName);
		}

		this.render();
	}

	destroy() {
		this.widgetEl?.replaceChildren();
		super.destroy();
	}

	private resolveLocale(locale: string | null | undefined): string {
		const incoming = String(locale ?? '').trim();
		if (incoming && localeExists(incoming)) {
			return incoming;
		}

		const stateLocale = window.SapphireRWALibrary?.State?.locale;
		if (stateLocale != null && String(stateLocale).trim() !== '') {
			return String(stateLocale).trim();
		}

		return 'en-US';
	}

	private regionName(code: string, locale: string): string {
		try {
			return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? '';
		} catch {
			return '';
		}
	}

	private render(): void {
		if (!this.widgetEl) return;

		this.widgetEl.replaceChildren();
		if (!this.#countryCode || (!this.#showFlag && !this.#showName)) return;

		const name = this.regionName(this.#countryCode, this.#locale);

		if (this.#showFlag) {
			this.appendFlag(name);
		}

		if (this.#showName && name) {
			const label = document.createElement('span');
			label.className = 'country-name';
			label.textContent = name;
			this.widgetEl.appendChild(label);
		}
	}

	private appendFlag(name: string): void {
		const flags = window.SapphireRWAFlags;
		if (!flags?.get) {
			if (!warnedMissingFlags) {
				console.warn('Country: sapphire-rwa-flags.js is not loaded; include it on screens that use this widget.');
				warnedMissingFlags = true;
			}
			return;
		}

		const svg = flags.get(this.#countryCode);
		if (!svg) return;

		const img = document.createElement('img');
		img.className = 'country-flag';
		img.draggable = false;
		if (this.#showName && name) {
			img.alt = '';
			img.setAttribute('aria-hidden', 'true');
		} else {
			img.alt = name || `Flag of ${this.#countryCode}`;
		}
		img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
		this.widgetEl.appendChild(img);
	}
}
