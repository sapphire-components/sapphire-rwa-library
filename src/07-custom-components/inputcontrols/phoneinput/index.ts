import { BaseComponent, type BaseComponentInit } from '@core/base';
import type { CountryCode } from 'libphonenumber-js';
import Helpers from '@utils/helpers';
import {
	countryByCode,
	countryName,
	defaultCountry,
	formatNational,
	interpretPhone,
	isPhoneValid,
	normalizeCountryCode,
	orderCountries,
	parseFavoriteCountries,
	readExternalPhone,
	resolveCountry,
	resolveLocale,
	type PhoneCountry,
} from './countries';

interface IPhoneInput extends BaseComponentInit {
	actions: {
		OnChange: (countryCode: string, dialCode: number, phoneNumber: string, isvalid: boolean) => void;
	};
	countryCode: string;
	dialCode: number;
	enabled: boolean;
	favoriteCountries: string;
	locale: string;
	phoneNumber: string;
}

const flagSrcCache = new Map<string, string | null>();
let warnedMissingFlags = false;

export default class PhoneInput extends BaseComponent {
	private actions: IPhoneInput['actions'] | undefined;
	private enabled = true;
	private favorites: CountryCode[] = [];
	private locale = 'en-US';
	private countryCode: CountryCode = 'US';
	private nationalDigits = '';
	private international = false;
	private ready = false;
	private isOpen = false;

	private boundCountryRaw = '';
	private boundDialRaw = 0;
	private boundPhoneRaw = '';
	private lastCountry: CountryCode = 'US';
	private lastDial = 0;
	private lastPhone = '';

	private fieldEl!: HTMLDivElement;
	private countryBtn!: HTMLButtonElement;
	private flagEl!: HTMLImageElement;
	private dialEl!: HTMLSpanElement;
	private inputEl!: HTMLInputElement;
	private panelEl!: HTMLDivElement;
	private searchEl!: HTMLInputElement;
	private searchClearEl!: HTMLButtonElement;
	private listEl!: HTMLUListElement;
	private emptyEl!: HTMLDivElement;
	private separatorEl: HTMLLIElement | null = null;
	private activeOption: HTMLLIElement | null = null;

	private tippyInstance: TippyInstance | null = null;
	private fieldResizeObserver?: ResizeObserver;
	private positionRafId: number | null = null;
	private lastFieldTop = 0;
	private lastFieldLeft = 0;
	private listId = '';

	private readonly onCountryClick = (event: MouseEvent): void => {
		event.preventDefault();
		if (!this.enabled) return;
		if (this.isOpen) this.close();
		else this.open();
	};

	private readonly onCountryKeyDown = (event: KeyboardEvent): void => {
		if (!this.enabled) return;

		if (!this.isOpen) {
			// Enter and Space activate the button, which toggles through the click handler.
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault();
				this.open();
				return;
			}
			if (isPrintableKey(event)) {
				event.preventDefault();
				this.open(event.key);
			}
			return;
		}

