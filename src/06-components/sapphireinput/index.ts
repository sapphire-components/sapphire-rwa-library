import { BaseComponent, type BaseComponentInit } from '../../core/base';
import Helpers from '../../09-utils/helpers';

interface SapphireInputNumericOptions {
	DecimalScale: number;
	Max: string;
	Min: string;
	Step: number;
}

interface SapphireInputInit extends BaseComponentInit {
	actions: {
		OnChange: (value: string) => void;
		OnClear: () => void;
		OnEnterKey: () => void;
	};
	debounceChange: number;
	enabled: boolean;
	hasSteps: boolean;
	isValid: boolean;
	maxLength: number;
	numericOptions: SapphireInputNumericOptions;
	placeholder: string;
	theme: string;
	type: 'text' | 'integer' | 'decimal';
	value: string;
}

export default class SapphireInput extends BaseComponent {
	private actions!: SapphireInputInit['actions'];
	private clearEl!: HTMLElement;
	private commitValueDebounced!: (() => void) & { cancel: () => void };
	private debounceChange!: number;
	private decimalScale!: number;
	private inputEl!: HTMLInputElement;
	private isOutOfBounds = false;
	private isValid = true;
	private max: number | null = null;
	private maxLength = 0;
	private min: number | null = null;
	private minusEl!: HTMLDivElement;
	private plusEl!: HTMLDivElement;
	private step!: number;
	private type!: SapphireInputInit['type'];
	private validationMessageEl: HTMLElement | null = null;
	private value!: string;

	private readonly handleInput = (): void => {
		const caret = this.inputEl.selectionStart ?? this.inputEl.value.length;
		const previousDisplay = this.inputEl.value;

		const masked = this.maskValue(previousDisplay);
		const display = this.toDisplay(masked);

		if (display !== previousDisplay) {
			this.inputEl.value = display;
			const adjustedCaret = Math.max(0, Math.min(caret + (display.length - previousDisplay.length), display.length));
			try {
				this.inputEl.setSelectionRange(adjustedCaret, adjustedCaret);
			} catch {
				// setSelectionRange throws on inputs that don't support it; safe to ignore
			}
		}

		this.updateHasContent();

		// Masking/caret above must stay synchronous for typing to feel right.
		// Only the change emission (commitValue) is debounced.
		if (this.debounceChange > 0) {
			this.commitValueDebounced();
		} else {
			this.commitValue();
		}
	};

	private readonly handleBlur = (): void => {
		this.commitValueDebounced.cancel();
		this.commitValue();
	};

	private readonly handleClearClick = (event: Event): void => {
		event.preventDefault();
		this.actions?.OnClear();
	};

