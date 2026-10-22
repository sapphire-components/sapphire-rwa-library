import { BaseComponent, type BaseComponentInit } from '@core/base';
import Helpers from '@utils/helpers';

interface IInputWrapper extends BaseComponentInit {
	actions: {
		OnClear: () => void;
	};
	enableTextAssistance: boolean;
	enabled: boolean;
	hasClear: boolean;
	iconName: string;
	theme: string;
}

export default class InputWrapper extends BaseComponent {
	private actions!: IInputWrapper['actions'];
	private clearEl: HTMLButtonElement | null = null;
	private enableTextAssistance!: boolean;
	private enabled!: boolean;
	private hasClear!: boolean;
	private iconEl: HTMLElement | null = null;
	private iconName!: string;
	private inputEl: HTMLInputElement | null = null;
	// Original input state, kept while the wrapper locks the input; null when not locked.
	private inputLock: { readOnly: boolean; tabIndex: string | null } | null = null;
	// Attributes the screen author set, kept while text assistance is forced off.
	private textAssistanceSnapshot: {
		autocapitalize: string | null;
		autocomplete: string | null;
		autocorrect: string | null;
		predictivetext: string | null;
		spellcheck: string | null;
		writingsuggestions: string | null;
	} | null = null;
	private passwordToggleEl: HTMLButtonElement | null = null;
	private passwordVisible = false;
	private valueAttrObserver?: MutationObserver;
	private valuePatched = false;
	private wrapperEl!: HTMLElement;

	private readonly onClearClick = (event: MouseEvent): void => {
		event.preventDefault();
		event.stopPropagation();
		this.clearValue();
	};

