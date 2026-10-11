import Helpers from '@utils/helpers';
import { createLoadingOverlay } from '@utils/loader';
import { BaseComponent, type BaseComponentInit } from '@core/base';

interface ILazyList extends BaseComponentInit {
	actions: {
		OnScroll: (startIndex: number, pageSize: number) => void;
		OnSort: (column: string, direction: string) => void;
	};
	bottomDistance: number;
	enabled: boolean;
	height: number;
	isLoading: boolean;
	isPristine: boolean;
	itemsTotal: number;
	maxHeight: number;
	pageSize: number;
	simulateTable: boolean;
	sortColumn: string;
	sortDirection: string;
	startIndex: number;
	theme: string;
}

export default class LazyList extends BaseComponent {
	private actions!: ILazyList['actions'];
	private avgLocked = false;
	private avgRowHeight = 0;
	private isPristine = true;
	private bottomDistance = 0;
	private enabled = true;
	private extraRows = 0;
	private height = 0;
	private initialStartIndex = 0;
	private isLoading = false;
	private itemsTotal = 0;
	private lazyListHeaderPlaceholderEl!: HTMLElement;
	private lazyListRowsPlaceholderEl!: HTMLElement;
	private listResizeObserver?: ResizeObserver;
	private loadingEl?: HTMLDivElement;
	private maxHeight = 0;
	private observedListEl?: HTMLElement;
	private pageSize = 0;
	private pageSizeSettled = false;
	private rowsAtBump = -1;
	private skeletonBumpPending = false;
	private requestedPageSize: number | null = null;
	private requestedStartIndex: number | null = null;
	private rowsObserver?: MutationObserver;
	private simulateTable = false;
	private skeletonAfterEl?: HTMLDivElement;
	private skeletonBeforeEl?: HTMLDivElement;
	private skeletonKey = '';
	private sortColumn = '';
	private sortDirection = '';
	private sortPin: { column: string; direction: string } | null = null;
	private headerObserver?: MutationObserver;
	private spacerBottomEl?: HTMLDivElement;
	private spacerTopEl?: HTMLDivElement;
	private startIndex = 0;
	private suppressScroll = false;
	private viewportHeight = 0;

	private measureQueued = false;

	private readonly requestPageDebounced = Helpers.debounce((): void => {
		this.coverVisibleSkeleton();
		this.requestPageForScroll();
	}, 200);

	private readonly handleScroll = (): void => {
		if (this.suppressScroll) return;
		this.syncLoadingShield();
		this.syncSkeletons();
		this.requestPageDebounced();
	};

	private readonly handleSortClick = (event: Event): void => {
		if (!this.enabled || this.isLoading || !this.simulateTable) return;
		const target = event.target;
		if (!(target instanceof Element)) return;

		const control = target.closest<HTMLElement>('.lazylist-sort');
		if (!control || !this.lazyListHeaderPlaceholderEl?.contains(control)) return;

		const column = control.dataset.column ?? '';
		if (!column) return;

		const direction = this.nextSortDirection(column);
		this.sortColumn = column;
		this.sortDirection = direction;
		this.sortPin = { column, direction };
		this.syncSortHeaders();
		this.scrollToTop();
		this.actions?.OnSort?.(column, direction);
	};

	private readonly handleViewportResize = (): void => {
		this.setViewport();
		this.syncSkeletons();
		this.updatePageSize();
		if (this.coverVisibleSkeleton()) this.requestPageDebounced();
	};

