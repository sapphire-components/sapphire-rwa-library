import { BaseComponent, type BaseComponentInit } from '../../core/base';

interface LabelValueConfigOptions extends BaseComponentInit {
	isMandatory: boolean;
	labelTopPadding: number;
	orientation: string;
}

export default class LabelValue extends BaseComponent {
	private configOptions!: LabelValueConfigOptions;
	private labelEl!: HTMLElement;
	private valueEl!: HTMLElement;

	constructor(configOptions: LabelValueConfigOptions) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('LabelValue: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		this.configOptions = configOptions;

		this.labelEl = this.widgetEl.querySelector('.labelvalue-label')!;
		this.valueEl = this.widgetEl.querySelector('.labelvalue-value')!;

		this.createLabel();

		this.widgetEl.style.setProperty('--label-top-padding', `${this.configOptions.labelTopPadding}px`);

		if (this.configOptions.isMandatory) {
			const asterisk = document.createElement('span');
			asterisk.classList.add('labelvalue-mandatory');
			asterisk.textContent = '*';
			this.labelEl.appendChild(asterisk);
		}
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

	destroy() {
		super.destroy();
	}
}
