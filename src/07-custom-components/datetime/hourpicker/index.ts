import { BaseComponent, type BaseComponentInit } from '@core/base';
import { resolveSapphireSize, SapphireSizes, type SapphireSize } from '@utils/size';
import { ValidationMessage } from '@utils/validation-message';
import {
	alignToHour,
	alignToMinute,
	ensureIncluded,
	END_DEFAULT,
	formatDisplay,
	formatTime,
	hourCandidates,
	hourLabel,
	maskTyped,
	minuteCandidates,
	parseDisplay,
	parseTime,
	periodOf,
	placeholderFor,
	resolveBound,
	resolveEnd,
	resolveStep,
	resolveTimeFormat,
	resolveTimePrecision,
	secondCandidates,
	snapToRange,
	START_DEFAULT,
	to24Hour,
	hour12,
	TimeFormats,
	TimePrecisions,
	type Period,
	type TimeFormat,
	type TimeParts,
	type TimePrecision,
} from './time';

interface IHourPicker extends BaseComponentInit {
	actions: {
		OnChange: (value: string) => void;
	};
	enabled: boolean;
	end: string;
	isValid: boolean;
	size: SapphireSize;
	start: string;
	step: number;
	theme: string;
	timeFormat: TimeFormat;
	timePrecision: TimePrecision;
	useInput: boolean;
	validationMessage: string;
	value: string;
}

export default class HourPicker extends BaseComponent {
	#actions!: IHourPicker['actions'];
	#componentEl: HTMLDivElement | null = null;
	#enabled = true;
	#end: TimeParts = END_DEFAULT;
	#hoursEl: HTMLSelectElement | null = null;
	#inputEl: HTMLInputElement | null = null;
	#isValid = true;
	#minutesEl: HTMLSelectElement | null = null;
	#period: Period = 'am';
	#periodEl: HTMLSelectElement | null = null;
	#secondsEl: HTMLSelectElement | null = null;
	#size: SapphireSize = SapphireSizes.M;
	#start: TimeParts = START_DEFAULT;
	#step = 30;
	#theme = '';
	#timeFormat: TimeFormat = TimeFormats.h24;
	#timePrecision: TimePrecision = TimePrecisions.minute;
	#useInput = false;
	#validationMessage = '';
	#validationMessageCtrl: ValidationMessage | undefined;
	#value: TimeParts | null = null;

