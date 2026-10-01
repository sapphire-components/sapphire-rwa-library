import { BaseComponent, type BaseComponentInit } from '@core/base';
import Helpers from '@utils/helpers';

interface ISidePanel extends BaseComponentInit {
	actions: {
		OnToggle: (IsOpen_out: boolean) => void;
	};
	closeOnEsc: boolean;
	enabled: boolean;
	hasClose: boolean;
	hasOverlay: boolean;
	isOpen: boolean;
	theme: string;
}

const FOCUSABLE_SELECTOR = 'button:not([hidden]):not(:disabled), [href], input:not([hidden]):not(:disabled), select:not([hidden]):not(:disabled), textarea:not([hidden]):not(:disabled), [tabindex]:not([tabindex="-1"])';

export default class SidePanel extends BaseComponent {
	private actions!: ISidePanel['actions'];
	private closeOnEsc = false;
	private hasClose = false;
	private hasOverlay = false;
	private isOpen = false;

	private backdropEl: HTMLDivElement | null = null;
	private closeEl: HTMLButtonElement | null = null;
	private lastFocusedEl: HTMLElement | null = null;

	private readonly onBackdropClick = (): void => {
		if (!this.closeOnEsc || !this.isOpen) return;
		this.requestClose();
	};

	private readonly onCloseClick = (): void => {
		this.requestClose();
	};

	private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
		if (!this.isOpen) return;

		if (event.key === 'Escape' || event.key === 'Esc') {
			if (!this.closeOnEsc) return;
			event.preventDefault();
			event.stopPropagation();
			this.requestClose();
			return;
		}

