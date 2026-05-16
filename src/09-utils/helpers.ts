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

	static isRTL(): boolean {
		console.log(document.body.classList.contains('is-rtl'));
		return document.body.classList.contains('is-rtl');
	}

	static areTheyEqual(incoming: any, existing: any): boolean {
		// Strict equality covers primitives and reference equality
		if (incoming === existing) {
			return true;
		}

		// Handle cases where one is null/undefined and the other is not
		if (incoming == null || existing == null) {
			return false;
		}

		// Arrays
		if (Array.isArray(incoming) || Array.isArray(existing)) {
			if (!Array.isArray(incoming) || !Array.isArray(existing)) {
				return false;
			}

			if (incoming.length !== existing.length) {
				return false;
			}

			for (let i = 0; i < incoming.length; i++) {
				if (!Helpers.areTheyEqual(incoming[i], existing[i])) {
					return false;
				}
			}

			return true;
		}

		// Objects (deep comparison)
		if (typeof incoming === 'object' && typeof existing === 'object') {
			const incomingKeys = Object.keys(incoming);
			const existingKeys = Object.keys(existing);

			if (incomingKeys.length !== existingKeys.length) {
				return false;
			}

			for (const key of incomingKeys) {
				if (!Object.prototype.hasOwnProperty.call(existing, key)) {
					return false;
				}

				if (!Helpers.areTheyEqual((incoming as any)[key], (existing as any)[key])) {
					return false;
				}
			}

			return true;
		}

		// Fallback for numbers / strings / booleans of different types
		return false;
	}

	static toNumber(value: number | string | undefined): number | null {
		if (typeof value === 'number') return value;

		if (typeof value === 'string') {
			const parsed = Number.parseFloat(value);
			return Number.isFinite(parsed) ? parsed : null;
		}

		return null;
	}

	static dataList(element: HTMLElement, attribute: string) {
		return {
			add(value: string) {
				const current = element.dataset[attribute] || '';
				const values = new Set(current.split(/\s+/).filter(Boolean));
				values.add(value);
				element.dataset[attribute] = [...values].join(' ');
			},
			remove(value: string) {
				const current = element.dataset[attribute] || '';
				element.dataset[attribute] = current
					.split(/\s+/)
					.filter(Boolean)
					.filter((item) => item !== value)
					.join(' ');
			},
			contains(value: string) {
				const current = element.dataset[attribute] || '';
				return current.split(/\s+/).includes(value);
			},
		};
	}

	static debounce<T extends (...args: any[]) => void>(fn: T, delay: number): ((...args: Parameters<T>) => void) & { cancel: () => void } {
		let timeout: ReturnType<typeof setTimeout> | undefined;

		const debounced = function (this: unknown, ...args: Parameters<T>): void {
			clearTimeout(timeout);
			timeout = setTimeout(() => fn.apply(this, args), delay);
		};

		return Object.assign(debounced, {
			cancel(): void {
				clearTimeout(timeout);
				timeout = undefined;
			},
		});
	}
}
