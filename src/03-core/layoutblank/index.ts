import Helpers from '@utils/helpers';
import { BaseComponent, type BaseComponentInit } from '@core/base';

interface ILayoutBlank extends BaseComponentInit {
	actions: {};
	enabled: boolean;
	theme: string;
}

export default class LayoutBlank extends BaseComponent {
	// private actions!: ITemplate['actions'];
	// private enabled!: boolean;
	// private theme!: string;

	constructor(init: ILayoutBlank) {
		super(init);

		if (!this.widgetEl) {
			console.warn('LayoutBlank: root element not found for runtimeId', init.runtimeId);
			return;
		}

		// console.log('LayoutBlank: constructor', this.widgetEl);

		if (Helpers.isInsideIframe()) {
			this.widgetEl.classList.add('layout-inside-iframe');
		}

		// this.actions = init.actions;
		// this.enabled = init.enabled;
		// this.theme = init.theme;
	}

	parametersChanged(_payload: ILayoutBlank): void {}

	destroy() {
		super.destroy();
	}
}
