import { BaseComponent, type BaseComponentInit } from '@core/base';
import Helpers from '@utils/helpers';

interface IInputWrapper extends BaseComponentInit {
	actions: {
		OnClear: () => void;
	};
	enabled: boolean;
	hasClear: boolean;
	iconName: string;
}

export default class InputWrapper extends BaseComponent {
	private actions!: IInputWrapper['actions'];
	private clearEl: HTMLButtonElement | null = null;
	private enabled!: boolean;
	private hasClear!: boolean;
	private iconEl: HTMLElement | null = null;
	private iconName!: string;
	private inputEl: HTMLInputElement | null = null;
	private valueAttrObserver?: MutationObserver;
	private valuePatched = false;
	private wrapperEl!: HTMLElement;

	private readonly onClearClick = (event: MouseEvent): void => {
		event.preventDefault();
		event.stopPropagation();
		if (!this.enabled) return;
		this.actions.OnClear();
		this.wrapperEl.dataset.hascontent = 'false';
		queueMicrotask(() => this.updateHasContent());
	};

	private readonly onClearKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
		event.preventDefault();
		event.stopPropagation();
		if (!this.enabled) return;
		this.actions.OnClear();
		this.wrapperEl.dataset.hascontent = 'false';
		queueMicrotask(() => this.updateHasContent());
	};

	private readonly onInput = (): void => {
		this.updateHasContent();
	};

	constructor(init: IInputWrapper) {
		super(init);

		if (!this.widgetEl) {
			console.warn('InputWrapper: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.enabled = init.enabled;
		this.hasClear = init.hasClear;
		this.iconName = init.iconName ?? '';
		this.wrapperEl = this.widgetEl.classList.contains('inputwrapper')
			? this.widgetEl
			: (this.widgetEl.querySelector<HTMLElement>('.inputwrapper') ?? this.widgetEl);
		this.inputEl = this.wrapperEl.querySelector('input');

		this.reflectStateAttributes();
		this.watchInputValue();
		this.updateHasContent();
		this.buildIcon();
		this.buildClearButton();
		this.bindEvents();
	}

	private reflectStateAttributes(): void {
		this.wrapperEl.dataset.enabled = this.enabled ? 'true' : 'false';
		this.wrapperEl.dataset.hasclear = this.hasClear ? 'true' : 'false';
		this.wrapperEl.dataset.hasicon = this.iconName ? 'true' : 'false';
		this.wrapperEl.dataset.iconname = this.iconName;
	}

	private updateHasContent(): void {
		const hasContent = (this.inputEl?.value.trim().length ?? 0) > 0;
		this.wrapperEl.dataset.hascontent = hasContent ? 'true' : 'false';
	}

	// Platform bindings set `input.value` without firing `input`/`change`.
	private watchInputValue(): void {
		if (!this.inputEl) return;

		const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
		if (descriptor?.configurable && descriptor.get && descriptor.set) {
			const { get, set } = descriptor;
			const onValueWrite = (): void => {
				this.updateHasContent();
			};

			Object.defineProperty(this.inputEl, 'value', {
				configurable: true,
				enumerable: descriptor.enumerable ?? false,
				get(): string {
					return get.call(this);
				},
				set(next: string) {
					set.call(this, next);
					onValueWrite();
				},
			});
			this.valuePatched = true;
		}

		this.valueAttrObserver = new MutationObserver(() => this.updateHasContent());
		this.valueAttrObserver.observe(this.inputEl, {
			attributes: true,
			attributeFilter: ['value'],
		});
	}

	private unwatchInputValue(): void {
		this.valueAttrObserver?.disconnect();
		this.valueAttrObserver = undefined;

		if (this.valuePatched && this.inputEl) {
			Reflect.deleteProperty(this.inputEl, 'value');
			this.valuePatched = false;
		}
	}

	private buildIcon(): void {
		this.removeIcon();

		if (!this.iconName || !this.inputEl) return;

		this.iconEl = document.createElement('span');
		this.iconEl.className = 'inputwrapper-icon';
		this.iconEl.innerHTML = Helpers.placeIcon(this.iconName, 's');
		this.iconEl.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');

		this.inputEl.before(this.iconEl);
	}

	private removeIcon(): void {
		this.iconEl?.remove();
		this.iconEl = null;
	}

	private buildClearButton(): void {
		this.removeClearButton();

		if (!this.hasClear || !this.inputEl) return;

		this.clearEl = document.createElement('button');
		this.clearEl.type = 'button';
		this.clearEl.className = 'inputwrapper-clear';
		this.clearEl.setAttribute('aria-label', 'Clear');
		this.clearEl.disabled = !this.enabled;
		this.clearEl.innerHTML = Helpers.placeIcon('x', 's');
		this.clearEl.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');

		this.inputEl.after(this.clearEl);
	}

	private removeClearButton(): void {
		this.clearEl?.remove();
		this.clearEl = null;
	}

	private bindEvents(): void {
		this.inputEl?.addEventListener('input', this.onInput);
		this.inputEl?.addEventListener('change', this.onInput);
		this.clearEl?.addEventListener('click', this.onClearClick);
		this.clearEl?.addEventListener('keydown', this.onClearKeyDown);
	}

	private unbindEvents(): void {
		this.inputEl?.removeEventListener('input', this.onInput);
		this.inputEl?.removeEventListener('change', this.onInput);
		this.clearEl?.removeEventListener('click', this.onClearClick);
		this.clearEl?.removeEventListener('keydown', this.onClearKeyDown);
	}

	parametersChanged(payload: IInputWrapper): void {
		if (!this.widgetEl) return;

		let needsClearRebuild = false;

		if (payload.enabled !== undefined && payload.enabled !== this.enabled) {
			this.enabled = payload.enabled;
			this.wrapperEl.dataset.enabled = this.enabled ? 'true' : 'false';
			if (this.clearEl) {
				this.clearEl.disabled = !this.enabled;
			}
		}

		if (payload.hasClear !== undefined && payload.hasClear !== this.hasClear) {
			this.hasClear = payload.hasClear;
			this.wrapperEl.dataset.hasclear = this.hasClear ? 'true' : 'false';
			needsClearRebuild = true;
		}

		if (payload.iconName !== undefined && payload.iconName !== this.iconName) {
			this.iconName = payload.iconName;
			this.wrapperEl.dataset.hasicon = this.iconName ? 'true' : 'false';
			this.wrapperEl.dataset.iconname = this.iconName;
			this.buildIcon();
		}

		this.updateHasContent();

		if (needsClearRebuild) {
			this.unbindEvents();
			this.buildClearButton();
			this.bindEvents();
		}
	}

	destroy(): void {
		super.destroy();
		this.unbindEvents();
		this.unwatchInputValue();
		this.removeIcon();
		this.removeClearButton();
	}
}
