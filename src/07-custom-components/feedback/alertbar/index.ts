import Helpers from '@utils/helpers';
import { AlertTypes, getAlertAppearance, resolveAlertType, type AlertType } from '@utils/alert';
import { BaseComponent, type BaseComponentInit } from '@core/base';
import { resolveShapeType, ShapeTypes, type ShapeType } from '@utils/shape';

export interface IAlertBar extends BaseComponentInit {
	actions: {
		OnClose: () => void;
	};
	enabled: boolean;
	hasClose: boolean;
	shape: ShapeType;
	size: string;
	theme: string;
	type: AlertType;
}

export default class AlertBar extends BaseComponent {
	#actions!: IAlertBar['actions'];
	#actionsEl: HTMLElement | null = null;
	#closeEl: HTMLButtonElement | null = null;
	#contentEl: HTMLElement | null = null;
	#enabled = true;
	#hasClose = false;
	#iconEl: HTMLElement | null = null;
	#shape: ShapeType = ShapeTypes.Rounded;
	#size = 'm';
	#theme = '';
	#type: AlertType = AlertTypes.Info;

	private readonly onCloseClick = (event: MouseEvent): void => {
		event.preventDefault();
		event.stopPropagation();
		if (!this.#enabled) return;
		this.#actions.OnClose();
	};

	constructor(config: IAlertBar) {
		super(config);

		if (!this.widgetEl) {
			console.warn('AlertBar: root element not found for runtimeId', config.runtimeId);
			return;
		}

		this.#actions = config.actions;
		this.applyConfig(config);
		this.layout();
	}

	parametersChanged(payload: IAlertBar): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) return;

		if (this.widgetEl !== liveEl) {
			this.unbindEvents();
			this.widgetEl = liveEl;
			this.#actionsEl = null;
			this.#closeEl = null;
			this.#contentEl = null;
			this.#iconEl = null;
		}

		if (payload.actions) {
			this.#actions = payload.actions;
		}

		this.applyConfig(payload);
		this.layout();
	}

	destroy(): void {
		this.unbindEvents();
		this.removeIcon();
		this.removeCloseButton();
		super.destroy();
	}

	private applyConfig(payload: Partial<IAlertBar>): void {
		if (payload.enabled !== undefined) {
			this.#enabled = Boolean(payload.enabled);
		}
		if (payload.hasClose !== undefined) {
			this.#hasClose = Boolean(payload.hasClose);
		}
		if (payload.shape !== undefined) {
			this.#shape = resolveShapeType(payload.shape);
		}
		if (payload.size !== undefined) {
			this.#size = payload.size || 'm';
		}
		if (payload.theme !== undefined) {
			this.#theme = payload.theme ?? '';
		}
		if (payload.type !== undefined) {
			this.#type = resolveAlertType(payload.type);
		}
	}

	private layout(): void {
		if (!this.widgetEl) return;

		this.#contentEl = this.widgetEl.querySelector('.alertbar-content');
		this.#actionsEl = this.widgetEl.querySelector('.alertbar-actions');

		if (!this.#contentEl) {
			console.warn('AlertBar: .alertbar-content not found for runtimeId', this.runtimeId);
			return;
		}

		const host = this.widgetEl;
		host.dataset.enabled = this.#enabled ? 'true' : 'false';
		host.dataset.hasclose = this.#hasClose ? 'true' : 'false';
		host.dataset.shape = this.#shape;
		host.dataset.size = this.#size;
		host.dataset.type = this.#type;
		if (this.#theme) {
			host.dataset.theme = this.#theme;
		} else {
			delete host.dataset.theme;
		}

		this.buildIcon();
		this.placeActions();
		this.buildCloseButton();
	}

	private buildIcon(): void {
		if (!this.#contentEl) return;

		const appearance = getAlertAppearance(this.#type);

		if (!this.#iconEl?.isConnected) {
			this.#iconEl = document.createElement('span');
			this.#iconEl.className = 'alertbar-icon';
			this.#iconEl.setAttribute('aria-hidden', 'true');
		}

		this.#iconEl.innerHTML = Helpers.placeIcon(appearance.icon, this.#size);
		this.#iconEl.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');
		this.#contentEl.before(this.#iconEl);
	}

	private placeActions(): void {
		if (!this.#contentEl || !this.#actionsEl) return;
		this.#contentEl.after(this.#actionsEl);
	}

	private buildCloseButton(): void {
		this.unbindEvents();

		if (!this.#hasClose) {
			this.removeCloseButton();
			return;
		}

		if (!this.#closeEl?.isConnected) {
			this.#closeEl = document.createElement('button');
			this.#closeEl.type = 'button';
			this.#closeEl.setAttribute('aria-label', 'Close');
			this.#closeEl.innerHTML = Helpers.placeIcon('x-bold', 's');
			this.#closeEl.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');
		}

		this.#closeEl.className = 'btn btn-icon btn-tertiary alertbar-close';
		if (this.#size === 's') {
			this.#closeEl.classList.add('btn-xsmall');
		} else if (this.#size === 'm') {
			this.#closeEl.classList.add('btn-small');
		}

		this.#closeEl.disabled = !this.#enabled;
		this.widgetEl.appendChild(this.#closeEl);
		this.bindEvents();
	}

	private removeIcon(): void {
		this.#iconEl?.remove();
		this.#iconEl = null;
	}

	private removeCloseButton(): void {
		this.#closeEl?.remove();
		this.#closeEl = null;
	}

	private bindEvents(): void {
		this.#closeEl?.addEventListener('click', this.onCloseClick);
	}

	private unbindEvents(): void {
		this.#closeEl?.removeEventListener('click', this.onCloseClick);
	}
}
