import Helpers from '@utils/helpers';
import { BaseComponent, type BaseComponentInit } from '@core/base';

interface IMasterDetail extends BaseComponentInit {
	actions: {};
	enabled: boolean;
}

export default class MasterDetail extends BaseComponent {
	private resizeObserver!: ResizeObserver;

	private readonly onResize = (): void => {
		this.renderVariables();
	};
	constructor(configOptions: IMasterDetail) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('MasterDetail: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		this.bindEvents();
		this.renderVariables();
	}

	bindEvents(): void {
		this.resizeObserver = new ResizeObserver(this.onResize);
		this.resizeObserver.observe(document.documentElement);
	}

	renderVariables(): void {
		this.widgetEl.style.removeProperty('--masterdetail-height');
		this.widgetEl.style.setProperty('--masterdetail-height', `${Helpers.getOuterSize(this.widgetEl).height}px`);
	}

	parametersChanged(payload: IMasterDetail): void {
		console.log(payload);
	}

	destroy() {
		super.destroy();
		this.resizeObserver?.disconnect();
	}
}
