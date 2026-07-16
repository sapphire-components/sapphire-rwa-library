import { BaseComponent, type BaseComponentInit } from '@core/base';
import { createLoadingOverlay } from '@utils/loader';

interface TableWrapperConfigOptions extends BaseComponentInit {
	height: number;
	isLoading: boolean;
	isStickyHeader: boolean;
	maxHeight: number;
	pageCount: number;
}

export default class TableWrapper extends BaseComponent {
	private configOptions!: TableWrapperConfigOptions;
	private hasMaxHeight = false;
	private isLoading = false;
	private isPristine = true;
	private isStickyHeader = false;
	private loadingEl?: HTMLDivElement;
	private pageCount = 0;
	private syncing = false;
	private tableEl!: HTMLTableElement;
	private tableHeaderCloneEl!: HTMLDivElement;
	private tableHeaderEl!: HTMLDivElement;
	private theadEl!: HTMLTableSectionElement;

	constructor(configOptions: TableWrapperConfigOptions) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('TableWrapper: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		this.configOptions = configOptions;

		this.isLoading = this.configOptions.isLoading;
		this.isStickyHeader = this.configOptions.isStickyHeader && !this.configOptions.maxHeight;
		this.pageCount = this.configOptions.pageCount;

		this.tableEl = this.widgetEl.querySelector<HTMLTableElement>('table')!;
		this.tableHeaderEl = this.widgetEl.querySelector<HTMLDivElement>('.table-header')!;
		this.theadEl = this.tableEl.querySelector<HTMLTableSectionElement>('thead')!;

		this.reflectStateAttributes();
		this.reflectPageCount();
		this.updateLoadingState();

		this.setupDOM();

		this.setWidgetRect();

		this.tableHeaderCloneEl.addEventListener('scroll', () => {
			console.log('table header clone scroll', this.syncing);
			if (this.syncing) return;
			this.syncing = true;
			this.widgetEl.scrollLeft = this.tableHeaderCloneEl.scrollLeft;
			this.syncing = false;
		});

		this.widgetEl.addEventListener('scroll', () => {
			if (this.syncing) return;
			this.syncing = true;
			this.tableHeaderCloneEl.scrollLeft = this.widgetEl.scrollLeft;
			this.syncing = false;
		});

		this.observeLayoutResize(this.handleLayoutResize);
	}

	setupDOM(): void {
		const clone = this.tableHeaderEl.cloneNode(true) as HTMLDivElement;
		clone.classList.add('table-header-clone');
		clone.querySelectorAll('.sortable-icon').forEach((child) => {
			(child as HTMLElement).style.opacity = '0';
		});
		this.tableHeaderCloneEl = clone as HTMLDivElement;
		this.theadEl.appendChild(this.tableHeaderCloneEl);
	}

	setWidgetRect(): void {
		if (this.configOptions.height) {
			this.widgetEl.style.setProperty('--tablewrapper-height', `${this.configOptions.height}px`);
		}

		if (this.configOptions.maxHeight) {
			this.hasMaxHeight = true;
			this.widgetEl.style.setProperty('--tablewrapper-max-height', `${this.configOptions.maxHeight}px`);
		} else {
			this.hasMaxHeight = false;
		}

		this.widgetEl.dataset.hasmaxheight = this.hasMaxHeight ? 'true' : 'false';

		this.widgetEl.style.setProperty('--tablewrapper-top', `${this.widgetEl.offsetTop}px`);
		this.widgetEl.style.setProperty('--tablewrapper-width', `${this.widgetEl.clientWidth}px`);
	}

	private reflectStateAttributes(): void {
		this.widgetEl.dataset.isloading = this.isLoading ? 'true' : 'false';
		this.widgetEl.dataset.ispristine = this.isPristine ? 'true' : 'false';
		this.widgetEl.dataset.isstickyheader = this.isStickyHeader ? 'true' : 'false';
	}

	private handleLayoutResize = (_entries: ResizeObserverEntry[]): void => {
		this.setWidgetRect();
	};

	parametersChanged(payload: TableWrapperConfigOptions): void {
		if (!this.widgetEl) return;

		if (payload.isLoading !== undefined && payload.isLoading !== this.isLoading) {
			this.isPristine = false;
			this.isLoading = payload.isLoading;
			this.reflectStateAttributes();
			this.updateLoadingState();
			if (!payload.isLoading) {
				this.reflectPageCount();
			}
		}

		if (payload.pageCount !== undefined && payload.pageCount !== this.pageCount) {
			this.isPristine = false;
			this.pageCount = payload.pageCount;
			this.reflectPageCount();
		}
	}

	// Floats a centered spinner over the whole wrapper while loading, and tears
	// it down when loading ends. The wrapper is already `position: relative`.
	private updateLoadingState(): void {
		if (this.isLoading) {
			if (!this.loadingEl) {
				this.loadingEl = createLoadingOverlay();
				this.widgetEl.appendChild(this.loadingEl);
			}
			return;
		}

		this.loadingEl?.remove();
		this.loadingEl = undefined;
	}

	private reflectPageCount(): void {
		console.log('reflectPageCount', this.runtimeId, this.pageCount, this.isPristine);

		if (this.pageCount === 0 && !this.isPristine) {
			this.widgetEl.dataset.norecords = 'true';
		} else {
			this.widgetEl.dataset.norecords = 'false';
		}
	}

	destroy() {
		this.loadingEl?.remove();
		this.loadingEl = undefined;
		super.destroy();
	}
}
