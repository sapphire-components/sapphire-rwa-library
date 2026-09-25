import { BaseComponent, type BaseComponentInit } from '@core/base';

type Layout = 'grid' | 'masonry';

interface ResponsiveContainersInit extends BaseComponentInit {
	gap: number;
	layout: Layout;
	minColWidth: number;
}

export default class ResponsiveContainers extends BaseComponent {
	private containersPlaceholder!: HTMLElement;
	private gap!: number;
	private layout!: Layout;
	private minColWidth!: number;

	constructor(init: ResponsiveContainersInit) {
		super(init);

		if (!this.widgetEl) {
			console.warn('ResponsiveContainers: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.containersPlaceholder = this.widgetEl.querySelector<HTMLElement>(':scope > div')!;
		this.applyLayout(init);
		this.markItems();
	}

	parametersChanged(payload?: ResponsiveContainersInit): void {
		if (!this.widgetEl || !payload) {
			return;
		}

		this.applyLayout(payload);
	}

	destroy() {}

	private applyLayout(init: ResponsiveContainersInit): void {
		this.gap = init.gap;
		this.layout = init.layout;
		this.minColWidth = init.minColWidth;

		this.widgetEl.style.setProperty('--responsive-containers-gap', `${this.gap}px`);
		this.widgetEl.style.setProperty('--responsive-containers-min-col-width', `${this.minColWidth}px`);

		this.containersPlaceholder.classList.add('responsive-containers');
		this.containersPlaceholder.classList.toggle('responsive-containers--grid', this.layout === 'grid');
		this.containersPlaceholder.classList.toggle('responsive-containers--masonry', this.layout === 'masonry');
	}

	private markItems(): void {
		const children = Array.from(this.containersPlaceholder.children);

		if (children.length === 1 && children[0].classList.contains('list') && children[0].classList.contains('list-group')) {
			const wrapper = children[0];
			wrapper.classList.add('display-contents');
			Array.from(wrapper.children).forEach((child) => {
				child.classList.add('responsive-container-item');
			});
			return;
		}

		children.forEach((child) => {
			child.classList.add('responsive-container-item');
		});
	}
}
