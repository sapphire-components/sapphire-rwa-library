import { BaseComponent, type BaseComponentInit } from '../../core/base';

interface SapphireInputInit extends BaseComponentInit {
	actions: {
		OnChange: () => void;
		OnClear: () => void;
		OnEnterKey: () => void;
	};
	debounceChange: number;
	enabled: boolean;
	theme: string;
}

export default class SapphireInput extends BaseComponent {
	private actions!: SapphireInputInit['actions'];
	private changeDebounceTimer?: ReturnType<typeof setTimeout>;
	private clearEl!: HTMLElement;
	private debounceChange: number;
	private inputAttrObserver?: MutationObserver;
	private inputEl!: HTMLInputElement;

	private readonly handleInput = (): void => {
		this.updateHasContent();

		window.clearTimeout(this.changeDebounceTimer);
		this.changeDebounceTimer = window.setTimeout(() => {
			this.changeDebounceTimer = undefined;
			this.actions?.OnChange();
		}, this.debounceChange);
	};

	private readonly handleClearClick = (event: Event): void => {
		event.preventDefault();
		this.actions?.OnClear();
	};

	private readonly handleEnterKey = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter') {
			return;
		}
		this.actions?.OnEnterKey();
	};

	constructor(init: SapphireInputInit) {
		super(init);
		this.debounceChange = init.debounceChange;

		if (!this.widgetEl) {
			console.warn('SapphireInput: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.clearEl = this.widgetEl.querySelector<HTMLElement>('.sapphireinput-clear')!;
		this.inputEl = this.widgetEl.querySelector<HTMLInputElement>('.form-control[data-input]')!;

		if (!this.inputEl) {
			console.warn('SapphireInput: input element not found for runtimeId', init.runtimeId);
			return;
		}

		this.inputEl.autocomplete = 'off';
		this.inputEl.autocorrect = false;
		this.inputEl.autocapitalize = 'off';
		this.inputEl.spellcheck = false;

		this.inputEl.addEventListener('input', this.handleInput);
		this.inputEl.addEventListener('change', this.handleInput);
		this.inputEl.addEventListener('keydown', this.handleEnterKey);
		this.clearEl?.addEventListener('click', this.handleClearClick);

		this.inputAttrObserver = new MutationObserver(() => {
			this.updateHasContent();
		});
		this.inputAttrObserver.observe(this.inputEl, {
			attributes: true,
			attributeFilter: ['value'],
		});

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

	parametersChanged(): void {}

	destroy(): void {
		window.clearTimeout(this.changeDebounceTimer);
		this.changeDebounceTimer = undefined;
		this.inputAttrObserver?.disconnect();
		this.inputAttrObserver = undefined;
		this.inputEl.removeEventListener('input', this.handleInput);
		this.inputEl.removeEventListener('change', this.handleInput);
		this.inputEl.removeEventListener('keydown', this.handleEnterKey);
		this.clearEl?.removeEventListener('click', this.handleClearClick);
	}
}