		this.onSearchKeyDown(event);
	};

	private readonly onNumberInput = (): void => {
		const raw = this.inputEl.value;
		const caret = this.inputEl.selectionStart ?? raw.length;
		const digitsBefore = countDigits(raw.slice(0, caret));
		const interpreted = interpretPhone(raw, this.countryCode, this.favorites, this.locale);

		if (interpreted.countryCode !== this.countryCode) {
			this.countryCode = interpreted.countryCode;
			this.renderTrigger();
			this.markSelected();
		}

		this.international = interpreted.international;
		this.nationalDigits = interpreted.nationalDigits;

		if (this.inputEl.value !== interpreted.formatted) {
			this.inputEl.value = interpreted.formatted;
			const nextCaret = caretAfterDigits(interpreted.formatted, digitsBefore);
			this.inputEl.setSelectionRange(nextCaret, nextCaret);
		}

		this.emitIfChanged();
	};

	private readonly onNumberBlur = (): void => {
		if (!this.international) return;

		const interpreted = interpretPhone(this.inputEl.value, this.countryCode, this.favorites, this.locale);
		if (interpreted.countryCode !== this.countryCode) {
			this.countryCode = interpreted.countryCode;
			this.renderTrigger();
			this.markSelected();
		}

		this.nationalDigits = interpreted.nationalDigits;
		this.international = false;
		this.inputEl.value = formatNational(this.countryCode, this.nationalDigits);
		this.emitIfChanged();
	};

	private readonly onNumberFocus = (): void => {
		this.close();
	};

	private readonly onSearchInput = (): void => {
		this.setActive(null, false);
		this.updateSearchClear();
		this.applyFilter();
	};

	private readonly onSearchKeyDown = (event: KeyboardEvent): void => {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			this.moveActive(1);
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			this.moveActive(-1);
			return;
		}
		if (event.key === 'Home') {
			event.preventDefault();
			const first = this.visibleOptions()[0];
			if (first) this.setActive(first);
			return;
		}
		if (event.key === 'End') {
			event.preventDefault();
			const options = this.visibleOptions();
			const last = options[options.length - 1];
			if (last) this.setActive(last);
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			this.selectActive();
			return;
		}
		if (event.key === 'Escape' || event.key === 'Esc') {
			event.preventDefault();
			this.close();
			this.countryBtn.focus();
			return;
		}
		if (event.key === 'Tab') {
			event.preventDefault();
			this.close();
			if (event.shiftKey) this.countryBtn.focus();
			else this.inputEl.focus();
		}
	};

	private readonly onSearchClearMouseDown = (event: MouseEvent): void => {
		event.preventDefault();
	};

	private readonly onSearchClearClick = (event: MouseEvent): void => {
		event.preventDefault();
		this.clearSearch();
	};

	private readonly onListMouseDown = (event: MouseEvent): void => {
		event.preventDefault();
	};

	private readonly onListMouseOver = (event: MouseEvent): void => {
		const option = (event.target as HTMLElement).closest<HTMLLIElement>('.phoneinput-option');
		if (!option || option.hidden || option === this.activeOption) return;
		this.setActive(option, false);
	};

	private readonly onListClick = (event: MouseEvent): void => {
		const option = (event.target as HTMLElement).closest<HTMLLIElement>('.phoneinput-option');
		if (!option || option.hidden) return;
		const code = normalizeCountryCode(option.dataset.value);
		if (!code) return;
		this.selectCountry(code);
	};

	private readonly syncPanelWidth = (): void => {
		const popper = this.tippyInstance?.popper;
		if (!popper) return;
		const width = this.fieldEl.getBoundingClientRect().width;
		popper.style.setProperty('--trigger-width', `${width}px`);
		this.tippyInstance?.popperInstance?.update?.();
	};

	private readonly watchFieldPosition = (): void => {
		if (!this.isOpen) {
			this.positionRafId = null;
			return;
		}

		const rect = this.fieldEl.getBoundingClientRect();
		if (rect.top !== this.lastFieldTop || rect.left !== this.lastFieldLeft) {
			this.lastFieldTop = rect.top;
			this.lastFieldLeft = rect.left;
			this.tippyInstance?.popperInstance?.update?.();
		}

		this.positionRafId = window.requestAnimationFrame(this.watchFieldPosition);
	};

	constructor(init: IPhoneInput) {
		super(init);
		this.actions = init.actions;

		if (!this.widgetEl) {
			console.warn('PhoneInput: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.locale = resolveLocale(init.locale);
		this.favorites = parseFavoriteCountries(init.favoriteCountries);
		this.enabled = init.enabled !== false;
		this.boundCountryRaw = init.countryCode ?? '';
		this.boundDialRaw = readDial(init.dialCode);
		this.boundPhoneRaw = init.phoneNumber ?? '';
		this.listId = `${this.runtimeId}-list`;

		const fallback = defaultCountry(this.favorites, this.locale);
		this.countryCode = resolveCountry(init.countryCode, this.boundDialRaw, this.favorites, this.locale, fallback);

		const read = readExternalPhone(this.boundPhoneRaw, this.countryCode, this.favorites, this.locale);
		this.countryCode = read.countryCode;
		this.nationalDigits = read.nationalDigits;
		this.lastCountry = this.countryCode;
		this.lastPhone = this.nationalDigits;
		this.lastDial = countryByCode(this.countryCode)?.dialCode ?? 0;

		this.build();
		this.setEnabled(this.enabled);
		this.renderTrigger();
		this.renderList();
		this.inputEl.value = formatNational(this.countryCode, this.nationalDigits);
		this.initTippy();
		this.bindEvents();
		this.ready = true;
	}

	parametersChanged(payload: IPhoneInput): void {
		if (!this.ready) return;

		if (payload.enabled !== undefined && payload.enabled !== this.enabled) {
			this.setEnabled(payload.enabled);
		}

		let listDirty = false;
		if (payload.locale !== undefined) {
			const locale = resolveLocale(payload.locale);
			if (locale !== this.locale) {
				this.locale = locale;
				listDirty = true;
			}
		}

		if (payload.favoriteCountries !== undefined) {
			const favorites = parseFavoriteCountries(payload.favoriteCountries);
			if (!Helpers.areTheyEqual(favorites, this.favorites)) {
				this.favorites = favorites;
				listDirty = true;
			}
		}

		if (listDirty) {
			this.renderTrigger();
			this.renderList();
			if (this.isOpen) this.applyFilter();
		}

		const countryProvided = payload.countryCode !== undefined;
		const dialProvided = payload.dialCode !== undefined;
		if (countryProvided || dialProvided) {
			const countryRaw = countryProvided ? (payload.countryCode ?? '') : this.boundCountryRaw;
			const dialRaw = dialProvided ? readDial(payload.dialCode) : this.boundDialRaw;
			if (countryRaw !== this.boundCountryRaw || dialRaw !== this.boundDialRaw) {
				this.boundCountryRaw = countryRaw;
				this.boundDialRaw = dialRaw;
				this.applyBoundCountry(countryRaw, dialRaw);
			}
		}

		if (payload.phoneNumber !== undefined && (payload.phoneNumber ?? '') !== this.boundPhoneRaw) {
			this.boundPhoneRaw = payload.phoneNumber ?? '';
			this.applyBoundPhone(this.boundPhoneRaw);
		}
	}

	destroy(): void {
		this.close();
		this.fieldResizeObserver?.disconnect();
		this.countryBtn?.removeEventListener('click', this.onCountryClick);
		this.countryBtn?.removeEventListener('keydown', this.onCountryKeyDown);
		this.inputEl?.removeEventListener('input', this.onNumberInput);
		this.inputEl?.removeEventListener('blur', this.onNumberBlur);
		this.inputEl?.removeEventListener('focus', this.onNumberFocus);
		this.searchEl?.removeEventListener('input', this.onSearchInput);
		this.searchEl?.removeEventListener('keydown', this.onSearchKeyDown);
		this.searchClearEl?.removeEventListener('mousedown', this.onSearchClearMouseDown);
		this.searchClearEl?.removeEventListener('click', this.onSearchClearClick);
		this.listEl?.removeEventListener('mousedown', this.onListMouseDown);
		this.listEl?.removeEventListener('mouseover', this.onListMouseOver);
		this.listEl?.removeEventListener('click', this.onListClick);
		this.tippyInstance?.destroy();
		this.tippyInstance = null;
		super.destroy();
	}

	private build(): void {
		this.widgetEl.classList.add('phoneinput');
		this.widgetEl.replaceChildren();

		this.fieldEl = document.createElement('div');
		this.fieldEl.className = 'phoneinput-field';
		this.fieldEl.dataset.open = 'false';

		this.countryBtn = document.createElement('button');
		this.countryBtn.type = 'button';
		this.countryBtn.className = 'phoneinput-country';
		this.countryBtn.setAttribute('role', 'combobox');
		this.countryBtn.setAttribute('aria-haspopup', 'listbox');
		this.countryBtn.setAttribute('aria-expanded', 'false');
		this.countryBtn.setAttribute('aria-controls', this.listId);

		this.flagEl = document.createElement('img');
		this.flagEl.className = 'phoneinput-flag';
		this.flagEl.alt = '';
		this.flagEl.draggable = false;
		this.flagEl.hidden = true;
		this.flagEl.setAttribute('aria-hidden', 'true');

		this.dialEl = document.createElement('span');
		this.dialEl.className = 'phoneinput-dial';
		this.dialEl.dir = 'ltr';

		const chevron = document.createElement('span');
		chevron.className = 'phoneinput-chevron';
		chevron.setAttribute('aria-hidden', 'true');
		chevron.innerHTML = Helpers.placeIcon('caret-down', 's');

		this.countryBtn.append(this.flagEl, this.dialEl, chevron);

		this.inputEl = document.createElement('input');
		this.inputEl.type = 'tel';
		this.inputEl.className = 'phoneinput-input';
		this.inputEl.dir = 'ltr';
		this.inputEl.inputMode = 'tel';
		this.inputEl.autocomplete = 'tel-national';
		this.inputEl.spellcheck = false;

		this.fieldEl.append(this.countryBtn, this.inputEl);
		this.widgetEl.append(this.fieldEl);

		this.panelEl = document.createElement('div');
		this.panelEl.className = 'phoneinput-panel';

		const search = document.createElement('div');
		search.className = 'phoneinput-search';

		const searchIcon = document.createElement('span');
		searchIcon.className = 'phoneinput-search-icon';
		searchIcon.setAttribute('aria-hidden', 'true');
		searchIcon.innerHTML = Helpers.placeIcon('magnifying-glass', 's');

		this.searchEl = document.createElement('input');
		this.searchEl.type = 'text';
		this.searchEl.className = 'phoneinput-search-input';
		this.searchEl.placeholder = 'Search';
		this.searchEl.autocomplete = 'off';
		this.searchEl.spellcheck = false;
		this.searchEl.setAttribute('aria-label', 'Search');
		this.searchEl.setAttribute('aria-autocomplete', 'list');
		this.searchEl.setAttribute('aria-controls', this.listId);

		this.searchClearEl = document.createElement('button');
		this.searchClearEl.type = 'button';
		this.searchClearEl.className = 'phoneinput-search-clear';
		this.searchClearEl.hidden = true;
		this.searchClearEl.setAttribute('aria-label', 'Clear search');
		this.searchClearEl.innerHTML = Helpers.placeIcon('x', 's');

		search.append(searchIcon, this.searchEl, this.searchClearEl);

		this.listEl = document.createElement('ul');
		this.listEl.className = 'phoneinput-list';
		this.listEl.id = this.listId;
		this.listEl.setAttribute('role', 'listbox');

		this.emptyEl = document.createElement('div');
		this.emptyEl.className = 'phoneinput-empty';
		this.emptyEl.textContent = 'No results';
		this.emptyEl.hidden = true;

		this.panelEl.append(search, this.listEl, this.emptyEl);
	}

	private bindEvents(): void {
		this.countryBtn.addEventListener('click', this.onCountryClick);
		this.countryBtn.addEventListener('keydown', this.onCountryKeyDown);
		this.inputEl.addEventListener('input', this.onNumberInput);
		this.inputEl.addEventListener('blur', this.onNumberBlur);
		this.inputEl.addEventListener('focus', this.onNumberFocus);
		this.searchEl.addEventListener('input', this.onSearchInput);
		this.searchEl.addEventListener('keydown', this.onSearchKeyDown);
		this.searchClearEl.addEventListener('mousedown', this.onSearchClearMouseDown);
		this.searchClearEl.addEventListener('click', this.onSearchClearClick);
		this.listEl.addEventListener('mousedown', this.onListMouseDown);
		this.listEl.addEventListener('mouseover', this.onListMouseOver);
		this.listEl.addEventListener('click', this.onListClick);

		this.fieldResizeObserver = new ResizeObserver(() => {
			if (this.isOpen) this.syncPanelWidth();
		});
		this.fieldResizeObserver.observe(this.fieldEl);
	}

	private initTippy(): void {
		if (typeof window.tippy !== 'function') {
			console.warn('PhoneInput: window.tippy is not available');
			return;
		}

		this.tippyInstance = window.tippy(this.countryBtn, {
			appendTo: () => document.body,
			arrow: false,
			content: this.panelEl,
			interactive: true,
			maxWidth: 'none',
			offset: [0, 4],
			placement: 'bottom-start',
			trigger: 'manual',
			onShow: (instance: TippyInstance) => {
				let placement = 'bottom-start';
				if (window.SapphireRWALibrary?.State?.isRTL) {
					placement = 'bottom-end';
				}
				instance.setProps({ placement });
				this.syncPanelWidth();
			},
			onClickOutside: () => {
				this.close();
			},
		});
	}

	private setEnabled(enabled: boolean): void {
		this.enabled = enabled;
		this.widgetEl.dataset.enabled = enabled ? 'true' : 'false';
		this.countryBtn.disabled = !enabled;
		this.inputEl.disabled = !enabled;
		if (!enabled) this.close();
	}

	private renderTrigger(): void {
		const country = countryByCode(this.countryCode);
		const name = countryName(this.countryCode, this.locale);
		const dial = country ? `+${country.callingCode}` : '';
		this.dialEl.textContent = dial;
		this.countryBtn.setAttribute('aria-label', name && dial ? `${name}, ${dial}` : name || dial);
		this.syncTitle(name);

		const src = flagSrc(this.countryCode);
		if (src) {
			this.flagEl.hidden = false;
			this.flagEl.src = src;
		} else {
			this.flagEl.hidden = true;
			this.flagEl.removeAttribute('src');
		}
	}

	private syncTitle(name: string): void {
		if (this.isOpen || !name) {
			this.countryBtn.removeAttribute('title');
			return;
		}
		this.countryBtn.title = name;
	}

	private renderList(): void {
		const { countries, favoriteCount } = orderCountries(this.locale, this.favorites);
		const fragment = document.createDocumentFragment();
		this.separatorEl = null;
		this.activeOption = null;

		countries.forEach((country, index) => {
			if (index === favoriteCount && favoriteCount > 0 && favoriteCount < countries.length) {
				const separator = document.createElement('li');
				separator.className = 'phoneinput-separator';
				separator.setAttribute('role', 'separator');
				separator.setAttribute('aria-hidden', 'true');
				this.separatorEl = separator;
				fragment.append(separator);
			}
			fragment.append(this.createOption(country, index < favoriteCount));
		});

		this.listEl.replaceChildren(fragment);
		this.markSelected();
	}

	private createOption(country: PhoneCountry, favorite: boolean): HTMLLIElement {
		const name = countryName(country.code, this.locale);
		const option = document.createElement('li');
		option.className = 'phoneinput-option';
		option.id = `${this.runtimeId}-opt-${country.code}`;
		option.dataset.value = country.code;
		option.dataset.favorite = favorite ? 'true' : 'false';
		option.dataset.name = normalizeSearch(name);
		option.dataset.code = country.code.toLowerCase();
		option.dataset.calling = country.callingCode;
		option.setAttribute('role', 'option');

		const src = flagSrc(country.code);
		if (src) {
			const img = document.createElement('img');
			img.className = 'phoneinput-flag';
			img.alt = '';
			img.draggable = false;
			img.setAttribute('aria-hidden', 'true');
			img.src = src;
			option.append(img);
		} else {
			const spacer = document.createElement('span');
			spacer.className = 'phoneinput-flag';
			spacer.setAttribute('aria-hidden', 'true');
			option.append(spacer);
		}

		const dial = document.createElement('span');
		dial.className = 'phoneinput-dial';
		dial.dir = 'ltr';
		dial.textContent = `+${country.callingCode}`;

		const label = document.createElement('span');
		label.className = 'phoneinput-name';
		label.textContent = name;
		label.title = name;

		option.append(dial, label);
		return option;
	}

	private markSelected(): void {
		for (const option of this.optionEls()) {
			option.setAttribute('aria-selected', option.dataset.value === this.countryCode ? 'true' : 'false');
		}
	}

	private applyBoundCountry(countryCode: string, dialCode: number): void {
		const next = resolveCountry(countryCode, dialCode, this.favorites, this.locale, this.countryCode);
		if (next === this.countryCode) return;

		this.countryCode = next;
		this.renderTrigger();
		this.markSelected();
		if (!this.international || document.activeElement !== this.inputEl) {
			this.international = false;
			this.inputEl.value = formatNational(this.countryCode, this.nationalDigits);
		}
	}

	private applyBoundPhone(value: string): void {
		const read = readExternalPhone(value, this.countryCode, this.favorites, this.locale);
		const countryChanged = read.countryCode !== this.countryCode;
		const digitsChanged = read.nationalDigits !== this.nationalDigits;
		if (!countryChanged && !digitsChanged) return;

		if (countryChanged) {
			this.countryCode = read.countryCode;
			this.renderTrigger();
			this.markSelected();
		}

		this.nationalDigits = read.nationalDigits;
		this.international = false;
		this.inputEl.value = formatNational(this.countryCode, this.nationalDigits);
	}

	private selectCountry(code: CountryCode): void {
		const changed = code !== this.countryCode;
		this.countryCode = code;
		this.international = false;
		this.renderTrigger();
		this.markSelected();
		this.inputEl.value = formatNational(this.countryCode, this.nationalDigits);
		this.close();
		this.inputEl.focus();
		if (changed) this.emitIfChanged();
	}

	private emitIfChanged(): void {
		const dial = countryByCode(this.countryCode)?.dialCode ?? 0;
		if (dial === this.lastDial && this.nationalDigits === this.lastPhone && this.countryCode === this.lastCountry) return;

		this.lastDial = dial;
		this.lastPhone = this.nationalDigits;
		this.lastCountry = this.countryCode;
		this.actions?.OnChange(this.countryCode, dial, this.nationalDigits, isPhoneValid(this.countryCode, this.nationalDigits));
	}

	private open(seed?: string): void {
		if (this.isOpen || !this.enabled) return;

		this.isOpen = true;
		this.fieldEl.dataset.open = 'true';
		this.countryBtn.setAttribute('aria-expanded', 'true');
		this.countryBtn.removeAttribute('title');
		this.tippyInstance?.show();
		this.startPositionWatch();

		this.searchEl.value = seed ?? '';
		this.updateSearchClear();
		this.applyFilter();
		this.syncPanelWidth();

		const selected = this.optionEls().find((option) => option.dataset.value === this.countryCode && !option.hidden) ?? null;
		this.setActive(selected, false);
		this.searchEl.focus();
		if (seed) {
			const end = this.searchEl.value.length;
			this.searchEl.setSelectionRange(end, end);
		}

		requestAnimationFrame(() => {
			(selected ?? this.visibleOptions()[0])?.scrollIntoView({ block: 'center' });
		});
	}

	private close(): void {
		if (!this.isOpen) return;

		this.isOpen = false;
		this.fieldEl.dataset.open = 'false';
		this.countryBtn.setAttribute('aria-expanded', 'false');
		this.syncTitle(countryName(this.countryCode, this.locale));
		this.setActive(null, false);
		this.stopPositionWatch();
		this.tippyInstance?.hide();
	}

	private clearSearch(): void {
		this.searchEl.value = '';
		this.setActive(null, false);
		this.updateSearchClear();
		this.applyFilter();
		this.searchEl.focus();
	}

	private updateSearchClear(): void {
		this.searchClearEl.hidden = this.searchEl.value.length === 0;
	}

	private applyFilter(): void {
		const query = normalizeSearch(this.searchEl.value);
		let favorites = 0;
		let others = 0;

		for (const option of this.optionEls()) {
			const match = optionMatches(option, query);
			option.hidden = !match;
			if (!match) continue;
			if (option.dataset.favorite === 'true') favorites += 1;
			else others += 1;
		}

		if (this.separatorEl) this.separatorEl.hidden = favorites === 0 || others === 0;
		this.emptyEl.hidden = favorites + others > 0;
		if (this.activeOption?.hidden) this.setActive(null, false);
		this.tippyInstance?.popperInstance?.update?.();
	}

	private optionEls(): HTMLLIElement[] {
		return Array.from(this.listEl.querySelectorAll<HTMLLIElement>('.phoneinput-option'));
	}

	private visibleOptions(): HTMLLIElement[] {
		return this.optionEls().filter((option) => !option.hidden);
	}

	private moveActive(delta: number): void {
		const options = this.visibleOptions();
		if (options.length === 0) {
			this.setActive(null, false);
			return;
		}

		const current = this.activeOption && !this.activeOption.hidden ? options.indexOf(this.activeOption) : -1;
		if (current === -1) {
			this.setActive(delta > 0 ? options[0] : options[options.length - 1]);
			return;
		}

		const next = current + delta;
		if (next < 0) {
			this.setActive(null, false);
			this.searchEl.focus();
			return;
		}
		if (next >= options.length) return;
		this.setActive(options[next]);
	}

	private setActive(option: HTMLLIElement | null, scroll = true): void {
		if (this.activeOption && this.activeOption !== option) {
			this.activeOption.dataset.active = 'false';
		}

		this.activeOption = option;
		if (!option) {
			this.searchEl.removeAttribute('aria-activedescendant');
			return;
		}

		option.dataset.active = 'true';
		this.searchEl.setAttribute('aria-activedescendant', option.id);
		if (scroll) option.scrollIntoView({ block: 'nearest' });
	}

	private selectActive(): void {
		const option = this.activeOption && !this.activeOption.hidden ? this.activeOption : this.visibleOptions()[0];
		if (!option) return;
		const code = normalizeCountryCode(option.dataset.value);
		if (!code) return;
		this.selectCountry(code);
	}

	private startPositionWatch(): void {
		if (this.positionRafId !== null) return;
		const rect = this.fieldEl.getBoundingClientRect();
		this.lastFieldTop = rect.top;
		this.lastFieldLeft = rect.left;
		this.positionRafId = window.requestAnimationFrame(this.watchFieldPosition);
	}

	private stopPositionWatch(): void {
		if (this.positionRafId === null) return;
		window.cancelAnimationFrame(this.positionRafId);
		this.positionRafId = null;
	}
}

function readDial(value: number | string | null | undefined): number {
	const parsed = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return 0;
	return Math.trunc(parsed);
}

function flagSrc(code: string): string | null {
	const cached = flagSrcCache.get(code);
	if (cached !== undefined) return cached;

	const flags = window.SapphireRWAFlags;
	if (!flags?.get) {
		if (!warnedMissingFlags) {
			console.warn('PhoneInput: sapphire-rwa-flags.js is not loaded; include it on screens that use this widget.');
			warnedMissingFlags = true;
		}
		return null;
	}

	const svg = flags.get(code);
	const src = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
	flagSrcCache.set(code, src);
	return src;
}

function optionMatches(option: HTMLElement, query: string): boolean {
	if (!query) return true;

	const name = option.dataset.name ?? '';
	const code = option.dataset.code ?? '';
	if (name.includes(query) || code.startsWith(query)) return true;

	const dialQuery = query.replace(/^\+/, '');
	if (/^\d+$/.test(dialQuery)) {
		return (option.dataset.calling ?? '').startsWith(dialQuery);
	}

	return false;
}

function normalizeSearch(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '');
}

function countDigits(value: string): number {
	return value.replace(/\D/g, '').length;
}

function caretAfterDigits(formatted: string, digitCount: number): number {
	if (digitCount <= 0) return 0;

	let seen = 0;
	for (let index = 0; index < formatted.length; index++) {
		const char = formatted.charCodeAt(index);
		if (char >= 48 && char <= 57) {
			seen += 1;
			if (seen === digitCount) return index + 1;
		}
	}

	return formatted.length;
}

function isPrintableKey(event: KeyboardEvent): boolean {
	return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}
