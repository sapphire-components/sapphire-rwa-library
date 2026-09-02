declare global {
	const __APP_VERSION__: string;

	interface Window {
		SapphireRWALibrary: SapphireRWALibrary;
		SapphireRWAIcons: SapphireRWAIcons;
		SapphireRWAFlags: SapphireRWAFlags;
		SapphireRWADocumentation: SapphireRWADocumentationConstructor;
		SapphireRWAStaticEntities: SapphireRWAStaticEntitiesConstructor;
		tippy: any;
	}

	interface SapphireRWAIcons {
		inject(): void;
	}

	interface SapphireRWAFlags {
		get(code: string): string | undefined;
	}

	interface SapphireRWALookupInstance {
		name: string;
		/** Build-time rendered HTML, or '' when none exists. */
		html: string;
	}

	interface SapphireRWALookupConstructor {
		new (name: string): SapphireRWALookupInstance;
		(name: string): SapphireRWALookupInstance;
		has(name: string): boolean;
		names(): string[];
	}

	interface SapphireRWADocumentationInstance extends SapphireRWALookupInstance {}

	interface SapphireRWADocumentationConstructor extends SapphireRWALookupConstructor {}

	interface SapphireRWAStaticEntitiesInstance extends SapphireRWALookupInstance {}

	interface SapphireRWAStaticEntitiesConstructor extends SapphireRWALookupConstructor {}

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
