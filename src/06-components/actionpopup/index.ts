import { BaseComponent, type BaseComponentInit } from '@core/base';
import Helpers from '@utils/helpers';
import { tmplActionPopup } from './templates';

export interface IActionPopup extends BaseComponentInit {
	actions: {
		OnCancel: () => void;
		OnClose: () => void;
		OnNo: () => void;
		OnYes: () => void;
	};
	closeOnEsc: boolean;
	enabled: boolean;
	hasClose: boolean;
	isOpen: boolean;
	labelCancel: string;
	labelNo: string;
	labelYes: string;
	message: string;
	padding: string;
	theme: string;
	title: string;
	width: string;
}

const FOCUSABLE_SELECTOR = 'button:not([hidden]):not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default class ActionPopup extends BaseComponent {
	#actions!: IActionPopup['actions'];
	#closeOnEsc!: boolean;
	#enabled!: boolean;
	#hasClose!: boolean;
	#isOpen = false;
	#labelCancel!: string;
	#labelNo!: string;
	#labelYes!: string;
	#message!: string;
	#padding!: string;
	#theme!: string;
	#title!: string;
	#width!: string;

	#backdropEl!: HTMLDivElement;
	#dialogEl!: HTMLDivElement;
	#titleEl!: HTMLHeadingElement;
	#messageEl!: HTMLParagraphElement;
	#slotEl!: HTMLDivElement;
	#closeEl!: HTMLButtonElement;
	#cancelEl!: HTMLButtonElement;
	#noEl!: HTMLButtonElement;
	#yesEl!: HTMLButtonElement;
	#lastFocusedEl: HTMLElement | null = null;

	customContentEl!: HTMLDivElement;

	// Buttons emit their event first, then close. Closing after the event keeps
	// any work the handler does (e.g. showing a Toast) from being disrupted by
	// close-time side effects such as focus restoration.
	private readonly onCancel = (): void => {
		if (!this.#enabled) return;
		this.#actions.OnCancel();
		this.close();
	};

	private readonly onNo = (): void => {
		if (!this.#enabled) return;
		this.#actions.OnNo();
		this.close();
	};

	private readonly onYes = (): void => {
		if (!this.#enabled) return;
		this.#actions.OnYes();
		this.close();
	};

	// Close affordances (top-right button + Esc) map to the Cancel action and
	// optimistically hide; OutSystems is expected to flip `isOpen` in its flow.
	private readonly onCloseRequest = (): void => {
		this.#actions.OnCancel();
		this.close();
	};

	private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Escape' || event.key === 'Esc') {
			// `hasClose === false` locks the popup to explicit user actions
			// (buttons), overriding the Esc shortcut.
			if (!this.#hasClose || !this.#closeOnEsc) return;
			event.preventDefault();
			this.onCloseRequest();
			return;
		}

		if (event.key !== 'Tab') return;

		const focusables = Array.from(this.#dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
		if (focusables.length === 0) {
			event.preventDefault();
			this.#dialogEl.focus();
			return;
		}

		const first = focusables[0];
		const last = focusables[focusables.length - 1];
		const active = document.activeElement as HTMLElement | null;

		if (event.shiftKey && (active === first || !this.#dialogEl.contains(active))) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus();
		}
	};

	constructor(config: IActionPopup) {
		super(config);

		if (!this.widgetEl) {
			console.warn('ActionPopup: root element not found for runtimeId', config.runtimeId);
			return;
		}

		this.#actions = config.actions;
		this.#closeOnEsc = config.closeOnEsc;
		this.#enabled = config.enabled;
		this.#hasClose = config.hasClose;
		this.#labelCancel = config.labelCancel ?? '';
		this.#labelNo = config.labelNo ?? '';
		this.#labelYes = config.labelYes ?? '';
		this.#message = config.message ?? '';
		this.#padding = config.padding ?? '';
		this.#theme = config.theme ?? '';
		this.#title = config.title ?? '';
		this.#width = config.width ?? '';

		this.customContentEl = this.widgetEl.querySelector<HTMLDivElement>('.actionpopup-content')!;

		this.buildShell();
		this.reflectStaticContent();
		this.buildButtons();
		this.bindEvents();

		if (config.isOpen) {
			this.open();
		}
	}

	private buildShell(): void {
		const fragment = tmplActionPopup.content.cloneNode(true) as DocumentFragment;

		this.#backdropEl = fragment.querySelector('.actionpopup-backdrop') as HTMLDivElement;
		this.#dialogEl = fragment.querySelector('.actionpopup-dialog') as HTMLDivElement;
		this.#titleEl = fragment.querySelector('.actionpopup-title') as HTMLHeadingElement;
		this.#messageEl = fragment.querySelector('.actionpopup-message') as HTMLParagraphElement;
		this.#slotEl = fragment.querySelector('.actionpopup-content-slot') as HTMLDivElement;
		this.#closeEl = fragment.querySelector('.actionpopup-close') as HTMLButtonElement;
		this.#cancelEl = fragment.querySelector('.actionpopup-cancel') as HTMLButtonElement;
		this.#noEl = fragment.querySelector('.actionpopup-no') as HTMLButtonElement;
		this.#yesEl = fragment.querySelector('.actionpopup-yes') as HTMLButtonElement;

		this.#closeEl.innerHTML = Helpers.placeIcon('x', 's');

		const titleId = `${this.runtimeId}-actionpopup-title`;
		this.#titleEl.id = titleId;
		this.#dialogEl.setAttribute('aria-labelledby', titleId);

		// Move the server-rendered custom content (Placeholder) into the dialog slot.
		if (this.customContentEl) {
			this.#slotEl.appendChild(this.customContentEl);
		}
		this.updateSlotVisibility();

		document.body.appendChild(this.#backdropEl);
	}

	private updateSlotVisibility(): void {
		const hasContent = !!this.customContentEl && (this.customContentEl.childElementCount > 0 || (this.customContentEl.textContent ?? '').trim() !== '');
		this.#slotEl.hidden = !hasContent;
	}

	private reflectStaticContent(): void {
		this.#titleEl.textContent = this.#title;
		this.#titleEl.hidden = this.#title === '';

		this.#messageEl.textContent = this.#message;
		this.#messageEl.hidden = this.#message === '';

		this.#dialogEl.dataset.padding = this.#padding || 'm';
		if (this.#theme) {
			this.#backdropEl.dataset.theme = this.#theme;
		} else {
			delete this.#backdropEl.dataset.theme;
		}

		this.#dialogEl.style.width = this.#width || '';
		this.#backdropEl.dataset.enabled = this.#enabled ? 'true' : 'false';
		this.#closeEl.hidden = !this.#hasClose;
	}

	private buildButtons(): void {
		this.setButton(this.#cancelEl, this.#labelCancel);
		this.setButton(this.#noEl, this.#labelNo);
		this.setButton(this.#yesEl, this.#labelYes, 'check-bold');
	}

	private setButton(button: HTMLButtonElement, label: string, icon?: string): void {
		if (!label) {
			button.hidden = true;
			button.textContent = '';
			return;
		}

		button.hidden = false;
		button.textContent = '';
		button.disabled = !this.#enabled;

		if (icon) {
			button.insertAdjacentHTML('afterbegin', Helpers.placeIcon(icon, 's'));
			button.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');
		}

		const labelEl = document.createElement('span');
		labelEl.className = 'actionpopup-btn-label';
		labelEl.textContent = label;
		button.appendChild(labelEl);
	}

	private bindEvents(): void {
		this.#closeEl.addEventListener('click', this.onCloseRequest);
		this.#cancelEl.addEventListener('click', this.onCancel);
		this.#noEl.addEventListener('click', this.onNo);
		this.#yesEl.addEventListener('click', this.onYes);
	}

	private unbindEvents(): void {
		this.#closeEl?.removeEventListener('click', this.onCloseRequest);
		this.#cancelEl?.removeEventListener('click', this.onCancel);
		this.#noEl?.removeEventListener('click', this.onNo);
		this.#yesEl?.removeEventListener('click', this.onYes);
	}

	open(): void {
		if (this.#isOpen) return;
		this.#isOpen = true;

		this.#lastFocusedEl = document.activeElement as HTMLElement | null;

		this.#backdropEl.hidden = false;
		this.#backdropEl.dataset.open = 'true';
		document.body.classList.add('actionpopup-locked');
		document.addEventListener('keydown', this.onDocumentKeydown);

		const firstFocusable = this.#dialogEl.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? this.#dialogEl;
		firstFocusable.focus();
	}

	close(): void {
		if (!this.#isOpen) return;
		// Flip state before emitting OnClose so a handler that sets IsOpen=false
		// re-enters this method and short-circuits here instead of looping.
		this.#isOpen = false;

		this.#backdropEl.dataset.open = 'false';
		this.#backdropEl.hidden = true;
		document.body.classList.remove('actionpopup-locked');
		document.removeEventListener('keydown', this.onDocumentKeydown);

		this.#lastFocusedEl?.focus?.();
		this.#lastFocusedEl = null;

		this.#actions.OnClose();
	}

	parametersChanged(payload: IActionPopup): void {
		if (!this.widgetEl) return;

		if (payload.enabled !== undefined && payload.enabled !== this.#enabled) {
			this.#enabled = payload.enabled;
			this.#backdropEl.dataset.enabled = this.#enabled ? 'true' : 'false';
			this.buildButtons();
		}

		if (payload.hasClose !== undefined && payload.hasClose !== this.#hasClose) {
			this.#hasClose = payload.hasClose;
			this.#closeEl.hidden = !this.#hasClose;
		}

		if (payload.title !== undefined && (payload.title ?? '') !== this.#title) {
			this.#title = payload.title ?? '';
			this.#titleEl.textContent = this.#title;
			this.#titleEl.hidden = this.#title === '';
		}

		if (payload.message !== undefined && (payload.message ?? '') !== this.#message) {
			this.#message = payload.message ?? '';
			this.#messageEl.textContent = this.#message;
			this.#messageEl.hidden = this.#message === '';
		}

		if (payload.labelCancel !== undefined && (payload.labelCancel ?? '') !== this.#labelCancel) {
			this.#labelCancel = payload.labelCancel ?? '';
			this.setButton(this.#cancelEl, this.#labelCancel);
		}

		if (payload.labelNo !== undefined && (payload.labelNo ?? '') !== this.#labelNo) {
			this.#labelNo = payload.labelNo ?? '';
			this.setButton(this.#noEl, this.#labelNo);
		}

		if (payload.labelYes !== undefined && (payload.labelYes ?? '') !== this.#labelYes) {
			this.#labelYes = payload.labelYes ?? '';
			this.setButton(this.#yesEl, this.#labelYes, 'check-bold');
		}

		if (payload.padding !== undefined && (payload.padding ?? '') !== this.#padding) {
			this.#padding = payload.padding ?? '';
			this.#dialogEl.dataset.padding = this.#padding || 'm';
		}

		if (payload.theme !== undefined && (payload.theme ?? '') !== this.#theme) {
			this.#theme = payload.theme ?? '';
			if (this.#theme) {
				this.#backdropEl.dataset.theme = this.#theme;
			} else {
				delete this.#backdropEl.dataset.theme;
			}
		}

		if (payload.width !== undefined && (payload.width ?? '') !== this.#width) {
			this.#width = payload.width ?? '';
			this.#dialogEl.style.width = this.#width || '';
		}

		if (payload.closeOnEsc !== undefined) {
			this.#closeOnEsc = payload.closeOnEsc;
		}

		this.updateSlotVisibility();

		if (payload.isOpen !== undefined && payload.isOpen !== this.#isOpen) {
			if (payload.isOpen) {
				this.open();
			} else {
				this.close();
			}
		}
	}

	destroy(): void {
		super.destroy();
		this.unbindEvents();
		document.removeEventListener('keydown', this.onDocumentKeydown);
		document.body.classList.remove('actionpopup-locked');
		this.#backdropEl?.remove();
	}
}
