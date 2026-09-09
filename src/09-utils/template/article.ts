interface IMyComponentConfig {
	events: {
		onClick: () => void;
	}
	runtimeId: string;
	incomingParam1: string;
}

class MyComponent {
	private runtimeId: string;
	private widgetElement: HTMLElement | null;

	constructor(config: IMyComponentConfig) {
		// component initialization
		// config = { incomingParam1: ..., runtimeId: ... }

		this.runtimeId = config.runtimeId;
		this.widgetElement = document.getElementById(this.runtimeId);

		if (this.widgetElement) {
			this.widgetElement.innerHTML = `
				<div>
					<h1>Hello, World!</h1>
				</div>
			`;
		}
	}

	onParametersChanged(_payload: IMyComponentConfig) {
		// what happens when some parameter changes
		// payload = { incomingParam1: ... }
	}

	destroy() {
		// cleanup. mainly event listeners, observers, etc.
	}
}

(window as any).MyLibraryNamespace = (window as any).MyLibraryNamespace || {};
(window as any).MyLibraryNamespace.MyComponent = MyComponent;
