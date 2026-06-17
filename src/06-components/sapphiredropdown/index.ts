import { BaseComponent, type BaseComponentInit } from '../../core/base';

interface ISapphireDropdownConfig {
	Clear: boolean;
	Multiple: boolean;
	Search: boolean;
}

interface ISapphireDropdownOption {
	Description: string;
	Icon: string;
	Label: string;
	Value: string;
}

interface ISapphireDropdown extends BaseComponentInit {
	actions: {};
	config: ISapphireDropdownConfig;
	enabled: boolean;
	optionsList: ISapphireDropdownOption[];
	selectedList: ISapphireDropdownOption[];
	theme: string;
}

export default class SapphireDropdown extends BaseComponent {
	#actions: ISapphireDropdown['actions'];

	constructor(config: ISapphireDropdown) {
		super(config);

		console.log(config);

		this.#actions = config.actions;
	}

	parametersChanged(payload: ISapphireDropdown): void {}

	destroy(): void {}
}
