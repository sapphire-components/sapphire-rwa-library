import { BaseComponent, type BaseComponentInit } from '@core/base';

interface SapphirePopupContentInit extends BaseComponentInit {
	actions: {
		OnClose: () => void;
	};
	closeOnEsc: boolean;
	height: number;
	minHeight: number;
	theme: boolean;
}

export default class SapphirePopupContent extends BaseComponent {
	private closeButton!: HTMLButtonElement;
	private closeOnEsc!: boolean;
	private height!: number;
	private minHeight!: number;
	private readonly actions!: SapphirePopupContentInit['actions'];
	private readonly onClickClose = (): void => {
		this.actions.OnClose();
	};
	private readonly onKeyDown = (event: KeyboardEvent): void => {
		if (this.closeOnEsc && event.key === 'Escape') {
			this.actions.OnClose();
		}
	};

	constructor(init: SapphirePopupContentInit) {
		super(init);

		if (!this.widgetEl) {
			console.warn('SapphirePopupContent: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.height = init.height;
		this.minHeight = init.minHeight;
		this.closeOnEsc = init.closeOnEsc;
		this.closeButton = this.widgetEl.querySelector<HTMLButtonElement>('.sapphire-popup-content-close button')!;

		this.bindEvents();
		this.renderVariables();

		setTimeout(() => {
			console.log('SapphirePopupContent: focus', this.runtimeId);
			this.widgetEl.focus();
		}, 0);
	}

	bindEvents(): void {
		this.closeButton?.addEventListener('click', this.onClickClose);
		document.addEventListener('keydown', this.onKeyDown);
	}

	renderVariables(): void {
		if (this.height) {
			this.widgetEl.style.setProperty('--sapphirepopupcontent-height', `${this.height}px`);
		} else {
			this.widgetEl.style.removeProperty('--sapphirepopupcontent-height');
		}
		if (this.minHeight) {
			this.widgetEl.style.setProperty('--sapphirepopupcontent-min-height', `${this.minHeight}px`);
		} else {
			this.widgetEl.style.removeProperty('--sapphirepopupcontent-min-height');
		}
	}

	parametersChanged(payload: SapphirePopupContentInit): void {
		console.log('SapphirePopupContent: parametersChanged', payload);
	}

	destroy(): void {
		this.closeButton?.removeEventListener('click', this.onClickClose);
		document.removeEventListener('keydown', this.onKeyDown);
	}
}
