import { BaseComponent, type BaseComponentInit } from '../../core/base';

export interface IButtonDropdown extends BaseComponentInit {
	actions: {
		OnClick: () => void;
		OnWaitingFinish: () => void;
	};
	isWaiting: boolean;
	runtimeId: string;
	waitingDuration: number;
}

export default class ButtonDropdown extends BaseComponent {
	#actions: IButtonDropdown['actions'];
	#click: EventListener = this.click.bind(this);
	#isWaiting: boolean;
	#labelEl: HTMLElement;

	constructor(config: IButtonDropdown) {
		super(config);

		this.#actions = config.actions;
		this.#isWaiting = config.isWaiting;

		this.#labelEl = this.widgetEl.querySelector('.buttondropdown-label') as HTMLElement;

		this.#labelEl.addEventListener('click', this.#click);
	}

	click(event: Event): void {
		event.stopPropagation();
		this.#actions.OnClick();
	}

	animationEvent(animation: AnimationEvent): void {
		if (animation.animationName === 'buttondropdown-waiting-creation') {
			this.widgetEl.classList.remove('is-waiting');
			this.#actions.OnWaitingFinish();
		}
	}

	parametersChanged(payload: IButtonDropdown): void {
		if (this.#isWaiting !== payload.isWaiting) {
			this.#isWaiting = payload.isWaiting;
			this.widgetEl.classList.toggle('is-waiting', this.#isWaiting);
		}
	}

	destroy(): void {
		this.#labelEl.removeEventListener('click', this.#click);
	}
}
