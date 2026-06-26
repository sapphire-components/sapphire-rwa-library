import { BaseComponent, type BaseComponentInit } from '../../core/base';
import Helpers from '../../09-utils/helpers';

export interface IChip extends BaseComponentInit {
	actions: {
		OnClear: () => void;
		OnClick: () => void;
		OnToggle: (isSelected: boolean) => void;
	};
	enabled: boolean;
	hasClear: boolean;
	icon: string;
	isClickable: boolean;
	isSelectable: boolean;
	isSelected: boolean;
	theme: string;
}

export default class Chip extends BaseComponent {
	#actions!: IChip['actions'];
	#clearEl: HTMLButtonElement | null = null;
	#enabled!: boolean;
	#hasClear!: boolean;
	#icon!: string;
	#iconEl: HTMLElement | null = null;
	#isClickable!: boolean;
	#isSelectable!: boolean;
	#isSelected!: boolean;
	#theme!: string;
	chipContentEl!: HTMLElement;

	private readonly onClearClick = (event: MouseEvent): void => {
		event.preventDefault();
		event.stopPropagation();
		if (!this.#enabled) return;
		this.#actions.OnClear();
	};

	private readonly onClearKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
		event.preventDefault();
		event.stopPropagation();
		if (!this.#enabled) return;
		this.#actions.OnClear();
	};

	private readonly onClickableClick = (event: MouseEvent): void => {
		if (!this.#enabled || !this.#isClickable) return;
		if ((event.target as HTMLElement).closest('.chip-clear')) return;
		this.#actions.OnClick();
	};

	private readonly onClickableKeyDown = (event: KeyboardEvent): void => {
		if (!this.#enabled || !this.#isClickable) return;
		if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
		event.preventDefault();
		this.#actions.OnClick();
	};

	private readonly onToggleClick = (event: MouseEvent): void => {
		if (!this.#enabled || !this.#isSelectable) return;
		if ((event.target as HTMLElement).closest('.chip-clear')) return;
		event.preventDefault();
		this.emitToggle();
	};

	private readonly onToggleKeyDown = (event: KeyboardEvent): void => {
		if (!this.#enabled || !this.#isSelectable) return;
		if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
		event.preventDefault();
		this.emitToggle();
	};

	constructor(config: IChip) {
		super(config);

		if (!this.widgetEl) {
			console.warn('Chip: root element not found for runtimeId', config.runtimeId);
			return;
		}

		this.#actions = config.actions;
		this.#enabled = config.enabled;
		this.#hasClear = config.hasClear;
		this.#icon = config.icon ?? '';
		this.#isClickable = config.isClickable;
		this.#isSelectable = config.isSelectable;
		this.#isSelected = config.isSelected;
		this.#theme = config.theme ?? '';

		this.chipContentEl = this.widgetEl.querySelector<HTMLElement>('.chip-content')!;

		this.reflectStateAttributes();
		this.buildIcon();
		this.buildClearButton();
		this.updateInteraction();
		this.bindEvents();
	}

	private reflectStateAttributes(): void {
		this.widgetEl.dataset.enabled = this.#enabled ? 'true' : 'false';
		this.widgetEl.dataset.hasclear = this.#hasClear ? 'true' : 'false';
		this.widgetEl.dataset.isclickable = this.#isClickable ? 'true' : 'false';
		this.widgetEl.dataset.isselectable = this.#isSelectable ? 'true' : 'false';
		this.widgetEl.dataset.isselected = this.#isSelected ? 'true' : 'false';
		if (this.#theme) {
			this.widgetEl.dataset.theme = this.#theme;
		} else {
			delete this.widgetEl.dataset.theme;
		}
	}

	private currentIsSelected(): boolean {
		return this.widgetEl.dataset.isselected === 'true';
	}

	private emitToggle(): void {
		this.#actions.OnToggle(this.currentIsSelected());
	}

	private syncAriaPressed(): void {
		if (!this.#isSelectable) return;
		this.widgetEl.setAttribute('aria-pressed', this.currentIsSelected() ? 'true' : 'false');
	}

	private updateInteraction(): void {
		if (this.#isSelectable || this.#isClickable) {
			this.widgetEl.setAttribute('role', 'button');
			this.widgetEl.tabIndex = this.#enabled ? 0 : -1;
			this.widgetEl.toggleAttribute('aria-disabled', !this.#enabled);
			this.syncAriaPressed();
			return;
		}

		this.widgetEl.removeAttribute('role');
		this.widgetEl.removeAttribute('aria-pressed');
		this.widgetEl.removeAttribute('aria-disabled');
		this.widgetEl.tabIndex = -1;
	}

	private buildIcon(): void {
		this.removeIcon();

		if (!this.#icon) return;

		this.#iconEl = document.createElement('span');
		this.#iconEl.className = 'chip-icon';
		this.#iconEl.innerHTML = Helpers.placeIcon(this.#icon, 's');
		this.#iconEl.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');

		this.widgetEl.insertBefore(this.#iconEl, this.chipContentEl);
	}

	private removeIcon(): void {
		this.#iconEl?.remove();
		this.#iconEl = null;
	}

	private buildClearButton(): void {
		this.removeClearButton();

		if (!this.#hasClear) return;

		this.#clearEl = document.createElement('button');
		this.#clearEl.type = 'button';
		this.#clearEl.className = 'chip-clear';
		this.#clearEl.setAttribute('aria-label', 'Remove');
		this.#clearEl.disabled = !this.#enabled;
		this.#clearEl.innerHTML = Helpers.placeIcon('x', 's');
		this.#clearEl.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');

		this.widgetEl.appendChild(this.#clearEl);
	}

	private removeClearButton(): void {
		this.#clearEl?.remove();
		this.#clearEl = null;
	}

	private bindEvents(): void {
		this.#clearEl?.addEventListener('click', this.onClearClick);
		this.#clearEl?.addEventListener('keydown', this.onClearKeyDown);

		if (this.#isSelectable) {
			this.widgetEl.addEventListener('click', this.onToggleClick);
			this.widgetEl.addEventListener('keydown', this.onToggleKeyDown);
		}

		if (this.#isClickable) {
			this.widgetEl.addEventListener('click', this.onClickableClick);
			this.widgetEl.addEventListener('keydown', this.onClickableKeyDown);
		}
	}

	private unbindEvents(): void {
		this.#clearEl?.removeEventListener('click', this.onClearClick);
		this.#clearEl?.removeEventListener('keydown', this.onClearKeyDown);
		this.widgetEl?.removeEventListener('click', this.onToggleClick);
		this.widgetEl?.removeEventListener('keydown', this.onToggleKeyDown);
		this.widgetEl?.removeEventListener('click', this.onClickableClick);
		this.widgetEl?.removeEventListener('keydown', this.onClickableKeyDown);
	}

	parametersChanged(payload: IChip): void {
		if (!this.widgetEl) return;

		let needsClearRebuild = false;
		let needsInteractionRebuild = false;

		if (payload.enabled !== undefined && payload.enabled !== this.#enabled) {
			this.#enabled = payload.enabled;
			this.widgetEl.dataset.enabled = this.#enabled ? 'true' : 'false';
			if (this.#clearEl) {
				this.#clearEl.disabled = !this.#enabled;
			}
			needsInteractionRebuild = true;
		}

		if (payload.hasClear !== undefined && payload.hasClear !== this.#hasClear) {
			this.#hasClear = payload.hasClear;
			this.widgetEl.dataset.hasclear = this.#hasClear ? 'true' : 'false';
			needsClearRebuild = true;
		}

		if (payload.icon !== undefined && (payload.icon ?? '') !== this.#icon) {
			this.#icon = payload.icon ?? '';
			this.buildIcon();
		}

		if (payload.isClickable !== undefined && payload.isClickable !== this.#isClickable) {
			this.#isClickable = payload.isClickable;
			this.widgetEl.dataset.isclickable = this.#isClickable ? 'true' : 'false';
			needsInteractionRebuild = true;
		}

		if (payload.isSelectable !== undefined && payload.isSelectable !== this.#isSelectable) {
			this.#isSelectable = payload.isSelectable;
			needsInteractionRebuild = true;
		}

		if (payload.isSelected !== undefined && payload.isSelected !== this.#isSelected) {
			this.#isSelected = payload.isSelected;
			this.widgetEl.dataset.isselected = this.#isSelected ? 'true' : 'false';
			this.syncAriaPressed();
		}

		if (payload.theme !== undefined && payload.theme !== this.#theme) {
			this.#theme = payload.theme ?? '';
			if (this.#theme) {
				this.widgetEl.dataset.theme = this.#theme;
			} else {
				delete this.widgetEl.dataset.theme;
			}
		}

		if (needsClearRebuild || needsInteractionRebuild) {
			this.unbindEvents();
			if (needsClearRebuild) {
				this.buildClearButton();
			}
			if (needsInteractionRebuild) {
				this.updateInteraction();
			}
			this.bindEvents();
		}
	}

	destroy(): void {
		super.destroy();
		this.unbindEvents();
		this.removeIcon();
		this.removeClearButton();
	}
}
