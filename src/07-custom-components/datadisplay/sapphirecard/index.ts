import { BaseComponent, type BaseComponentInit } from '@core/base';
import Helpers from '@utils/helpers';

interface ISapphireCardConfig {
	HasExpandable: boolean;
	HasFavorite: boolean;
	HasSelectable: boolean;
	IsFavorite: boolean;
	IsOpen: boolean;
	IsSelected: boolean;
}

type SapphireCardDensity = 'dense' | 'compact' | 'default' | 'comfortable';

const DENSITIES: readonly SapphireCardDensity[] = ['dense', 'compact', 'default', 'comfortable'];

interface ISapphireCard extends BaseComponentInit {
	actions: {
		OnToggleFavorite: (isFavorite: boolean) => void;
		OnToggleOpen: (isOpen: boolean) => void;
		OnToggleSelect: (isSelected: boolean) => void;
	};
	config: ISapphireCardConfig;
	density: SapphireCardDensity;
	enabled: boolean;
	height: number;
	maxHeight: number;
	theme: string;
}

// Clicks on these, when they sit inside the header, run the control and do not toggle the card.
const HEADER_CONTROL_SELECTOR = 'a, button, input, select, textarea, label, .btn, [role="button"], [role="checkbox"], [role="link"], [role="switch"], [contenteditable="true"]';
const HEADER_ACTIONS_SELECTOR = '.sapphirecard-header-actionswhenclosed, .sapphirecard-header-actionswhenopen';
const CAPABILITIES_SELECTOR = '.sapphirecard-capabilities';

export default class SapphireCard extends BaseComponent {
	private actions!: ISapphireCard['actions'];
	private capabilitiesEl: HTMLElement | null = null;
	private cardHeaderEl: HTMLElement | null = null;
	private density: SapphireCardDensity = 'default';
	private enabled = true;
	private hasFavorite = false;
	private hasSelectable = false;
	private height = 0;
	private isExpandable = true;
	private isFavorite = false;
	private isOpen = false;
	private isSelected = false;
	private maxHeight = 0;
	private missingHeaderWarned = false;
	private theme = '';

	private readonly onCapabilitiesClick = (event: MouseEvent): void => {
		if (!this.enabled) return;

		const target = event.target;
		if (!(target instanceof Element)) return;

		event.stopPropagation();

		if (target.closest('.sapphirecard-capabilities-favorite')) {
			this.setFavorite(!this.isFavorite);
			return;
		}

		if (target.closest('.sapphirecard-capabilities-selectable')) {
			this.setSelected(!this.isSelected);
		}
	};

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

