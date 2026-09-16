import { BaseComponent, type BaseComponentInit } from '@core/base';
import Helpers from '@utils/helpers';

interface IPopupContent extends BaseComponentInit {
	actions: {
		OnClose: () => void;
	};
	closeOnEsc: boolean;
	extraParameters: string;
	height: number;
	minHeight: number;
	theme: boolean;
}

export default class PopupContent extends BaseComponent {
	private closeButton!: HTMLButtonElement;
	private closeOnEsc!: boolean;
	private height!: number;
	private minHeight!: number;
	private popupContentBody!: HTMLDivElement;
	private popupContentFooter!: HTMLDivElement;
	private popupContentHeader!: HTMLDivElement;
	private readonly actions!: IPopupContent['actions'];
	private resizeObserver!: ResizeObserver;

	private readonly onClickClose = (): void => {
		this.actions.OnClose();
	};
	private readonly onKeyDown = (event: KeyboardEvent): void => {
		if (this.closeOnEsc && event.key === 'Escape') {
			this.actions.OnClose();
		}
	};
	private readonly onResize = (): void => {
		this.renderVariables();
	};

	constructor(init: IPopupContent) {
		super(init);

		if (!this.widgetEl) {
			console.warn('PopupContent: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.height = init.height;
		this.minHeight = init.minHeight;
		this.closeOnEsc = init.closeOnEsc;
		this.closeButton = this.widgetEl.querySelector<HTMLButtonElement>('.popup-content-close button')!;
		this.popupContentHeader = this.widgetEl.querySelector<HTMLDivElement>('.popup-content-header')!;
		this.popupContentBody = this.widgetEl.querySelector<HTMLDivElement>('.popup-content-body')!;
		this.popupContentFooter = this.widgetEl.querySelector<HTMLDivElement>('.popup-content-footer')!;

		this.bindEvents();
		this.renderVariables();

		setTimeout(() => {
			this.widgetEl.focus();
		}, 0);
	}

	bindEvents(): void {
		this.closeButton?.addEventListener('click', this.onClickClose);
		document.addEventListener('keydown', this.onKeyDown);

		this.resizeObserver = new ResizeObserver(this.onResize);
		this.resizeObserver.observe(document.documentElement);
	}

	renderVariables(): void {
		this.widgetEl.style.removeProperty('--popupcontent-height');
		this.widgetEl.style.removeProperty('--popupcontent-min-height');
		this.widgetEl.style.removeProperty('--popupcontentbody-height');
		this.widgetEl.style.removeProperty('--popupcontentfooter-height');
		this.widgetEl.style.removeProperty('--popupcontentfooter-top');
		this.widgetEl.style.removeProperty('--popupcontentheader-height');

		this.widgetEl.style.setProperty('--popupcontentbody-height', `${this.popupContentBody ? Helpers.getOuterSize(this.popupContentBody).height : 0}px`);
		this.widgetEl.style.setProperty('--popupcontentfooter-height', `${this.popupContentFooter ? Helpers.getOuterSize(this.popupContentFooter).height : 0}px`);
		this.widgetEl.style.setProperty('--popupcontentfooter-top', `${this.popupContentFooter.getBoundingClientRect().top}px`);
		this.widgetEl.style.setProperty('--popupcontentheader-height', `${this.popupContentHeader ? Helpers.getOuterSize(this.popupContentHeader).height : 0}px`);

		if (this.height) {
			this.widgetEl.style.setProperty('--popupcontent-height', `${this.height}px`);
		} else if (this.minHeight) {
			this.widgetEl.style.setProperty('--popupcontent-min-height', `${this.minHeight}px`);
		}
	}

	parametersChanged(payload: IPopupContent): void {
		console.log('PopupContent: parametersChanged', payload);
	}

	destroy(): void {
		this.closeButton?.removeEventListener('click', this.onClickClose);
		document.removeEventListener('keydown', this.onKeyDown);
		this.resizeObserver?.disconnect();
	}
}
