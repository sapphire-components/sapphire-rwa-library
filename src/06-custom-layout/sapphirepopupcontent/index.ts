import { BaseComponent, type BaseComponentInit } from '@core/base';
import Helpers from '@utils/helpers';

interface SapphirePopupContentInit extends BaseComponentInit {
	actions: {
		OnClose: () => void;
	};
	closeOnEsc: boolean;
	extraParameters: string;
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
			this.widgetEl.focus();
		}, 0);
	}

	bindEvents(): void {
		this.closeButton?.addEventListener('click', this.onClickClose);
		document.addEventListener('keydown', this.onKeyDown);
	}

	renderVariables(): void {
		const popupContent = this.widgetEl.querySelector<HTMLDivElement>('.sapphire-popup-content');
		this.widgetEl.style.removeProperty('--sapphirepopupcontent-height');

		const popupContentHeader = this.widgetEl.querySelector<HTMLDivElement>('.sapphire-popup-content-header');
		this.widgetEl.style.setProperty('--popupcontentheader-height', `${popupContentHeader ? Helpers.getOuterSize(popupContentHeader).height : 0}px`);

		const popupContentFooter = this.widgetEl.querySelector<HTMLDivElement>('.sapphire-popup-content-footer');
		this.widgetEl.style.setProperty('--popupcontentfooter-height', `${popupContentFooter ? Helpers.getOuterSize(popupContentFooter).height : 0}px`);

		if (this.height) {
			this.widgetEl.style.setProperty('--sapphirepopupcontent-height', `${this.height}px`);
		} else if (this.minHeight) {
			this.widgetEl.style.setProperty('--sapphirepopupcontent-min-height', `${this.minHeight}px`);
		} else {
			setTimeout(() => {
				this.widgetEl.style.setProperty('--sapphirepopupcontent-height', `${popupContent ? popupContent.getBoundingClientRect().height : 0}px`);
			}, 10);
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
