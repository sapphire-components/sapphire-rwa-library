import Helpers from '../../09-utils/helpers';
import { BaseComponent, type BaseComponentInit } from '../../core/base';

interface LayoutWrapperInit extends BaseComponentInit {
	theme: string;
	density: string;
}

export default class LayoutWrapper extends BaseComponent {
	private filterBarEl: HTMLDivElement | null = null;
	private layoutWrapperEl: HTMLDivElement | null;
	private screenContainerEl: HTMLDivElement | null;
	private tableEl: HTMLDivElement | null = null;

	constructor(configOptions: LayoutWrapperInit) {
		super(configOptions);

		this.layoutWrapperEl = document.querySelector<HTMLDivElement>('.layoutwrapper');
		this.screenContainerEl = document.querySelector<HTMLDivElement>('.screen-container');

		if (!this.screenContainerEl || !this.layoutWrapperEl) {
			return;
		}

		console.log('LayoutWrapper: constructor');

		this.filterBarEl = document.querySelector<HTMLDivElement>('.filterbar[data-issticky="true"]');
		this.tableEl = document.querySelector<HTMLDivElement>('.tablewrapper .table');

		const onScroll = this.handleLayoutVerticalScroll.bind(this);

		this.observeLayoutResize(this.handleLayoutResize);

		this.screenContainerEl.addEventListener('scroll', onScroll);
	}

	private handleLayoutResize = (_entries: ResizeObserverEntry[]): void => {
		if (this.tableEl && this.tableEl.dataset.isfixed === 'true') {
			this.duplicateTableHeaderWidths(this.tableEl as HTMLTableElement);
		} else if (this.tableEl && this.tableEl.dataset.isfixed === 'false') {
			this.removeTableHeaderCloneWidths(this.tableEl as HTMLTableElement);
		}
	};

	handleLayoutVerticalScroll(): void {
		if (this.filterBarEl) {
			this.filterBarEl.dataset.isfixed = 'false';
		}

		if (this.tableEl) {
			this.tableEl.dataset.isfixed = 'false';
		}

		let fixedCombinedHeight = 0;

		if (this.filterBarEl) {
			fixedCombinedHeight = Helpers.getFixedElementsCombinedHeight();
			const filterBarRect = this.filterBarEl!.getBoundingClientRect();
			if (filterBarRect.top < fixedCombinedHeight) {
				this.filterBarEl!.dataset.isfixed = 'true';
				document.querySelector<HTMLDivElement>('.filterbar-wrapper')!.style.top = `${fixedCombinedHeight}px`;
			} else {
				this.filterBarEl!.dataset.isfixed = 'false';
				document.querySelector<HTMLDivElement>('.filterbar-wrapper')!.style.top = '';
			}
		}

		if (this.tableEl) {
			fixedCombinedHeight = Helpers.getFixedElementsCombinedHeight();
			const tableRect = this.tableEl!.getBoundingClientRect();
			if (tableRect.top < fixedCombinedHeight) {
				this.tableEl!.dataset.isfixed = 'true';
				document.querySelector<HTMLDivElement>('.table-header-clone')!.style.top = `${fixedCombinedHeight}px`;
				document.querySelector<HTMLDivElement>('.table-header-clone')!.scrollLeft = document.querySelector<HTMLDivElement>('.tablewrapper')!.scrollLeft;
				this.duplicateTableHeaderWidths(this.tableEl as HTMLTableElement);
			} else {
				this.tableEl!.dataset.isfixed = 'false';
				this.removeTableHeaderCloneWidths(this.tableEl as HTMLTableElement);
				document.querySelector<HTMLDivElement>('.table-header-clone')!.style.top = ``;
			}
		}

		this.screenContainerEl!.dataset.fixedcombinedheight = fixedCombinedHeight.toString();
	}

	duplicateTableHeaderWidths(tableEl: HTMLTableElement): void {
		const tableHeaderEl = tableEl.querySelector<HTMLDivElement>('.table-header:not(.table-header-clone)');
		const tableHeaderClonedEl = tableEl.querySelector<HTMLDivElement>('.table-header-clone');
		const allTableHeaderEls = tableHeaderEl!.querySelectorAll<HTMLTableCellElement>('th');
		const allTableHeaderCloneEls = tableHeaderClonedEl!.querySelectorAll<HTMLTableCellElement>('th');
		const count = Math.min(allTableHeaderEls.length, allTableHeaderCloneEls.length);
		for (let i = 0; i < count; i++) {
			const width = allTableHeaderEls[i].getBoundingClientRect().width;
			allTableHeaderCloneEls[i].style.width = `${width}px`;
		}
	}

	removeTableHeaderCloneWidths(tableEl: HTMLTableElement): void {
		const tableHeaderClonedEl = tableEl.querySelector<HTMLDivElement>('.table-header-clone');
		const allTableHeaderCloneEls = tableHeaderClonedEl!.querySelectorAll<HTMLTableCellElement>('th');
		for (let i = 0; i < allTableHeaderCloneEls.length; i++) {
			allTableHeaderCloneEls[i].style.width = '';
		}
	}

	destroy(): void {
		super.destroy();
	}
}
