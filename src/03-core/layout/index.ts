import Helpers from '@utils/helpers';
import { LocalStorageKeys } from '@utils/local-storage-keys';
import { BaseComponent, type BaseComponentInit } from '@core/base';

interface LayoutWrapperInit extends BaseComponentInit {
	theme: string;
	density: string;
}

export default class LayoutWrapper extends BaseComponent {
	private auxiliarOverlayObserver?: ResizeObserver;
	private auxiliarOverlaySkip = false;
	private documentationCloseEl: HTMLButtonElement | null = null;
	private filterBarEl: HTMLDivElement | null = null;
	private layoutWrapperEl: HTMLDivElement | null;
	private screenContainerEl: HTMLDivElement | null;
	private tableEl: HTMLDivElement | null = null;

	private onDocumentationCloseClick = (): void => {
		Helpers.writeToLocalStorage(LocalStorageKeys.showDocumentation, false);
		document.body.dataset.showdocumentation = 'false';
		this.syncDesignSystemAuxiliarOverlay();
	};

	private handleLayoutVerticalScroll = (): void => {
		this.filterBarEl = document.querySelector<HTMLDivElement>('.filterbar[data-issticky="true"]');
		this.tableEl = document.querySelector<HTMLDivElement>('.tablewrapper[data-isstickyheader="true"] .table');

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
	};

	constructor(configOptions: LayoutWrapperInit) {
		super(configOptions);

		this.layoutWrapperEl = document.querySelector<HTMLDivElement>('.layoutwrapper');
		this.screenContainerEl = document.querySelector<HTMLDivElement>('.screen-container');

		if (!this.layoutWrapperEl) {
			return;
		}

		this.applyStoredDocumentationVisibility();
		this.bindDocumentationClose();

		if (!this.screenContainerEl) {
			return;
		}

		this.filterBarEl = document.querySelector<HTMLDivElement>('.filterbar[data-issticky="true"]');
		this.tableEl = document.querySelector<HTMLDivElement>('.tablewrapper[data-isstickyheader="true"] .table');

		this.observeLayoutResize(this.handleLayoutResize);

		this.screenContainerEl.addEventListener('scroll', this.handleLayoutVerticalScroll);
		this.bindDesignSystemAuxiliarOverlay();
	}

	private isDocumentationLayout(wrapper: HTMLElement): boolean {
		return wrapper.classList.contains('designsystem') || wrapper.hasAttribute('data-documentationwidth');
	}

	private applyStoredDocumentationVisibility(): void {
		const wrapper = this.layoutWrapperEl;
		if (!wrapper || !this.isDocumentationLayout(wrapper)) {
			return;
		}

		if (Helpers.readFromLocalStorage<boolean>(LocalStorageKeys.showDocumentation) === false) {
			document.body.dataset.showdocumentation = 'false';
		}
	}

	private bindDocumentationClose(): void {
		const wrapper = this.layoutWrapperEl;
		if (!wrapper || !this.isDocumentationLayout(wrapper)) {
			return;
		}

		const auxiliar = wrapper.querySelector<HTMLElement>('.layoutwrapper-body-auxiliar');
		if (!auxiliar) {
			return;
		}

		let button = auxiliar.querySelector<HTMLButtonElement>(':scope > .layoutwrapper-body-auxiliar-close');
		if (!button) {
			button = document.createElement('button');
			button.type = 'button';
			button.className = 'btn btn-icon btn-xsmall btn-tertiary layoutwrapper-body-auxiliar-close';
			button.setAttribute('aria-label', 'Close documentation');
			button.innerHTML = Helpers.placeIcon('x', 's');
			button.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');
			auxiliar.prepend(button);
		}

		this.documentationCloseEl = button;
		button.addEventListener('click', this.onDocumentationCloseClick);
	}

