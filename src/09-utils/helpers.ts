export default class Helpers {
	static placeIcon(name: string, size: string = 'm'): string {
		return `<div class="svg-icon" data-size="${size}"><svg fill="currentColor"><use xlink:href="#svg-icon-${name}"></use></svg></div>`;
	}

	static writeToLocalStorage<T>(key: string, value: T): boolean {
		try {
			localStorage.setItem(key, JSON.stringify(value));
			return true;
		} catch (error) {
			console.warn(`Helpers.writeToLocalStorage failed for key "${key}"`, error);
			return false;
		}
	}

	static readFromLocalStorage<T>(key: string): T | null {
		const storedValue = localStorage.getItem(key);

		if (storedValue === null) {
			return null;
		}

		try {
			return JSON.parse(storedValue) as T;
		} catch {
			return storedValue as T;
		}
	}

	static getFixedElementsCombinedHeight(root = document) {
		const fixedFilterBarHeight = root.querySelector<HTMLDivElement>('.filterbar[data-isfixed="true"]')?.getBoundingClientRect().height || 0;
		const fixedTableHeaderHeight = root.querySelector<HTMLDivElement>('.table[data-isfixed="true"] .table-header')?.getBoundingClientRect().height || 0;
		return fixedFilterBarHeight + fixedTableHeaderHeight;
	}
}
