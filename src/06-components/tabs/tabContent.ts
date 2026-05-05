import { BaseComponent, type BaseComponentInit } from '../../core/base';

interface TabContentConfigOptions extends BaseComponentInit {
	enabled: boolean;
}

export default class TabContent extends BaseComponent {
	constructor(configOptions: TabContentConfigOptions) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('TabContent: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}
	}

	parametersChanged(payload: TabContentConfigOptions): void {
		console.log(payload);
	}

	destroy() {}
}
