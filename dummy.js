class MyExampleComponent {
	constructor() {
		this.options = {};
		this.isReady = false;
		this.element = null;
	}

	onParametersChanged(options) {
		this.options = {
			...this.options,
			...options,
		};

		console.log('Parameters changed:', options);
	}

	onDestroy() {
		console.log('Destroyed');

		this.options = null;
	}
}
