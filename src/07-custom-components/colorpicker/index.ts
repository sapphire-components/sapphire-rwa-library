import { BaseComponent, type BaseComponentInit } from '@core/base';
import { clamp, DEFAULT_HSV, hexToHsv, hueToHex, hsvToHex, isValidDraft, parseHex, sanitizeTypedHex, type HSV } from './color';

interface IColorPicker extends BaseComponentInit {
	actions: {
		OnChange: (value: string) => void;
	};
	allowEmpty: boolean;
	enabled: boolean;
	showInput: boolean;
	value: string;
}

const FOCUSABLE_SELECTOR = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SV_STEP = 0.01;
const SV_STEP_LARGE = 0.05;
const HUE_STEP = 1;
const HUE_STEP_LARGE = 10;

export default class ColorPicker extends BaseComponent {
	#actions!: IColorPicker['actions'];
	#allowEmpty = false;
	#committed = '';
	#draftHex = '';
	#draftHsv: HSV = { ...DEFAULT_HSV };
	#enabled = true;
	#isOpen = false;
	#showInput = true;

	#triggerEl!: HTMLButtonElement;
	#panelEl!: HTMLElement;
	#svEl!: HTMLElement;
	#svThumbEl!: HTMLElement;
	#hueEl!: HTMLElement;
	#hueThumbEl!: HTMLElement;
	#previewEl!: HTMLElement;
	#previewCurrentEl!: HTMLElement;
	#previewSelectedEl!: HTMLElement;
	#inputEl!: HTMLInputElement;
	#cancelEl!: HTMLButtonElement;
	#clearEl!: HTMLButtonElement;
	#applyEl!: HTMLButtonElement;

	#tippyInstance: TippyInstance | null = null;
	#activePointer: { target: 'sv' | 'hue'; id: number } | null = null;

	constructor(config: IColorPicker) {
		super(config);

		if (!this.widgetEl) {
			console.warn('ColorPicker: root element not found for runtimeId', config.runtimeId);
			return;
		}

		this.#actions = config.actions;
		this.#allowEmpty = Boolean(config.allowEmpty);
		this.#enabled = config.enabled !== false;
		this.#showInput = config.showInput !== false;
		this.#committed = parseHex(config.value) ?? '';

		this.#build();
		this.#initTippy();
		this.#bindEvents();
		this.#syncCommittedToDraft();
		this.#render();
	}

