import { BaseComponent, type BaseComponentInit } from '@core/base';

interface ISapphireCard extends BaseComponentInit {
	actions: {
		OnToggle: (isOpen: boolean) => void;
	};
	enabled: boolean;
	height: number;
	isExpandable: boolean;
	isOpen: boolean;
	maxHeight: number;
	theme: string;
}

// Clicks on these, when they sit inside the header, run the control and do not toggle the card.
const HEADER_CONTROL_SELECTOR = 'a, button, input, select, textarea, label, .btn, [role="button"], [role="checkbox"], [role="link"], [role="switch"], [contenteditable="true"]';
const HEADER_ACTIONS_SELECTOR = '.sapphirecard-header-actionswhenclosed, .sapphirecard-header-actionswhenopen';

export default class SapphireCard extends BaseComponent {
	private actions!: ISapphireCard['actions'];
	private cardHeaderEl: HTMLElement | null = null;
	private enabled = true;
	private height = 0;
	private isExpandable = true;
	private isOpen = false;
	private maxHeight = 0;
	private missingHeaderWarned = false;
	private theme = '';

	private readonly onHeaderClick = (event: MouseEvent): void => {
		if (!this.canToggle()) return;
		const target = event.target;
		if (!(target instanceof Element) || this.isHeaderControl(target)) return;
		this.setOpen(!this.isOpen);
	};

	constructor(init: ISapphireCard) {
		super(init);

		if (!this.widgetEl) {
			console.warn('SapphireCard: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.applyConfig(init);
		this.mount();
	}

	parametersChanged(payload: ISapphireCard): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) return;

		if (this.widgetEl !== liveEl) {
			this.unbind();
			this.widgetEl = liveEl;
		}

		if (payload.actions) {
			this.actions = payload.actions;
		}

		this.applyConfig(payload);
		this.mount();
	}

	destroy(): void {
		this.unbind();
		super.destroy();
	}

	private applyConfig(payload: Partial<ISapphireCard>): void {
		if (payload.enabled !== undefined) {
			this.enabled = Boolean(payload.enabled);
		}
		if (payload.height !== undefined) {
			this.height = this.readSize(payload.height);
		}
		if (payload.isExpandable !== undefined) {
			this.isExpandable = Boolean(payload.isExpandable);
		}
		if (payload.isOpen !== undefined) {
			this.isOpen = Boolean(payload.isOpen);
		}
		if (payload.maxHeight !== undefined) {
			this.maxHeight = this.readSize(payload.maxHeight);
		}
		if (payload.theme !== undefined) {
			this.theme = payload.theme ?? '';
		}
	}

	private mount(): void {
		if (!this.widgetEl) return;

		this.unbind();
		this.cardHeaderEl = this.widgetEl.querySelector(':scope > .sapphirecard-header');

		if (!this.cardHeaderEl && !this.missingHeaderWarned) {
			this.missingHeaderWarned = true;
			console.warn('SapphireCard: .sapphirecard-header not found for runtimeId', this.runtimeId);
		}

		this.bind();
		this.render();
	}

	private bind(): void {
		this.cardHeaderEl?.addEventListener('click', this.onHeaderClick);
	}

	private unbind(): void {
		this.cardHeaderEl?.removeEventListener('click', this.onHeaderClick);
	}

	private canToggle(): boolean {
		return Boolean(this.widgetEl) && this.enabled && this.isExpandable;
	}

	private isHeaderControl(target: Element): boolean {
		const header = this.cardHeaderEl;
		if (!header) return false;

		const control = target.closest(HEADER_CONTROL_SELECTOR);
		if (control && header.contains(control)) return true;

		const actions = target.closest(HEADER_ACTIONS_SELECTOR);
		return Boolean(actions && header.contains(actions));
	}

	private setOpen(next: boolean): void {
		if (!this.widgetEl || this.isOpen === next) return;

		// Flip first so a synchronous OnToggle that writes isOpen back
		// re-enters parametersChanged with the same value.
		this.isOpen = next;
		this.render();
		this.actions.OnToggle(next);
	}

	private render(): void {
		if (!this.widgetEl) return;

		const root = this.widgetEl;
		const constrained = this.height > 0 || this.maxHeight > 0;

		root.classList.add('sapphirecard');
		root.dataset.constrained = constrained ? 'true' : 'false';
		root.dataset.enabled = this.enabled ? 'true' : 'false';
		root.dataset.hasmaxheight = this.maxHeight > 0 ? 'true' : 'false';
		root.dataset.hasspecificheight = this.height > 0 ? 'true' : 'false';
		root.dataset.isexpandable = this.isExpandable ? 'true' : 'false';
		root.dataset.isopen = this.isOpen ? 'true' : 'false';

		if (this.theme) {
			root.dataset.theme = this.theme;
		} else {
			delete root.dataset.theme;
		}

		if (this.height > 0) {
			root.style.setProperty('--sapphirecard-height', `${this.height}px`);
		} else {
			root.style.removeProperty('--sapphirecard-height');
		}

		if (this.maxHeight > 0) {
			root.style.setProperty('--sapphirecard-max-height', `${this.maxHeight}px`);
		} else {
			root.style.removeProperty('--sapphirecard-max-height');
		}

		if (!this.cardHeaderEl) return;

		if (this.canToggle()) {
			this.cardHeaderEl.setAttribute('aria-expanded', this.isOpen ? 'true' : 'false');
		} else {
			this.cardHeaderEl.removeAttribute('aria-expanded');
		}
	}

	private readSize(value: number): number {
		const size = Number(value);
		return Number.isFinite(size) && size > 0 ? size : 0;
	}
}
