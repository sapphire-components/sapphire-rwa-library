import { BaseComponent, type BaseComponentInit } from '@core/base';

type WeekDayFormat = 'narrow' | 'short' | 'long';

interface IWeekDayPicker extends BaseComponentInit {
	actions: {
		OnChange: (days: string) => void;
	};
	enabled: boolean;
	locale: string;
	selectableCount: number;
	/** ISO weekday ints (1–7), or the same JSON string emitted by OnChange. */
	selected: number[] | string;
	weekDayFormat: string; // narrow, short, long
	weekStart: number; // 1 Monday ... 7 Sunday
}

const ISO_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
/** Known Monday used as the base for Intl weekday labels. */
const REFERENCE_MONDAY_UTC = Date.UTC(2024, 0, 1);

export default class WeekDayPicker extends BaseComponent {
	#actions!: IWeekDayPicker['actions'];
	#buttonByDay = new Map<number, HTMLButtonElement>();
	#enabled = true;
	#locale = 'en-US';
	#selectableCount = 1;
	#selected: number[] = [];
	#weekDayFormat: WeekDayFormat = 'short';
	#weekStart = 1;

	private readonly onDayClick = (event: MouseEvent): void => {
		const button = event.currentTarget as HTMLButtonElement;
		if (!this.#enabled || button.disabled) return;

		const day = Number(button.dataset.day);
		if (!Number.isInteger(day) || day < 1 || day > 7) return;

		this.toggleDay(day);
	};

	constructor(config: IWeekDayPicker) {
		super(config);

		if (!this.widgetEl) {
			console.warn('WeekDayPicker: root element not found for runtimeId', config.runtimeId);
			return;
		}

		this.#actions = config.actions;
		this.applyConfig(config, { rebuild: true, syncSelected: true });
	}

	parametersChanged(payload: IWeekDayPicker): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) return;

		// OutSystems may replace the host node or wipe JS-generated children on refresh.
		if (this.widgetEl !== liveEl) {
			this.widgetEl = liveEl;
			this.#buttonByDay.clear();
		}

