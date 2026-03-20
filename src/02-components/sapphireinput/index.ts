import { BaseComponent, type BaseComponentInit } from '../../core/base';

interface SapphireInputInit extends BaseComponentInit {
	actions: {
		OnClear: () => void;
	};
}

export default class SapphireInput extends BaseComponent {
	private actions!: SapphireInputInit['actions'];
	private clearEl!: HTMLElement;
	private inputEl!: HTMLInputElement;
	private readonly handleInput = (): void => {
		this.updateHasContent();
	};

	private readonly handleClearClick = (event: Event): void => {
		event.preventDefault();
		this.clearValue();
	};

	constructor(init: SapphireInputInit) {
		super(init);

		if (!this.widgetEl) {
			console.warn('SapphireInput: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.clearEl = this.widgetEl.querySelector<HTMLElement>('.sapphireinput-clear')!;
		this.inputEl = this.widgetEl.querySelector<HTMLInputElement>('.form-control[data-input]')!;

		this.inputEl.autocomplete = 'off';
		this.inputEl.autocorrect = false;
		this.inputEl.autocapitalize = 'off';
		this.inputEl.spellcheck = false;

		this.inputEl.addEventListener('input', this.handleInput);
		this.inputEl.addEventListener('change', this.handleInput);
		this.clearEl?.addEventListener('click', this.handleClearClick);

		this.updateHasContent();
	}

	private updateHasContent(): void {
		const hasContent = this.inputEl.value.trim().length > 0;
		if (hasContent) {
			this.widgetEl.dataset.hascontent = 'true';
		} else {
			this.widgetEl.dataset.hascontent = 'false';
		}
	}

	private clearValue(): void {
		this.actions?.OnClear();
	}

	destroy(): void {
		this.inputEl.removeEventListener('input', this.handleInput);
		this.inputEl.removeEventListener('change', this.handleInput);
		this.clearEl?.removeEventListener('click', this.handleClearClick);
	}
}
