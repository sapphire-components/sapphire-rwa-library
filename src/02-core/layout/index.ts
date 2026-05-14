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

	constructor(init: LayoutWrapperInit) {
		super(init);

		this.layoutWrapperEl = document.querySelector<HTMLDivElement>('.layoutwrapper');
		this.screenContainerEl = document.querySelector<HTMLDivElement>('.screen-container');

		if (!this.screenContainerEl || !this.layoutWrapperEl) {
			return;
		}

		this.filterBarEl = document.querySelector<HTMLDivElement>('.filterbar');
		this.tableEl = document.querySelector<HTMLDivElement>('.tablewrapper .table');

		const onScroll = this.handleScroll.bind(this);

		this.screenContainerEl.addEventListener('scroll', onScroll);
	}

	handleScroll(): void {
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
			} else {
				this.tableEl!.dataset.isfixed = 'false';
				document.querySelector<HTMLDivElement>('.table-header-clone')!.style.top = ``;
			}
		}

		this.screenContainerEl!.dataset.fixedcombinedheight = fixedCombinedHeight.toString();
	}

	destroy(): void {
		super.destroy();
	}
}
