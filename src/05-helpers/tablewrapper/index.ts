import { BaseComponent, type BaseComponentInit } from '../../core/base';

interface TableWrapperConfigOptions extends BaseComponentInit {
	hasScrollTop: boolean;
	height: number;
	isLoading: boolean;
	maxHeight: number;
	pageCount: number;
}

export default class TableWrapper extends BaseComponent {
	private configOptions!: TableWrapperConfigOptions;
	private isLoading = false;
	private pageCount = 0;
	private syncing = false;
	private tableEl!: HTMLTableElement;
	private tableHeaderCloneEl!: HTMLDivElement;
	private tableHeaderEl!: HTMLDivElement;
	private theadEl!: HTMLTableSectionElement;
	private topInnerEl?: HTMLDivElement;
	private topScrollEl!: HTMLDivElement;

	constructor(configOptions: TableWrapperConfigOptions) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('TableWrapper: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		console.log('TableWrapper: constructor', configOptions);

		this.configOptions = configOptions;

		this.isLoading = this.configOptions.isLoading;
		this.pageCount = this.configOptions.pageCount;

		this.tableEl = this.widgetEl.querySelector<HTMLTableElement>('table')!;
		this.tableHeaderEl = this.widgetEl.querySelector<HTMLDivElement>('.table-header')!;
		this.theadEl = this.tableEl.querySelector<HTMLTableSectionElement>('thead')!;

		this.reflectStateAttributes();
		this.reflectPageCount();

		this.setupDOM();

		this.setWidgetRect();

		if (this.configOptions.hasScrollTop) {
			this.topInnerEl = this.topScrollEl.querySelector<HTMLDivElement>('.table-scroll-top__inner')!;

			this.topInnerEl.style.width = `${this.tableEl.scrollWidth}px`;

			console.log('table scroll top scroll listener added', this.topScrollEl);
			this.topScrollEl.addEventListener('scroll', () => {
				console.log('table scroll top scroll', this.syncing);
				if (this.syncing) return;
				this.syncing = true;
				this.widgetEl.scrollLeft = this.topScrollEl.scrollLeft;
				this.syncing = false;
			});

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
				this.topScrollEl.scrollLeft = this.widgetEl.scrollLeft;
				this.topScrollEl.style.marginLeft = this.widgetEl.scrollLeft + 'px';
				this.tableHeaderCloneEl.scrollLeft = this.widgetEl.scrollLeft;
				this.syncing = false;
			});
		}

		this.observeLayoutResize(this.handleLayoutResize);
	}

	setupDOM(): void {
		if (this.configOptions.hasScrollTop) {
			this.topScrollEl = document.createElement('div');
			this.topScrollEl.classList.add('table-scroll-top');
			this.topScrollEl.innerHTML = '<div class="table-scroll-top__inner"></div>';
			this.tableEl.parentNode?.insertBefore(this.topScrollEl, this.tableEl);
		}

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
			this.widgetEl.style.setProperty('--tablewrapper-max-height', `${this.configOptions.maxHeight}px`);
		}

		if (this.topInnerEl) {
			this.topInnerEl.style.width = `${this.tableEl.scrollWidth}px`;
		}

		this.widgetEl.style.setProperty('--tablewrapper-top', `${this.widgetEl.offsetTop}px`);
		this.widgetEl.style.setProperty('--tablewrapper-width', `${this.widgetEl.clientWidth}px`);
	}

	private reflectStateAttributes(): void {
		this.widgetEl.dataset.isloading = this.isLoading ? 'true' : 'false';
	}

	private handleLayoutResize = (_entries: ResizeObserverEntry[]): void => {
		console.log('layout resized tablewrapper');
		if (this.configOptions.hasScrollTop) {
			this.topInnerEl!.style.width = ``;
		}

		this.setWidgetRect();
	};

	parametersChanged(payload: TableWrapperConfigOptions): void {
		if (!this.widgetEl) return;

		if (payload.isLoading !== undefined && payload.isLoading !== this.isLoading) {
			this.isLoading = payload.isLoading;
			this.reflectStateAttributes();
		}

		if (payload.pageCount !== undefined && payload.pageCount !== this.pageCount) {
			this.pageCount = payload.pageCount;
			this.reflectPageCount();
		}
	}

	private reflectPageCount(): void {
		if (this.pageCount === 0) {
			this.widgetEl.dataset.norecords = 'true';
		} else {
			this.widgetEl.dataset.norecords = 'false';
		}
	}

	destroy() {
		super.destroy();
	}
}