		console.log('SapphireCard: constructor', init);

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
		this.removeCapabilities();
		super.destroy();
	}

	private applyConfig(payload: Partial<ISapphireCard>): void {
		if (payload.density !== undefined) {
			this.density = this.readDensity(payload.density);
		}
		if (payload.enabled !== undefined) {
			this.enabled = Boolean(payload.enabled);
		}
		if (payload.height !== undefined) {
			this.height = this.readSize(payload.height);
		}
		if (payload.maxHeight !== undefined) {
			this.maxHeight = this.readSize(payload.maxHeight);
		}
		if (payload.theme !== undefined) {
			this.theme = payload.theme ?? '';
		}
		if (payload.config) {
			this.applyCardConfig(payload.config);
		}
	}

	private applyCardConfig(config: Partial<ISapphireCardConfig>): void {
		if (config.HasExpandable !== undefined) {
			this.isExpandable = Boolean(config.HasExpandable);
		}
		if (config.HasFavorite !== undefined) {
			this.hasFavorite = Boolean(config.HasFavorite);
		}
		if (config.HasSelectable !== undefined) {
			this.hasSelectable = Boolean(config.HasSelectable);
		}
		if (config.IsFavorite !== undefined) {
			this.isFavorite = Boolean(config.IsFavorite);
		}
		if (config.IsOpen !== undefined) {
			this.isOpen = Boolean(config.IsOpen);
		}
		if (config.IsSelected !== undefined) {
			this.isSelected = Boolean(config.IsSelected);
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
		if (actions && header.contains(actions)) return true;

		const capabilities = target.closest(CAPABILITIES_SELECTOR);
		return Boolean(capabilities && header.contains(capabilities));
	}

	private setOpen(next: boolean): void {
		if (!this.widgetEl || this.isOpen === next) return;

		// Flip first so a synchronous action that writes the same flag back
		// re-enters parametersChanged with the same value.
		this.isOpen = next;
		this.render();
		this.actions.OnToggleOpen(next);
	}

	private setFavorite(next: boolean): void {
		if (!this.widgetEl || !this.hasFavorite || this.isFavorite === next) return;

		this.isFavorite = next;
		this.render();
		this.actions.OnToggleFavorite(next);
	}

	private setSelected(next: boolean): void {
		if (!this.widgetEl || !this.hasSelectable || this.isSelected === next) return;

		this.isSelected = next;
		this.render();
		this.actions.OnToggleSelect(next);
	}

	private render(): void {
		if (!this.widgetEl) return;

		const root = this.widgetEl;
		const constrained = this.height > 0 || this.maxHeight > 0;

		root.classList.add('sapphirecard');
		root.dataset.constrained = constrained ? 'true' : 'false';
		root.dataset.density = this.density;
		root.dataset.enabled = this.enabled ? 'true' : 'false';
		root.dataset.hasfavorite = this.hasFavorite ? 'true' : 'false';
		root.dataset.hasmaxheight = this.maxHeight > 0 ? 'true' : 'false';
		root.dataset.hasspecificheight = this.height > 0 ? 'true' : 'false';
		root.dataset.hasselectable = this.hasSelectable ? 'true' : 'false';
		root.dataset.isexpandable = this.isExpandable ? 'true' : 'false';
		root.dataset.isfavorite = this.isFavorite ? 'true' : 'false';
		root.dataset.isopen = this.isOpen ? 'true' : 'false';
		root.dataset.isselected = this.isSelected ? 'true' : 'false';

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

		this.renderCapabilities();

		if (!this.cardHeaderEl) return;

		if (this.canToggle()) {
			this.cardHeaderEl.setAttribute('aria-expanded', this.isOpen ? 'true' : 'false');
		} else {
			this.cardHeaderEl.removeAttribute('aria-expanded');
		}
	}

	private renderCapabilities(): void {
		const header = this.cardHeaderEl;
		if (!header) return;

		if (!this.hasFavorite && !this.hasSelectable) {
			this.removeCapabilities();
			return;
		}

		if (!this.capabilitiesEl?.isConnected || this.capabilitiesEl.parentElement !== header) {
			this.removeCapabilities();
			this.capabilitiesEl = document.createElement('div');
			this.capabilitiesEl.className = 'sapphirecard-capabilities';
			this.capabilitiesEl.addEventListener('click', this.onCapabilitiesClick);
			header.prepend(this.capabilitiesEl);
		}

		const favoriteIcon = this.isFavorite ? 'star-full' : 'star';
		const selectableIcon = this.isSelected ? 'check-square' : 'square';
		this.capabilitiesEl.replaceChildren();
		if (this.hasFavorite) {
			this.capabilitiesEl.append(this.createCapabilityIcon('favorite', favoriteIcon, this.isFavorite));
		}
		if (this.hasSelectable) {
			this.capabilitiesEl.append(this.createCapabilityIcon('selectable', selectableIcon, this.isSelected));
		}
	}

	private removeCapabilities(): void {
		this.capabilitiesEl?.removeEventListener('click', this.onCapabilitiesClick);
		this.capabilitiesEl?.remove();
		this.capabilitiesEl = null;
	}

	private createCapabilityIcon(name: 'favorite' | 'selectable', icon: string, pressed: boolean): HTMLButtonElement {
		const el = document.createElement('button');
		el.type = 'button';
		el.className = `sapphirecard-capabilities-${name}`;
		el.dataset.icon = icon;
		el.disabled = !this.enabled;
		el.setAttribute('aria-pressed', pressed ? 'true' : 'false');
		el.innerHTML = Helpers.placeIcon(icon, 'm');
		el.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');
		return el;
	}

	private readDensity(value: string): SapphireCardDensity {
		const density = value.toLowerCase();
		return DENSITIES.includes(density as SapphireCardDensity) ? (density as SapphireCardDensity) : 'default';
	}

	private readSize(value: number): number {
		const size = Number(value);
		return Number.isFinite(size) && size > 0 ? size : 0;
	}
}
