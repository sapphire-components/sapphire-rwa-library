import Helpers from './helpers';

// Shared validation message UI. Keep markup here so every component renders
// the same icon/text layout and picks up styling from `09-utils/_validation-message.scss`.

type ValidationMessagePlacement = 'after' | 'append';

export class ValidationMessage {
	#el: HTMLElement | null = null;
	#textEl: HTMLElement | null = null;
	readonly #anchor: HTMLElement;
	readonly #placement: ValidationMessagePlacement;

	constructor(anchor: HTMLElement, placement: ValidationMessagePlacement = 'after') {
		this.#anchor = anchor;
		this.#placement = placement;
	}

	update(isValid: boolean, message: string): void {
		if (isValid || !message) {
			this.destroy();
			return;
		}

		if (!this.#el) {
			this.#el = document.createElement('div');
			this.#el.className = 'validation-message';

			const icon = document.createElement('span');
			icon.className = 'validation-message-icon';
			icon.setAttribute('aria-hidden', 'true');
			icon.innerHTML = Helpers.placeIcon('warning', 'xs');

			this.#textEl = document.createElement('span');
			this.#textEl.className = 'validation-message-text';

			this.#el.append(icon, this.#textEl);
			if (this.#placement === 'append') {
				this.#anchor.append(this.#el);
			} else {
				this.#anchor.after(this.#el);
			}
		}

		this.#textEl!.textContent = message;
	}

	destroy(): void {
		this.#el?.remove();
		this.#el = null;
		this.#textEl = null;
	}
}
