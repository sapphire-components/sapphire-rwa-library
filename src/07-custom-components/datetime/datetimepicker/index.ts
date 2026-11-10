import { BaseComponent, type BaseComponentInit } from '@core/base';
import { DateTimeFormat } from '@/03-core/clientactions/datetimeformat';
import Locale from '@/03-core/locale';
import Helpers from '@utils/helpers';
import { ValidationMessage } from '@utils/validation-message';
import {
	alignToHour,
	alignToMinute,
	END_DEFAULT,
	ensureIncluded,
	hour12,
	hourCandidates,
	hourLabel,
	minuteCandidates,
	periodOf,
	resolveStep,
	resolveTimeFormat,
	resolveTimePrecision,
	secondCandidates,
	START_DEFAULT,
	TimeFormats,
	TimePrecisions,
	to24Hour,
	type Period,
	type TimeFormat,
	type TimeParts,
	type TimePrecision,
} from '../hourpicker/time';
import {
	addDays,
	addMonths,
	clampDate,
	compareDates,
	formatDate,
	inDateRange,
	isoWeekday,
	monthGrid,
	orderedWeekdays,
	parseDate,
	parseSelected,
	toIsoDateTime,
	sameDate,
	toLocalDate,
	today,
	yearPageStart,
	type DateParts,
} from './dates';

type View = 'days' | 'months' | 'years';

/** Ids of the SapphireDensity static entity (RW_Core_Lib). Only `default` and `compact` are styled for now. */
const DENSITIES = ['dense', 'compact', 'default', 'comfortable'] as const;
type Density = (typeof DENSITIES)[number];

/** Ids of the DateTimePickerMode static entity (RW_DesignSystem). */
const MODES = ['single', 'multiple', 'range'] as const;
type Mode = (typeof MODES)[number];

/** `DateTimePickerConfig` structure, JSON-serialized by the block (PascalCase keys). */
interface IDateTimePickerConfig {
	DisplayFormat: string;
	/** When true, picks stay a draft until the Apply button commits them and fires Change. */
	HasApplyButton: boolean;
	HasClear: boolean;
	Inline: boolean;
	MaxDate: string;
	MinDate: string;
	/** DateTimePickerMode id: `single`, `multiple` or `range`. */
	Mode: Mode;
	MonthYearNavigation: boolean;
	/** Range mode only: true (default) shows two months side by side, false shows one. */
	RangeTwoCalendars: boolean;
	WeekStart: number;
}

/** `DateTimePickerConfigTime` structure, JSON-serialized by the block (PascalCase keys). */
interface IDateTimePickerConfigTime {
	HasTime: boolean;
	TimeFormat: TimeFormat;
	TimePrecision: TimePrecision;
	TimeStep: number;
}

/** Payload sent by the OutSystems block (OnReady / OnParametersChanged). */
interface IDateTimePicker extends BaseComponentInit {
	actions: {
		/** Receives a JSON array of ISO DateTimes; the block deserializes it into a DateTime List. */
		OnChange: (value: string) => void;
		/** Focus left the component (trigger, clear control and calendar popup count as one). */
		OnBlur?: () => void;
		/** The user cleared the value (trigger ✕, or footer Clear followed by Apply). Fired after OnChange. */
		OnClear?: () => void;
	};
	config: Partial<IDateTimePickerConfig>;
	configTime: Partial<IDateTimePickerConfigTime>;
	/** DateTime List of days that cannot be picked, serialized like `selected`. Only the date part is used. */
	disabled: unknown;
	enabled: boolean;
	isValid: boolean;
	locale: string;
	placeholder: string;
	/** DateTime List serialized as ISO strings (or a JSON string of the same). */
	selected: unknown;
	selectedText: string;
	density: Density;
	theme: string;
	validationMessage: string;
}

/** Flat settings the component works with internally. */
interface Settings {
	actions: IDateTimePicker['actions'];
	disabled: unknown;
	displayFormat: string;
	enabled: boolean;
	hasApplyButton: boolean;
	hasClear: boolean;
	hasTime: boolean;
	inline: boolean;
	isValid: boolean;
	locale: string;
	maxDate: string;
	minDate: string;
	mode: Mode;
	monthYearNavigation: boolean;
	placeholder: string;
	rangeTwoCalendars: boolean;
	selected: unknown;
	selectedText: string;
	density: Density;
	theme: string;
	timeFormat: TimeFormat;
	timePrecision: TimePrecision;
	timeStep: number;
	validationMessage: string;
	weekStart: number;
}

function toSettings(payload: Partial<IDateTimePicker>): Partial<Settings> {
	const settings: Partial<Settings> = {};
	const put = <K extends keyof Settings>(key: K, value: Settings[K] | undefined): void => {
		if (value !== undefined) settings[key] = value;
	};

	put('actions', payload.actions);
	put('disabled', payload.disabled);
	put('enabled', payload.enabled);
	put('isValid', payload.isValid);
	put('locale', payload.locale);
	put('placeholder', payload.placeholder);
	put('selected', payload.selected);
	put('selectedText', payload.selectedText);
	put('density', payload.density);
	put('theme', payload.theme);
	put('validationMessage', payload.validationMessage);

	const config = payload.config;
	if (config) {
		put('displayFormat', config.DisplayFormat);
		put('hasApplyButton', config.HasApplyButton);
		put('hasClear', config.HasClear);
		put('inline', config.Inline);
		put('maxDate', config.MaxDate);
		put('minDate', config.MinDate);
		put('monthYearNavigation', config.MonthYearNavigation);
		put('rangeTwoCalendars', config.RangeTwoCalendars);
		put('mode', config.Mode);
		put('weekStart', config.WeekStart);
	}

	const configTime = payload.configTime;
	if (configTime) {
		put('hasTime', configTime.HasTime);
		put('timeFormat', configTime.TimeFormat);
		put('timePrecision', configTime.TimePrecision);
		put('timeStep', configTime.TimeStep);
	}

	return settings;
}

