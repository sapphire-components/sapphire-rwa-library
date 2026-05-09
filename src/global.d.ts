declare global {
	interface Window {
		SapphireRWALibrary: SapphireRWALibrary;
		tippy: any;
	}

	type TippyInstance = {
		destroy: () => void;
		hide: () => void;
		popper: HTMLElement;
		popperInstance: any;
		reference: HTMLElement;
		setProps: (props: any) => void;
		show: () => void;
		state: any;
	};
}

// “When I import a file whose path ends with .svg?raw, treat that import as a string.”
declare module '*.svg?raw' {
	const content: string;
	export default content;
}

export {};