	constructor(init: ILazyList) {
		super(init);

		if (!this.widgetEl) {
			console.warn('LazyList: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.enabled = init.enabled !== false;
		this.isLoading = init.isLoading;
		this.bottomDistance = this.readNumber(init.bottomDistance);
		this.height = this.readNumber(init.height);
		this.maxHeight = this.readNumber(init.maxHeight);
		this.itemsTotal = this.readNumber(init.itemsTotal);
		this.pageSize = this.readNumber(init.pageSize);
		this.startIndex = this.readNumber(init.startIndex);
		this.initialStartIndex = this.startIndex;
		this.sortColumn = this.readText(init.sortColumn);
		this.sortDirection = this.readText(init.sortDirection);
		this.simulateTable = init.simulateTable === true;
		if (init.isPristine !== undefined) this.isPristine = init.isPristine === true;

		this.lazyListHeaderPlaceholderEl = this.widgetEl.querySelector<HTMLElement>(':scope > .lazylist-header-placeholder')!;
		this.lazyListRowsPlaceholderEl = this.widgetEl.querySelector<HTMLElement>(':scope > .lazylist-rows-placeholder')!;

		this.placeHeader();
		this.observeHeader();
		this.syncSortHeaders();
		this.syncNoRecords();
		this.setupSpacers();
		this.setupSkeletons();
		this.setViewport();
		this.reflectState();
		this.observeRows();

		this.widgetEl.addEventListener('scroll', this.handleScroll, { passive: true });
		window.addEventListener('resize', this.handleViewportResize);
		this.observeLayoutResize(this.handleViewportResize, 50);

		this.scheduleMeasure();
	}

	parametersChanged(payload: ILazyList): void {
		if (!this.widgetEl || !this.lazyListRowsPlaceholderEl) return;

		const viewportChanged = payload.bottomDistance !== undefined || payload.height !== undefined || payload.maxHeight !== undefined;

		if (payload.enabled !== undefined) this.enabled = payload.enabled;

		if (payload.isLoading !== undefined) this.isLoading = payload.isLoading;
		if (payload.isPristine !== undefined) this.isPristine = payload.isPristine === true;
		if (payload.bottomDistance !== undefined) this.bottomDistance = this.readNumber(payload.bottomDistance);
		if (payload.height !== undefined) this.height = this.readNumber(payload.height);
		if (payload.maxHeight !== undefined) this.maxHeight = this.readNumber(payload.maxHeight);
		if (payload.itemsTotal !== undefined) this.itemsTotal = this.readNumber(payload.itemsTotal);
		let nextSortColumn = payload.sortColumn !== undefined ? this.readText(payload.sortColumn) : this.sortColumn;
		let nextSortDirection = payload.sortDirection !== undefined ? this.readText(payload.sortDirection) : this.sortDirection;
		if (this.sortPin && (payload.sortColumn !== undefined || payload.sortDirection !== undefined)) {
			const echoed = nextSortColumn === this.sortPin.column && nextSortDirection.toUpperCase() === this.sortPin.direction.toUpperCase();
			if (!echoed) {
				nextSortColumn = this.sortPin.column;
				nextSortDirection = this.sortPin.direction;
			} else if (payload.isLoading !== true && this.requestedStartIndex === null) {
				this.sortPin = null;
			}
		}
		const sortChanged = nextSortColumn !== this.sortColumn || nextSortDirection !== this.sortDirection;
		if (payload.sortColumn !== undefined) this.sortColumn = nextSortColumn;
		if (payload.sortDirection !== undefined) this.sortDirection = nextSortDirection;
		if (payload.simulateTable !== undefined) this.simulateTable = payload.simulateTable === true;

		if (payload.startIndex !== undefined) {
			this.startIndex = this.readNumber(payload.startIndex);
			if (this.avgRowHeight > 0 && this.startIndex !== this.initialStartIndex) {
				this.avgLocked = true;
			}
			if (this.requestedStartIndex === this.startIndex) {
				this.requestedStartIndex = null;
				this.requestedPageSize = null;
			}
		}

		this.reflectState();
		if (viewportChanged) this.setViewport();
		this.syncSortHeaders();
		this.syncNoRecords();
		if (sortChanged) this.scrollToTop();
		this.scheduleMeasure();
	}

	destroy(): void {
		this.requestPageDebounced.cancel();
		this.widgetEl?.removeEventListener('scroll', this.handleScroll);
		window.removeEventListener('resize', this.handleViewportResize);
		this.lazyListHeaderPlaceholderEl?.removeEventListener('click', this.handleSortClick);
		this.headerObserver?.disconnect();
		this.listResizeObserver?.disconnect();
		this.rowsObserver?.disconnect();
		this.loadingEl?.remove();
		this.loadingEl = undefined;
		this.skeletonBeforeEl?.remove();
		this.skeletonAfterEl?.remove();
		this.spacerTopEl?.remove();
		this.spacerBottomEl?.remove();
		super.destroy();
	}

	private placeHeader(): void {
		if (!this.lazyListHeaderPlaceholderEl) return;
		this.widgetEl.prepend(this.lazyListHeaderPlaceholderEl);
		this.lazyListHeaderPlaceholderEl.addEventListener('click', this.handleSortClick);
	}

	private observeHeader(): void {
		if (!this.lazyListHeaderPlaceholderEl) return;

		this.headerObserver = new MutationObserver((mutations) => {
			const ownChange = mutations.every((mutation) => this.isSortControlMutation(mutation));
			if (!ownChange) this.syncSortHeaders();
		});
		this.headerObserver.observe(this.lazyListHeaderPlaceholderEl, {
			attributeFilter: ['data-column', 'data-sort'],
			attributes: true,
			childList: true,
			subtree: true,
		});
	}

	private isSortControlMutation(mutation: MutationRecord): boolean {
		const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
		if (target?.closest('.lazylist-sort')) return true;
		if (mutation.type !== 'childList') return false;

		const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
		return nodes.length > 0 && nodes.every((node) => node instanceof Element && (node.classList.contains('lazylist-sort') || !!node.closest('.lazylist-sort')));
	}

	private syncSortHeaders(): void {
		const header = this.lazyListHeaderPlaceholderEl;
		if (!header) return;

		const sortable = this.simulateTable ? this.sortableHeaders() : [];
		const sortableSet = new Set(sortable);

		header.querySelectorAll<HTMLElement>('.lazylist-sort').forEach((control) => {
			if (!control.parentElement || !sortableSet.has(control.parentElement)) control.remove();
		});

		for (const columnEl of sortable) {
			const column = columnEl.dataset.column ?? '';
			let control = columnEl.querySelector<HTMLElement>(':scope > .lazylist-sort');
			if (!control) {
				control = this.createSortControl();
				columnEl.appendChild(control);
			}
			control.dataset.column = column;
			this.paintSortControl(control, column);
		}
	}

	private sortableHeaders(): HTMLElement[] {
		if (!this.lazyListHeaderPlaceholderEl) return [];
		return Array.from(this.lazyListHeaderPlaceholderEl.querySelectorAll<HTMLElement>('[data-sort]')).filter((el) => (el.getAttribute('data-sort') ?? '').toLowerCase() === 'true');
	}

	private createSortControl(): HTMLButtonElement {
		const control = document.createElement('button');
		control.type = 'button';
		control.className = 'lazylist-sort';
		control.innerHTML = `${Helpers.placeIcon('caret-up-fill', 'xs')}${Helpers.placeIcon('caret-down-fill', 'xs')}`;

		const [up, down] = control.querySelectorAll<HTMLElement>('.svg-icon');
		if (up) up.dataset.caret = 'up';
		if (down) down.dataset.caret = 'down';
		return control;
	}

	private paintSortControl(control: HTMLElement, column: string): void {
		const active = this.sortColumn === column ? this.activeSortDirection() : '';
		const up = control.querySelector<HTMLElement>('[data-caret="up"]');
		const down = control.querySelector<HTMLElement>('[data-caret="down"]');
		// ASC highlights the down caret. DESC highlights the up caret.
		if (up) up.dataset.iconcolor = active === 'DESC' ? 'primary' : 'neutral-5';
		if (down) down.dataset.iconcolor = active === 'ASC' ? 'primary' : 'neutral-5';
		control.setAttribute('aria-pressed', active ? 'true' : 'false');
	}

	private nextSortDirection(column: string): 'ASC' | 'DESC' | '' {
		const active = this.sortColumn === column ? this.activeSortDirection() : '';
		if (active === '') return 'ASC';
		if (active === 'ASC') return 'DESC';
		return '';
	}

	private scrollToTop(): void {
		if (!this.widgetEl || this.widgetEl.scrollTop === 0) return;
		this.suppressScroll = true;
		this.widgetEl.scrollTop = 0;
		this.suppressScroll = false;
		this.syncLoadingShield();
	}

	private activeSortDirection(): 'ASC' | 'DESC' | '' {
		const direction = this.sortDirection.toUpperCase();
		if (direction === 'ASC' || direction === 'DESC') return direction;
		return '';
	}

	private setupSpacers(): void {
		this.spacerTopEl = this.createSpacer('top');
		this.spacerBottomEl = this.createSpacer('bottom');
		this.widgetEl.insertBefore(this.spacerTopEl, this.lazyListRowsPlaceholderEl);
		this.widgetEl.appendChild(this.spacerBottomEl);
	}

	private setupSkeletons(): void {
		this.skeletonBeforeEl = this.createSkeletonGroup('before');
		this.skeletonAfterEl = this.createSkeletonGroup('after');
		this.widgetEl.append(this.skeletonBeforeEl, this.skeletonAfterEl);
	}

	private createSkeletonGroup(edge: 'before' | 'after'): HTMLDivElement {
		const group = document.createElement('div');
		group.className = `lazylist-skeletons lazylist-skeletons-${edge}`;
		group.setAttribute('aria-hidden', 'true');
		return group;
	}

	private createSkeletonRow(): HTMLDivElement {
		const row = document.createElement('div');
		row.className = 'lazylist-skeleton';
		row.append(document.createElement('span'), document.createElement('span'));
		return row;
	}

	private createSpacer(edge: 'top' | 'bottom'): HTMLDivElement {
		const spacer = document.createElement('div');
		spacer.className = `lazylist-spacer lazylist-spacer-${edge}`;
		spacer.setAttribute('aria-hidden', 'true');
		return spacer;
	}

	private syncNoRecords(): void {
		if (!this.widgetEl) return;
		const hasRecords = this.itemsTotal > 0 || this.getRows().length > 0;
		this.widgetEl.dataset.norecords = !this.isPristine && !hasRecords ? 'true' : 'false';
	}

	private observeRows(): void {
		this.rowsObserver = new MutationObserver(() => {
			this.syncNoRecords();
			this.scheduleMeasure();
		});
		this.rowsObserver.observe(this.lazyListRowsPlaceholderEl, { childList: true, subtree: true });
	}

	private scheduleMeasure(): void {
		if (this.measureQueued) return;
		this.measureQueued = true;
		requestAnimationFrame(() => {
			this.measureQueued = false;
			if (!this.widgetEl) return;
			this.applyVirtualHeight();
		});
	}

	private setViewport(): void {
		const hasHeight = this.height > 0;
		const hasMaxHeight = this.maxHeight > 0;

		this.widgetEl.dataset.fillviewport = !hasHeight && !hasMaxHeight ? 'true' : 'false';
		this.widgetEl.dataset.hasmaxheight = hasMaxHeight ? 'true' : 'false';
		this.widgetEl.dataset.hasspecificheight = hasHeight ? 'true' : 'false';

		if (hasHeight) {
			this.widgetEl.style.setProperty('--lazylist-height', `${this.height}px`);
		} else {
			this.widgetEl.style.removeProperty('--lazylist-height');
		}

		if (hasMaxHeight) {
			this.widgetEl.style.setProperty('--lazylist-max-height', `${this.maxHeight}px`);
		} else {
			this.widgetEl.style.removeProperty('--lazylist-max-height');
		}

		this.widgetEl.style.setProperty('--lazylist-bottom', `${this.bottomDistance}px`);

		if (!hasHeight && !hasMaxHeight) {
			const top = Math.max(0, Math.round(this.widgetEl.getBoundingClientRect().top));
			this.widgetEl.style.setProperty('--lazylist-top', `${top}px`);
		} else {
			this.widgetEl.style.removeProperty('--lazylist-top');
		}
	}

	private reflectState(): void {
		this.widgetEl.dataset.enabled = this.enabled ? 'true' : 'false';
		this.widgetEl.dataset.isloading = this.isLoading ? 'true' : 'false';
		this.widgetEl.setAttribute('aria-busy', this.isLoading ? 'true' : 'false');
		if (this.lazyListRowsPlaceholderEl) this.lazyListRowsPlaceholderEl.inert = this.isLoading;
		this.updateLoadingState();
	}

	private updateLoadingState(): void {
		if (this.isLoading) {
			if (!this.loadingEl) {
				this.loadingEl = createLoadingOverlay();
				this.widgetEl.appendChild(this.loadingEl);
			}
			this.syncLoadingShield();
			return;
		}

		this.loadingEl?.remove();
		this.loadingEl = undefined;
	}

	private syncLoadingShield(): void {
		if (!this.loadingEl) return;
		this.loadingEl.style.transform = `translateY(${this.widgetEl.scrollTop}px)`;
	}

	private applyVirtualHeight(): void {
		const list = this.getListEl();
		if (list) this.prepareList(list);

		const rows = this.getRows();
		this.captureAverage(rows);
		this.observeList();

		if (!this.spacerTopEl || !this.spacerBottomEl) return;

		const avg = this.avgRowHeight;
		if (avg <= 0 || this.itemsTotal <= 0) {
			this.spacerTopEl.style.height = '0px';
			this.spacerBottomEl.style.height = '0px';
			this.syncSkeletons();
			return;
		}

		const start = Math.min(this.startIndex, this.itemsTotal);
		const rendered = Math.min(rows.length, this.itemsTotal - start);
		const below = Math.max(0, this.itemsTotal - start - rendered);
		const scrollTop = this.widgetEl.scrollTop;

		// Growing the top spacer on the way down makes the browser bump scrollTop
		// to hold the previous rows still. That bump would be read as another scroll.
		this.suppressScroll = true;
		this.spacerTopEl.style.height = `${start * avg}px`;
		this.spacerBottomEl.style.height = `${below * avg}px`;
		if (this.widgetEl.scrollTop !== scrollTop) this.widgetEl.scrollTop = scrollTop;
		this.suppressScroll = false;

		this.updatePageSize();
		this.syncSkeletons();
		this.releaseSkeletonBump();
		if (this.coverVisibleSkeleton()) this.requestPageDebounced();
	}

	private captureAverage(rows: HTMLElement[]): void {
		if (this.avgLocked || rows.length === 0) return;

		const next = this.measureStride(rows);
		if (next <= 0) return;
		this.avgRowHeight = next;
		this.avgLocked = true;
	}

	private measureStride(rows: HTMLElement[]): number {
		const first = rows[0].getBoundingClientRect();
		if (rows.length === 1) return first.height;

		const last = rows[rows.length - 1].getBoundingClientRect();
		const span = last.top - first.top;
		if (span <= 0) return first.height;
		return span / (rows.length - 1);
	}

	private prepareList(list: HTMLElement): void {
		list.style.height = 'auto';
		list.style.maxHeight = 'none';
		list.style.overflow = 'visible';
	}

	private observeList(): void {
		const list = this.getListEl();
		if (!list || list === this.observedListEl) return;

		this.listResizeObserver?.disconnect();
		this.observedListEl = list;
		this.listResizeObserver = new ResizeObserver(() => {
			this.scheduleMeasure();
		});
		this.listResizeObserver.observe(list);
		if (this.lazyListHeaderPlaceholderEl) this.listResizeObserver.observe(this.lazyListHeaderPlaceholderEl);
	}

	private headerHeight(): number {
		return this.lazyListHeaderPlaceholderEl?.offsetHeight ?? 0;
	}

	private rowViewportHeight(): number {
		return Math.max(0, this.widgetEl.clientHeight - this.headerHeight());
	}

	private updatePageSize(): void {
		const height = this.rowViewportHeight();
		if (!this.avgLocked || height <= 0) return;

		if (this.viewportHeight > 0 && Math.abs(height - this.viewportHeight) >= this.avgRowHeight) {
			this.extraRows = 0;
		}
		this.viewportHeight = height;

		const next = this.pageSizeForViewport();
		const changed = next !== this.pageSize;
		this.pageSize = next;

		if (!this.pageSizeSettled) {
			this.pageSizeSettled = true;
			if (!changed || this.hasEnoughRows()) return;
		} else if (!changed) {
			return;
		}

		this.requestPageDebounced();
	}

	private pageSizeForViewport(): number {
		const fitted = this.fittedPageSize() + this.extraRows;
		if (this.itemsTotal <= 0) return fitted;
		return Math.min(this.itemsTotal, fitted);
	}

	private hasEnoughRows(): boolean {
		const needed = Math.min(this.pageSize, Math.max(0, this.itemsTotal - this.startIndex));
		const rendered = Math.min(this.getRows().length, Math.max(0, this.itemsTotal - this.startIndex));
		return rendered >= needed;
	}

	private fittedPageSize(): number {
		const fitted = Math.max(1, Math.ceil(this.rowViewportHeight() / this.avgRowHeight) + 1);
		if (this.itemsTotal <= 0) return fitted;
		return Math.min(this.itemsTotal, fitted);
	}

	private releaseSkeletonBump(): void {
		if (!this.skeletonBumpPending) return;
		if (this.getRows().length !== this.rowsAtBump) this.skeletonBumpPending = false;
	}

	private coverVisibleSkeleton(): boolean {
		if (this.isLoading || !this.pageSizeSettled || !this.avgLocked) return false;

		const rows = this.getRows();
		if (rows.length === 0 || !this.skeletonVisibleInWrapper(rows)) return false;
		if (this.skeletonBumpPending && rows.length === this.rowsAtBump) return false;

		const remaining = Math.max(0, this.itemsTotal - this.startIndex);
		if (rows.length >= remaining || this.extraRows >= 5) return false;

		const next = Math.min(remaining, this.pageSize + 1);
		if (next <= this.pageSize) return false;

		this.extraRows += 1;
		this.pageSize = next;
		this.rowsAtBump = rows.length;
		this.skeletonBumpPending = true;
		return true;
	}

	private skeletonVisibleInWrapper(rows: HTMLElement[]): boolean {
		const port = this.scrollport();
		if (port.bottom - port.top <= 0) return false;

		const group = this.skeletonAfterEl;
		if (group && !group.hidden) {
			for (const child of group.children) {
				const box = (child as HTMLElement).getBoundingClientRect();
				const overlap = Math.min(box.bottom, port.bottom) - Math.max(box.top, port.top);
				if (overlap > 1) return true;
			}
		}

		if (this.startIndex + rows.length >= this.itemsTotal) return false;
		const edges = this.renderedEdges(rows);
		return !!edges && this.visibleGap(edges).below > 1;
	}

	private scrollport(): { top: number; bottom: number } {
		const view = this.widgetEl.getBoundingClientRect();
		const origin = view.top + this.widgetEl.clientTop;
		const height = this.widgetEl.clientHeight;
		if (height > 0) return { top: origin + this.headerHeight(), bottom: origin + height };
		return { top: view.top + this.headerHeight(), bottom: view.bottom };
	}

	private requestPageForScroll(): void {
		if (!this.enabled || !this.actions || this.avgRowHeight <= 0 || this.pageSize <= 0 || this.itemsTotal <= 0) return;
		if (this.getRows().length === 0) return;

		const firstVisible = Math.max(0, Math.floor(this.widgetEl.scrollTop / this.avgRowHeight));
		const maxStart = Math.max(0, this.itemsTotal - this.pageSize);
		const desired = Math.min(maxStart, firstVisible);
		const needed = Math.min(this.pageSize, this.itemsTotal - desired);
		const rendered = Math.min(this.getRows().length, this.itemsTotal - this.startIndex);
		const sameRequest = desired === this.requestedStartIndex && this.pageSize === this.requestedPageSize;
		if (sameRequest) return;
		if (desired === this.startIndex && rendered === needed) return;

		this.requestedStartIndex = desired;
		this.requestedPageSize = this.pageSize;
		this.actions.OnScroll(desired, this.pageSize);
	}

	private syncSkeletons(): void {
		if (!this.skeletonBeforeEl || !this.skeletonAfterEl) return;

		const avg = this.avgRowHeight;
		if (avg <= 0 || this.itemsTotal <= 0) {
			this.renderSkeletonGroup(this.skeletonBeforeEl, 0, 0, 0);
			this.renderSkeletonGroup(this.skeletonAfterEl, 0, 0, 0);
			this.skeletonKey = '';
			return;
		}

		const rows = this.getRows();
		const loadedStart = Math.min(this.startIndex, this.itemsTotal);
		const loadedEnd = Math.min(this.itemsTotal, loadedStart + rows.length);
		const overscan = Math.max(1, Math.ceil((this.widgetEl.clientHeight || avg) / avg));
		const viewStart = Math.max(0, Math.floor(this.widgetEl.scrollTop / avg) - overscan);
		const viewEnd = Math.min(this.itemsTotal, Math.ceil((this.widgetEl.scrollTop + this.widgetEl.clientHeight) / avg) + overscan);

		const beforeFrom = viewStart;
		let beforeCount = Math.max(0, Math.min(viewEnd, loadedStart) - beforeFrom);
		const afterFrom = Math.max(viewStart, loadedEnd);
		let afterCount = Math.max(0, viewEnd - afterFrom);
		const edges = this.renderedEdges(rows);
		const gap = this.visibleGap(edges);

		if (gap.below > 8 && loadedEnd < this.itemsTotal) {
			afterCount = Math.max(afterCount, Math.min(Math.ceil(gap.below / avg), this.itemsTotal - loadedEnd));
		}
		if (gap.above > 8 && loadedStart > 0) {
			beforeCount = Math.max(beforeCount, Math.min(Math.ceil(gap.above / avg), loadedStart));
		}

		const beforeTop = edges && beforeCount > 0 ? edges.top - beforeCount * avg : beforeFrom * avg;
		const afterTop = edges && afterCount > 0 ? edges.bottom : afterFrom * avg;
		const key = `${Math.round(beforeTop)}:${beforeCount}:${Math.round(afterTop)}:${afterCount}:${avg}`;
		if (key === this.skeletonKey) return;
		this.skeletonKey = key;

		this.renderSkeletonGroup(this.skeletonBeforeEl, beforeTop, beforeCount, avg);
		this.renderSkeletonGroup(this.skeletonAfterEl, afterTop, afterCount, avg);
	}

	private visibleGap(edges: { top: number; bottom: number } | null): { above: number; below: number } {
		const viewTop = this.widgetEl.scrollTop + this.headerHeight();
		const viewBottom = this.widgetEl.scrollTop + this.widgetEl.clientHeight;
		if (!edges) return { above: 0, below: 0 };
		return {
			above: Math.max(0, edges.top - viewTop),
			below: Math.max(0, viewBottom - edges.bottom),
		};
	}

	private renderedEdges(rows: HTMLElement[]): { top: number; bottom: number } | null {
		if (rows.length === 0) return null;

		const firstTop = this.contentTop(rows[0]);
		const last = rows[rows.length - 1];
		return { top: firstTop, bottom: this.contentTop(last) + last.getBoundingClientRect().height };
	}

	private contentTop(el: HTMLElement): number {
		const scroller = this.widgetEl.getBoundingClientRect();
		return el.getBoundingClientRect().top - scroller.top + this.widgetEl.scrollTop;
	}

	private renderSkeletonGroup(group: HTMLDivElement, top: number, count: number, avg: number): void {
		if (count <= 0 || avg <= 0) {
			group.replaceChildren();
			group.hidden = true;
			return;
		}

		group.hidden = false;
		group.style.top = `${top}px`;

		while (group.childElementCount < count) {
			group.appendChild(this.createSkeletonRow());
		}
		while (group.childElementCount > count) {
			group.lastElementChild?.remove();
		}

		const height = `${avg}px`;
		for (const child of group.children) {
			const row = child as HTMLElement;
			if (row.style.height !== height) row.style.height = height;
		}
	}

	private getListEl(): HTMLElement | null {
		if (!this.lazyListRowsPlaceholderEl) return null;
		return this.lazyListRowsPlaceholderEl.querySelector<HTMLElement>(':scope > .list.list-group') ?? this.lazyListRowsPlaceholderEl.querySelector<HTMLElement>('.list.list-group');
	}

	private getRows(): HTMLElement[] {
		const list = this.getListEl();
		if (!list) return [];
		return Array.from(list.querySelectorAll<HTMLElement>('.lazylist-row'));
	}

	private readText(value: string | undefined): string {
		return typeof value === 'string' ? value.trim() : '';
	}

	private readNumber(value: number | undefined): number {
		const parsed = Helpers.toNumber(value);
		if (parsed == null || !Number.isFinite(parsed) || parsed <= 0) return 0;
		return parsed;
	}
}
