declare global {
	interface Window {
		SapphireRWALibrary: SapphireRWALibraryAPI;
	}
}

// “When I import a file whose path ends with .svg?raw, treat that import as a string.”
declare module '*.svg?raw' {
	const content: string;
	export default content;
}

export {};
