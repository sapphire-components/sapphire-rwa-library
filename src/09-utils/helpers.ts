export default class Helpers {
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
}