	private readonly onClearKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
		event.preventDefault();
		event.stopPropagation();
		this.clearValue();
	};

	private readonly onInput = (): void => {
		this.updateHasContent();
	};

	private readonly onPasswordToggleClick = (event: MouseEvent): void => {
		event.preventDefault();
		event.stopPropagation();
		this.togglePasswordVisibility();
	};

	private readonly onPasswordToggleKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
		event.preventDefault();
		event.stopPropagation();
		this.togglePasswordVisibility();
	};

	private readonly onPasswordToggleMouseDown = (event: MouseEvent): void => {
		// Keep the caret in the field while revealing or hiding the value.
		event.preventDefault();
	};

	constructor(init: IInputWrapper) {
		super(init);

		if (!this.widgetEl) {
			console.warn('InputWrapper: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.enableTextAssistance = init.enableTextAssistance;
		this.enabled = init.enabled;
		this.hasClear = init.hasClear;
		this.iconName = init.iconName ?? '';
		this.wrapperEl = this.widgetEl.classList.contains('inputwrapper') ? this.widgetEl : (this.widgetEl.querySelector<HTMLElement>('.inputwrapper') ?? this.widgetEl);
		this.inputEl = this.wrapperEl.querySelector('input');
		this.syncTextAssistance();

		this.reflectStateAttributes();
		this.syncInputLock();
		this.watchInputValue();
		this.updateHasContent();
		this.buildIcon();
		this.buildClearButton();
		this.syncPasswordAffordance();
		this.bindEvents();
	}

	private reflectStateAttributes(): void {
		this.wrapperEl.dataset.enabled = this.enabled ? 'true' : 'false';
		this.wrapperEl.dataset.hasclear = this.hasClear ? 'true' : 'false';
		this.wrapperEl.dataset.hasicon = this.iconName ? 'true' : 'false';
		this.wrapperEl.dataset.iconname = this.iconName;
	}

	private clearValue(): void {
		if (!this.enabled) return;
		this.actions.OnClear();
		this.wrapperEl.dataset.hascontent = 'false';
		// The clear control hides once the field is empty; keep focus in the field.
		this.inputEl?.focus();
		queueMicrotask(() => this.updateHasContent());
	}

	// False turns assistive input features off. True leaves the author's attributes in place.
	private syncTextAssistance(): void {
		const input = this.inputEl;
		if (!input) return;

		if (this.enableTextAssistance === false) {
			this.disableTextAssistance(input);
			return;
		}

		this.restoreTextAssistance();
	}

	private disableTextAssistance(input: HTMLInputElement): void {
		if (!this.textAssistanceSnapshot) {
			this.textAssistanceSnapshot = {
				autocapitalize: input.getAttribute('autocapitalize'),
				autocomplete: input.getAttribute('autocomplete'),
				autocorrect: input.getAttribute('autocorrect'),
				predictivetext: input.getAttribute('predictivetext'),
				spellcheck: input.getAttribute('spellcheck'),
				writingsuggestions: input.getAttribute('writingsuggestions'),
			};
		}

		input.autocapitalize = 'off';
		input.autocomplete = 'off';
		input.setAttribute('autocorrect', 'off');
		input.spellcheck = false;
		input.setAttribute('predictivetext', 'off');
		// Browser writing suggestions are the predictive-text control.
		input.setAttribute('writingsuggestions', 'false');
	}

	private restoreTextAssistance(): void {
		const input = this.inputEl;
		const snapshot = this.textAssistanceSnapshot;
		if (!input || !snapshot) return;

		this.restoreAttribute(input, 'autocapitalize', snapshot.autocapitalize);
		this.restoreAttribute(input, 'autocomplete', snapshot.autocomplete);
		this.restoreAttribute(input, 'autocorrect', snapshot.autocorrect);
		this.restoreAttribute(input, 'spellcheck', snapshot.spellcheck);
		this.restoreAttribute(input, 'predictivetext', snapshot.predictivetext);
		this.restoreAttribute(input, 'writingsuggestions', snapshot.writingsuggestions);
		this.textAssistanceSnapshot = null;
	}

	private restoreAttribute(input: HTMLInputElement, name: string, value: string | null): void {
		if (value === null) {
			input.removeAttribute(name);
			return;
		}
		input.setAttribute(name, value);
	}

	// The platform owns the input's `disabled` state, so lock it with
	// `readonly` and remove it from the tab order instead, restoring both on unlock.
	private syncInputLock(): void {
		const input = this.inputEl;
		if (!input) return;

		if (!this.enabled && !this.inputLock) {
			this.inputLock = { readOnly: input.readOnly, tabIndex: input.getAttribute('tabindex') };
			input.readOnly = true;
			input.tabIndex = -1;
			input.setAttribute('aria-disabled', 'true');
			if (document.activeElement === input) input.blur();
			return;
		}

		if (this.enabled && this.inputLock) {
			this.releaseInputLock();
		}
	}

	private releaseInputLock(): void {
		const input = this.inputEl;
		const lock = this.inputLock;
		if (!input || !lock) return;

		input.readOnly = lock.readOnly;
		if (lock.tabIndex === null) {
			input.removeAttribute('tabindex');
		} else {
			input.setAttribute('tabindex', lock.tabIndex);
		}
		input.removeAttribute('aria-disabled');
		this.inputLock = null;
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

		this.valueAttrObserver = new MutationObserver((mutations) => {
			this.updateHasContent();
			if (mutations.some((mutation) => mutation.attributeName === 'type')) {
				this.syncPasswordAffordance();
			}
		});
		this.valueAttrObserver.observe(this.inputEl, {
			attributes: true,
			attributeFilter: ['type', 'value'],
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

	private isPasswordInput(): boolean {
		if (!this.inputEl) return false;
		if (this.passwordVisible) return true;
		return this.inputEl.type === 'password' || this.inputEl.closest('.input-password') !== null;
	}

	private syncPasswordAffordance(): void {
		const show = this.isPasswordInput();
		this.wrapperEl.dataset.haspassword = show ? 'true' : 'false';

		if (!show) {
			this.removePasswordToggle();
			return;
		}

		if (!this.passwordToggleEl) {
			this.buildPasswordToggle();
			return;
		}

		this.syncPasswordToggle();
	}

	private buildPasswordToggle(): void {
		this.removePasswordToggle();
		if (!this.inputEl) return;

		this.passwordToggleEl = document.createElement('button');
		this.passwordToggleEl.type = 'button';
		this.passwordToggleEl.className = 'inputwrapper-password';
		this.passwordToggleEl.disabled = !this.enabled;
		this.syncPasswordToggle();

		this.passwordToggleEl.addEventListener('mousedown', this.onPasswordToggleMouseDown);
		this.passwordToggleEl.addEventListener('click', this.onPasswordToggleClick);
		this.passwordToggleEl.addEventListener('keydown', this.onPasswordToggleKeyDown);

		(this.clearEl ?? this.inputEl).after(this.passwordToggleEl);
	}

	private syncPasswordToggle(): void {
		if (!this.passwordToggleEl) return;
		const iconName = this.passwordVisible ? 'eye-fill' : 'eye-closed';
		this.passwordToggleEl.innerHTML = Helpers.placeIcon(iconName, 's');
		this.passwordToggleEl.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');
		this.passwordToggleEl.dataset.visible = this.passwordVisible ? 'true' : 'false';
		this.passwordToggleEl.setAttribute('aria-pressed', this.passwordVisible ? 'true' : 'false');
		this.passwordToggleEl.setAttribute('aria-label', this.passwordVisible ? 'Hide password' : 'Show password');
	}

	private togglePasswordVisibility(): void {
		if (!this.enabled || !this.inputEl || !this.isPasswordInput()) return;
		this.passwordVisible = !this.passwordVisible;
		this.inputEl.type = this.passwordVisible ? 'text' : 'password';
		this.syncPasswordToggle();
	}

	private removePasswordToggle(): void {
		if (!this.passwordToggleEl) return;
		this.passwordToggleEl.removeEventListener('mousedown', this.onPasswordToggleMouseDown);
		this.passwordToggleEl.removeEventListener('click', this.onPasswordToggleClick);
		this.passwordToggleEl.removeEventListener('keydown', this.onPasswordToggleKeyDown);
		this.passwordToggleEl.remove();
		this.passwordToggleEl = null;
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

		if (payload.enableTextAssistance !== undefined && payload.enableTextAssistance !== this.enableTextAssistance) {
			this.enableTextAssistance = payload.enableTextAssistance;
			this.syncTextAssistance();
		}

		if (payload.enabled !== undefined && payload.enabled !== this.enabled) {
			this.enabled = payload.enabled;
			this.wrapperEl.dataset.enabled = this.enabled ? 'true' : 'false';
			this.syncInputLock();
			if (this.clearEl) {
				this.clearEl.disabled = !this.enabled;
			}
			if (this.passwordToggleEl) {
				this.passwordToggleEl.disabled = !this.enabled;
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
		this.releaseInputLock();
		this.restoreTextAssistance();
		if (this.passwordVisible && this.inputEl) {
			this.inputEl.type = 'password';
			this.passwordVisible = false;
		}
		this.removeIcon();
		this.removeClearButton();
		this.removePasswordToggle();
	}
}
