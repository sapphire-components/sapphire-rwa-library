import { BaseComponent, type BaseComponentInit } from '../../core/base';

interface ScrollableContentConfigOptions extends BaseComponentInit {
	enabled: boolean;
	height: number;
	maxHeight: number;
	theme: string;
}

export default class ScrollableContent extends BaseComponent {
	private configOptions!: ScrollableContentConfigOptions;
	// private enabled!: boolean;

	constructor(configOptions: ScrollableContentConfigOptions) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('Template: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		this.configOptions = configOptions;

		this.setCssVariables();
		// this.enabled = configOptions.enabled;
	}

	setCssVariables(): void {
		if (this.configOptions.height) {
			this.widgetEl.style.setProperty('--scrollablecontent-height', `${this.configOptions.height}px`);
		}
		if (this.configOptions.maxHeight) {
			this.widgetEl.style.setProperty('--scrollablecontent-maxHeight', `${this.configOptions.maxHeight}px`);
		}
	}

	parametersChanged(payload: ScrollableContentConfigOptions): void {
		console.log(payload);
	}

	destroy() {}
}
