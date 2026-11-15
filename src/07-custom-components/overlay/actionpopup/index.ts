import { BaseComponent, type BaseComponentInit } from '@core/base';
import Helpers from '@utils/helpers';
import { tmplActionPopup } from './templates';
import topWindowCss from './top-window.inline.scss?inline';

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

const HOST_STYLE_ID = 'sapphire-actionpopup-host-styles';
const ICON_SPRITE_SELECTOR = 'svg[data-svg-icon-sprite]';
// Inherited text styles copied from the iframe so the popup reads the same in the top window.
const INHERITED_TEXT_PROPS = ['color', 'font-family', 'font-size', 'font-weight', 'letter-spacing', 'line-height'];

// Design tokens the injected stylesheet reads, so only those are copied from the
// iframe. Variables the stylesheet declares itself (e.g. `--btn-ring`) are skipped.
const HOST_TOKEN_NAMES = ((): string[] => {
	const declared = new Set(Array.from(topWindowCss.matchAll(/(--[\w-]+)\s*:/g), (m) => m[1]));
	const used = new Set(Array.from(topWindowCss.matchAll(/var\(\s*(--[\w-]+)/g), (m) => m[1]));
	return [...used].filter((name) => !declared.has(name));
})();

// The top window may not load this library (e.g. a Traditional app), so it gets
// the popup's own stylesheet once.
function ensureHostStyles(hostDoc: Document): void {
	if (hostDoc.getElementById(HOST_STYLE_ID)) return;
	const style = hostDoc.createElement('style');
	style.id = HOST_STYLE_ID;
	style.textContent = topWindowCss;
	hostDoc.head.appendChild(style);
}

// Icons are `<use>` references to the sprite, which only exists in the iframe's document.
function ensureHostIconSprite(hostDoc: Document): void {
	if (hostDoc.querySelector(ICON_SPRITE_SELECTOR)) return;
	const sprite = document.querySelector(ICON_SPRITE_SELECTOR);
	if (!sprite) return;

	const container = hostDoc.createElement('div');
	container.setAttribute('aria-hidden', 'true');
	container.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
	container.appendChild(hostDoc.importNode(sprite, true));
	hostDoc.body.prepend(container);
}

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

	// The popup opens in the top window so it covers the whole page when this
	// component runs inside an iframe (always same-origin). Outside an iframe the
	// host is this window and nothing moves.
	#hostDoc: Document = (window.top ?? window).document;

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
		const active = this.#hostDoc.activeElement as HTMLElement | null;

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

	// Moves the backdrop into the top window while open. The Content placeholder
	// moves with it and still renders, but its Reactive events do not fire there:
	// React listens for events at its root in this document, and clicks in the top
	// window never bubble up to it. Widgets that use this document or window
	// (e.g. date pickers) break the same way.
	// It lives in this document while closed, so nothing is left in the top window
	// when the iframe goes away.
	private mountInHost(): void {
		if (this.#hostDoc === document) return;

		ensureHostStyles(this.#hostDoc);
		ensureHostIconSprite(this.#hostDoc);
		this.copyOwnerContext();
		this.#hostDoc.body.appendChild(this.#backdropEl);
		window.addEventListener('pagehide', this.onOwnerPageHide);
	}

	private unmountFromHost(): void {
		if (this.#hostDoc === document) return;

		window.removeEventListener('pagehide', this.onOwnerPageHide);
		document.body.appendChild(this.#backdropEl);
	}

	// Design tokens, text styles and direction come from this document; the top
	// window may define them differently or not at all.
	private copyOwnerContext(): void {
		const bodyStyle = getComputedStyle(document.body);

		for (const name of HOST_TOKEN_NAMES) {
			const value = bodyStyle.getPropertyValue(name);
			if (value) {
				this.#backdropEl.style.setProperty(name, value);
			}
		}

		for (const name of INHERITED_TEXT_PROPS) {
			this.#backdropEl.style.setProperty(name, bodyStyle.getPropertyValue(name));
		}

		this.#backdropEl.dir = bodyStyle.direction;
	}

	// The iframe is unloading while the popup is open (Traditional postback,
	// navigation, iframe removed): clean up the top window.
	private readonly onOwnerPageHide = (): void => {
		this.releaseHost();
		this.#backdropEl.remove();
	};

	private releaseHost(): void {
		this.#hostDoc.body.classList.remove('actionpopup-locked');
		this.#hostDoc.removeEventListener('keydown', this.onDocumentKeydown);
		window.removeEventListener('pagehide', this.onOwnerPageHide);
	}

	open(): void {
		if (this.#isOpen) return;
		this.#isOpen = true;

		this.#lastFocusedEl = document.activeElement as HTMLElement | null;

		this.mountInHost();
		this.#backdropEl.hidden = false;
		this.#backdropEl.dataset.open = 'true';
		this.#hostDoc.body.classList.add('actionpopup-locked');
		this.#hostDoc.addEventListener('keydown', this.onDocumentKeydown);

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
		this.releaseHost();
		this.unmountFromHost();

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
		this.releaseHost();
		this.#backdropEl?.remove();
	}
}
