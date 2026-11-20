import Helpers from '@utils/helpers';

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

	private layoutResizeObserver?: ResizeObserver;
	private layoutResizeDebounced?: ((...args: Parameters<ResizeObserverCallback>) => void) & { cancel: () => void };

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
		this.disconnectLayoutResize();

		if (this.widgetEl) {
			BaseComponent.getRegistry(this.constructor as BaseComponentConstructor<this>).delete(this.widgetEl);
		}
	}

	/** Points the instance at a new host element (e.g. after OutSystems replaces the node) and keeps the registry in sync. */
	protected setWidgetEl(element: HTMLElement): void {
		if (element === this.widgetEl) return;

		const registry = BaseComponent.getRegistry(this.constructor as BaseComponentConstructor<this>);
		if (this.widgetEl) {
			registry.delete(this.widgetEl);
		}
		this.widgetEl = element;
		registry.set(element, this);
	}

	protected observeLayoutResize(handler: ResizeObserverCallback, debounceMs?: number): void {
		if (this.layoutResizeObserver) {
			return;
		}

		const layoutEl = document.querySelector<HTMLElement>('.layout');
		if (!layoutEl) {
			return;
		}

		let callback: ResizeObserverCallback = handler;
		if (typeof debounceMs === 'number' && debounceMs > 0) {
			this.layoutResizeDebounced = Helpers.debounce(handler, debounceMs);
			callback = this.layoutResizeDebounced;
		}

		this.layoutResizeObserver = new ResizeObserver(callback);
		this.layoutResizeObserver.observe(layoutEl);
	}

	protected disconnectLayoutResize(): void {
		this.layoutResizeDebounced?.cancel();
		this.layoutResizeDebounced = undefined;
		this.layoutResizeObserver?.disconnect();
		this.layoutResizeObserver = undefined;
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
