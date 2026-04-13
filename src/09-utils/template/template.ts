import { BaseComponent, type BaseComponentInit } from '../../core/base';

interface TemplateConfigOptions extends BaseComponentInit {
	enabled: boolean;
}

export default class Template extends BaseComponent {
	// private configOptions!: TemplateConfigOptions;
	// private enabled!: boolean;

	constructor(configOptions: TemplateConfigOptions) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('Template: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		// this.configOptions = configOptions;
		// this.enabled = configOptions.enabled;
	}

	parametersChanged(payload: TemplateConfigOptions): void {
		console.log(payload);
	}

	destroy() {}
}
