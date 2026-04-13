import { BaseComponent, type BaseComponentInit } from '../../core/base';

interface ResponsiveGridInit extends BaseComponentInit {
	forcedColumns: number;
	gridGap: number;
	maxColWidth: number;
	minColWidth: number;
}

export default class ResponsiveGrid extends BaseComponent {
	private gridPlaceholder!: HTMLElement;
	private forcedColumns!: number;

	constructor(init: ResponsiveGridInit) {
		super(init);

		if (!this.widgetEl) {
			console.warn('ResponsiveGrid: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.forcedColumns = init.forcedColumns;

		if (this.forcedColumns) {
			this.widgetEl.style.setProperty('--responsive-grid-forced-columns', `${this.forcedColumns}`);
			this.widgetEl.style.gridTemplateColumns = `repeat(${this.forcedColumns}, minmax(var(--responsive-grid-min-col-width), 1fr))`;
		}

		this.widgetEl.style.setProperty('--responsive-grid-min-col-width', `${init.minColWidth}px`);
		if (init.maxColWidth) {
			this.widgetEl.style.setProperty('--responsive-grid-max-col-width', `${init.maxColWidth}px`);
		}
		this.widgetEl.style.setProperty('--responsive-grid-gap', `${init.gridGap}px`);

		this.gridPlaceholder = this.widgetEl.querySelector<HTMLElement>(':scope > div')!;

		const children = Array.from(this.gridPlaceholder.children);

		if (children.length === 1 && children[0].classList.contains('list') && children[0].classList.contains('list-group')) {
			const wrapper = children[0];
			wrapper.classList.add('display-contents');
			Array.from(wrapper.children).forEach((child) => {
				child.classList.add('responsive-grid-item');
			});
			return;
		}

		children.forEach((child) => {
			child.classList.add('responsive-grid-item');
		});
	}

	destroy() {}
}
