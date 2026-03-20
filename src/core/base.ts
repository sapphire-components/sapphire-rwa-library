export type BaseComponentInit = {
	identifier?: string;
	runtimeId?: string;
};

export class BaseComponent {
	identifier: string;
	runtimeId: string;
	widgetEl: HTMLElement;

	constructor(init: BaseComponentInit) {
		this.identifier = init.identifier!;
		this.runtimeId = init.runtimeId!;
		this.widgetEl = document.getElementById(this.runtimeId)!;
	}
}
