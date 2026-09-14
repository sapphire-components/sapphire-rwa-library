import { BaseComponent, type BaseComponentInit } from '@core/base';
import Helpers from '@utils/helpers';
import { ValidationMessage } from '@utils/validation-message';

export interface IButtonChoice extends BaseComponentInit {
	actions: {
		OnChange: (isSelected: boolean) => void;
	};
	allowMultiple: boolean;
	enabled: boolean;
	groupName: string;
	isSelected: boolean;
	isValid: boolean;
	validationMessage: string;
}

const ICON_MULTIPLE = 'square';
const ICON_MULTIPLE_SELECTED = 'check-square';
const ICON_SINGLE = 'radio-button-light';
const ICON_SINGLE_SELECTED = 'radio-button-fill';

const instances = new Set<ButtonChoice>();

export default class ButtonChoice extends BaseComponent {
	#actions!: IButtonChoice['actions'];
	#allowMultiple = false;
	#enabled = true;
	#groupName = '';
	#iconEl: HTMLElement | null = null;
	#isSelected = false;
	#isValid = true;
	#validationMessage = '';
	#validationMessageCtrl!: ValidationMessage;
	#wrapperEl!: HTMLElement;
	buttonChoiceContentEl!: HTMLElement;

	private readonly onClick = (event: MouseEvent): void => {
		if (!this.#enabled) return;
		if ((event.target as HTMLElement).closest('a, button, input, select, textarea')) return;
		this.toggle();
	};

	private readonly onKeyDown = (event: KeyboardEvent): void => {
		if (!this.#enabled) return;
		if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
		event.preventDefault();
		this.toggle();
	};

	constructor(config: IButtonChoice) {
		super(config);

		if (!this.widgetEl) {
			console.warn('ButtonChoice: root element not found for runtimeId', config.runtimeId);
			return;
		}

		this.#actions = config.actions;
		if (!this.ensureStructure()) return;

		this.#validationMessageCtrl = new ValidationMessage(this.#wrapperEl);
		this.applyConfig(config);
		this.bindEvents();
		instances.add(this);
	}

	/**
	 * Sets this button's selected state, refreshes the leading icon, and fires `OnChange`.
	 * When `allowMultiple` is false and the button becomes selected, other ButtonChoices
	 * in the same document with the same `groupName` are deselected.
	 */
	setSelected(isSelected: boolean): void {
		this.applySelected(isSelected, true);
		if (isSelected && !this.#allowMultiple) {
			this.deselectPeers();
		}
	}

	getSelected(): boolean {
		return this.#isSelected;
	}

	parametersChanged(payload: IButtonChoice): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) return;

		if (this.widgetEl !== liveEl) {
			this.unbindEvents();
			this.#validationMessageCtrl?.destroy();
			this.widgetEl = liveEl;
			if (!this.ensureStructure()) return;
			this.#validationMessageCtrl = new ValidationMessage(this.#wrapperEl);
			this.bindEvents();
		}

		this.applyConfig(payload);
	}

	destroy(): void {
		instances.delete(this);
		this.unbindEvents();
		this.removeIcon();
		this.#validationMessageCtrl?.destroy();
		super.destroy();
	}

