export type BaseComponentInit = {
	identifier?: string;
	runtimeId?: string;
};

type BaseComponentConstructor<T extends BaseComponent> = new (...args: any[]) => T;

type RegistryHost = { __instances?: WeakMap<HTMLElement, BaseComponent> };

export class BaseComponent {
	identifier: string;
	runtimeId: string;
	widgetEl: HTMLElement;

	constructor(init: BaseComponentInit) {
		this.identifier = init.identifier!;
		this.runtimeId = init.runtimeId!;
		this.widgetEl = document.getElementById(this.runtimeId)!;

		if (this.widgetEl) {
			BaseComponent.getRegistry(this.constructor as BaseComponentConstructor<this>).set(this.widgetEl, this);
		}
	}

	parametersChanged(_payload?: BaseComponentInit): void {}

	destroy(): void {
		if (this.widgetEl) {
			BaseComponent.getRegistry(this.constructor as BaseComponentConstructor<this>).delete(this.widgetEl);
		}
	}

	static getInstance<T extends BaseComponent>(this: BaseComponentConstructor<T>, element: HTMLElement): T | undefined {
		return BaseComponent.getRegistry(this).get(element);
	}

	private static getRegistry<T extends BaseComponent>(ctor: BaseComponentConstructor<T>): WeakMap<HTMLElement, T> {
		const host = ctor as unknown as RegistryHost;
		if (!host.__instances) {
			host.__instances = new WeakMap<HTMLElement, BaseComponent>();
		}
		return host.__instances as WeakMap<HTMLElement, T>;
	}
}