/** Stable key for change detection on the Selected input. */
function selectedKey(raw: unknown): string {
	if (raw == null) return '';
	return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

const YEARS_PER_PAGE = 12;
/** Below this viewport width two calendars do not fit, so range mode falls back to one. */
const DUAL_MIN_VIEWPORT = 640;
const GRID_COLUMNS_MONTHS = 3;

export default class DateTimePicker extends BaseComponent {
	#actions!: IDateTimePicker['actions'];
	#displayFormat = '';
	#enabled = true;
	#hasApplyButton = false;
	#hasClear = false;
	#hasTime = false;
	#inline = false;
	#isValid = true;
	#locale = 'en-US';
	#max: DateParts | null = null;
	#min: DateParts | null = null;
	/** Days from the Disabled input, as `YYYY-MM-DD` keys. */
	#disabledDays = new Set<string>();
	#lastDisabledKey: string | undefined;
	#monthYearNavigation = false;
	#rangeTwoCalendars = true;
	/** Two months are on screen right now (range + RangeTwoCalendars + wide enough viewport). */
	#dual = false;
	#mode: Mode = 'single';
	#placeholder = '';
	#selectedText = '';
	#density: Density = 'default';
	#theme = '';
	#timeFormat: TimeFormat = TimeFormats.h24;
	#timePrecision: TimePrecision = TimePrecisions.minute;
	#timeStep = 30;
	#validationMessage = '';
	#weekStart = 1;

	// Value state. #selected / #time are what the panel shows (the draft while
	// HasApplyButton is on). #committed* is what the trigger shows and Change emits;
	// without the Apply button both are kept equal on every change.
	#selected: DateParts[] = [];
	#time: TimeParts | null = null;
	#committedSelected: DateParts[] = [];
	#committedTime: TimeParts | null = null;
	#period: Period = 'am';
	#lastValueIn: string | undefined;
	#lastSelectedRaw: unknown = null;
	#lastEmitted = '';
	/** Focus is somewhere inside the component; used to fire OnBlur once when it leaves. */
	#hasFocus = false;
	/** Footer Clear emptied the draft; OnClear fires if Apply then commits it. */
	#clearPending = false;
	/** The current pointer press landed on a disabled control (reset after the press's task). */
	#pressOnDisabled = false;
	/** Range mode: day under the pointer / keyboard focus while only the start is picked. */
	#hoverDate: DateParts | null = null;

	// View state
	#view: View = 'days';
	#viewYear = today().year;
	#viewMonth = today().month;
	#focusDate: DateParts = today();
	#isOpen = false;

	// DOM
	#triggerEl: HTMLDivElement | null = null;
	#valueEl: HTMLSpanElement | null = null;
	#clearEl: HTMLSpanElement | null = null;
	#panelEl: HTMLDivElement | null = null;
	#prevEl: HTMLButtonElement | null = null;
	#nextEl: HTMLButtonElement | null = null;
	#titleEl: HTMLButtonElement | null = null;
	#title2El: HTMLButtonElement | null = null;
	#bodyEl: HTMLDivElement | null = null;
	#timeEl: HTMLDivElement | null = null;
	#hoursEl: HTMLSelectElement | null = null;
	#minutesEl: HTMLSelectElement | null = null;
	#secondsEl: HTMLSelectElement | null = null;
	#periodEl: HTMLSelectElement | null = null;
	#applyEl: HTMLButtonElement | null = null;
	#footerClearEl: HTMLButtonElement | null = null;
	#tippy: TippyInstance | null = null;
	#validationMessageCtrl: ValidationMessage | undefined;

	// ---------------------------------------------------------------- handlers

	private readonly onTriggerClick = (event: MouseEvent): void => {
		event.preventDefault();
		if (!this.#enabled) return;
		if ((event.target as HTMLElement).closest('.datetimepicker-clear')) return;
		this.toggle();
	};

	private readonly onTriggerKeyDown = (event: KeyboardEvent): void => {
		if (!this.#enabled) return;
		if ((event.target as HTMLElement).closest('.datetimepicker-clear')) return;

		if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
			event.preventDefault();
			// Already open (e.g. by a click): move into the grid instead.
			if (this.#isOpen) {
				this.focusActiveCell();
			} else {
				this.open(true);
			}
		} else if (event.key === 'Escape' && this.#isOpen) {
			event.preventDefault();
			this.close();
		}
	};

	private readonly onClearClick = (event: Event): void => {
		event.preventDefault();
		event.stopPropagation();
		if (!this.#enabled) return;
		this.clear();
		// The clear control hides once the value is empty; keep focus on the trigger.
		this.#triggerEl?.focus();
	};

	private readonly onClearKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		this.onClearClick(event);
	};

	private readonly onApplyClick = (): void => {
		if (!this.#enabled || !this.isComplete()) return;
		const cleared = this.#clearPending && this.#selected.length === 0;
		this.#clearPending = false;
		this.commit();
		if (cleared) this.#actions?.OnClear?.();
		if (!this.#inline) {
			this.close();
			this.#triggerEl?.focus();
		}
	};

	private readonly onFooterClearClick = (): void => {
		if (!this.#enabled || this.#selected.length === 0) return;
		this.#selected = [];
		this.#time = null;
		this.#hoverDate = null;
		this.#clearPending = true;
		this.renderPanel();
		this.changed();
		this.focusActiveCell();
	};

	private readonly onFocusIn = (): void => {
		this.#hasFocus = true;
	};

	private readonly onFocusOut = (event: FocusEvent): void => {
		if (this.restoreFocusAfterDisabledPress(event)) return;
		const next = event.relatedTarget as Node | null;
		if (next && this.containsNode(next)) return;
		// relatedTarget is null for window blur and clicks on the page; check once focus has settled.
		window.setTimeout(() => {
			if (!this.#hasFocus || this.containsNode(document.activeElement)) return;
			this.#hasFocus = false;
			this.#actions?.OnBlur?.();
		}, 0);
	};

	/**
	 * Clicks on non-focusable parts (padding, weekday labels, blank cells) would
	 * otherwise move focus to <body> and look like a blur.
	 */
	private readonly onMouseDown = (event: MouseEvent): void => {
		const target = event.target as HTMLElement;
		if (!target.closest('button, select, input, [tabindex]')) event.preventDefault();
	};

	/**
	 * Browsers send no mousedown to a disabled control, so onMouseDown cannot keep focus:
	 * it moves to the nearest focusable ancestor (Tippy's box) or to <body>. Flag the
	 * press so the focusout it causes can be undone.
	 */
	private readonly onPointerDown = (event: PointerEvent): void => {
		const target = event.target as Element | null;
		if (!target?.closest?.(':disabled')) return;
		this.#pressOnDisabled = true;
		window.setTimeout(() => {
			this.#pressOnDisabled = false;
		}, 0);
	};

	private readonly onPrevClick = (): void => this.page(-1);
	private readonly onNextClick = (): void => this.page(1);

	private readonly onTitleClick = (): void => {
		if (!this.#monthYearNavigation) return;
		if (this.#view === 'days') {
			this.setView('months');
		} else if (this.#view === 'months') {
			this.setView('years');
		}
	};

	/** Second month's title: open the month grid for that month's year. */
	private readonly onTitle2Click = (): void => {
		if (!this.#monthYearNavigation || this.#view !== 'days') return;
		const second = addMonths({ year: this.#viewYear, month: this.#viewMonth, day: 1 }, 1);
		this.#viewYear = second.year;
		this.#viewMonth = second.month;
		this.#focusDate = clampDate(this.focusInView(), this.#min, this.#max);
		this.setView('months');
	};

	private readonly onBodyClick = (event: MouseEvent): void => {
		const cell = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-cell]');
		if (!cell || cell.disabled || !this.#enabled) return;

		if (cell.dataset.cell === 'day') {
			const date = parseDate(cell.dataset.date);
			if (date) this.pickDate(date);
		} else if (cell.dataset.cell === 'month') {
			this.#viewMonth = Number(cell.dataset.month);
			this.#focusDate = clampDate(this.focusInView(), this.#min, this.#max);
			this.setView('days');
		} else if (cell.dataset.cell === 'year') {
			this.#viewYear = Number(cell.dataset.year);
			this.#focusDate = clampDate(this.focusInView(), this.#min, this.#max);
			this.setView('months');
		}
	};

	private readonly onBodyMouseOver = (event: MouseEvent): void => {
		if (!this.isPickingRangeEnd()) return;
		const cell = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-cell="day"]');
		const date = cell && !cell.disabled ? parseDate(cell.dataset.date) : null;
		if (!date || sameDate(date, this.#hoverDate)) return;
		this.#hoverDate = date;
		this.decorateRange();
	};

	private readonly onBodyMouseLeave = (): void => {
		if (!this.#hoverDate) return;
		this.#hoverDate = null;
		this.decorateRange();
	};

	private readonly onBodyKeyDown = (event: KeyboardEvent): void => {
		if (!this.#enabled) return;
		if (this.#view === 'days') {
			this.handleDaysKey(event);
		} else {
			this.handleGridKey(event);
		}
	};

	private readonly onPanelKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape') return;
		event.preventDefault();
		event.stopPropagation();
		if (this.#view === 'years') {
			this.setView('months', true);
		} else if (this.#view === 'months') {
			this.setView('days', true);
		} else if (!this.#inline) {
			this.close();
			this.#triggerEl?.focus();
		}
	};

	private readonly onPanelFocusOut = (event: FocusEvent): void => {
		if (this.#inline || !this.#isOpen || this.#pressOnDisabled) return;
		const next = event.relatedTarget as Node | null;
		// null relatedTarget = click on a non-focusable spot or window blur; outside clicks are handled by tippy.
		if (!next) return;
		if (this.containsNode(next)) return;
		this.close();
	};

	private readonly onHoursChange = (): void => {
		if (!this.#hoursEl) return;
		if (this.#hoursEl.value === '') {
			this.setTime(null);
			return;
		}
		const next = alignToHour(Number(this.#hoursEl.value), this.#time, this.#timePrecision, this.#timeStep, START_DEFAULT, END_DEFAULT);
		this.setTime(next);
	};

	private readonly onMinutesChange = (): void => {
		if (!this.#minutesEl || !this.#time) return;
		const minute = Number(this.#minutesEl.value);
		const next =
			this.#timePrecision === TimePrecisions.second
				? alignToMinute(this.#time.hours, minute, this.#time, this.#timeStep, START_DEFAULT, END_DEFAULT)
				: { hours: this.#time.hours, minutes: minute, seconds: 0 };
		this.setTime(next);
	};

	private readonly onSecondsChange = (): void => {
		if (!this.#secondsEl || !this.#time) return;
		this.setTime({ ...this.#time, seconds: Number(this.#secondsEl.value) });
	};

	private readonly onPeriodChange = (): void => {
		if (!this.#periodEl) return;
		const period: Period = this.#periodEl.value === 'pm' ? 'pm' : 'am';
		this.#period = period;
		if (!this.#time) {
			this.fillTimeOptions();
			return;
		}
		const hour = to24Hour(hour12(this.#time.hours), period);
		this.setTime(alignToHour(hour, this.#time, this.#timePrecision, this.#timeStep, START_DEFAULT, END_DEFAULT));
	};

	// --------------------------------------------------------------- lifecycle

	constructor(config: IDateTimePicker) {
		super(config);

		if (!this.widgetEl) {
			console.warn('DateTimePicker: root element not found for runtimeId', config.runtimeId);
			return;
		}

		this.#actions = config.actions;
		this.applyConfig(toSettings(config), true);
	}

	parametersChanged(payload: IDateTimePicker): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) return;

		const settings = toSettings(payload);

		// OutSystems may replace the host node on refresh.
		if (this.widgetEl !== liveEl) {
			this.teardown();
			this.widgetEl = liveEl;
			this.applyConfig(settings, true);
			return;
		}

		this.applyConfig(settings, this.needsRebuild(settings) || !this.hasLiveDom());
	}

	destroy(): void {
		this.teardown();
		this.widgetEl?.replaceChildren();
		super.destroy();
	}

	// ------------------------------------------------------------------ config

	private applyConfig(payload: Partial<Settings>, rebuild: boolean): void {
		const shapeChanged = (payload.mode !== undefined && resolveMode(payload.mode) !== this.#mode) || (payload.hasTime !== undefined && Boolean(payload.hasTime) !== this.#hasTime);

		if (payload.actions) this.#actions = payload.actions;
		if (payload.displayFormat !== undefined) this.#displayFormat = String(payload.displayFormat ?? '');
		if (payload.enabled !== undefined) this.#enabled = Boolean(payload.enabled);
		if (payload.hasApplyButton !== undefined) this.#hasApplyButton = Boolean(payload.hasApplyButton);
		if (payload.hasClear !== undefined) this.#hasClear = Boolean(payload.hasClear);
		if (payload.hasTime !== undefined) this.#hasTime = Boolean(payload.hasTime);
		if (payload.inline !== undefined) this.#inline = Boolean(payload.inline);
		if (payload.isValid !== undefined) this.#isValid = Boolean(payload.isValid);
		if (payload.locale !== undefined || !this.#locale) this.#locale = resolveLocale(payload.locale);
		if (payload.maxDate !== undefined) this.#max = parseDate(payload.maxDate);
		if (payload.minDate !== undefined) this.#min = parseDate(payload.minDate);
		if (payload.monthYearNavigation !== undefined) this.#monthYearNavigation = Boolean(payload.monthYearNavigation);
		if (payload.rangeTwoCalendars !== undefined) this.#rangeTwoCalendars = Boolean(payload.rangeTwoCalendars);
		if (payload.mode !== undefined) this.#mode = resolveMode(payload.mode);
		if (payload.placeholder !== undefined) this.#placeholder = String(payload.placeholder ?? '');
		if (payload.selectedText !== undefined) this.#selectedText = String(payload.selectedText ?? '');
		if (payload.density !== undefined) this.#density = resolveDensity(payload.density);
		if (payload.theme !== undefined) this.#theme = String(payload.theme ?? '');
		if (payload.timeFormat !== undefined) this.#timeFormat = resolveTimeFormat(payload.timeFormat);
		if (payload.timePrecision !== undefined) this.#timePrecision = resolveTimePrecision(payload.timePrecision);
		if (payload.timeStep !== undefined || payload.timePrecision !== undefined) {
			this.#timeStep = resolveStep(payload.timeStep ?? this.#timeStep, this.#timePrecision);
		}
		if (payload.validationMessage !== undefined) this.#validationMessage = String(payload.validationMessage ?? '');
		if (payload.weekStart !== undefined) this.#weekStart = normalizeWeekStart(payload.weekStart);

		if (this.#min && this.#max && compareDates(this.#min, this.#max) > 0) {
			[this.#min, this.#max] = [this.#max, this.#min];
		}

		if (payload.disabled !== undefined) {
			const key = selectedKey(payload.disabled);
			if (key !== this.#lastDisabledKey) {
				this.#lastDisabledKey = key;
				this.#disabledDays = new Set(parseSelected(payload.disabled).map((item) => formatDate(item.date)));
			}
		}

		// Only re-read Selected when the parent actually changed it. A parent that does
		// not bind Selected back must not wipe the user's pick on unrelated refreshes.
		const incoming = payload.selected === undefined ? undefined : selectedKey(payload.selected);
		const valueChanged = incoming !== undefined && incoming !== this.#lastValueIn;
		if (valueChanged || shapeChanged) {
			// Mode / HasTime change how Selected is read and emitted, so re-read it.
			if (payload.selected !== undefined) {
				this.#lastValueIn = incoming;
				this.#lastSelectedRaw = payload.selected;
			}
			this.readValue(this.#lastSelectedRaw);
		} else if (this.#lastValueIn === undefined) {
			this.#lastEmitted = this.serialize();
		}

		if (rebuild) {
			this.rebuild();
		} else {
			this.syncEnabled();
			this.renderPanel();
			this.renderTrigger();
		}

		this.reflectState();
		this.syncValidity();
	}

	/** Shows the validation message and links it to the focusable control for assistive tech. */
	private syncValidity(): void {
		this.#validationMessageCtrl?.update(this.#isValid, this.#validationMessage);
		const control = this.#inline ? this.#panelEl : this.#triggerEl;
		if (!control) return;
		control.setAttribute('aria-invalid', this.#isValid ? 'false' : 'true');
		const messageEl = this.#validationMessageCtrl?.element;
		if (messageEl) {
			messageEl.id = `${this.runtimeId}-validation`;
			control.setAttribute('aria-describedby', messageEl.id);
		} else {
			control.removeAttribute('aria-describedby');
		}
	}

	private needsRebuild(payload: Partial<Settings>): boolean {
		return (
			(payload.inline !== undefined && Boolean(payload.inline) !== this.#inline) ||
			(payload.hasTime !== undefined && Boolean(payload.hasTime) !== this.#hasTime) ||
			(payload.mode !== undefined && resolveMode(payload.mode) !== this.#mode) ||
			(payload.hasClear !== undefined && Boolean(payload.hasClear) !== this.#hasClear) ||
			(payload.hasApplyButton !== undefined && Boolean(payload.hasApplyButton) !== this.#hasApplyButton) ||
			(payload.rangeTwoCalendars !== undefined && Boolean(payload.rangeTwoCalendars) !== this.#rangeTwoCalendars) ||
			(payload.timeFormat !== undefined && resolveTimeFormat(payload.timeFormat) !== this.#timeFormat) ||
			(payload.timePrecision !== undefined && resolveTimePrecision(payload.timePrecision) !== this.#timePrecision)
		);
	}

	private readValue(raw: unknown): void {
		const items = parseSelected(raw);

		this.#hoverDate = null;

		if (this.#mode === 'multiple') {
			this.#selected = items.map((item) => item.date);
			this.#time = null;
		} else if (this.#mode === 'range') {
			// Earliest and latest item; one item is a single-day range.
			const first = items[0];
			const last = items[items.length - 1];
			this.#selected = first ? [first.date, last.date] : [];
			this.#time = null;
		} else {
			// Single mode keeps the first DateTime of the list.
			const first = items[0];
			this.#selected = first ? [first.date] : [];
			this.#time = first && this.#hasTime ? (first.time ?? { ...START_DEFAULT }) : null;
		}

		if (this.#time) this.#period = periodOf(this.#time.hours);
		// A value from the parent is committed as-is (and replaces any open draft).
		this.#committedSelected = [...this.#selected];
		this.#committedTime = this.#time ? { ...this.#time } : null;
		this.#lastEmitted = this.serialize();

		// Point the calendar at the (first) selected date, or today.
		const anchor = clampDate(this.#selected[0] ?? today(), this.#min, this.#max);
		this.#focusDate = anchor;
		this.#viewYear = anchor.year;
		this.#viewMonth = anchor.month;
	}

	// ------------------------------------------------------------------- build

	private rebuild(): void {
		this.teardown();

		this.widgetEl.classList.add('datetimepicker');
		this.widgetEl.replaceChildren();

		if (!this.#inline) {
			this.#triggerEl = this.createTrigger();
			this.widgetEl.append(this.#triggerEl);
		}

		this.#panelEl = this.createPanel();

		if (this.#inline) {
			this.widgetEl.append(this.#panelEl);
		} else {
			this.initTippy();
		}

		this.#validationMessageCtrl = new ValidationMessage(this.widgetEl, 'append');
		this.bindEvents();
		this.syncEnabled();
		this.renderPanel();
		this.renderTrigger();
	}

	private createTrigger(): HTMLDivElement {
		const trigger = document.createElement('div');
		trigger.className = 'datetimepicker-trigger';
		trigger.id = `${this.runtimeId}-trigger`;
		trigger.setAttribute('role', 'button');
		trigger.setAttribute('aria-haspopup', 'dialog');
		trigger.setAttribute('aria-expanded', 'false');

		const icon = document.createElement('span');
		icon.className = 'datetimepicker-icon';
		icon.setAttribute('aria-hidden', 'true');
		icon.innerHTML = Helpers.placeIcon('calendar-blank', 's');

		this.#valueEl = document.createElement('span');
		this.#valueEl.className = 'datetimepicker-value';

		trigger.append(icon, this.#valueEl);

		if (this.#hasClear) {
			this.#clearEl = document.createElement('span');
			this.#clearEl.className = 'datetimepicker-clear';
			this.#clearEl.setAttribute('role', 'button');
			this.#clearEl.tabIndex = 0;
			this.#clearEl.innerHTML = Helpers.placeIcon('x', 's');
			trigger.append(this.#clearEl);
		}

		return trigger;
	}

	private createPanel(): HTMLDivElement {
		const panel = document.createElement('div');
		panel.className = 'datetimepicker-panel';
		panel.setAttribute('role', this.#inline ? 'group' : 'dialog');

		const header = document.createElement('div');
		header.className = 'datetimepicker-header';

		this.#prevEl = this.createNavButton('prev', 'caret-left', 'Previous');
		this.#nextEl = this.createNavButton('next', 'caret-right', 'Next');

		this.#titleEl = document.createElement('button');
		this.#titleEl.type = 'button';
		this.#titleEl.className = 'datetimepicker-title';
		this.#titleEl.setAttribute('aria-live', 'polite');
		header.append(this.#prevEl, this.#titleEl);

		if (this.canBeDual()) {
			this.#title2El = document.createElement('button');
			this.#title2El.type = 'button';
			this.#title2El.className = 'datetimepicker-title datetimepicker-title-second';
			this.#title2El.hidden = true;
			header.append(this.#title2El);
		}

		header.append(this.#nextEl);

		this.#bodyEl = document.createElement('div');
		this.#bodyEl.className = 'datetimepicker-body';

		panel.append(header, this.#bodyEl);

		if (this.usesTime()) {
			this.#timeEl = this.createTimeRow();
			panel.append(this.#timeEl);
		}

		if (this.#hasApplyButton) {
			const footer = document.createElement('div');
			footer.className = 'datetimepicker-footer';
			if (this.#hasClear) {
				// Clears the draft only; Apply then commits the empty value.
				this.#footerClearEl = document.createElement('button');
				this.#footerClearEl.type = 'button';
				this.#footerClearEl.className = 'datetimepicker-footer-clear';
				footer.append(this.#footerClearEl);
			}
			this.#applyEl = document.createElement('button');
			this.#applyEl.type = 'button';
			this.#applyEl.className = 'datetimepicker-apply';
			footer.append(this.#applyEl);
			panel.append(footer);
		}

		panel.dataset.mode = this.#mode;
		return panel;
	}

	private createNavButton(kind: 'prev' | 'next', icon: string, label: string): HTMLButtonElement {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = `datetimepicker-nav datetimepicker-${kind}`;
		button.setAttribute('aria-label', label);
		button.innerHTML = Helpers.placeIcon(icon, 's');
		return button;
	}

	private createTimeRow(): HTMLDivElement {
		const row = document.createElement('div');
		row.className = 'datetimepicker-time';

		const icon = document.createElement('span');
		icon.className = 'datetimepicker-time-icon';
		icon.setAttribute('aria-hidden', 'true');
		icon.innerHTML = Helpers.placeIcon('clock', 's');
		row.append(icon);

		this.#hoursEl = this.createTimeSelect('hours', 'Hours');
		row.append(this.#hoursEl);

		if (this.#timePrecision !== TimePrecisions.hour) {
			row.append(createSeparator());
			this.#minutesEl = this.createTimeSelect('minutes', 'Minutes');
			row.append(this.#minutesEl);
		}

		if (this.#timePrecision === TimePrecisions.second) {
			row.append(createSeparator());
			this.#secondsEl = this.createTimeSelect('seconds', 'Seconds');
			row.append(this.#secondsEl);
		}

		if (this.#timeFormat === TimeFormats.h12) {
			this.#periodEl = this.createTimeSelect('period', 'AM/PM');
			for (const period of ['am', 'pm']) {
				const option = document.createElement('option');
				option.value = period;
				option.textContent = period.toUpperCase();
				this.#periodEl.append(option);
			}
			row.append(this.#periodEl);
		}

		return row;
	}

	private createTimeSelect(kind: string, label: string): HTMLSelectElement {
		const select = document.createElement('select');
		select.className = `form-control datetimepicker-select datetimepicker-${kind}`;
		select.name = `datetimepicker-${kind}-${this.runtimeId}`;
		select.setAttribute('aria-label', label);
		return select;
	}

	private initTippy(): void {
		if (!this.#triggerEl) return;
		if (typeof window.tippy !== 'function') {
			if (this.#isOpen) console.warn('DateTimePicker: window.tippy is not available');
			return;
		}

		this.#tippy = window.tippy(this.#triggerEl, {
			appendTo: () => document.body,
			arrow: false,
			content: this.#panelEl,
			interactive: true,
			maxWidth: 'none',
			offset: [0, 4],
			placement: 'bottom-start',
			trigger: 'manual',
			onShow: (instance: TippyInstance) => {
				instance.setProps({ placement: window.SapphireRWALibrary?.State?.isRTL ? 'bottom-end' : 'bottom-start' });
			},
			onClickOutside: () => this.close(),
		});
	}

	// ------------------------------------------------------------------ render

	private renderTrigger(): void {
		if (!this.#valueEl) return;

		const text = this.displayText();
		this.#valueEl.textContent = text || this.#placeholder;
		this.#valueEl.dataset.placeholder = text ? 'false' : 'true';
		// Multiple mode may show only a count; the tooltip still lists every date.
		const fullText = this.#mode === 'multiple' ? this.#committedSelected.map((date) => this.formatForDisplay(date, null)).join(', ') : text;
		this.#triggerEl?.setAttribute('title', fullText);
		this.#triggerEl?.setAttribute('aria-label', fullText || this.#placeholder || Locale.translate('ChooseDate', this.#locale));
		this.#clearEl?.setAttribute('aria-label', Locale.translate('Clear', this.#locale));
	}

	/** The trigger always shows the committed value, never an unapplied draft. */
	private displayText(): string {
		const selected = this.#committedSelected;
		if (selected.length === 0) return '';

		if (this.#mode === 'multiple') {
			if (selected.length > 1 && this.#selectedText) {
				return `${selected.length} ${this.#selectedText}`;
			}
			return selected.map((date) => this.formatForDisplay(date, null)).join(', ');
		}

		if (this.#mode === 'range') {
			const [start, end = start] = selected;
			const from = this.formatForDisplay(start, null);
			return sameDate(start, end) ? from : `${from} – ${this.formatForDisplay(end, null)}`;
		}

		return this.formatForDisplay(selected[0], this.usesTime() ? this.#committedTime : null);
	}

	private formatForDisplay(date: DateParts, time: TimeParts | null): string {
		const dateTime = toLocalDate(date, time);

		if (this.#displayFormat.trim()) {
			return DateTimeFormat({ dateTime, locale: this.#locale, maskPattern: this.#displayFormat });
		}

		if (!time) {
			return DateTimeFormat({ dateTime, locale: this.#locale, dateStyle: 'medium' });
		}

		const options: Intl.DateTimeFormatOptions = {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			hourCycle: this.#timeFormat === TimeFormats.h12 ? 'h12' : 'h23',
		};
		if (this.#timePrecision !== TimePrecisions.hour) options.minute = '2-digit';
		if (this.#timePrecision === TimePrecisions.second) options.second = '2-digit';

		return DateTimeFormat({ dateTime, locale: this.#locale, options });
	}

	private renderPanel(): void {
		if (!this.#panelEl || !this.#bodyEl) return;

		this.#panelEl.dataset.view = this.#view;
		this.#dual = this.canBeDual() && window.matchMedia(`(min-width: ${DUAL_MIN_VIEWPORT}px)`).matches;
		this.#panelEl.dataset.dual = this.#dual ? 'true' : 'false';

		if (this.#view === 'days') {
			this.renderDays();
		} else if (this.#view === 'months') {
			this.renderMonths();
		} else {
			this.renderYears();
		}

		this.renderHeader();
		this.renderTime();
		if (this.#applyEl) this.#applyEl.textContent = Locale.translate('Apply', this.#locale);
		if (this.#footerClearEl) this.#footerClearEl.textContent = Locale.translate('Clear', this.#locale);
		this.#panelEl.setAttribute('aria-label', Locale.translate('ChooseDate', this.#locale));
		this.syncApplyButton();
		this.#tippy?.popperInstance?.update?.();
	}

	private renderHeader(): void {
		if (!this.#titleEl || !this.#prevEl || !this.#nextEl) return;

		let title = '';
		let prevDisabled = false;
		let nextDisabled = false;

		let title2 = '';

		if (this.#view === 'days') {
			const monthTitle = this.intl({ month: 'long', year: 'numeric' });
			const first: DateParts = { year: this.#viewYear, month: this.#viewMonth, day: 1 };
			title = monthTitle.format(toLocalDate(first));
			if (this.#dual) title2 = monthTitle.format(toLocalDate(addMonths(first, 1)));
			const prevMonthEnd = addDays(first, -1);
			const nextMonthStart = addMonths(first, this.#dual ? 2 : 1);
			prevDisabled = !!this.#min && compareDates(prevMonthEnd, this.#min) < 0;
			nextDisabled = !!this.#max && compareDates(nextMonthStart, this.#max) > 0;
		} else if (this.#view === 'months') {
			title = this.intl({ year: 'numeric' }).format(toLocalDate({ year: this.#viewYear, month: 1, day: 1 }));
			prevDisabled = !!this.#min && this.#viewYear - 1 < this.#min.year;
			nextDisabled = !!this.#max && this.#viewYear + 1 > this.#max.year;
		} else {
			const start = yearPageStart(this.#viewYear);
			title = `${start} – ${start + YEARS_PER_PAGE - 1}`;
			prevDisabled = !!this.#min && start - 1 < this.#min.year;
			nextDisabled = !!this.#max && start + YEARS_PER_PAGE > this.#max.year;
		}

		this.#titleEl.textContent = capitalizeFirst(title);
		const clickable = this.#monthYearNavigation && this.#view !== 'years';
		this.#titleEl.disabled = !clickable || !this.#enabled;
		this.#titleEl.dataset.clickable = clickable ? 'true' : 'false';
		if (clickable) {
			this.#titleEl.setAttribute('aria-label', `${title}, ${this.#view === 'days' ? 'choose month' : 'choose year'}`);
		} else {
			this.#titleEl.removeAttribute('aria-label');
		}

		if (this.#title2El) {
			// Second month's title, only while two calendars are on screen.
			this.#title2El.hidden = !title2;
			this.#title2El.textContent = capitalizeFirst(title2);
			this.#title2El.disabled = !clickable || !this.#enabled;
			this.#title2El.dataset.clickable = clickable ? 'true' : 'false';
			if (clickable && title2) {
				this.#title2El.setAttribute('aria-label', `${title2}, choose month`);
			} else {
				this.#title2El.removeAttribute('aria-label');
			}
		}

		this.#prevEl.disabled = prevDisabled || !this.#enabled;
		this.#nextEl.disabled = nextDisabled || !this.#enabled;

		const unit = this.#view === 'days' ? 'Month' : this.#view === 'months' ? 'Year' : 'Years';
		this.#prevEl.setAttribute('aria-label', Locale.translate(`Previous${unit}`, this.#locale));
		this.#nextEl.setAttribute('aria-label', Locale.translate(`Next${unit}`, this.#locale));
	}

	private renderDays(): void {
		if (this.#dual) {
			// Two months side by side: days of the neighbouring months are left blank,
			// otherwise the same date would appear in both grids.
			const second = addMonths({ year: this.#viewYear, month: this.#viewMonth, day: 1 }, 1);
			this.#bodyEl!.replaceChildren(this.buildMonth(this.#viewYear, this.#viewMonth, true), this.buildMonth(second.year, second.month, true));
		} else {
			this.#bodyEl!.replaceChildren(this.buildMonth(this.#viewYear, this.#viewMonth, false));
		}
		this.decorateRange();
	}

	private buildMonth(year: number, month: number, hideOutside: boolean): HTMLDivElement {
		const grid = document.createElement('div');
		grid.className = 'datetimepicker-days';
		grid.setAttribute('role', 'grid');
		grid.setAttribute('aria-label', this.intl({ month: 'long', year: 'numeric' }).format(toLocalDate({ year, month, day: 1 })));

		const weekdayLong = this.intl({ weekday: 'long' });
		const weekdayShort = this.intl({ weekday: 'short' });
		const head = document.createElement('div');
		head.className = 'datetimepicker-weekdays';
		head.setAttribute('role', 'row');
		for (const iso of orderedWeekdays(this.#weekStart)) {
			// 2024-01-01 was a Monday.
			const ref = toLocalDate({ year: 2024, month: 1, day: iso });
			const cell = document.createElement('span');
			cell.className = 'datetimepicker-weekday';
			cell.setAttribute('role', 'columnheader');
			cell.setAttribute('aria-label', weekdayLong.format(ref));
			cell.textContent = weekdayShort.format(ref).replace(/\.$/, '').slice(0, 3);
			head.append(cell);
		}
		grid.append(head);

		const now = today();
		const fullLabel = this.intl({ dateStyle: 'full' });
		const cells = monthGrid(year, month, this.#weekStart);

		let row: HTMLDivElement | null = null;
		cells.forEach((cell, index) => {
			if (index % 7 === 0) {
				row = document.createElement('div');
				row.className = 'datetimepicker-week';
				row.setAttribute('role', 'row');
				grid.append(row);
			}

			if (hideOutside && cell.outside) {
				const blank = document.createElement('span');
				blank.className = 'datetimepicker-blank';
				blank.setAttribute('role', 'gridcell');
				blank.setAttribute('aria-hidden', 'true');
				row!.append(blank);
				return;
			}

			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'datetimepicker-day';
			button.dataset.cell = 'day';
			button.dataset.date = formatDate(cell.date);
			button.textContent = String(cell.date.day);
			button.setAttribute('role', 'gridcell');
			button.setAttribute('aria-label', fullLabel.format(toLocalDate(cell.date)));

			const selected = this.isSelected(cell.date);
			const blocked = this.isBlocked(cell.date);
			const disabled = blocked || !this.#enabled;
			button.dataset.blocked = blocked ? 'true' : 'false';
			const focused = sameDate(cell.date, this.#focusDate);

			button.dataset.outside = cell.outside ? 'true' : 'false';
			button.dataset.selected = selected ? 'true' : 'false';
			button.dataset.today = sameDate(cell.date, now) ? 'true' : 'false';
			button.dataset.weekend = isoWeekday(cell.date) >= 6 ? 'true' : 'false';
			button.setAttribute('aria-selected', selected ? 'true' : 'false');
			if (sameDate(cell.date, now)) button.setAttribute('aria-current', 'date');
			button.disabled = disabled;
			button.tabIndex = focused ? 0 : -1;

			row!.append(button);
		});

		return grid;
	}

	/**
	 * Range mode: marks start / end / middle days on the rendered grid. While only the
	 * start is picked, the day under the pointer (or keyboard focus) previews the end.
	 * Runs on every hover, so it only touches data attributes.
	 */
	private decorateRange(): void {
		if (this.#mode !== 'range' || this.#view !== 'days' || !this.#bodyEl) return;

		const [start, picked] = this.#selected;
		let from: DateParts | undefined = start;
		let to: DateParts | undefined = picked ?? (start && this.#hoverDate ? this.#hoverDate : start);
		if (from && to && compareDates(to, from) < 0) [from, to] = [to, from];
		const preview = !!start && !picked;

		for (const button of this.#bodyEl.querySelectorAll<HTMLButtonElement>('button[data-cell="day"]')) {
			const date = parseDate(button.dataset.date);
			const inRange = !!date && !!from && !!to && compareDates(date, from) >= 0 && compareDates(date, to) <= 0;
			const isStart = inRange && sameDate(date, from);
			const isEnd = inRange && sameDate(date, to);

			button.dataset.range = !inRange ? 'none' : isStart && isEnd ? 'single' : isStart ? 'start' : isEnd ? 'end' : 'middle';
			button.dataset.preview = preview && inRange ? 'true' : 'false';
			// Only real endpoints get the solid selected look; a previewed end stays light.
			const endpoint = (isStart || isEnd) && this.isSelected(date!);
			button.dataset.selected = endpoint ? 'true' : 'false';
			button.setAttribute('aria-selected', inRange && !preview ? 'true' : endpoint ? 'true' : 'false');
		}
	}

	/** Whether the selection touches the days `first`..`last` (month / year cells). */
	private selectionTouches(first: DateParts, last: DateParts): boolean {
		if (this.#mode === 'range' && this.#selected.length === 2) {
			const [start, end] = this.#selected;
			return compareDates(start, last) <= 0 && compareDates(end, first) >= 0;
		}
		return this.#selected.some((d) => compareDates(d, first) >= 0 && compareDates(d, last) <= 0);
	}

	private renderMonths(): void {
		const grid = document.createElement('div');
		grid.className = 'datetimepicker-grid datetimepicker-months';
		grid.setAttribute('role', 'grid');

		const short = this.intl({ month: 'short' });
		const long = this.intl({ month: 'long', year: 'numeric' });
		const now = today();

		for (let month = 1; month <= 12; month++) {
			const first: DateParts = { year: this.#viewYear, month, day: 1 };
			const last = addDays(addMonths(first, 1), -1);
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'datetimepicker-cell';
			button.dataset.cell = 'month';
			button.dataset.month = String(month);
			button.textContent = short.format(toLocalDate(first)).replace(/\.$/, '');
			button.setAttribute('role', 'gridcell');
			button.setAttribute('aria-label', long.format(toLocalDate(first)));
			button.dataset.selected = this.selectionTouches(first, last) ? 'true' : 'false';
			button.dataset.today = now.year === this.#viewYear && now.month === month ? 'true' : 'false';
			button.disabled = !this.#enabled || (!!this.#min && compareDates(last, this.#min) < 0) || (!!this.#max && compareDates(first, this.#max) > 0);
			button.tabIndex = month === this.#focusDate.month ? 0 : -1;
			grid.append(button);
		}

		this.#bodyEl!.replaceChildren(grid);
	}

	private renderYears(): void {
		const grid = document.createElement('div');
		grid.className = 'datetimepicker-grid datetimepicker-years';
		grid.setAttribute('role', 'grid');

		const start = yearPageStart(this.#viewYear);
		const now = today();

		for (let year = start; year < start + YEARS_PER_PAGE; year++) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'datetimepicker-cell';
			button.dataset.cell = 'year';
			button.dataset.year = String(year);
			button.textContent = String(year);
			button.setAttribute('role', 'gridcell');
			button.dataset.selected = this.selectionTouches({ year, month: 1, day: 1 }, { year, month: 12, day: 31 }) ? 'true' : 'false';
			button.dataset.today = now.year === year ? 'true' : 'false';
			button.disabled = !this.#enabled || (!!this.#min && year < this.#min.year) || (!!this.#max && year > this.#max.year);
			button.tabIndex = year === this.#focusDate.year ? 0 : -1;
			grid.append(button);
		}

		this.#bodyEl!.replaceChildren(grid);
	}

	private renderTime(): void {
		if (!this.#timeEl) return;
		this.#timeEl.hidden = this.#view !== 'days';
		this.fillTimeOptions();
	}

	private fillTimeOptions(): void {
		if (this.#hoursEl) {
			const hours = hourCandidates(this.#timePrecision, this.#timeStep, START_DEFAULT, END_DEFAULT, this.#timeFormat, this.#period);
			const selected = this.#time && periodOf(this.#time.hours) === this.#period ? this.#time.hours : null;
			// Once a date is picked the time is required, so no empty hour option then.
			fillSelect(this.#hoursEl, ensureIncluded(hours, selected, this.#timeFormat), selected, (h) => hourLabel(h, this.#timeFormat), selected == null);
		}

		if (this.#minutesEl) {
			const minutes = this.#time ? minuteCandidates(this.#time.hours, this.#timePrecision, this.#timeStep, START_DEFAULT, END_DEFAULT) : [];
			fillSelect(this.#minutesEl, ensureIncluded(minutes, this.#time?.minutes), this.#time?.minutes ?? null, pad, !this.#time);
		}

		if (this.#secondsEl) {
			const seconds = this.#time ? secondCandidates(this.#time.hours, this.#time.minutes, this.#timeStep, START_DEFAULT, END_DEFAULT) : [];
			fillSelect(this.#secondsEl, ensureIncluded(seconds, this.#time?.seconds), this.#time?.seconds ?? null, pad, !this.#time);
		}

		if (this.#periodEl) {
			this.#periodEl.value = this.#period;
		}

		this.syncTimeEnabled();
	}

	// ----------------------------------------------------------------- actions

	private pickDate(date: DateParts): void {
		if (this.isBlocked(date)) return;

		this.#clearPending = false;
		this.#focusDate = date;
		this.revealMonth(date);

		if (this.#mode === 'multiple') {
			const index = this.#selected.findIndex((d) => sameDate(d, date));
			if (index >= 0) {
				this.#selected.splice(index, 1);
			} else {
				this.#selected.push(date);
				this.#selected.sort(compareDates);
			}
		} else if (this.#mode === 'range') {
			// First click (or a click after a full range) starts a new range; the second
			// click ends it, in either direction. The same day twice is a one-day range.
			const [start, end] = this.#selected;
			if (!start || end) {
				this.#selected = [date];
			} else {
				this.#selected = compareDates(date, start) < 0 ? [date, start] : [start, date];
			}
			this.#hoverDate = null;
		} else {
			this.#selected = [date];
			if (this.#hasTime && !this.#time) {
				this.#time = { ...START_DEFAULT };
				this.#period = periodOf(this.#time.hours);
			}
		}

		this.renderPanel();
		this.changed();

		// A single date with no time, or a finished range, closes right away unless it still needs Apply.
		const done = this.#mode === 'single' ? !this.#hasTime : this.#mode === 'range' && this.#selected.length === 2;
		if (done && !this.#inline && !this.#hasApplyButton) {
			this.close();
			this.#triggerEl?.focus();
		} else {
			this.focusActiveCell();
		}
	}

	private setTime(next: TimeParts | null): void {
		if (next) this.#clearPending = false;
		this.#time = next;
		if (next) this.#period = periodOf(next.hours);

		// A time picked before a date applies to the focused day.
		const focusDay = clampDate(this.#focusDate, this.#min, this.#max);
		if (next && this.#selected.length === 0 && !this.isBlocked(focusDay)) {
			this.#selected = [focusDay];
			this.renderPanel();
		} else {
			this.fillTimeOptions();
		}

		this.changed();
	}

	/** The clear control acts on the committed value right away, Apply button or not. */
	private clear(): void {
		const hadValue = this.#committedSelected.length > 0;
		this.#selected = [];
		this.#time = null;
		this.#clearPending = false;
		this.renderPanel();
		this.commit();
		if (hadValue) this.#actions?.OnClear?.();
	}

	/** After every draft edit: commit at once, or wait for the Apply button (or for a range's end). */
	private changed(): void {
		if (this.#hasApplyButton || !this.isComplete()) {
			this.syncApplyButton();
		} else {
			this.commit();
		}
	}

	/** Draft → committed, then refresh the trigger and emit Change if the value differs. */
	private commit(): void {
		this.#committedSelected = [...this.#selected];
		this.#committedTime = this.#time ? { ...this.#time } : null;
		this.renderTrigger();
		this.reflectState();
		this.emit();
		this.syncApplyButton();
	}

	/** Drop an unapplied draft and show the committed value again. */
	private discard(): void {
		this.#hoverDate = null;
		this.#clearPending = false;
		if (!this.isDirty()) return;
		this.#selected = [...this.#committedSelected];
		this.#time = this.#committedTime ? { ...this.#committedTime } : null;
		if (this.#time) this.#period = periodOf(this.#time.hours);
		this.renderPanel();
	}

	private isDirty(): boolean {
		return serializeValue(this.#selected, this.#time, this.#mode, this.#hasTime) !== this.serialize();
	}

	/** False only in range mode while the start is picked but not the end. */
	private isComplete(): boolean {
		return !this.isPickingRangeEnd();
	}

	private isPickingRangeEnd(): boolean {
		return this.#mode === 'range' && this.#selected.length === 1;
	}

	/** Time dropdowns only exist in single mode. */
	private usesTime(): boolean {
		return this.#hasTime && this.#mode === 'single';
	}

	private syncApplyButton(): void {
		if (this.#footerClearEl) this.#footerClearEl.disabled = !this.#enabled || this.#selected.length === 0;
		if (!this.#applyEl) return;
		this.#applyEl.disabled = !this.#enabled || !this.isDirty() || !this.isComplete();
	}

	/** Committed value as the JSON the block deserializes into a DateTime List. */
	private serialize(): string {
		return serializeValue(this.#committedSelected, this.#committedTime, this.#mode, this.#hasTime);
	}

	private emit(): void {
		const value = this.serialize();
		if (value === this.#lastEmitted) return;
		this.#lastEmitted = value;
		this.#actions?.OnChange(value);
	}

	// -------------------------------------------------------------- navigation

	private page(direction: 1 | -1): void {
		if (this.#view === 'days') {
			const next = addMonths({ year: this.#viewYear, month: this.#viewMonth, day: 1 }, direction);
			this.#viewYear = next.year;
			this.#viewMonth = next.month;
			this.#focusDate = clampDate(this.focusInView(), this.#min, this.#max);
		} else if (this.#view === 'months') {
			this.#viewYear += direction;
		} else {
			this.#viewYear += direction * YEARS_PER_PAGE;
		}
		const focused = document.activeElement;
		this.renderPanel();
		// Paging up to MinDate / MaxDate disables the arrow that has focus; move focus into the grid.
		if ((focused === this.#prevEl || focused === this.#nextEl) && (focused as HTMLButtonElement).disabled) {
			this.focusActiveCell();
		}
	}

	private setView(view: View, focus = true): void {
		this.#view = view;
		if (view !== 'days') {
			this.#focusDate = { ...this.#focusDate, year: this.#viewYear, month: view === 'months' ? this.#focusDate.month : this.#viewMonth };
		}
		this.renderPanel();
		if (focus) this.focusActiveCell();
	}

	/** Focus date carried into the current view month, keeping the day where possible. */
	private focusInView(): DateParts {
		const day = Math.min(this.#focusDate.day, addDays(addMonths({ year: this.#viewYear, month: this.#viewMonth, day: 1 }, 1), -1).day);
		return { year: this.#viewYear, month: this.#viewMonth, day };
	}

	/**
	 * Moves keyboard focus to `date`. When that day is in the Disabled list, keeps
	 * stepping by `step` days to the next available one (up to a year), so arrow keys
	 * jump over disabled days instead of getting stuck on them.
	 */
	private moveFocus(date: DateParts, step: number): void {
		let target = clampDate(date, this.#min, this.#max);
		for (let i = 0; i < 366 && this.isBlocked(target); i++) {
			const candidate = addDays(target, step);
			if (!inDateRange(candidate, this.#min, this.#max)) break;
			target = candidate;
		}
		this.#focusDate = target;
		if (this.isPickingRangeEnd()) this.#hoverDate = target;
		this.revealMonth(target);
		this.renderPanel();
		this.focusActiveCell();
	}

	/**
	 * Scrolls the calendar so `date` is visible. With two calendars, a day in the
	 * right-hand month leaves the view alone; a later day puts its month on the right.
	 */
	private revealMonth(date: DateParts): void {
		const first: DateParts = { year: this.#viewYear, month: this.#viewMonth, day: 1 };
		const target: DateParts = { year: date.year, month: date.month, day: 1 };
		const shown = this.#dual ? 2 : 1;
		const offset = (target.year - first.year) * 12 + (target.month - first.month);
		if (offset >= 0 && offset < shown) return;
		const start = offset < 0 ? target : addMonths(target, 1 - shown);
		this.#viewYear = start.year;
		this.#viewMonth = start.month;
	}

	/** Range mode with RangeTwoCalendars; the viewport still has to be wide enough. */
	private canBeDual(): boolean {
		return this.#mode === 'range' && this.#rangeTwoCalendars;
	}

	private handleDaysKey(event: KeyboardEvent): void {
		const from = this.#focusDate;
		const weekday = isoWeekday(from);
		const column = (weekday - this.#weekStart + 7) % 7;
		const rtl = !!window.SapphireRWALibrary?.State?.isRTL;
		let next: DateParts | null = null;
		// Direction to keep moving in when the target day is disabled.
		let step = 1;

		switch (event.key) {
			case 'ArrowLeft':
				step = rtl ? 1 : -1;
				next = addDays(from, step);
				break;
			case 'ArrowRight':
				step = rtl ? -1 : 1;
				next = addDays(from, step);
				break;
			case 'ArrowUp':
				step = -7;
				next = addDays(from, step);
				break;
			case 'ArrowDown':
				step = 7;
				next = addDays(from, step);
				break;
			case 'Home':
				next = addDays(from, -column);
				break;
			case 'End':
				step = -1;
				next = addDays(from, 6 - column);
				break;
			case 'PageUp':
				next = addMonths(from, event.shiftKey ? -12 : -1);
				break;
			case 'PageDown':
				next = addMonths(from, event.shiftKey ? 12 : 1);
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				this.pickDate(from);
				return;
			default:
				return;
		}

		event.preventDefault();
		this.moveFocus(next, step);
	}

	private handleGridKey(event: KeyboardEvent): void {
		const isMonths = this.#view === 'months';
		const rtl = !!window.SapphireRWALibrary?.State?.isRTL;
		const current = isMonths ? this.#focusDate.month : this.#focusDate.year;
		let delta = 0;

		switch (event.key) {
			case 'ArrowLeft':
				delta = rtl ? 1 : -1;
				break;
			case 'ArrowRight':
				delta = rtl ? -1 : 1;
				break;
			case 'ArrowUp':
				delta = -GRID_COLUMNS_MONTHS;
				break;
			case 'ArrowDown':
				delta = GRID_COLUMNS_MONTHS;
				break;
			case 'Enter':
			case ' ': {
				event.preventDefault();
				const cell = this.#bodyEl?.querySelector<HTMLButtonElement>('button[tabindex="0"]');
				cell?.click();
				return;
			}
			default:
				return;
		}

		event.preventDefault();

		if (isMonths) {
			const moved = addMonths({ year: this.#viewYear, month: current, day: 1 }, delta);
			this.#viewYear = moved.year;
			this.#focusDate = { ...this.#focusDate, year: moved.year, month: moved.month };
		} else {
			const year = current + delta;
			this.#viewYear = year;
			this.#focusDate = { ...this.#focusDate, year };
		}

		this.renderPanel();
		this.focusActiveCell();
	}

	private focusActiveCell(): void {
		const cell = this.#bodyEl?.querySelector<HTMLButtonElement>('button[tabindex="0"]:not(:disabled)') ?? this.#bodyEl?.querySelector<HTMLButtonElement>('button:not(:disabled)');
		cell?.focus({ preventScroll: true });
	}

	// ------------------------------------------------------------- open/close

	private toggle(): void {
		if (this.#isOpen) {
			this.close();
		} else {
			this.open(false);
		}
	}

	private open(focusGrid: boolean): void {
		if (this.#isOpen || !this.#enabled || this.#inline) return;

		this.#isOpen = true;
		this.#view = 'days';
		const anchor = clampDate(this.#selected[0] ?? today(), this.#min, this.#max);
		this.#focusDate = anchor;
		this.#viewYear = anchor.year;
		this.#viewMonth = anchor.month;
		this.renderPanel();

		// Tippy may load after the block was created; attach it on first open then.
		if (!this.#tippy) this.initTippy();
		this.#triggerEl?.setAttribute('aria-expanded', 'true');
		this.#tippy?.show();

		if (focusGrid) {
			window.requestAnimationFrame(() => this.focusActiveCell());
		}
	}

	private close(): void {
		if (!this.#isOpen) return;
		this.#isOpen = false;
		this.#triggerEl?.setAttribute('aria-expanded', 'false');
		this.#tippy?.hide();
		// Closing without Apply (outside click, Escape, Tab away) drops the draft,
		// and so does closing on a range that only has its start.
		if (this.#hasApplyButton || !this.isComplete()) this.discard();
	}

	// ------------------------------------------------------------------- state

	/** Inside the widget root or the calendar popup (which lives in <body>, wrapped by Tippy's focusable box). */
	private containsNode(node: Node | null): boolean {
		return !!node && (this.widgetEl.contains(node) || !!this.#panelEl?.contains(node) || !!this.#tippy?.popper.contains(node));
	}

	/**
	 * Undo the focus loss caused by pressing a disabled control (see onPointerDown):
	 * put focus back where it was so the keyboard keeps working and no Blur fires.
	 */
	private restoreFocusAfterDisabledPress(event: FocusEvent): boolean {
		if (!this.#pressOnDisabled) return false;
		const previous = event.target as HTMLElement;
		window.setTimeout(() => {
			if (previous.isConnected && !previous.matches(':disabled')) {
				previous.focus({ preventScroll: true });
			} else if (this.#isOpen || this.#inline) {
				this.focusActiveCell();
			} else {
				this.#triggerEl?.focus({ preventScroll: true });
			}
		}, 0);
		return true;
	}

	/** Outside MinDate / MaxDate, or listed in the Disabled input. */
	private isBlocked(date: DateParts): boolean {
		return !inDateRange(date, this.#min, this.#max) || this.#disabledDays.has(formatDate(date));
	}

	private isSelected(date: DateParts): boolean {
		return this.#selected.some((d) => sameDate(d, date));
	}

	private intl(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
		try {
			return new Intl.DateTimeFormat(this.#locale, options);
		} catch {
			return new Intl.DateTimeFormat('en-US', options);
		}
	}

	private syncEnabled(): void {
		if (this.#triggerEl) {
			this.#triggerEl.tabIndex = this.#enabled ? 0 : -1;
			this.#triggerEl.setAttribute('aria-disabled', this.#enabled ? 'false' : 'true');
		}
		// Hidden by CSS while disabled; also keep it out of the tab order.
		if (this.#clearEl) this.#clearEl.tabIndex = this.#enabled ? 0 : -1;
		if (!this.#enabled) this.close();
		this.syncTimeEnabled();
		this.syncApplyButton();
	}

	private syncTimeEnabled(): void {
		const disabled = !this.#enabled;
		if (this.#hoursEl) this.#hoursEl.disabled = disabled;
		if (this.#periodEl) this.#periodEl.disabled = disabled;
		if (this.#minutesEl) this.#minutesEl.disabled = disabled || !this.#time;
		if (this.#secondsEl) this.#secondsEl.disabled = disabled || !this.#time;
	}

	private reflectState(): void {
		const ds = this.widgetEl.dataset;
		ds.enabled = this.#enabled ? 'true' : 'false';
		ds.isvalid = this.#isValid ? 'true' : 'false';
		ds.hasvalue = this.#committedSelected.length > 0 ? 'true' : 'false';
		ds.hasapply = this.#hasApplyButton ? 'true' : 'false';
		ds.hastime = this.usesTime() ? 'true' : 'false';
		ds.hasclear = this.#hasClear ? 'true' : 'false';
		ds.inline = this.#inline ? 'true' : 'false';
		ds.mode = this.#mode;
		ds.density = this.#density;
		// The popup lives in <body>, so it carries its own copy for styling.
		if (this.#panelEl) this.#panelEl.dataset.density = this.#density;
		ds.theme = this.#theme;
	}

	private hasLiveDom(): boolean {
		return !!this.#panelEl && (this.#inline ? this.#panelEl.parentElement === this.widgetEl : this.#triggerEl?.parentElement === this.widgetEl);
	}

	private bindEvents(): void {
		// Focus tracking for OnBlur. An inline panel sits inside widgetEl, so only a popup needs its own listeners.
		for (const target of this.focusScopes()) {
			target.addEventListener('focusin', this.onFocusIn);
			target.addEventListener('focusout', this.onFocusOut);
			target.addEventListener('mousedown', this.onMouseDown);
			target.addEventListener('pointerdown', this.onPointerDown, true);
		}
		this.#triggerEl?.addEventListener('click', this.onTriggerClick);
		this.#triggerEl?.addEventListener('keydown', this.onTriggerKeyDown);
		this.#clearEl?.addEventListener('click', this.onClearClick);
		this.#clearEl?.addEventListener('keydown', this.onClearKeyDown);
		this.#prevEl?.addEventListener('click', this.onPrevClick);
		this.#nextEl?.addEventListener('click', this.onNextClick);
		this.#titleEl?.addEventListener('click', this.onTitleClick);
		this.#title2El?.addEventListener('click', this.onTitle2Click);
		this.#bodyEl?.addEventListener('click', this.onBodyClick);
		this.#bodyEl?.addEventListener('keydown', this.onBodyKeyDown);
		this.#bodyEl?.addEventListener('mouseover', this.onBodyMouseOver);
		this.#bodyEl?.addEventListener('mouseleave', this.onBodyMouseLeave);
		this.#panelEl?.addEventListener('keydown', this.onPanelKeyDown);
		this.#panelEl?.addEventListener('focusout', this.onPanelFocusOut);
		this.#hoursEl?.addEventListener('change', this.onHoursChange);
		this.#minutesEl?.addEventListener('change', this.onMinutesChange);
		this.#secondsEl?.addEventListener('change', this.onSecondsChange);
		this.#periodEl?.addEventListener('change', this.onPeriodChange);
		this.#applyEl?.addEventListener('click', this.onApplyClick);
		this.#footerClearEl?.addEventListener('click', this.onFooterClearClick);
	}

	private focusScopes(): HTMLElement[] {
		return this.#panelEl && !this.#inline ? [this.widgetEl, this.#panelEl] : [this.widgetEl];
	}

	private unbindEvents(): void {
		for (const target of this.focusScopes()) {
			target.removeEventListener('focusin', this.onFocusIn);
			target.removeEventListener('focusout', this.onFocusOut);
			target.removeEventListener('mousedown', this.onMouseDown);
			target.removeEventListener('pointerdown', this.onPointerDown, true);
		}
		this.#triggerEl?.removeEventListener('click', this.onTriggerClick);
		this.#triggerEl?.removeEventListener('keydown', this.onTriggerKeyDown);
		this.#clearEl?.removeEventListener('click', this.onClearClick);
		this.#clearEl?.removeEventListener('keydown', this.onClearKeyDown);
		this.#prevEl?.removeEventListener('click', this.onPrevClick);
		this.#nextEl?.removeEventListener('click', this.onNextClick);
		this.#titleEl?.removeEventListener('click', this.onTitleClick);
		this.#title2El?.removeEventListener('click', this.onTitle2Click);
		this.#bodyEl?.removeEventListener('click', this.onBodyClick);
		this.#bodyEl?.removeEventListener('keydown', this.onBodyKeyDown);
		this.#bodyEl?.removeEventListener('mouseover', this.onBodyMouseOver);
		this.#bodyEl?.removeEventListener('mouseleave', this.onBodyMouseLeave);
		this.#panelEl?.removeEventListener('keydown', this.onPanelKeyDown);
		this.#panelEl?.removeEventListener('focusout', this.onPanelFocusOut);
		this.#hoursEl?.removeEventListener('change', this.onHoursChange);
		this.#minutesEl?.removeEventListener('change', this.onMinutesChange);
		this.#secondsEl?.removeEventListener('change', this.onSecondsChange);
		this.#periodEl?.removeEventListener('change', this.onPeriodChange);
		this.#applyEl?.removeEventListener('click', this.onApplyClick);
		this.#footerClearEl?.removeEventListener('click', this.onFooterClearClick);
	}

	private teardown(): void {
		this.unbindEvents();
		this.#isOpen = false;
		this.#tippy?.destroy();
		this.#tippy = null;
		this.#validationMessageCtrl?.destroy();
		this.#validationMessageCtrl = undefined;
		this.#triggerEl = null;
		this.#valueEl = null;
		this.#clearEl = null;
		this.#panelEl = null;
		this.#prevEl = null;
		this.#nextEl = null;
		this.#titleEl = null;
		this.#title2El = null;
		this.#bodyEl = null;
		this.#timeEl = null;
		this.#hoursEl = null;
		this.#minutesEl = null;
		this.#secondsEl = null;
		this.#periodEl = null;
		this.#applyEl = null;
		this.#footerClearEl = null;
	}
}

/**
 * JSON array of ISO DateTimes for the block's JSON Deserialize into a DateTime List.
 * Empty → `[]`; single → one item; multiple → one item per day; range → start and
 * end (equal for a one-day range). Multiple and range days are local midnight.
 */
function serializeValue(selected: DateParts[], time: TimeParts | null, mode: Mode, hasTime: boolean): string {
	if (mode !== 'single') {
		return JSON.stringify(selected.map((date) => toIsoDateTime(date, null)));
	}
	const date = selected[0];
	if (!date) return '[]';
	return JSON.stringify([toIsoDateTime(date, hasTime ? time : null)]);
}

function resolveDensity(value: string | null | undefined): Density {
	const density = String(value ?? '')
		.trim()
		.toLowerCase();
	return (DENSITIES as readonly string[]).includes(density) ? (density as Density) : 'default';
}

function resolveMode(value: string | null | undefined): Mode {
	const mode = String(value ?? '')
		.trim()
		.toLowerCase();
	return (MODES as readonly string[]).includes(mode) ? (mode as Mode) : 'single';
}

function resolveLocale(locale: string | null | undefined): string {
	if (locale != null && String(locale).trim() !== '') return String(locale);
	const stateLocale = window.SapphireRWALibrary?.State?.locale;
	if (stateLocale != null && String(stateLocale).trim() !== '') return String(stateLocale);
	return 'en-US';
}

function normalizeWeekStart(value: number | null | undefined): number {
	const day = Number(value);
	return Number.isInteger(day) && day >= 1 && day <= 7 ? day : 1;
}

// CSS `capitalize` would also upper-case words like "de" in "novembro de 2026".
function capitalizeFirst(text: string): string {
	return text ? text.charAt(0).toLocaleUpperCase() + text.slice(1) : text;
}

function createSeparator(): HTMLSpanElement {
	const sep = document.createElement('span');
	sep.className = 'datetimepicker-sep';
	sep.setAttribute('aria-hidden', 'true');
	sep.textContent = ':';
	return sep;
}

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

function fillSelect(select: HTMLSelectElement, values: number[], selected: number | null, label: (value: number) => string, allowEmpty: boolean): void {
	select.replaceChildren();

	if (allowEmpty) {
		const empty = document.createElement('option');
		empty.value = '';
		select.append(empty);
	}

	for (const value of values) {
		const option = document.createElement('option');
		option.value = String(value);
		option.textContent = label(value);
		select.append(option);
	}

	select.value = selected == null ? '' : String(selected);
}
