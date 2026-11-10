import { BaseComponent, type BaseComponentInit } from '@core/base';

type Layout = 'grid' | 'masonry';

// SapphireSize ids that have a matching --space-* token.
const GAP_SIZES = ['none', 'xs3', 'xs2', 'xs', 's', 'base', 'm', 'l', 'xl', 'xl2', 'xl3', 'xl4'] as const;
type GapSize = (typeof GAP_SIZES)[number];
// Matches the block's Gap default (Entities.SapphireSize.M).
const DEFAULT_GAP: GapSize = 'm';

function resolveGap(value: string | null | undefined): GapSize {
	const normalized = String(value ?? '')
		.trim()
		.toLowerCase();
	return (GAP_SIZES as readonly string[]).includes(normalized) ? (normalized as GapSize) : DEFAULT_GAP;
}

interface ResponsiveContainersInit extends BaseComponentInit {
	columns: number;
	gap: string;
	layout: Layout;
	minColWidth: number;
}

export default class ResponsiveContainers extends BaseComponent {
	private columns = 0;
	private containersPlaceholder!: HTMLElement;
	private gap: GapSize = DEFAULT_GAP;
	private layout: Layout = 'grid';
	private minColWidth = 0;

	constructor(init: ResponsiveContainersInit) {
		super(init);

		if (!this.widgetEl) {
			console.warn('ResponsiveContainers: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.apply(init);
	}

	parametersChanged(payload: ResponsiveContainersInit): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) {
			return;
		}

		// OutSystems may replace the host node when inputs change.
		this.widgetEl = liveEl;
		this.apply(payload);
	}

	destroy() {}

	private apply(init: Partial<ResponsiveContainersInit>): void {
		if (!this.widgetEl) {
			return;
		}

		const placeholder = this.widgetEl.querySelector<HTMLElement>(':scope > div');
		if (!placeholder) {
			console.warn('ResponsiveContainers: containers placeholder not found for runtimeId', this.runtimeId);
			return;
		}

		this.containersPlaceholder = placeholder;

		if (init.columns !== undefined) {
			this.columns = init.columns;
		}
		if (init.gap !== undefined) {
			this.gap = resolveGap(init.gap);
		}
		if (init.layout !== undefined) {
			this.layout = init.layout;
		}
		if (init.minColWidth !== undefined) {
			this.minColWidth = init.minColWidth;
		}

		const columnCount = Math.floor(this.columns);
		const fixedColumns = columnCount > 0;

		this.widgetEl.style.setProperty('--responsive-containers-gap', `var(--space-${this.gap})`);
		this.widgetEl.style.setProperty('--responsive-containers-min-col-width', `${this.minColWidth}px`);

		if (fixedColumns) {
			this.widgetEl.style.setProperty('--responsive-containers-columns', String(columnCount));
		} else {
			this.widgetEl.style.removeProperty('--responsive-containers-columns');
		}

		this.containersPlaceholder.classList.add('responsive-containers');
		this.containersPlaceholder.classList.toggle('responsive-containers--grid', this.layout === 'grid');
		this.containersPlaceholder.classList.toggle('responsive-containers--masonry', this.layout === 'masonry');
		this.containersPlaceholder.classList.toggle('responsive-containers--fixed-columns', fixedColumns);
		this.markItems();
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
