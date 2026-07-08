declare global {
	const __APP_VERSION__: string;

	interface Window {
		SapphireRWALibrary: SapphireRWALibrary;
		SapphireRWADocumentation: SapphireRWADocumentationConstructor;
		tippy: any;
	}

	interface SapphireRWADocumentationInstance {
		name: string;
		/** Build-time rendered HTML for the component's documentation.md, or '' when none exists. */
		html: string;
	}

	interface SapphireRWADocumentationConstructor {
		new (name: string): SapphireRWADocumentationInstance;
		(name: string): SapphireRWADocumentationInstance;
		has(name: string): boolean;
		names(): string[];
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
