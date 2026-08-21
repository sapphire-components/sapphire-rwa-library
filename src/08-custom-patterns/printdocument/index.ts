import { BaseComponent, type BaseComponentInit } from '@core/base';

interface IPrintDocument extends BaseComponentInit {
	actions: {
		OnShowPopup: (state_in: boolean) => void;
	};
	enabled: boolean;
}

export default class PrintDocument extends BaseComponent {
	private actions!: IPrintDocument['actions'];
	private btnClose!: HTMLButtonElement;
	private btnPrint!: HTMLButtonElement;
	// private enabled!: boolean;
	private popupContent!: HTMLDivElement;

	private readonly ShowPopup = (): void => {
		this.actions.OnShowPopup(true);
		this.startPopupSearching();
	};

	constructor(configOptions: IPrintDocument) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('Template: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		this.actions = configOptions.actions;
		// this.enabled = configOptions.enabled;

		//
		this.btnPrint = this.widgetEl.querySelector<HTMLButtonElement>('.btn-print')!;
		this.btnPrint.addEventListener('click', this.ShowPopup);
	}

	startPopupSearching(): void {
		// Wait for the popup content to be mounted
		const startTime = Date.now();
		const interval = setInterval(() => {
			this.popupContent = document.querySelector<HTMLDivElement>('.sapphire-popup-content[data-theme="printdocument"]')!;
			if (this.popupContent) {
				clearInterval(interval);
				this.initialize();
				return;
			}
			if (Date.now() - startTime >= 5000) {
				clearInterval(interval);
				console.warn('Popup content not found after 5 seconds.');
			}
		}, 50);
	}

	initialize(): void {
		this.btnClose = this.popupContent.querySelector<HTMLButtonElement>('.btn-close')!;
		this.btnClose.addEventListener('click', () => {
			this.actions.OnShowPopup(false);
		});
	}

	parametersChanged(payload: IPrintDocument): void {
		console.log(payload);
	}

	destroy() {
		this.btnPrint.removeEventListener('click', this.ShowPopup);
		super.destroy();
	}
}