	private bindDesignSystemAuxiliarOverlay(): void {
		const wrapper = this.layoutWrapperEl;
		if (!wrapper?.classList.contains('designsystem')) {
			return;
		}

		this.auxiliarOverlayObserver = new ResizeObserver(() => {
			if (this.auxiliarOverlaySkip) {
				return;
			}
			this.syncDesignSystemAuxiliarOverlay();
		});
		this.auxiliarOverlayObserver.observe(document.documentElement);
		this.auxiliarOverlayObserver.observe(wrapper);

		const body = wrapper.querySelector<HTMLElement>('.layoutwrapper-body');
		const content = wrapper.querySelector<HTMLElement>('.layoutwrapper-body-content');
		const auxiliar = wrapper.querySelector<HTMLElement>('.layoutwrapper-body-auxiliar');
		if (body) {
			this.auxiliarOverlayObserver.observe(body);
		}
		if (content) {
			this.auxiliarOverlayObserver.observe(content);
		}
		if (auxiliar) {
			this.auxiliarOverlayObserver.observe(auxiliar);
		}

		this.syncDesignSystemAuxiliarOverlay();
	}

	private syncDesignSystemAuxiliarOverlay = (): void => {
		const wrapper = this.layoutWrapperEl;
		if (!wrapper?.classList.contains('designsystem')) {
			return;
		}

		const auxiliar = wrapper.querySelector<HTMLElement>('.layoutwrapper-body-auxiliar');
		if (!auxiliar || getComputedStyle(auxiliar).display === 'none') {
			delete wrapper.dataset.auxiliaroverlay;
			return;
		}

		const wasOverlay = wrapper.dataset.auxiliaroverlay === 'true';
		if (wasOverlay) {
			delete wrapper.dataset.auxiliaroverlay;
		}

		const overflows = auxiliar.getBoundingClientRect().right > document.documentElement.clientWidth + 1;
		if (overflows) {
			wrapper.dataset.auxiliaroverlay = 'true';
		}

		if (wasOverlay || overflows) {
			this.auxiliarOverlaySkip = true;
			requestAnimationFrame(() => {
				this.auxiliarOverlaySkip = false;
			});
		}
	};

	private handleLayoutResize = (_entries: ResizeObserverEntry[]): void => {
		if (this.tableEl && this.tableEl.dataset.isfixed === 'true') {
			this.duplicateTableHeaderWidths(this.tableEl as HTMLTableElement);
		} else if (this.tableEl && this.tableEl.dataset.isfixed === 'false') {
			this.removeTableHeaderCloneWidths(this.tableEl as HTMLTableElement);
		}
	};

	duplicateTableHeaderWidths(tableEl: HTMLTableElement): void {
		const tableHeaderEl = tableEl.querySelector<HTMLDivElement>('.table-header:not(.table-header-clone)');
		const tableHeaderClonedEl = tableEl.querySelector<HTMLDivElement>('.table-header-clone');
		const allTableHeaderEls = tableHeaderEl!.querySelectorAll<HTMLTableCellElement>('th');
		const allTableHeaderCloneEls = tableHeaderClonedEl!.querySelectorAll<HTMLTableCellElement>('th');

		const count = Math.min(allTableHeaderEls.length, allTableHeaderCloneEls.length);

		for (let i = 0; i < count; i++) {
			const width = allTableHeaderEls[i].getBoundingClientRect().width;
			allTableHeaderCloneEls[i].style.maxWidth = `${width}px`;
			allTableHeaderCloneEls[i].style.minWidth = `${width}px`;
			allTableHeaderCloneEls[i].style.width = `${width}px`;
		}
	}

	removeTableHeaderCloneWidths(tableEl: HTMLTableElement): void {
		const tableHeaderClonedEl = tableEl.querySelector<HTMLDivElement>('.table-header-clone');
		const allTableHeaderCloneEls = tableHeaderClonedEl!.querySelectorAll<HTMLTableCellElement>('th');
		for (let i = 0; i < allTableHeaderCloneEls.length; i++) {
			allTableHeaderCloneEls[i].style.width = '';
			allTableHeaderCloneEls[i].style.maxWidth = '';
			allTableHeaderCloneEls[i].style.minWidth = '';
		}
	}

	destroy(): void {
		this.documentationCloseEl?.removeEventListener('click', this.onDocumentationCloseClick);
		this.auxiliarOverlayObserver?.disconnect();
		super.destroy();
	}
}
