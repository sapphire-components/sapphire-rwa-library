declare global {
	interface Window {
		SapphireRWALibrary: SapphireRWALibrary;
		SapphireRWAInstances: SapphireRWAInstances;
		tippy: any;
	}

	type TippyInstance = {
		hide: () => void;
		popper: HTMLElement;
		popperInstance: any;
		reference: HTMLElement;
		show: () => void;
		state: any;
		destroy: () => void;
	};
}

// “When I import a file whose path ends with .svg?raw, treat that import as a string.”
declare module '*.svg?raw' {
	const content: string;
	export default content;
}

export {};