	private readonly handleClearKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter') {
			return;
		}
		this.handleClearClick(event);
	};

	private readonly handleKeyDown = (event: KeyboardEvent): void => {
		if (event.key === 'Enter') {
			// Flush any pending debounced change so OnEnterKey consumers
			// observe the latest value, not the previous keystroke's.
			this.commitValueDebounced.cancel();
			this.commitValue();
			this.actions?.OnEnterKey();
			return;
		}
		if (event.key === 'ArrowUp' && this.plusEl) {
			this.handlePlusClick(event);
			return;
		}
		if (event.key === 'ArrowDown' && this.minusEl) {
			this.handleMinusClick(event);
		}
	};

	private readonly handlePlusClick = (event: Event): void => {
		event.preventDefault();
		event.stopPropagation();

		const next = Number(this.value) + this.step;
		if (this.max !== null && next > this.max) {
			return;
		}

		this.commitValueDebounced.cancel();
		this.value = String(next);
		this.updateDisplayValue();
		this.updateHasContent();
		this.updateStepsButtons();
		this.actions?.OnChange(this.value);
	};

	private readonly handleMinusClick = (event: Event): void => {
		event.preventDefault();
		event.stopPropagation();

		const next = Number(this.value) - this.step;
		if (this.min !== null && next < this.min) {
			return;
		}

		this.commitValueDebounced.cancel();
		this.value = String(next);
		this.updateDisplayValue();
		this.updateHasContent();
		this.updateStepsButtons();
		this.actions?.OnChange(this.value);
	};

	private readonly handleStepKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter') {
			return;
		}

		if (event.currentTarget === this.plusEl) {
			this.handlePlusClick(event);
		} else if (event.currentTarget === this.minusEl) {
			this.handleMinusClick(event);
		}
	};

	constructor(init: SapphireInputInit) {
		super(init);

		if (!this.widgetEl) {
			console.warn('SapphireInput: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.clearEl = this.widgetEl.querySelector<HTMLElement>('.sapphireinput-clear')!;
		this.debounceChange = init.debounceChange;
		this.commitValueDebounced = Helpers.debounce(() => this.commitValue(), this.debounceChange);
		this.decimalScale = init.numericOptions.DecimalScale;
		this.max = SapphireInput.parseBound(init.numericOptions?.Max);
		this.min = SapphireInput.parseBound(init.numericOptions?.Min);
		this.minusEl = this.widgetEl.querySelector<HTMLDivElement>('.sapphireinput-minus')!;
		this.plusEl = this.widgetEl.querySelector<HTMLDivElement>('.sapphireinput-plus')!;
		this.step = init.numericOptions.Step;
		this.type = init.type;
		this.maxLength = init.maxLength ?? 0;
		this.isValid = init.isValid ?? true;
		this.validationMessageEl = this.widgetEl.querySelector<HTMLElement>('.sapphireinput-invalid');
		this.widgetEl.dataset.isvalid = this.isValid ? 'true' : 'false';
		this.widgetEl.dataset.isoutofbounds = 'false';
		this.widgetEl.dataset.type = this.type;

		// Initial value is "external" — accept it verbatim (only capped to maxLength).
		// Out-of-bounds is checked at the end of the constructor; user typing later
		// will mask/clamp on the fly.
		this.value = this.truncateToMaxLength(init.value ?? '');

		this.inputEl = this.widgetEl.querySelector<HTMLInputElement>('input[data-input]')!;

		this.inputEl.autocapitalize = 'off';
		this.inputEl.autocomplete = 'off';
		this.inputEl.autocorrect = false;
		this.inputEl.name = `input-${init.runtimeId}`;
		this.inputEl.placeholder = init.placeholder;
		this.inputEl.spellcheck = false;
		this.applyMaxLength();

		this.clearEl?.addEventListener('click', this.handleClearClick);
		this.clearEl?.addEventListener('keydown', this.handleClearKeyDown);
		this.inputEl.addEventListener('blur', this.handleBlur);
		this.inputEl.addEventListener('input', this.handleInput);
		this.inputEl.addEventListener('keydown', this.handleKeyDown);
		this.minusEl?.addEventListener('click', this.handleMinusClick);
		this.minusEl?.addEventListener('keydown', this.handleStepKeyDown);
		this.plusEl?.addEventListener('click', this.handlePlusClick);
		this.plusEl?.addEventListener('keydown', this.handleStepKeyDown);

		this.updateDisplayValue();
		this.updateHasContent();
		this.updateStepsButtons();
		this.updateValidationMessage();
		this.checkOutOfBounds();
	}

	// Sets the native maxlength when a positive limit is provided; a value of 0
	// (or less) means "no limit" and clears any previously set attribute.
	private applyMaxLength(): void {
		if (this.maxLength > 0) {
			this.inputEl.maxLength = this.maxLength;
		} else {
			this.inputEl.removeAttribute('maxlength');
		}
	}

	// Native maxlength only caps user typing/paste; externally-set values must be
	// truncated explicitly. A limit of 0 (or less) means "no limit".
	private truncateToMaxLength(value: string): string {
		if (this.maxLength > 0 && value.length > this.maxLength) {
			return value.slice(0, this.maxLength);
		}
		return value;
	}

	// The backend renders the message element (.sapphireinput-invalid); we only
	// toggle its visibility: shown while invalid, hidden while valid.
	private updateValidationMessage(): void {
		if (!this.validationMessageEl) {
			return;
		}
		this.validationMessageEl.hidden = this.isValid;
	}

	private updateDisplayValue(): void {
		this.inputEl.value = this.toDisplay(this.value);
	}

	private updateHasContent(): void {
		const hasContent = this.inputEl.value.trim().length > 0;
		if (hasContent) {
			this.widgetEl.dataset.hascontent = 'true';
		} else {
			this.widgetEl.dataset.hascontent = 'false';
		}
	}

	private updateStepsButtons(): void {
		if (this.minusEl) {
			this.minusEl.dataset.enabled = this.min === null || Number(this.value) > this.min ? 'true' : 'false';
		}

		if (this.plusEl) {
			this.plusEl.dataset.enabled = this.max === null || Number(this.value) < this.max ? 'true' : 'false';
		}
	}

	parametersChanged(payload: SapphireInputInit): void {
		// Bounds first — out-of-bounds check below depends on min/max being current.
		const nextMin = SapphireInput.parseBound(payload.numericOptions?.Min);
		if (nextMin !== this.min) {
			this.min = nextMin;
		}

		const nextMax = SapphireInput.parseBound(payload.numericOptions?.Max);
		if (nextMax !== this.max) {
			this.max = nextMax;
		}

		// Apply maxLength before the value so the incoming value is truncated
		// against the current limit.
		if (payload.maxLength !== undefined && payload.maxLength !== this.maxLength) {
			this.maxLength = payload.maxLength;
			this.applyMaxLength();
		}

		// External value: accept verbatim, only capped to maxLength. We don't mask
		// or clamp — out-of-bounds is evaluated below if it doesn't fit the rules.
		const incoming = this.truncateToMaxLength(payload.value ?? '');
		if (!Helpers.areTheyEqual(incoming, this.value)) {
			this.value = incoming;
			this.updateDisplayValue();
			this.updateHasContent();
			this.updateStepsButtons();
		}

		if (payload.isValid !== undefined && payload.isValid !== this.isValid) {
			this.isValid = payload.isValid;
			this.widgetEl.dataset.isvalid = this.isValid ? 'true' : 'false';
			this.updateValidationMessage();
		}

		this.checkOutOfBounds();
	}

	destroy(): void {
		super.destroy();
		this.commitValueDebounced.cancel();
		this.inputEl.removeEventListener('input', this.handleInput);
		this.inputEl.removeEventListener('blur', this.handleBlur);
		this.inputEl.removeEventListener('keydown', this.handleKeyDown);
		this.clearEl?.removeEventListener('click', this.handleClearClick);
		this.clearEl?.removeEventListener('keydown', this.handleClearKeyDown);
		this.plusEl?.removeEventListener('click', this.handlePlusClick);
		this.plusEl?.removeEventListener('keydown', this.handleStepKeyDown);
		this.minusEl?.removeEventListener('click', this.handleMinusClick);
		this.minusEl?.removeEventListener('keydown', this.handleStepKeyDown);
	}

	private checkOutOfBounds(): void {
		this.setOutOfBounds(this.computeOutOfBounds());
	}

	// True when `this.value` is outside type/bounds rules.
	// Empty is treated as in-bounds (required-field semantics live elsewhere).
	private computeOutOfBounds(): boolean {
		if (this.type === 'text') {
			return false;
		}

		const trimmed = String(this.value).trim();
		if (trimmed === '') {
			return false;
		}

		const numeric = Number(trimmed.replace(',', '.'));
		if (!Number.isFinite(numeric)) {
			return true;
		}

		// Round-trip integrity: masking the raw value must not change its
		// numeric meaning. Catches integer-with-decimals and over-scale decimals.
		const masked = this.maskValue(trimmed);
		const maskedNumeric = masked === '' ? NaN : Number(masked);
		if (!Number.isFinite(maskedNumeric) || maskedNumeric !== numeric) {
			return true;
		}

		if (this.min !== null && numeric < this.min) {
			return true;
		}
		if (this.max !== null && numeric > this.max) {
			return true;
		}

		return false;
	}

	private setOutOfBounds(next: boolean): void {
		if (next === this.isOutOfBounds) {
			return;
		}
		this.isOutOfBounds = next;
		this.widgetEl.dataset.isoutofbounds = next ? 'true' : 'false';
	}

	// Parses an inbound bound string. Empty / whitespace / non-numeric => null (no constraint).
	private static parseBound(raw: string | null | undefined): number | null {
		if (raw === null || raw === undefined) {
			return null;
		}
		const trimmed = String(raw).trim();
		if (trimmed === '') {
			return null;
		}
		const num = Number(trimmed.replace(',', '.'));
		return Number.isFinite(num) ? num : null;
	}

	// Strips disallowed characters and normalizes the value to internal format ("." separator).
	// Does not enforce min/max — that happens on debounce/blur via commitValue().
	private maskValue(raw: string): string {
		if (this.type === 'text') {
			return raw;
		}

		// Normalize display separator to internal one
		let v = String(raw).replace(/,/g, '.');

		// Capture sign (only a single leading minus is meaningful)
		const negative = v.trimStart().startsWith('-');
		v = v.replace(/-/g, '');

		// Allow only digits (and a dot for decimal type)
		const allowed = this.type === 'decimal' && this.decimalScale > 0 ? /[^0-9.]/g : /[^0-9]/g;
		v = v.replace(allowed, '');

		if (this.type === 'decimal' && this.decimalScale > 0) {
			// Keep only the first dot
			const firstDot = v.indexOf('.');
			if (firstDot !== -1) {
				v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
				// Truncate to decimalScale
				const [intPart, decPart = ''] = v.split('.');
				v = intPart + '.' + decPart.slice(0, this.decimalScale);
			}
		}

		if (v === '' && !negative) {
			return '';
		}
		return (negative ? '-' : '') + v;
	}

	// Applies min/max constraints. Assumes input is already in internal format.
	private clampValue(internal: string): string {
		if (this.type === 'text' || internal === '') {
			return internal;
		}

		const num = Number(internal);
		if (!Number.isFinite(num)) {
			// Transient values like "-" or "." — leave untouched, they'll be re-evaluated next pass
			return internal;
		}

		let clamped = num;
		if (this.max !== null && clamped > this.max) {
			clamped = this.max;
		}
		if (this.min !== null && clamped < this.min) {
			clamped = this.min;
		}

		if (clamped === num) {
			return internal;
		}

		if (this.type === 'decimal' && this.decimalScale > 0) {
			return clamped.toFixed(this.decimalScale);
		}
		return String(Math.trunc(clamped));
	}

	// Re-masks the current display, clamps it, syncs both display + emitted value, and notifies.
	private commitValue(): void {
		const internal = this.maskValue(this.inputEl.value);
		const next = this.clampValue(internal);

		const nextDisplay = this.toDisplay(next);

		if (nextDisplay !== this.inputEl.value) {
			this.inputEl.value = nextDisplay;
			this.updateHasContent();
		}

		if (next !== this.value) {
			this.value = next;
			this.actions?.OnChange(this.value);
		}

		// User-typed path: maskValue + clampValue guarantee the stored value is
		// well-formed and within bounds, so it is in-bounds by construction.
		this.setOutOfBounds(false);
	}

	private toDisplay(internal: string): string {
		if (this.type === 'text') {
			return internal;
		}
		return internal.replace('.', ',');
	}
}
