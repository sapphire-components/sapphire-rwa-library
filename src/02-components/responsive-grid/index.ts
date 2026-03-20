import { BaseComponent, type BaseComponentInit } from '../../core/base';

interface ResponsiveGridInit extends BaseComponentInit {
	minimumWidth: number;
	gridGap: number;
}

export default class ResponsiveGrid extends BaseComponent {
	private gridPlaceholder!: HTMLElement;

	constructor(init: ResponsiveGridInit) {
		super(init);

		if (!this.widgetEl) {
			console.warn('ResponsiveGrid: root element not found for runtimeId', init.runtimeId);
			return;
		}

		console.log(init);

		this.widgetEl.style.setProperty('--responsive-grid-minimum-width', `${init.minimumWidth}px`);
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
