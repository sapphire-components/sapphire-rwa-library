import { BaseComponent, type BaseComponentInit } from '@core/base';

interface LabelValueConfig extends BaseComponentInit {
	isMandatory: boolean;
	labelTopPadding: number;
}

export default class LabelValue extends BaseComponent {
	private isMandatory!: boolean;
	private labelEl!: HTMLElement;
	private labelTopPadding!: number;
	private valueEl!: HTMLElement;

	constructor(config: LabelValueConfig) {
		super(config);

		if (!this.widgetEl) {
			console.warn('LabelValue: root element not found for runtimeId', config.runtimeId);
			return;
		}

		this.isMandatory = config.isMandatory;
		this.labelEl = this.widgetEl.querySelector('.labelvalue-label')!;
		this.labelTopPadding = config.labelTopPadding;
		this.valueEl = this.widgetEl.querySelector('.labelvalue-value')!;

		this.createLabel();

		this.widgetEl.style.setProperty('--label-top-padding', `${this.labelTopPadding}px`);
		this.syncMandatoryIndicator();
	}

	createLabel(): void {
		const fieldId = this.getFieldId(this.valueEl);
		if (fieldId) {
			const label = document.createElement('label');
			label.setAttribute('for', fieldId);
			while (this.labelEl.firstChild) {
				label.appendChild(this.labelEl.firstChild);
			}
			this.labelEl.appendChild(label);
		}
	}

	getFieldId(valueEl: HTMLElement, selectors = ['data-input', 'data-checkbox']): string | null {
		for (const attr of selectors) {
			const el = valueEl.querySelector(`[${attr}]`);
			if (el?.id) {
				return el.id;
			}
		}
		return null;
	}

	private syncMandatoryIndicator(): void {
		const existing = this.labelEl.querySelector('.labelvalue-mandatory');

		if (this.isMandatory) {
			if (!existing) {
				const asterisk = document.createElement('span');
				asterisk.classList.add('labelvalue-mandatory');
				asterisk.textContent = '*';
				this.labelEl.appendChild(asterisk);
			}
			return;
		}

		existing?.remove();
	}

	parametersChanged(payload: LabelValueConfig): void {
		if (!this.widgetEl) return;

		if (payload.isMandatory !== undefined) {
			this.isMandatory = payload.isMandatory;
			this.syncMandatoryIndicator();
		}
	}

	destroy() {
		super.destroy();
	}
}