		if (event.key === 'Tab' && this.hasOverlay) {
			this.trapTab(event);
		}
	};

	constructor(configOptions: ISidePanel) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('SidePanel: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		this.actions = configOptions.actions;
		this.closeOnEsc = configOptions.closeOnEsc;
		this.hasClose = configOptions.hasClose;
		this.hasOverlay = configOptions.hasOverlay;
		this.isOpen = configOptions.isOpen;

		// Fixed positioning is trapped by transformed ancestors. The panel has to
		// live on body to cover the viewport.
		document.body.appendChild(this.widgetEl);
		this.widgetEl.setAttribute('role', 'dialog');
		this.widgetEl.tabIndex = -1;
		this.mountBody();
		this.ensureCloseButton();

		this.render();
	}

	parametersChanged(payload: ISidePanel): void {
		if (!this.widgetEl) return;

		let chromeChanged = false;

		if (payload.closeOnEsc !== undefined && payload.closeOnEsc !== this.closeOnEsc) {
			this.closeOnEsc = payload.closeOnEsc;
			chromeChanged = true;
		}

		if (payload.hasClose !== undefined && payload.hasClose !== this.hasClose) {
			this.hasClose = payload.hasClose;
			chromeChanged = true;
		}

		if (payload.hasOverlay !== undefined && payload.hasOverlay !== this.hasOverlay) {
			this.hasOverlay = payload.hasOverlay;
			chromeChanged = true;
		}

		if (payload.isOpen !== undefined && payload.isOpen !== this.isOpen) {
			this.isOpen = payload.isOpen;
			chromeChanged = true;
		}

		if (chromeChanged) {
			this.render();
		}
	}

	toggle(): void {
		this.setOpen(!this.isOpen);
	}

	destroy(): void {
		super.destroy();
		document.removeEventListener('keydown', this.onDocumentKeydown);
		this.closeEl?.removeEventListener('click', this.onCloseClick);
		this.closeEl?.remove();
		this.closeEl = null;
		this.removeBackdrop();
		document.body.classList.remove('sidepanel-locked');
	}

	private requestClose(): void {
		this.setOpen(false);
	}

	private setOpen(next: boolean): void {
		if (!this.widgetEl || this.isOpen === next) return;
		// Flip first so a synchronous OnToggle that sets IsOpen re-enters
		// parametersChanged and short-circuits instead of applying twice.
		this.isOpen = next;
		this.render();
		this.actions.OnToggle(next);
	}

	private mountBody(): void {
		if (this.widgetEl.querySelector(':scope > .sidepanel-body')) return;

		const body = document.createElement('div');
		body.className = 'sidepanel-body';
		while (this.widgetEl.firstChild) {
			body.appendChild(this.widgetEl.firstChild);
		}
		this.widgetEl.appendChild(body);
	}

	private ensureCloseButton(): void {
		const existing = this.widgetEl.querySelector(':scope > .sidepanel-close');
		if (existing instanceof HTMLButtonElement) {
			this.closeEl = existing;
			this.closeEl.addEventListener('click', this.onCloseClick);
			return;
		}

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'sidepanel-close btn btn-small btn-icon btn-tertiary';
		button.setAttribute('aria-label', 'Close');
		button.innerHTML = Helpers.placeIcon('x', 's');
		button.addEventListener('click', this.onCloseClick);
		this.widgetEl.prepend(button);
		this.closeEl = button;
	}

	private render(): void {
		const wasOpen = this.widgetEl.dataset.open === 'true';

		if (this.isOpen) {
			if (!wasOpen) {
				this.rememberFocus();
			}
			// Drop aria-hidden before the panel is shown. Setting it while the
			// close button is focused makes the browser reject the attribute.
			this.widgetEl.inert = false;
			this.widgetEl.removeAttribute('aria-hidden');
			this.widgetEl.dataset.open = 'true';
		} else {
			if (wasOpen || this.widgetEl.contains(document.activeElement)) {
				this.releaseFocus();
			}
			delete this.widgetEl.dataset.open;
			this.widgetEl.removeAttribute('aria-hidden');
			this.widgetEl.inert = true;
		}

		this.widgetEl.setAttribute('aria-modal', this.hasOverlay && this.isOpen ? 'true' : 'false');
		this.widgetEl.dataset.hasclose = this.hasClose ? 'true' : 'false';

		if (this.closeEl) {
			this.closeEl.hidden = !this.hasClose;
		}

		document.removeEventListener('keydown', this.onDocumentKeydown);
		if (this.isOpen) {
			document.addEventListener('keydown', this.onDocumentKeydown);
		}

		this.renderOverlay();

		if (this.isOpen && !wasOpen) {
			this.focusInside();
		}
	}

	private renderOverlay(): void {
		if (!this.hasOverlay) {
			this.removeBackdrop();
			document.body.classList.remove('sidepanel-locked');
			return;
		}

		if (!this.backdropEl) {
			this.backdropEl = document.createElement('div');
			this.backdropEl.className = 'sidepanel-backdrop';
			this.backdropEl.addEventListener('click', this.onBackdropClick);
			document.body.insertBefore(this.backdropEl, this.widgetEl);
		}

		this.backdropEl.dataset.closeonesc = this.closeOnEsc ? 'true' : 'false';

		if (this.isOpen) {
			this.backdropEl.dataset.open = 'true';
			document.body.classList.add('sidepanel-locked');
		} else {
			delete this.backdropEl.dataset.open;
			document.body.classList.remove('sidepanel-locked');
		}
	}

	private focusableElements(root: ParentNode = this.widgetEl): HTMLElement[] {
		return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => !el.closest('[hidden]'));
	}

	private focusInside(): void {
		void this.widgetEl.offsetWidth;

		const body = this.widgetEl.querySelector('.sidepanel-body');
		const inContent = body ? this.focusableElements(body)[0] : undefined;
		const target = inContent ?? (this.closeEl && !this.closeEl.hidden ? this.closeEl : this.widgetEl);
		target.focus();
	}

	private trapTab(event: KeyboardEvent): void {
		const focusables = this.focusableElements();
		if (focusables.length === 0) {
			event.preventDefault();
			this.widgetEl.focus();
			return;
		}

		const first = focusables[0];
		const last = focusables[focusables.length - 1];
		const active = document.activeElement;

		if (!(active instanceof HTMLElement) || !this.widgetEl.contains(active)) {
			event.preventDefault();
			(event.shiftKey ? last : first).focus();
			return;
		}

		if (event.shiftKey && active === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus();
		}
	}

	private rememberFocus(): void {
		const active = document.activeElement;
		if (active instanceof HTMLElement && !this.widgetEl.contains(active)) {
			this.lastFocusedEl = active;
		}
	}

	private releaseFocus(): void {
		const active = document.activeElement;
		if (!(active instanceof HTMLElement) || !this.widgetEl.contains(active)) return;

		const restore = this.lastFocusedEl;
		this.lastFocusedEl = null;

		if (restore && restore.isConnected && !this.widgetEl.contains(restore)) {
			restore.focus();
			return;
		}

		active.blur();
	}

	private removeBackdrop(): void {
		this.backdropEl?.removeEventListener('click', this.onBackdropClick);
		this.backdropEl?.remove();
		this.backdropEl = null;
	}
}