	private readonly onInput = (): void => {
		if (!this.#inputEl) {
			return;
		}

		const caret = this.#inputEl.selectionStart ?? this.#inputEl.value.length;
		const previous = this.#inputEl.value;
		const masked = maskTyped(previous, this.#timeFormat, this.#timePrecision);

		if (masked !== previous) {
			this.#inputEl.value = masked;
			const nextCaret = Math.max(0, Math.min(caret + (masked.length - previous.length), masked.length));
			try {
				this.#inputEl.setSelectionRange(nextCaret, nextCaret);
			} catch {
				// setSelectionRange throws on inputs that don't support it
			}
		}
	};

	private readonly onBlur = (): void => {
		this.commitInput();
	};

	private readonly onHoursChange = (): void => {
		if (!this.#hoursEl) {
			return;
		}

		const raw = this.#hoursEl.value;
		if (raw === '') {
			this.setValue(null, true);
			this.fillDependentOptions();
			this.syncSelects();
			return;
		}

		const next = alignToHour(Number(raw), this.#value, this.#timePrecision, this.#step, this.#start, this.#end);
		if (!next) {
			this.syncSelects();
			return;
		}

		this.setValue(next, true);
		this.fillDependentOptions();
		this.syncSelects();
	};

	private readonly onMinutesChange = (): void => {
		if (!this.#minutesEl || this.#value == null) {
			this.syncSelects();
			return;
		}

		const raw = this.#minutesEl.value;
		if (raw === '') {
			this.setValue(null, true);
			this.syncSelects();
			return;
		}

		const minute = Number(raw);
		const next = this.#timePrecision === TimePrecisions.second ? alignToMinute(this.#value.hours, minute, this.#value, this.#step, this.#start, this.#end) : { hours: this.#value.hours, minutes: minute, seconds: 0 };

		if (!next) {
			this.syncSelects();
			return;
		}

		this.setValue(next, true);
		this.fillSecondsOptions();
		this.syncSelects();
	};

	private readonly onSecondsChange = (): void => {
		if (!this.#secondsEl || this.#value == null) {
			this.syncSelects();
			return;
		}

		const raw = this.#secondsEl.value;
		if (raw === '') {
			this.setValue(null, true);
			this.syncSelects();
			return;
		}

		this.setValue({ hours: this.#value.hours, minutes: this.#value.minutes, seconds: Number(raw) }, true);
	};

	private readonly onPeriodChange = (): void => {
		if (!this.#periodEl) {
			return;
		}

		const period = this.#periodEl.value === 'pm' ? 'pm' : 'am';
		const hoursForPeriod = hourCandidates(this.#timePrecision, this.#step, this.#start, this.#end, this.#timeFormat, period);
		if (hoursForPeriod.length === 0) {
			this.syncPeriod();
			return;
		}

		if (this.#value == null) {
			this.#period = period;
			if (!this.#useInput) {
				this.fillHourOptions();
				this.syncSelects();
			}
			return;
		}

		const preferred = to24Hour(hour12(this.#value.hours), period);
		const hour = hoursForPeriod.includes(preferred) ? preferred : hoursForPeriod[0];
		const next = alignToHour(hour, this.#value, this.#timePrecision, this.#step, this.#start, this.#end);
		if (!next) {
			this.syncPeriod();
			return;
		}

		this.#period = period;
		this.setValue(next, true);
		if (!this.#useInput) {
			this.fillOptions();
			this.syncSelects();
		} else {
			this.syncValueToDom();
		}
	};

	constructor(config: IHourPicker) {
		super(config);

		if (!this.widgetEl) {
			console.warn('HourPicker: root element not found for runtimeId', config.runtimeId);
			return;
		}

		this.#actions = config.actions;
		this.applyConfig(config, { rebuild: true, syncValue: true });
	}

	parametersChanged(payload: IHourPicker): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) {
			return;
		}

		if (this.widgetEl !== liveEl) {
			this.teardown();
			this.widgetEl = liveEl;
			this.applyConfig(payload, { rebuild: true, syncValue: payload.value !== undefined });
			return;
		}

		this.applyConfig(payload, {
			rebuild: this.needsRebuild(payload) || !this.hasLiveDom(),
			syncValue: payload.value !== undefined,
		});
	}

	destroy(): void {
		this.teardown();
		this.widgetEl?.replaceChildren();
		super.destroy();
	}

	private applyConfig(payload: Partial<IHourPicker>, options: { rebuild: boolean; syncValue: boolean }): void {
		if (payload.actions) {
			this.#actions = payload.actions;
		}

		if (payload.enabled !== undefined) {
			this.#enabled = Boolean(payload.enabled);
		}

		if (payload.isValid !== undefined) {
			this.#isValid = Boolean(payload.isValid);
		}

		if (payload.validationMessage !== undefined) {
			this.#validationMessage = String(payload.validationMessage ?? '');
		}

		if (payload.size !== undefined) {
			this.#size = resolveSapphireSize(payload.size);
		}

		if (payload.theme !== undefined) {
			this.#theme = String(payload.theme ?? '');
		}

		if (payload.timeFormat !== undefined) {
			this.#timeFormat = resolveTimeFormat(payload.timeFormat);
		}

		if (payload.timePrecision !== undefined) {
			this.#timePrecision = resolveTimePrecision(payload.timePrecision);
		}

		if (payload.useInput !== undefined) {
			this.#useInput = Boolean(payload.useInput);
		}

		if (payload.start !== undefined) {
			this.#start = resolveBound(payload.start, START_DEFAULT);
		}

		if (payload.end !== undefined) {
			this.#end = resolveEnd(payload.end);
		}

		if (payload.step !== undefined || payload.timePrecision !== undefined) {
			this.#step = resolveStep(payload.step ?? this.#step, this.#timePrecision);
		}

		if (options.syncValue && payload.value !== undefined) {
			this.#value = parseTime(payload.value);
			if (this.#value) {
				this.#period = periodOf(this.#value.hours);
			}
		}

		this.ensurePeriodHasHours();

		if (options.rebuild || !this.hasLiveDom()) {
			this.rebuild();
		} else {
			if (!this.#useInput) {
				this.fillOptions();
			}
			this.syncEnabled();
			if (options.syncValue || !this.inputIsFocused()) {
				this.syncValueToDom();
			}
		}

		this.reflectState();
		this.#validationMessageCtrl?.update(this.#isValid, this.#validationMessage);
	}

	private needsRebuild(payload: Partial<IHourPicker>): boolean {
		if (payload.useInput !== undefined && Boolean(payload.useInput) !== this.#useInput) {
			return true;
		}
		if (payload.timeFormat !== undefined && resolveTimeFormat(payload.timeFormat) !== this.#timeFormat) {
			return true;
		}
		if (payload.timePrecision !== undefined && resolveTimePrecision(payload.timePrecision) !== this.#timePrecision) {
			return true;
		}
		return false;
	}

	private rebuild(): void {
		this.unbindEvents();

		this.widgetEl.classList.add('hourpicker');

		if (!this.#componentEl || this.#componentEl.parentElement !== this.widgetEl) {
			this.#componentEl = document.createElement('div');
			this.#componentEl.className = 'hourpicker-component';
			this.widgetEl.replaceChildren(this.#componentEl);
			this.#validationMessageCtrl?.destroy();
			this.#validationMessageCtrl = new ValidationMessage(this.widgetEl, 'append');
		}

		this.#componentEl.replaceChildren();
		this.#inputEl = null;
		this.#hoursEl = null;
		this.#minutesEl = null;
		this.#secondsEl = null;
		this.#periodEl = null;

		if (this.#useInput) {
			this.#inputEl = this.createInput();
			this.#componentEl.append(this.#inputEl);
		} else {
			this.#hoursEl = this.createSelect('hours', 'Hours');
			this.#componentEl.append(this.#hoursEl);

			if (this.#timePrecision !== TimePrecisions.hour) {
				this.#componentEl.append(this.createSeparator());
				this.#minutesEl = this.createSelect('minutes', 'Minutes');
				this.#componentEl.append(this.#minutesEl);
			}

			if (this.#timePrecision === TimePrecisions.second) {
				this.#componentEl.append(this.createSeparator());
				this.#secondsEl = this.createSelect('seconds', 'Seconds');
				this.#componentEl.append(this.#secondsEl);
			}
		}

		if (this.#timeFormat === TimeFormats.h12) {
			this.#periodEl = this.createPeriodSelect();
			this.#componentEl.append(this.#periodEl);
		}

		this.bindEvents();
		this.syncEnabled();
		this.syncValueToDom();
		this.reflectState();
	}

	private createInput(): HTMLInputElement {
		const input = document.createElement('input');
		input.className = 'form-control hourpicker-input';
		input.dataset.input = '';
		input.autocomplete = 'off';
		input.spellcheck = false;
		input.inputMode = 'numeric';
		input.name = `hourpicker-${this.runtimeId}`;
		input.setAttribute('aria-label', 'Time');
		input.placeholder = placeholderFor(this.#timeFormat, this.#timePrecision);
		return input;
	}

	private createSelect(kind: 'hours' | 'minutes' | 'seconds', label: string): HTMLSelectElement {
		const select = document.createElement('select');
		select.className = `form-control hourpicker-select hourpicker-${kind}`;
		select.name = `hourpicker-${kind}-${this.runtimeId}`;
		select.setAttribute('aria-label', label);
		return select;
	}

	private createPeriodSelect(): HTMLSelectElement {
		const select = document.createElement('select');
		select.className = 'form-control hourpicker-select hourpicker-period';
		select.name = `hourpicker-period-${this.runtimeId}`;
		select.setAttribute('aria-label', 'AM/PM');

		const am = document.createElement('option');
		am.value = 'am';
		am.textContent = 'AM';
		const pm = document.createElement('option');
		pm.value = 'pm';
		pm.textContent = 'PM';
		select.append(am, pm);
		return select;
	}

	private createSeparator(): HTMLSpanElement {
		const sep = document.createElement('span');
		sep.className = 'hourpicker-sep';
		sep.setAttribute('aria-hidden', 'true');
		sep.textContent = ':';
		return sep;
	}

	private fillOptions(): void {
		this.fillHourOptions();
		this.fillDependentOptions();
		this.syncPeriod();
	}

	private fillHourOptions(): void {
		if (!this.#hoursEl) {
			return;
		}

		const hours = hourCandidates(this.#timePrecision, this.#step, this.#start, this.#end, this.#timeFormat, this.#period);
		const selected = this.#value && periodOf(this.#value.hours) === this.#period ? this.#value.hours : null;
		this.fillSelect(this.#hoursEl, ensureIncluded(hours, selected, this.#timeFormat), selected, (hour) => hourLabel(hour, this.#timeFormat), true);
	}

	private fillDependentOptions(): void {
		this.fillMinuteOptions();
		this.fillSecondsOptions();
	}

	private fillMinuteOptions(): void {
		if (!this.#minutesEl) {
			return;
		}

		if (this.#value == null) {
			this.fillSelect(this.#minutesEl, [], null, padLabel, true);
			return;
		}

		const minutes = minuteCandidates(this.#value.hours, this.#timePrecision, this.#step, this.#start, this.#end);
		this.fillSelect(this.#minutesEl, ensureIncluded(minutes, this.#value.minutes), this.#value.minutes, padLabel, false);
	}

	private fillSecondsOptions(): void {
		if (!this.#secondsEl) {
			return;
		}

		if (this.#value == null) {
			this.fillSelect(this.#secondsEl, [], null, padLabel, true);
			return;
		}

		const seconds = secondCandidates(this.#value.hours, this.#value.minutes, this.#step, this.#start, this.#end);
		this.fillSelect(this.#secondsEl, ensureIncluded(seconds, this.#value.seconds), this.#value.seconds, padLabel, false);
	}

	private fillSelect(select: HTMLSelectElement, values: number[], selected: number | null, label: (value: number) => string, allowEmpty: boolean): void {
		select.replaceChildren();

		if (allowEmpty) {
			const empty = document.createElement('option');
			empty.value = '';
			empty.textContent = '';
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

	private syncValueToDom(): void {
		if (this.#inputEl) {
			this.#inputEl.value = formatDisplay(this.#value, this.#timeFormat, this.#timePrecision);
		} else {
			this.fillOptions();
			this.syncSelects();
		}
		this.syncPeriod();
	}

	private syncSelects(): void {
		if (this.#hoursEl) {
			this.#hoursEl.value = this.#value == null ? '' : String(this.#value.hours);
		}
		if (this.#minutesEl) {
			this.#minutesEl.value = this.#value == null ? '' : String(this.#value.minutes);
		}
		if (this.#secondsEl) {
			this.#secondsEl.value = this.#value == null ? '' : String(this.#value.seconds);
		}
	}

	private syncPeriod(): void {
		if (!this.#periodEl) {
			return;
		}
		if (this.#value) {
			this.#period = periodOf(this.#value.hours);
		}
		this.#periodEl.value = this.#period;
	}

	private syncEnabled(): void {
		const disabled = !this.#enabled;
		if (this.#inputEl) {
			this.#inputEl.disabled = disabled;
		}
		if (this.#hoursEl) {
			this.#hoursEl.disabled = disabled;
		}
		if (this.#minutesEl) {
			this.#minutesEl.disabled = disabled || this.#value == null;
		}
		if (this.#secondsEl) {
			this.#secondsEl.disabled = disabled || this.#value == null;
		}
		if (this.#periodEl) {
			this.#periodEl.disabled = disabled;
		}
	}

	private reflectState(): void {
		this.widgetEl.dataset.enabled = this.#enabled ? 'true' : 'false';
		this.widgetEl.dataset.isvalid = this.#isValid ? 'true' : 'false';
		this.widgetEl.dataset.useinput = this.#useInput ? 'true' : 'false';
		this.widgetEl.dataset.timeformat = this.#timeFormat;
		this.widgetEl.dataset.timeprecision = this.#timePrecision;
		this.widgetEl.dataset.hasvalue = this.#value ? 'true' : 'false';
		this.widgetEl.dataset.size = this.#size;
		this.widgetEl.dataset.theme = this.#theme;
	}

	private commitInput(): void {
		if (!this.#inputEl) {
			return;
		}

		const typed = this.#inputEl.value.trim();
		if (!typed) {
			this.setValue(null, true);
			this.syncValueToDom();
			return;
		}

		const parsed = parseDisplay(typed, this.#timeFormat, this.#timePrecision, this.#period);
		if (!parsed) {
			this.syncValueToDom();
			return;
		}

		this.setValue(snapToRange(parsed, this.#timePrecision, this.#step, this.#start, this.#end), true);
		this.syncValueToDom();
	}

	private setValue(next: TimeParts | null, emit: boolean): void {
		const previous = formatTime(this.#value);
		this.#value = next;
		if (next) {
			this.#period = periodOf(next.hours);
		}
		this.widgetEl.dataset.hasvalue = next ? 'true' : 'false';
		this.syncEnabled();

		const formatted = formatTime(next);
		if (emit && formatted !== previous) {
			this.#actions?.OnChange(formatted);
		}
	}

	private ensurePeriodHasHours(): void {
		if (this.#timeFormat !== TimeFormats.h12 || this.#value) {
			return;
		}

		const current = hourCandidates(this.#timePrecision, this.#step, this.#start, this.#end, this.#timeFormat, this.#period);
		if (current.length > 0) {
			return;
		}

		const other: Period = this.#period === 'am' ? 'pm' : 'am';
		if (hourCandidates(this.#timePrecision, this.#step, this.#start, this.#end, this.#timeFormat, other).length > 0) {
			this.#period = other;
		}
	}

	private inputIsFocused(): boolean {
		return !!this.#inputEl && document.activeElement === this.#inputEl;
	}

	private hasLiveDom(): boolean {
		return !!this.#componentEl?.isConnected && this.#componentEl.parentElement === this.widgetEl;
	}

	private bindEvents(): void {
		this.#inputEl?.addEventListener('input', this.onInput);
		this.#inputEl?.addEventListener('blur', this.onBlur);
		this.#hoursEl?.addEventListener('change', this.onHoursChange);
		this.#minutesEl?.addEventListener('change', this.onMinutesChange);
		this.#secondsEl?.addEventListener('change', this.onSecondsChange);
		this.#periodEl?.addEventListener('change', this.onPeriodChange);
	}

	private unbindEvents(): void {
		this.#inputEl?.removeEventListener('input', this.onInput);
		this.#inputEl?.removeEventListener('blur', this.onBlur);
		this.#hoursEl?.removeEventListener('change', this.onHoursChange);
		this.#minutesEl?.removeEventListener('change', this.onMinutesChange);
		this.#secondsEl?.removeEventListener('change', this.onSecondsChange);
		this.#periodEl?.removeEventListener('change', this.onPeriodChange);
	}

	private teardown(): void {
		this.unbindEvents();
		this.#validationMessageCtrl?.destroy();
	}
}

function padLabel(value: number): string {
	return String(value).padStart(2, '0');
}
