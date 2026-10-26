import { BaseComponent, type BaseComponentInit } from '@core/base';

interface ITemplate extends BaseComponentInit {
	actions: {};
	enabled: boolean;
	theme: string;
}

export default class Template extends BaseComponent {
	// private actions!: ITemplate['actions'];
	// private enabled!: boolean;
	// private theme!: string;

	constructor(init: ITemplate) {
		super(init);

		if (!this.widgetEl) {
			console.warn('Template: root element not found for runtimeId', init.runtimeId);
			return;
		}

		// this.actions = init.actions;
		// this.enabled = init.enabled;
		// this.theme = init.theme;
	}

	parametersChanged(payload: ITemplate): void {
		console.log(payload);
	}

	destroy() {
		super.destroy();
	}
}
