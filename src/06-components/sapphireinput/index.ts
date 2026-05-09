import { BaseComponent, type BaseComponentInit } from '../../core/base';
import Helpers from '../../09-utils/helpers';

interface SapphireInputTypeOptions {
	DecimalScale: number;
	Max: string;
	Min: string;
}

interface SapphireInputInit extends BaseComponentInit {
	actions: {
		OnChange: (value: string) => void;
		OnClear: () => void;
		OnEnterKey: () => void;
	};
	debounceChange: number;
	enabled: boolean;
	placeholder: string;
	theme: string;
	type: 'text' | 'integer' | 'decimal';
	typeOptions: SapphireInputTypeOptions;
	value: string;
}

export default class SapphireInput extends BaseComponent {
	private actions!: SapphireInputInit['actions'];
	private changeDebounceTimer?: ReturnType<typeof setTimeout>;
	private clearEl!: HTMLElement;
	private debounceChange!: number;
	private decimalScale!: number;
	private inputEl!: HTMLInputElement;
	private max: number | null = null;
	private min: number | null = null;
	private type!: SapphireInputInit['type'];
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

		window.clearTimeout(this.changeDebounceTimer);
		this.changeDebounceTimer = window.setTimeout(() => {
			this.changeDebounceTimer = undefined;
			this.commitValue();
		}, this.debounceChange);
	};

	private readonly handleBlur = (): void => {
		if (this.changeDebounceTimer !== undefined) {
			window.clearTimeout(this.changeDebounceTimer);
			this.changeDebounceTimer = undefined;
		}
		this.commitValue();
	};

	private readonly handleClearClick = (event: Event): void => {
		event.preventDefault();
		this.actions?.OnClear();
	};

	private readonly handleEnterKey = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter') {
			return;
		}
		this.actions?.OnEnterKey();
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
		this.type = init.type;
		this.decimalScale = init.typeOptions.DecimalScale;
		this.min = SapphireInput.parseBound(init.typeOptions?.Min);
		this.max = SapphireInput.parseBound(init.typeOptions?.Max);

		this.value = this.maskValue(init.value ?? '');

		this.inputEl = this.widgetEl.querySelector<HTMLInputElement>('input[data-input]')!;
		this.inputEl.autocapitalize = 'off';
		this.inputEl.autocomplete = 'off';
		this.inputEl.autocorrect = false;
		this.inputEl.placeholder = init.placeholder;
		this.inputEl.spellcheck = false;
		this.inputEl.name = `input-${init.runtimeId}`;

		this.inputEl.addEventListener('input', this.handleInput);
		this.inputEl.addEventListener('blur', this.handleBlur);
		this.inputEl.addEventListener('keydown', this.handleEnterKey);
		this.clearEl?.addEventListener('click', this.handleClearClick);

		this.updateDisplayValue();
		this.updateHasContent();
	}

	private updateHasContent(): void {
		const hasContent = this.inputEl.value.trim().length > 0;
		if (hasContent) {
			this.widgetEl.dataset.hascontent = 'true';
		} else {
			this.widgetEl.dataset.hascontent = 'false';
		}
	}

	updateDisplayValue(): void {
		this.inputEl.value = this.toDisplay(this.value);
	}

	parametersChanged(payload: SapphireInputInit): void {
		const incoming = this.maskValue(payload.value ?? '');
		if (!Helpers.areTheyEqual(incoming, this.value)) {
			this.value = incoming;
			this.updateDisplayValue();
		}

		const nextMin = SapphireInput.parseBound(payload.typeOptions?.Min);
		if (nextMin !== this.min) {
			this.min = nextMin;
		}

		const nextMax = SapphireInput.parseBound(payload.typeOptions?.Max);
		if (nextMax !== this.max) {
			this.max = nextMax;
		}
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
	}

	private toDisplay(internal: string): string {
		if (this.type === 'text') {
			return internal;
		}
		return internal.replace('.', ',');
	}
}
