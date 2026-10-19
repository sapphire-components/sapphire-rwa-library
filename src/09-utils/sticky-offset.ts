type StickyBand = {
	element: HTMLElement;
	height: number;
};

const bands = new Map<string, StickyBand>();
const listeners = new Set<() => void>();

export function setStickyBand(id: string, element: HTMLElement, height: number): void {
	const existing = bands.get(id);
	if (existing && existing.element === element && existing.height === height) {
		return;
	}

	bands.set(id, { element, height });
	notifyStickyOffset();
}

export function clearStickyBand(id: string): void {
	if (!bands.delete(id)) {
		return;
	}

	notifyStickyOffset();
}

export function subscribeStickyOffset(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function stickyOffsetBefore(element: HTMLElement): number {
	let offset = 0;

	for (const band of bands.values()) {
		if (band.element === element || band.element.contains(element) || element.contains(band.element)) {
			continue;
		}

		const position = band.element.compareDocumentPosition(element);
		if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
			offset += band.height;
		}
	}

	return offset;
}

export function scrollportOf(element: HTMLElement): HTMLElement | null {
	let parent = element.parentElement;

	while (parent && parent !== document.documentElement) {
		const { overflowY } = getComputedStyle(parent);
		if (overflowY === 'auto' || overflowY === 'scroll') {
			return parent;
		}
		parent = parent.parentElement;
	}

	return null;
}

export function pinTopFor(element: HTMLElement): number {
	const scrollport = scrollportOf(element);
	const scrollportTop = scrollport ? scrollport.getBoundingClientRect().top : 0;
	return scrollportTop + stickyOffsetBefore(element);
}

function notifyStickyOffset(): void {
	listeners.forEach((listener) => listener());
}
