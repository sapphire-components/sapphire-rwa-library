import { BaseComponent, type BaseComponentInit } from '@core/base';
import { AlertTypes, getAlertAppearance, resolveAlertType, type AlertType } from '@utils/alert';
import Helpers from '@utils/helpers';

export interface IStatus extends BaseComponentInit {
	label: string;
	size: string;
	type: AlertType;
}

export default class Status extends BaseComponent {
	#label = '';
	#size: string = 'm';
	#type: AlertType = AlertTypes.Info;

	constructor(config: IStatus) {
		super(config);

		if (!this.widgetEl) {
			console.warn('Status: root element not found for runtimeId', config.runtimeId);
			return;
		}

		this.applyConfig(config);
		this.render();
	}

	parametersChanged(payload: IStatus): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) return;

		if (this.widgetEl !== liveEl) {
			this.widgetEl = liveEl;
		}

		this.applyConfig(payload);
		this.render();
	}

	destroy(): void {
		this.widgetEl?.replaceChildren();
		super.destroy();
	}

	private applyConfig(payload: Partial<IStatus>): void {
		if (payload.label !== undefined) {
			this.#label = payload.label ?? '';
		}
		if (payload.type !== undefined) {
			this.#type = resolveAlertType(payload.type);
		}
		if (payload.size !== undefined) {
			this.#size = payload.size ?? 'm';
		}
	}

	private render(): void {
		if (!this.widgetEl) return;

		const appearance = getAlertAppearance(this.#type);

		this.widgetEl.classList.add('status');
		this.widgetEl.dataset.type = this.#type;
		this.widgetEl.dataset.size = this.#size;
		this.widgetEl.replaceChildren();

		const iconEl = document.createElement('span');
		iconEl.className = 'status-icon';
		iconEl.setAttribute('aria-hidden', 'true');
		iconEl.innerHTML = Helpers.placeIcon(appearance.icon, this.#size);
		iconEl.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');

		const labelEl = document.createElement('span');
		labelEl.className = 'status-label';
		labelEl.textContent = this.#label;

		this.widgetEl.append(iconEl, labelEl);
	}
}
