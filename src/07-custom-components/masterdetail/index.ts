import { BaseComponent, type BaseComponentInit } from '@core/base';

interface IMasterDetail extends BaseComponentInit {
	actions: {};
	enabled: boolean;
}

export default class MasterDetail extends BaseComponent {
	// private actions: ITemplateConfigOptions['actions'];
	// private configOptions!: ITemplateConfigOptions;
	// private enabled!: boolean;

	constructor(configOptions: IMasterDetail) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('Template: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		// this.actions = configOptions.actions;
		// this.configOptions = configOptions;
		// this.enabled = configOptions.enabled;
	}

	parametersChanged(payload: IMasterDetail): void {
		console.log(payload);
	}

	destroy() {
		super.destroy();
	}
}