	private ensureStructure(): boolean {
		this.buttonChoiceContentEl = this.widgetEl.querySelector<HTMLElement>('.buttonchoice-content')!;
		if (!this.buttonChoiceContentEl) {
			console.warn('ButtonChoice: .buttonchoice-content not found for runtimeId', this.runtimeId);
			return false;
		}

		this.widgetEl.classList.add('buttonchoice');

		const existing =
			this.buttonChoiceContentEl.closest<HTMLElement>('.buttonchoice-wrapper') ??
			this.widgetEl.querySelector<HTMLElement>(':scope > .buttonchoice-wrapper');

		if (existing) {
			this.#wrapperEl = existing;
			if (this.buttonChoiceContentEl.parentElement !== existing) {
				existing.append(this.buttonChoiceContentEl);
			}
		} else {
			const wrapper = document.createElement('div');
			wrapper.className = 'buttonchoice-wrapper';
			const oldParent = this.buttonChoiceContentEl.parentElement;
			wrapper.append(this.buttonChoiceContentEl);
			this.widgetEl.prepend(wrapper);
			if (oldParent && oldParent !== this.widgetEl && !oldParent.hasChildNodes()) {
				oldParent.remove();
			}
			this.#wrapperEl = wrapper;
		}

		if (this.#wrapperEl.parentElement !== this.widgetEl) {
			this.widgetEl.prepend(this.#wrapperEl);
		}

		return true;
	}

	private applyConfig(payload: Partial<IButtonChoice>): void {
		if (payload.allowMultiple !== undefined) {
			this.#allowMultiple = Boolean(payload.allowMultiple);
		}
		if (payload.enabled !== undefined) {
			this.#enabled = Boolean(payload.enabled);
		}
		if (payload.groupName !== undefined) {
			this.#groupName = String(payload.groupName ?? '');
		}
		if (payload.isSelected !== undefined) {
			this.#isSelected = Boolean(payload.isSelected);
		}
		if (payload.isValid !== undefined) {
			this.#isValid = Boolean(payload.isValid);
		}
		if (payload.validationMessage !== undefined) {
			this.#validationMessage = String(payload.validationMessage ?? '');
		}

		this.reflectState();
		this.buildIcon();
		this.updateInteraction();
		this.#validationMessageCtrl.update(this.#isValid, this.#validationMessage);
	}

	private toggle(): void {
		this.setSelected(!this.#isSelected);
	}

	private applySelected(isSelected: boolean, emit: boolean): void {
		if (this.#isSelected === isSelected) return;

		this.#isSelected = isSelected;
		this.reflectState();
		this.buildIcon();
		this.syncAriaPressed();

		if (emit) {
			this.#actions.OnChange(this.#isSelected);
		}
	}

	private deselectPeers(): void {
		for (const peer of this.getGroupPeers()) {
			peer.applySelected(false, true);
		}
	}

	private getGroupPeers(): ButtonChoice[] {
		const groupName = this.#groupName.trim();
		if (!groupName || !this.widgetEl) return [];

		const doc = this.widgetEl.ownerDocument;
		const peers: ButtonChoice[] = [];

		for (const other of instances) {
			if (other === this) continue;
			if (!other.widgetEl?.isConnected) continue;
			if (other.widgetEl.ownerDocument !== doc) continue;
			if (other.#groupName.trim() !== groupName) continue;
			peers.push(other);
		}

		return peers;
	}

	private reflectState(): void {
		this.widgetEl.dataset.isselected = this.#isSelected ? 'true' : 'false';
		this.widgetEl.dataset.enabled = this.#enabled ? 'true' : 'false';
		this.widgetEl.dataset.allowmultiple = this.#allowMultiple ? 'true' : 'false';
		this.widgetEl.dataset.groupname = this.#groupName;
		this.widgetEl.dataset.isvalid = this.#isValid ? 'true' : 'false';
	}

	private currentIconName(): string {
		if (this.#allowMultiple) {
			return this.#isSelected ? ICON_MULTIPLE_SELECTED : ICON_MULTIPLE;
		}
		return this.#isSelected ? ICON_SINGLE_SELECTED : ICON_SINGLE;
	}

	private buildIcon(): void {
		const name = this.currentIconName().trim();
		this.removeIcon();
		if (!name || !this.buttonChoiceContentEl) return;

		this.#iconEl = document.createElement('span');
		this.#iconEl.className = 'buttonchoice-icon';
		this.#iconEl.innerHTML = Helpers.placeIcon(name, 's');
		this.#iconEl.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');
		this.buttonChoiceContentEl.before(this.#iconEl);
	}

	private removeIcon(): void {
		this.#iconEl?.remove();
		this.#iconEl = null;
	}

	private updateInteraction(): void {
		this.#wrapperEl.setAttribute('role', 'button');
		this.#wrapperEl.tabIndex = this.#enabled ? 0 : -1;
		this.#wrapperEl.toggleAttribute('aria-disabled', !this.#enabled);
		this.syncAriaPressed();
	}

	private syncAriaPressed(): void {
		this.#wrapperEl.setAttribute('aria-pressed', this.#isSelected ? 'true' : 'false');
	}

	private bindEvents(): void {
		this.#wrapperEl.addEventListener('click', this.onClick);
		this.#wrapperEl.addEventListener('keydown', this.onKeyDown);
	}

	private unbindEvents(): void {
		this.#wrapperEl?.removeEventListener('click', this.onClick);
		this.#wrapperEl?.removeEventListener('keydown', this.onKeyDown);
	}
}
