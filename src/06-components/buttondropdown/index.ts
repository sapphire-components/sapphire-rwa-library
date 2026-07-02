import { BaseComponent, type BaseComponentInit } from '../../core/base';
import Helpers from '../../09-utils/helpers';

export interface IButtonDropdown extends BaseComponentInit {
	actions: {
		OnClick: () => void;
	};
	enabled: boolean;
	isSplitButton: boolean;
	isValid: boolean;
	placement: string;
	runtimeId: string;
	validationMessage: string;
}

const DEFAULT_PLACEMENT = 'bottom-start';
const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default class ButtonDropdown extends BaseComponent {
	#actions!: IButtonDropdown['actions'];
	#enabled = true;
	#isSplitButton = false;
	#isValid = true;
	#placement = DEFAULT_PLACEMENT;
	#validationMessage = '';

	#labelEl!: HTMLElement;
	#actionsEl!: HTMLElement;
	#arrowEl: HTMLButtonElement | null = null;
	#triggerEl!: HTMLElement;
	#validationMessageEl: HTMLElement | null = null;
	#actionsId = '';

	#tippyInstance: TippyInstance | null = null;
	#isOpen = false;
	#openWithKeyboard = false;

	constructor(config: IButtonDropdown) {
		super(config);

		if (!this.widgetEl) {
			console.warn('ButtonDropdown: root element not found for runtimeId', config.runtimeId);
			return;
		}

		this.#actions = config.actions;
		this.#enabled = config.enabled;
		this.#isSplitButton = config.isSplitButton;
		this.#isValid = config.isValid;
		this.#placement = config.placement || DEFAULT_PLACEMENT;
		this.#validationMessage = config.validationMessage ?? '';

		this.#labelEl = this.widgetEl.querySelector('.buttondropdown-label') as HTMLElement;
		this.#actionsEl = this.widgetEl.querySelector('.buttondropdown-actions') as HTMLElement;

		if (!this.#labelEl || !this.#actionsEl) {
			console.warn('ButtonDropdown: label or actions element not found for runtimeId', config.runtimeId);
			return;
		}

		this.#actionsId = `${this.runtimeId}-actions`;

		this.#reflectStateAttributes();
		this.#build();
		this.#updateValidationMessage();
		this.#initTippy();
		this.#bindEvents();
	}

	// enabled/isValid are always mirrored as data attributes on the widget so the
	// SCSS state variations (disabled, invalid) apply, matching the other components.
	#reflectStateAttributes(): void {
		this.widgetEl.dataset.enabled = this.#enabled ? 'true' : 'false';
		this.widgetEl.dataset.isvalid = this.#isValid ? 'true' : 'false';
	}

	// The trigger differs by mode: in split-button mode a dedicated chevron opens
	// the overlay (the label runs its own OnClick action); otherwise the label
	// itself is the trigger.
	#build(): void {
		this.widgetEl.dataset.issplitbutton = this.#isSplitButton ? 'true' : 'false';

		this.#actionsEl.id = this.#actionsId;
		this.#actionsEl.setAttribute('role', 'menu');

		if (this.#isSplitButton) {
			this.#arrowEl = this.#createArrow();
			this.#labelEl.after(this.#arrowEl);
			this.#triggerEl = this.#arrowEl;
		} else {
			this.#triggerEl = this.#labelEl;
			if (this.#triggerEl.tabIndex < 0) this.#triggerEl.tabIndex = 0;
		}

		this.#triggerEl.setAttribute('aria-haspopup', 'true');
		this.#triggerEl.setAttribute('aria-expanded', 'false');
		this.#triggerEl.setAttribute('aria-controls', this.#actionsId);
	}

	// Mirror the label's button styling so the chevron visually joins it, then
	// swap the label class for the arrow class.
	#createArrow(): HTMLButtonElement {
		const arrow = document.createElement('button');
		arrow.type = 'button';
		arrow.className = this.#labelEl.className.replace('buttondropdown-label', '').trim();
		arrow.classList.add('buttondropdown-arrow');
		arrow.setAttribute('aria-label', 'More options');
		arrow.innerHTML = Helpers.placeIcon('caret-down', 's');
		return arrow;
	}

	#initTippy(): void {
		if (typeof window.tippy !== 'function') {
			console.warn('ButtonDropdown: window.tippy is not available');
			return;
		}

		this.#tippyInstance = window.tippy(this.#triggerEl, {
			appendTo: () => document.body,
			arrow: false,
			content: this.#actionsEl,
			interactive: true,
			maxWidth: 'none',
			offset: [0, 4],
			placement: this.#placement,
			trigger: 'manual',
			onShow: (instance: TippyInstance) => {
				instance.setProps({ placement: this.#resolvePlacement() });
				this.#applyOverlayWidth();
			},
			onShown: () => {
				if (this.#openWithKeyboard) this.#focusEdge(true);
			},
			onClickOutside: () => this.#close(false),
			onHidden: () => {
				this.#isOpen = false;
				this.#openWithKeyboard = false;
				this.#triggerEl.setAttribute('aria-expanded', 'false');
			},
		});
	}

	// Drives the panel's min-width (as a CSS var). Non-split pins to the label
	// width. Split pins to the whole component only when it opens inward (-end
	// placements) so it covers the label; outward (-start) stays organic.
	#applyOverlayWidth(): void {
		const popper = this.#tippyInstance?.popper;
		if (!popper) return;

		let minWidth: number | null = null;
		if (!this.#isSplitButton) {
			minWidth = this.#labelEl.getBoundingClientRect().width;
		} else if (this.#placement.endsWith('-end')) {
			minWidth = this.widgetEl.getBoundingClientRect().width;
		}

		if (minWidth !== null) {
			popper.style.setProperty('--trigger-width', `${minWidth}px`);
		} else {
			popper.style.removeProperty('--trigger-width');
		}
		this.#tippyInstance?.popperInstance?.update?.();
	}

	#resolvePlacement(): string {
		if (!window.SapphireRWALibrary?.State?.isRTL) return this.#placement;
		return this.#placement.replace('-start', '-TEMP').replace('-end', '-start').replace('-TEMP', '-end');
	}

	#bindEvents(): void {
		this.#labelEl.addEventListener('click', this.#onLabelClick);
		this.#labelEl.addEventListener('keydown', this.#onLabelKeyDown);
		this.#arrowEl?.addEventListener('click', this.#onArrowClick);
		this.#arrowEl?.addEventListener('keydown', this.#onArrowKeyDown);
		this.#actionsEl.addEventListener('click', this.#onPanelClick);
		this.#actionsEl.addEventListener('keydown', this.#onPanelKeyDown);
	}

	readonly #onLabelClick = (event: MouseEvent): void => {
		if (this.#isSplitButton) {
			this.#actions.OnClick();
			return;
		}
		event.preventDefault();
		this.#toggle(false);
	};

	readonly #onLabelKeyDown = (event: KeyboardEvent): void => {
		if (this.#isSplitButton) {
			if (!this.#isActivationKey(event)) return;
			event.preventDefault();
			this.#actions.OnClick();
			return;
		}

		if (this.#isActivationKey(event)) {
			event.preventDefault();
			this.#toggle(true);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			this.#open(true);
		}
	};

	readonly #onArrowClick = (): void => {
		this.#toggle(false);
	};

	readonly #onArrowKeyDown = (event: KeyboardEvent): void => {
		if (this.#isActivationKey(event)) {
			event.preventDefault();
			this.#toggle(true);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			this.#open(true);
		}
	};

	// Close only when a genuine menu action is activated (link/button). Form
	// controls like <select>/<input> manage their own open/close state and must
	// not tear down the overlay when interacted with.
	readonly #onPanelClick = (event: MouseEvent): void => {
		const item = (event.target as HTMLElement).closest('a[href], button');
		if (item && this.#actionsEl.contains(item)) this.#close(false);
	};

	readonly #onPanelKeyDown = (event: KeyboardEvent): void => {
		switch (event.key) {
			case 'Escape':
			case 'Esc':
				event.preventDefault();
				this.#close(true);
				break;
			case 'ArrowDown':
				event.preventDefault();
				this.#moveFocus(1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				this.#moveFocus(-1);
				break;
			case 'Home':
				event.preventDefault();
				this.#focusEdge(true);
				break;
			case 'End':
				event.preventDefault();
				this.#focusEdge(false);
				break;
			case 'Tab':
				this.#trapTab(event);
				break;
		}
	};

	#isActivationKey(event: KeyboardEvent): boolean {
		return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
	}

	#toggle(keyboard: boolean): void {
		if (this.#isOpen) {
			this.#close(keyboard);
		} else {
			this.#open(keyboard);
		}
	}

	#open(keyboard: boolean): void {
		if (this.#isOpen) return;
		this.#isOpen = true;
		this.#openWithKeyboard = keyboard;
		this.#triggerEl.setAttribute('aria-expanded', 'true');
		this.#tippyInstance?.show();
	}

	#close(returnFocus: boolean): void {
		if (!this.#isOpen) return;
		this.#isOpen = false;
		this.#openWithKeyboard = false;
		this.#triggerEl.setAttribute('aria-expanded', 'false');
		this.#tippyInstance?.hide();
		if (returnFocus) this.#triggerEl.focus();
	}

	#focusables(): HTMLElement[] {
		return Array.from(this.#actionsEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
			(el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
		);
	}

	#moveFocus(direction: 1 | -1): void {
		const items = this.#focusables();
		if (items.length === 0) return;

		const currentIndex = items.indexOf(document.activeElement as HTMLElement);
		let nextIndex = currentIndex + direction;
		if (nextIndex < 0) nextIndex = items.length - 1;
		if (nextIndex >= items.length) nextIndex = 0;

		items[nextIndex].focus();
	}

	#focusEdge(first: boolean): void {
		const items = this.#focusables();
		if (items.length === 0) return;
		items[first ? 0 : items.length - 1].focus();
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

	// Renders a validation message below the widget while invalid, mirroring
	// SapphireDropdown. The element only exists while isValid is false.
	#updateValidationMessage(): void {
		if (!this.#isValid) {
			if (!this.#validationMessageEl) {
				this.#validationMessageEl = document.createElement('div');
				this.#validationMessageEl.className = 'validation-message';
				this.widgetEl.after(this.#validationMessageEl);
			}
			this.#validationMessageEl.textContent = this.#validationMessage;
			return;
		}

		this.#validationMessageEl?.remove();
		this.#validationMessageEl = null;
	}

	parametersChanged(payload: IButtonDropdown): void {
		if (!this.widgetEl) return;

		if (payload.enabled !== undefined && payload.enabled !== this.#enabled) {
			this.#enabled = payload.enabled;
			this.widgetEl.dataset.enabled = this.#enabled ? 'true' : 'false';
			if (!this.#enabled) this.#close(false);
		}

		let needsValidationRefresh = false;
		if (payload.isValid !== undefined && payload.isValid !== this.#isValid) {
			this.#isValid = payload.isValid;
			this.widgetEl.dataset.isvalid = this.#isValid ? 'true' : 'false';
			needsValidationRefresh = true;
		}

		if (payload.validationMessage !== undefined && payload.validationMessage !== this.#validationMessage) {
			this.#validationMessage = payload.validationMessage;
			needsValidationRefresh = true;
		}

		if (needsValidationRefresh) {
			this.#updateValidationMessage();
		}

		if (payload.isSplitButton !== undefined && payload.isSplitButton !== this.#isSplitButton) {
			this.#isSplitButton = payload.isSplitButton;
			this.#teardown();
			this.#build();
			this.#initTippy();
			this.#bindEvents();
		}
	}

	#teardown(): void {
		this.#close(false);
		this.#labelEl.removeEventListener('click', this.#onLabelClick);
		this.#labelEl.removeEventListener('keydown', this.#onLabelKeyDown);
		this.#arrowEl?.removeEventListener('click', this.#onArrowClick);
		this.#arrowEl?.removeEventListener('keydown', this.#onArrowKeyDown);
		this.#actionsEl.removeEventListener('click', this.#onPanelClick);
		this.#actionsEl.removeEventListener('keydown', this.#onPanelKeyDown);

		this.#tippyInstance?.destroy();
		this.#tippyInstance = null;

		this.#arrowEl?.remove();
		this.#arrowEl = null;

		this.#triggerEl?.removeAttribute('aria-haspopup');
		this.#triggerEl?.removeAttribute('aria-expanded');
		this.#triggerEl?.removeAttribute('aria-controls');
	}

	destroy(): void {
		super.destroy();
		this.#teardown();
		this.#validationMessageEl?.remove();
		this.#validationMessageEl = null;
	}
}
