import { BaseComponent, type BaseComponentInit } from '@core/base';

interface ITemplate extends BaseComponentInit {
	actions: {};
	enabled: boolean;
}

export default class Template extends BaseComponent {
	// private actions: ITemplateConfigOptions['actions'];
	// private enabled!: boolean;

	constructor(init: ITemplate) {
		super(init);

		if (!this.widgetEl) {
			console.warn('Template: root element not found for runtimeId', init.runtimeId);
			return;
		}

		// this.actions = configOptions.actions;
		// this.enabled = configOptions.enabled;
	}

	parametersChanged(payload: ITemplate): void {
		console.log(payload);
	}

	destroy() {
		super.destroy();
	}
}