	parametersChanged(payload: IColorPicker): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) return;

		if (this.widgetEl !== liveEl) {
			this.#teardown();
			this.widgetEl = liveEl;
			this.#build();
			this.#initTippy();
			this.#bindEvents();
		}

		if (payload.actions) {
			this.#actions = payload.actions;
		}

		if (payload.enabled !== undefined && payload.enabled !== this.#enabled) {
			this.#enabled = Boolean(payload.enabled);
			if (!this.#enabled) this.#cancel();
		}

		if (payload.allowEmpty !== undefined) {
			this.#allowEmpty = Boolean(payload.allowEmpty);
		}

		if (payload.showInput !== undefined && payload.showInput !== this.#showInput) {
			this.#showInput = Boolean(payload.showInput);
		}

		if (payload.value !== undefined) {
			this.#committed = parseHex(payload.value) ?? '';
			if (!this.#isOpen) this.#syncCommittedToDraft();
		}

		this.#render();
	}

	destroy(): void {
		this.#teardown();
		super.destroy();
	}

	#build(): void {
		this.widgetEl.classList.add('colorpicker');
		this.widgetEl.replaceChildren();

		this.#triggerEl = document.createElement('button');
		this.#triggerEl.type = 'button';
		this.#triggerEl.className = 'colorpicker-trigger';
		this.#triggerEl.setAttribute('aria-haspopup', 'dialog');
		this.#triggerEl.setAttribute('aria-expanded', 'false');
		this.#triggerEl.setAttribute('aria-label', 'Open color picker');

		this.#panelEl = document.createElement('div');
		this.#panelEl.className = 'colorpicker-panel';
		this.#panelEl.setAttribute('role', 'dialog');
		this.#panelEl.setAttribute('aria-label', 'Color picker');

		const fields = document.createElement('div');
		fields.className = 'colorpicker-fields';

		this.#svEl = document.createElement('div');
		this.#svEl.className = 'colorpicker-sv';
		this.#svEl.tabIndex = 0;
		this.#svEl.setAttribute('role', 'slider');
		this.#svEl.setAttribute('aria-label', 'Saturation and brightness');

		this.#svThumbEl = document.createElement('div');
		this.#svThumbEl.className = 'colorpicker-sv-thumb';
		this.#svEl.appendChild(this.#svThumbEl);

		this.#hueEl = document.createElement('div');
		this.#hueEl.className = 'colorpicker-hue';
		this.#hueEl.tabIndex = 0;
		this.#hueEl.setAttribute('role', 'slider');
		this.#hueEl.setAttribute('aria-label', 'Hue');
		this.#hueEl.setAttribute('aria-valuemin', '0');
		this.#hueEl.setAttribute('aria-valuemax', '360');

		this.#hueThumbEl = document.createElement('div');
		this.#hueThumbEl.className = 'colorpicker-hue-thumb';
		this.#hueEl.appendChild(this.#hueThumbEl);

		fields.append(this.#svEl, this.#hueEl);

		const meta = document.createElement('div');
		meta.className = 'colorpicker-meta';

		this.#previewEl = document.createElement('div');
		this.#previewEl.className = 'colorpicker-preview';
		this.#previewEl.setAttribute('aria-hidden', 'true');

		this.#previewCurrentEl = document.createElement('div');
		this.#previewCurrentEl.className = 'colorpicker-preview-current';
		this.#previewCurrentEl.title = 'Current color';

		this.#previewSelectedEl = document.createElement('div');
		this.#previewSelectedEl.className = 'colorpicker-preview-selected';
		this.#previewSelectedEl.title = 'Selected color';

		this.#previewEl.append(this.#previewCurrentEl, this.#previewSelectedEl);

		this.#inputEl = document.createElement('input');
		this.#inputEl.className = 'colorpicker-input';
		this.#inputEl.type = 'text';
		this.#inputEl.spellcheck = false;
		this.#inputEl.autocomplete = 'off';
		this.#inputEl.autocapitalize = 'off';
		this.#inputEl.maxLength = 7;
		this.#inputEl.placeholder = '';
		this.#inputEl.setAttribute('aria-label', 'Hexadecimal color');
		// this.#inputEl.dataset.input = '';

		meta.append(this.#previewEl, this.#inputEl);

		const actions = document.createElement('div');
		actions.className = 'colorpicker-actions';

		this.#cancelEl = document.createElement('button');
		this.#cancelEl.type = 'button';
		this.#cancelEl.className = 'btn btn-tertiary btn-small colorpicker-cancel';
		this.#cancelEl.textContent = 'Cancel';

		this.#clearEl = document.createElement('button');
		this.#clearEl.type = 'button';
		this.#clearEl.className = 'btn btn-small colorpicker-clear';
		this.#clearEl.textContent = 'Clear';

		this.#applyEl = document.createElement('button');
		this.#applyEl.type = 'button';
		this.#applyEl.className = 'btn btn-primary btn-small colorpicker-apply';
		this.#applyEl.textContent = 'Apply';

		actions.append(this.#cancelEl, this.#clearEl, this.#applyEl);
		this.#panelEl.append(fields, meta, actions);
		this.widgetEl.append(this.#triggerEl, this.#panelEl);
	}

	#initTippy(): void {
		if (typeof window.tippy !== 'function') {
			console.warn('ColorPicker: window.tippy is not available');
			return;
		}

		this.#tippyInstance = window.tippy(this.#triggerEl, {
			appendTo: () => document.body,
			arrow: false,
			content: this.#panelEl,
			interactive: true,
			maxWidth: 'none',
			offset: [0, 4],
			placement: 'bottom-start',
			trigger: 'manual',
			onShow: (instance: TippyInstance) => {
				instance.setProps({ placement: this.#resolvePlacement() });
			},
			onClickOutside: () => this.#cancel(),
			onHidden: () => {
				this.#isOpen = false;
				this.#triggerEl.setAttribute('aria-expanded', 'false');
			},
		});
	}

	#resolvePlacement(): string {
		const placement = 'bottom-start';
		if (!window.SapphireRWALibrary?.State?.isRTL) return placement;
		return placement.replace('-start', '-TEMP').replace('-end', '-start').replace('-TEMP', '-end');
	}

	#bindEvents(): void {
		this.#triggerEl.addEventListener('click', this.#onTriggerClick);
		this.#triggerEl.addEventListener('keydown', this.#onTriggerKeyDown);
		this.#panelEl.addEventListener('keydown', this.#onPanelKeyDown);
		this.#svEl.addEventListener('pointerdown', this.#onSvPointerDown);
		this.#svEl.addEventListener('pointermove', this.#onPointerMove);
		this.#svEl.addEventListener('pointerup', this.#onPointerUp);
		this.#svEl.addEventListener('pointercancel', this.#onPointerUp);
		this.#svEl.addEventListener('keydown', this.#onSvKeyDown);
		this.#hueEl.addEventListener('pointerdown', this.#onHuePointerDown);
		this.#hueEl.addEventListener('pointermove', this.#onPointerMove);
		this.#hueEl.addEventListener('pointerup', this.#onPointerUp);
		this.#hueEl.addEventListener('pointercancel', this.#onPointerUp);
		this.#hueEl.addEventListener('keydown', this.#onHueKeyDown);
		this.#inputEl.addEventListener('input', this.#onInput);
		this.#inputEl.addEventListener('blur', this.#onInputBlur);
		this.#inputEl.addEventListener('keydown', this.#onInputKeyDown);
		this.#cancelEl.addEventListener('click', this.#onCancelClick);
		this.#clearEl.addEventListener('click', this.#onClearClick);
		this.#applyEl.addEventListener('click', this.#onApplyClick);
	}

	#unbindEvents(): void {
		this.#triggerEl?.removeEventListener('click', this.#onTriggerClick);
		this.#triggerEl?.removeEventListener('keydown', this.#onTriggerKeyDown);
		this.#panelEl?.removeEventListener('keydown', this.#onPanelKeyDown);
		this.#svEl?.removeEventListener('pointerdown', this.#onSvPointerDown);
		this.#svEl?.removeEventListener('pointermove', this.#onPointerMove);
		this.#svEl?.removeEventListener('pointerup', this.#onPointerUp);
		this.#svEl?.removeEventListener('pointercancel', this.#onPointerUp);
		this.#svEl?.removeEventListener('keydown', this.#onSvKeyDown);
		this.#hueEl?.removeEventListener('pointerdown', this.#onHuePointerDown);
		this.#hueEl?.removeEventListener('pointermove', this.#onPointerMove);
		this.#hueEl?.removeEventListener('pointerup', this.#onPointerUp);
		this.#hueEl?.removeEventListener('pointercancel', this.#onPointerUp);
		this.#hueEl?.removeEventListener('keydown', this.#onHueKeyDown);
		this.#inputEl?.removeEventListener('input', this.#onInput);
		this.#inputEl?.removeEventListener('blur', this.#onInputBlur);
		this.#inputEl?.removeEventListener('keydown', this.#onInputKeyDown);
		this.#cancelEl?.removeEventListener('click', this.#onCancelClick);
		this.#clearEl?.removeEventListener('click', this.#onClearClick);
		this.#applyEl?.removeEventListener('click', this.#onApplyClick);
	}

	#teardown(): void {
		this.#close(false);
		this.#unbindEvents();
		this.#tippyInstance?.destroy();
		this.#tippyInstance = null;
		this.#activePointer = null;
		this.widgetEl?.replaceChildren();
	}

	readonly #onTriggerClick = (): void => {
		if (!this.#enabled) return;
		if (this.#isOpen) {
			this.#cancel();
			return;
		}
		this.#open();
	};

	readonly #onTriggerKeyDown = (event: KeyboardEvent): void => {
		if (!this.#enabled) return;
		if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar' || event.key === 'ArrowDown') {
			event.preventDefault();
			this.#open();
		}
	};

	readonly #onPanelKeyDown = (event: KeyboardEvent): void => {
		if (event.key === 'Escape' || event.key === 'Esc') {
			event.preventDefault();
			this.#cancel();
			return;
		}
		if (event.key === 'Tab') {
			this.#trapTab(event);
		}
	};

	readonly #onSvPointerDown = (event: PointerEvent): void => {
		if (!this.#enabled) return;
		event.preventDefault();
		this.#svEl.setPointerCapture(event.pointerId);
		this.#activePointer = { target: 'sv', id: event.pointerId };
		this.#svEl.focus();
		this.#applySvFromPointer(event);
	};

	readonly #onHuePointerDown = (event: PointerEvent): void => {
		if (!this.#enabled) return;
		event.preventDefault();
		this.#hueEl.setPointerCapture(event.pointerId);
		this.#activePointer = { target: 'hue', id: event.pointerId };
		this.#hueEl.focus();
		this.#applyHueFromPointer(event);
	};

	readonly #onPointerMove = (event: PointerEvent): void => {
		if (!this.#activePointer || this.#activePointer.id !== event.pointerId) return;
		if (this.#activePointer.target === 'sv') this.#applySvFromPointer(event);
		else this.#applyHueFromPointer(event);
	};

	readonly #onPointerUp = (event: PointerEvent): void => {
		if (!this.#activePointer || this.#activePointer.id !== event.pointerId) return;
		const target = this.#activePointer.target === 'sv' ? this.#svEl : this.#hueEl;
		if (target.hasPointerCapture(event.pointerId)) {
			target.releasePointerCapture(event.pointerId);
		}
		this.#activePointer = null;
	};

	readonly #onSvKeyDown = (event: KeyboardEvent): void => {
		const step = event.shiftKey ? SV_STEP_LARGE : SV_STEP;
		let nextS = this.#draftHsv.s;
		let nextV = this.#draftHsv.v;

		switch (event.key) {
			case 'ArrowLeft':
				nextS -= step;
				break;
			case 'ArrowRight':
				nextS += step;
				break;
			case 'ArrowDown':
				nextV -= step;
				break;
			case 'ArrowUp':
				nextV += step;
				break;
			default:
				return;
		}

		event.preventDefault();
		this.#setDraftFromHsv({
			h: this.#draftHsv.h,
			s: clamp(nextS, 0, 1),
			v: clamp(nextV, 0, 1),
		});
	};

	readonly #onHueKeyDown = (event: KeyboardEvent): void => {
		const step = event.shiftKey ? HUE_STEP_LARGE : HUE_STEP;
		let nextH = this.#draftHsv.h;

		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowRight':
				nextH += step;
				break;
			case 'ArrowUp':
			case 'ArrowLeft':
				nextH -= step;
				break;
			default:
				return;
		}

		event.preventDefault();
		this.#setDraftFromHsv({
			h: (nextH + 360) % 360,
			s: this.#draftHsv.s,
			v: this.#draftHsv.v,
		});
	};

	readonly #onInput = (event: Event): void => {
		const previous = this.#inputEl.value;
		const caret = this.#inputEl.selectionStart ?? previous.length;
		const pasted = event instanceof InputEvent && (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop');

		let next = sanitizeTypedHex(previous);
		const digitCount = next ? next.length - 1 : 0;
		if (pasted && digitCount === 3) {
			next = parseHex(next) ?? next;
		}

		this.#writeNormalizedInput(next, previous, caret);
		this.#draftHex = next;

		const parsed = parseHex(next);
		if (parsed) {
			this.#draftHsv = hexToHsv(parsed, this.#draftHsv.h);
		}

		this.#renderVisuals();
		this.#renderValidity();
	};

	readonly #onInputBlur = (): void => {
		this.#normalizeDraftToHex6();
		this.#render();
	};

	#writeNormalizedInput(next: string, previous: string, caret: number): void {
		if (next === previous) return;

		this.#inputEl.value = next;
		const digitsBeforeCaret = previous.slice(0, caret).replace(/[^0-9a-f]/gi, '').length;
		const nextCaret = next === '' ? 0 : Math.min(1 + digitsBeforeCaret, next.length);
		try {
			this.#inputEl.setSelectionRange(nextCaret, nextCaret);
		} catch {
			// setSelectionRange throws on inputs that don't support it; safe to ignore
		}
	}

	#normalizeDraftToHex6(): void {
		const parsed = parseHex(this.#draftHex);
		if (parsed) {
			this.#draftHex = parsed;
			this.#draftHsv = hexToHsv(parsed, this.#draftHsv.h);
			return;
		}
		this.#draftHex = sanitizeTypedHex(this.#draftHex);
	}

	readonly #onInputKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		this.#apply();
	};

	readonly #onCancelClick = (): void => {
		this.#cancel();
	};

	readonly #onClearClick = (): void => {
		if (!this.#allowEmpty || !this.#enabled) return;
		this.#committed = '';
		this.#syncCommittedToDraft();
		this.#render();
		this.#actions.OnChange('');
		this.#close(true);
	};

	readonly #onApplyClick = (): void => {
		this.#apply();
	};

	#open(): void {
		if (!this.#enabled || this.#isOpen) return;
		this.#syncCommittedToDraft();
		this.#render();
		this.#isOpen = true;
		this.#triggerEl.setAttribute('aria-expanded', 'true');
		this.#tippyInstance?.show();
		if (this.#showInput) this.#inputEl.focus();
		else this.#svEl.focus();
	}

	#cancel(): void {
		if (!this.#isOpen) {
			this.#syncCommittedToDraft();
			this.#render();
			return;
		}
		this.#syncCommittedToDraft();
		this.#render();
		this.#close(true);
	}

	#apply(): void {
		this.#normalizeDraftToHex6();
		if (!this.#isDraftValid()) {
			this.#renderValidity();
			if (this.#showInput) this.#inputEl.focus();
			return;
		}

		const next = this.#draftHex === '' ? '' : this.#showInput ? (parseHex(this.#draftHex) ?? '') : hsvToHex(this.#draftHsv);
		this.#committed = next;
		this.#syncCommittedToDraft();
		this.#render();
		this.#actions.OnChange(next);
		this.#close(true);
	}

	#close(returnFocus: boolean): void {
		if (!this.#isOpen && !this.#tippyInstance?.state?.isVisible) {
			this.#triggerEl?.setAttribute('aria-expanded', 'false');
			return;
		}
		this.#isOpen = false;
		this.#triggerEl.setAttribute('aria-expanded', 'false');
		this.#tippyInstance?.hide();
		if (returnFocus) this.#triggerEl.focus();
	}

	#syncCommittedToDraft(): void {
		this.#draftHex = this.#committed;
		this.#draftHsv = this.#committed ? hexToHsv(this.#committed) : { ...DEFAULT_HSV };
	}

	#setDraftFromHsv(hsv: HSV): void {
		this.#draftHsv = hsv;
		this.#draftHex = hsvToHex(hsv);
		this.#render();
	}

	#applySvFromPointer(event: PointerEvent): void {
		const rect = this.#svEl.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		const s = clamp((event.clientX - rect.left) / rect.width, 0, 1);
		const v = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
		this.#setDraftFromHsv({ h: this.#draftHsv.h, s, v });
	}

	#applyHueFromPointer(event: PointerEvent): void {
		const rect = this.#hueEl.getBoundingClientRect();
		if (rect.height === 0) return;
		const h = clamp(((event.clientY - rect.top) / rect.height) * 360, 0, 360);
		this.#setDraftFromHsv({ h: h === 360 ? 0 : h, s: this.#draftHsv.s, v: this.#draftHsv.v });
	}

	#isDraftValid(): boolean {
		if (this.#draftHex === '') return this.#allowEmpty;
		if (!this.#showInput) return true;
		return isValidDraft(this.#draftHex, this.#allowEmpty);
	}

	#render(): void {
		this.widgetEl.dataset.enabled = this.#enabled ? 'true' : 'false';
		this.widgetEl.dataset.showinput = this.#showInput ? 'true' : 'false';
		this.widgetEl.dataset.allowempty = this.#allowEmpty ? 'true' : 'false';
		this.#panelEl.dataset.showinput = this.#showInput ? 'true' : 'false';
		this.#panelEl.dataset.allowempty = this.#allowEmpty ? 'true' : 'false';

		this.#triggerEl.disabled = !this.#enabled;
		this.#inputEl.disabled = !this.#enabled;
		this.#cancelEl.disabled = !this.#enabled;
		this.#clearEl.disabled = !this.#enabled;
		this.#clearEl.hidden = !this.#allowEmpty;
		this.#applyEl.disabled = !this.#enabled;
		this.#svEl.tabIndex = this.#enabled ? 0 : -1;
		this.#hueEl.tabIndex = this.#enabled ? 0 : -1;

		if (this.#showInput) {
			this.#inputEl.hidden = false;
			this.#inputEl.tabIndex = 0;
			if (document.activeElement !== this.#inputEl) {
				this.#inputEl.value = this.#draftHex;
			}
		} else {
			this.#inputEl.hidden = true;
			this.#inputEl.tabIndex = -1;
		}

		this.#renderVisuals();
		this.#renderValidity();
	}

	#renderVisuals(): void {
		const parsed = parseHex(this.#draftHex);
		const previewHex = parsed || hsvToHex(this.#draftHsv);
		const emptyPreview = parsed === '';
		const hueHex = hueToHex(this.#draftHsv.h);

		this.#svEl.style.setProperty('--colorpicker-hue', hueHex);
		this.#svThumbEl.style.left = `${this.#draftHsv.s * 100}%`;
		this.#svThumbEl.style.top = `${(1 - this.#draftHsv.v) * 100}%`;

		this.#hueThumbEl.style.top = `${(this.#draftHsv.h / 360) * 100}%`;
		this.#hueEl.setAttribute('aria-valuenow', String(Math.round(this.#draftHsv.h)));

		this.#paintPreviewHalf(this.#previewCurrentEl, this.#committed);
		this.#paintPreviewHalf(this.#previewSelectedEl, emptyPreview ? '' : previewHex);

		this.#triggerEl.dataset.empty = this.#committed ? 'false' : 'true';
		this.#triggerEl.style.backgroundColor = this.#committed || '';
		this.#triggerEl.setAttribute('aria-label', this.#committed ? `Open color picker, ${this.#committed}` : 'Open color picker');

		this.#svEl.setAttribute('aria-valuetext', `${Math.round(this.#draftHsv.s * 100)}% saturation, ${Math.round(this.#draftHsv.v * 100)}% brightness`);
	}

	#paintPreviewHalf(el: HTMLElement, hex: string): void {
		el.dataset.empty = hex ? 'false' : 'true';
		el.style.backgroundColor = hex || '';
	}

	#renderValidity(): void {
		const valid = this.#isDraftValid();
		this.#panelEl.dataset.isvalid = valid ? 'true' : 'false';
		this.#inputEl.setAttribute('aria-invalid', valid ? 'false' : 'true');
	}

	#focusables(): HTMLElement[] {
		return Array.from(this.#panelEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
			(el) => !el.hidden && !el.hasAttribute('disabled') && el.offsetParent !== null,
		);
	}

	#trapTab(event: KeyboardEvent): void {
		const items = this.#focusables();
		if (items.length === 0) return;

		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement as HTMLElement | null;

		if (event.shiftKey && active === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus();
		}
	}
}