		this.applyConfig(payload, {
			rebuild: this.needsRebuild(payload) || !this.hasLiveButtons(),
			syncSelected: payload.selected !== undefined,
		});
	}

	destroy(): void {
		this.unbindEvents();
		this.widgetEl?.replaceChildren();
		this.#buttonByDay.clear();
		super.destroy();
	}

	private applyConfig(payload: Partial<IWeekDayPicker>, options: { rebuild: boolean; syncSelected: boolean }): void {
		if (payload.enabled !== undefined) {
			this.#enabled = Boolean(payload.enabled);
		}

		if (payload.locale !== undefined) {
			this.#locale = this.resolveLocale(payload.locale);
		} else if (!this.#locale) {
			this.#locale = this.resolveLocale(undefined);
		}

		if (payload.selectableCount !== undefined) {
			this.#selectableCount = this.normalizeSelectableCount(payload.selectableCount);
		}

		if (payload.weekDayFormat !== undefined) {
			this.#weekDayFormat = this.normalizeWeekDayFormat(payload.weekDayFormat);
		}

		if (payload.weekStart !== undefined) {
			this.#weekStart = this.normalizeWeekStart(payload.weekStart);
		}

		if (options.syncSelected && payload.selected !== undefined) {
			this.#selected = this.normalizeSelected(payload.selected);
		} else {
			// Keep selection valid if selectableCount shrunk.
			this.#selected = this.normalizeSelected(this.#selected);
		}

		if (options.rebuild || this.#buttonByDay.size === 0) {
			this.rebuild();
		} else {
			this.refreshLabels();
			this.refreshDayState();
		}
	}

	private needsRebuild(payload: Partial<IWeekDayPicker>): boolean {
		if (payload.weekStart !== undefined && this.normalizeWeekStart(payload.weekStart) !== this.#weekStart) {
			return true;
		}
		if (payload.weekDayFormat !== undefined && this.normalizeWeekDayFormat(payload.weekDayFormat) !== this.#weekDayFormat) {
			return true;
		}
		if (payload.locale !== undefined && this.resolveLocale(payload.locale) !== this.#locale) {
			return true;
		}
		return false;
	}

	private rebuild(): void {
		this.unbindEvents();
		this.widgetEl.replaceChildren();
		this.#buttonByDay.clear();

		for (const day of this.orderedDays()) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'weekdaypicker-day';
			button.dataset.day = String(day);
			this.applyDayLabels(button, day);
			this.widgetEl.appendChild(button);
			this.#buttonByDay.set(day, button);
		}

		this.bindEvents();
		this.refreshDayState();
	}

	private refreshLabels(): void {
		for (const [day, button] of this.#buttonByDay) {
			this.applyDayLabels(button, day);
		}
	}

	private applyDayLabels(button: HTMLButtonElement, isoDay: number): void {
		button.textContent = this.labelForDay(isoDay, this.#weekDayFormat);
		button.title = this.labelForDay(isoDay, 'long');
	}

	private refreshDayState(): void {
		const atLimit = this.#selected.length >= this.#selectableCount;
		const selectedSet = new Set(this.#selected);

		for (const day of ISO_DAYS) {
			const button = this.#buttonByDay.get(day);
			if (!button) continue;

			const isSelected = selectedSet.has(day);
			button.dataset.selected = isSelected ? 'true' : 'false';
			button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

			const disabledByLimit = atLimit && !isSelected;
			const disabled = !this.#enabled || disabledByLimit;
			button.disabled = disabled;
			button.tabIndex = disabled ? -1 : 0;
		}
	}

	private toggleDay(day: number): void {
		const index = this.#selected.indexOf(day);

		if (index >= 0) {
			this.#selected = this.#selected.filter((value) => value !== day);
			this.refreshDayState();
			return;
		}

		if (this.#selected.length >= this.#selectableCount) {
			return;
		}

		this.#selected = [...this.#selected, day];
		this.refreshDayState();

		if (this.#selected.length === this.#selectableCount) {
			this.#actions.OnChange(JSON.stringify(this.#selected));
		}
	}

	private orderedDays(): number[] {
		const start = this.#weekStart;
		return Array.from({ length: 7 }, (_, index) => ((start - 1 + index) % 7) + 1);
	}

	private labelForDay(isoDay: number, format: WeekDayFormat = this.#weekDayFormat): string {
		const date = new Date(REFERENCE_MONDAY_UTC + (isoDay - 1) * 24 * 60 * 60 * 1000);
		try {
			return new Intl.DateTimeFormat(this.#locale, { weekday: format }).format(date);
		} catch {
			return new Intl.DateTimeFormat('en-US', { weekday: format }).format(date);
		}
	}

	private resolveLocale(locale: string | null | undefined): string {
		if (locale != null && String(locale).trim() !== '') {
			return String(locale);
		}

		const stateLocale = window.SapphireRWALibrary?.State?.locale;
		if (stateLocale != null && String(stateLocale).trim() !== '') {
			return String(stateLocale);
		}

		return 'en-US';
	}

	private normalizeWeekDayFormat(value: string | null | undefined): WeekDayFormat {
		const normalized = String(value ?? '').toLowerCase();
		if (normalized === 'narrow' || normalized === 'short' || normalized === 'long') {
			return normalized;
		}
		return 'short';
	}

	private normalizeWeekStart(value: number | null | undefined): number {
		const day = Number(value);
		if (!Number.isInteger(day) || day < 1 || day > 7) {
			return 1;
		}
		return day;
	}

	private normalizeSelectableCount(value: number | null | undefined): number {
		const count = Number(value);
		if (!Number.isFinite(count) || count < 0) {
			return 0;
		}
		return Math.min(7, Math.floor(count));
	}

	private normalizeSelected(value: number[] | string | null | undefined): number[] {
		const incoming = this.parseSelectedInput(value);
		const seen = new Set<number>();
		const result: number[] = [];

		for (const item of incoming) {
			const day = Number(item);
			if (!Number.isInteger(day) || day < 1 || day > 7 || seen.has(day)) {
				continue;
			}
			seen.add(day);
			result.push(day);
			if (result.length >= this.#selectableCount) {
				break;
			}
		}

		return result;
	}

	private parseSelectedInput(value: number[] | string | null | undefined): unknown[] {
		if (value == null) return [];

		if (Array.isArray(value)) {
			return value;
		}

		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (!trimmed) return [];

			try {
				const parsed = JSON.parse(trimmed);
				return Array.isArray(parsed) ? parsed : [];
			} catch {
				return trimmed
					.split(',')
					.map((part) => part.trim())
					.filter(Boolean);
			}
		}

		return [];
	}

	private hasLiveButtons(): boolean {
		if (this.#buttonByDay.size === 0) return false;
		for (const button of this.#buttonByDay.values()) {
			if (!button.isConnected || button.parentElement !== this.widgetEl) {
				return false;
			}
		}
		return true;
	}

	private bindEvents(): void {
		for (const button of this.#buttonByDay.values()) {
			button.addEventListener('click', this.onDayClick);
		}
	}

	private unbindEvents(): void {
		for (const button of this.#buttonByDay.values()) {
			button.removeEventListener('click', this.onDayClick);
		}
	}
}
