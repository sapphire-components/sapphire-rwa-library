import Helpers from '@utils/helpers';
import { createLoadingOverlay } from '@utils/loader';
import { BaseComponent, type BaseComponentInit } from '@core/base';

interface ILazyList extends BaseComponentInit {
	actions: {
		OnScroll: (startIndex: number, pageSize: number) => void;
	};
	bottomDistance: number;
	enabled: boolean;
	height: number;
	isLoading: boolean;
	itemsTotal: number;
	maxHeight: number;
	pageSize: number;
	startIndex: number;
	theme: string;
}

export default class LazyList extends BaseComponent {
	private actions!: ILazyList['actions'];
	private avgLocked = false;
	private avgRowHeight = 0;
	private bottomDistance = 0;
	private enabled = true;
	private height = 0;
	private initialStartIndex = 0;
	private isLoading = false;
	private itemsTotal = 0;
	private lazyListPlaceholderEl!: HTMLElement;
	private listResizeObserver?: ResizeObserver;
	private loadingEl?: HTMLDivElement;
	private maxHeight = 0;
	private observedListEl?: HTMLElement;
	private pageSize = 0;
	private requestedStartIndex: number | null = null;
	private scrollCheckPending = false;
	private rowsObserver?: MutationObserver;
	private spacerBottomEl?: HTMLDivElement;
	private spacerTopEl?: HTMLDivElement;
	private startIndex = 0;

	private measureQueued = false;

	private readonly requestPageDebounced = Helpers.debounce((): void => {
		this.requestPageForScroll();
	}, 80);

	private readonly handleScroll = (): void => {
		this.syncLoadingShield();
		if (this.avgRowHeight > 0 && this.widgetEl.scrollTop > 0) {
			this.avgLocked = true;
		}
		if (this.isLoading) {
			this.scrollCheckPending = true;
			return;
		}
		this.requestPageDebounced();
	};

	private readonly handleViewportResize = (): void => {
		this.setViewport();
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

		this.widgetEl.classList.add('lazylist');
		this.lazyListPlaceholderEl = this.widgetEl.querySelector<HTMLElement>(':scope > .lazylist-placeholder') ?? this.widgetEl.querySelector<HTMLElement>('.lazylist-placeholder')!;

		if (!this.lazyListPlaceholderEl) {
			console.warn('LazyList: .lazylist-placeholder not found for runtimeId', init.runtimeId);
			return;
		}

		this.setupSpacers();
		this.setViewport();
		this.reflectState();
		this.observeRows();

		this.widgetEl.addEventListener('scroll', this.handleScroll, { passive: true });
		window.addEventListener('resize', this.handleViewportResize);
		this.observeLayoutResize(this.handleViewportResize, 50);

		this.scheduleMeasure();
	}

	parametersChanged(payload: ILazyList): void {
		if (!this.widgetEl || !this.lazyListPlaceholderEl) return;

		const viewportChanged = payload.bottomDistance !== undefined || payload.height !== undefined || payload.maxHeight !== undefined;

		if (payload.enabled !== undefined) this.enabled = payload.enabled;

		const finishedLoading = payload.isLoading !== undefined && payload.isLoading === false && this.isLoading;
		if (payload.isLoading !== undefined) this.isLoading = payload.isLoading;
		if (payload.bottomDistance !== undefined) this.bottomDistance = this.readNumber(payload.bottomDistance);
		if (payload.height !== undefined) this.height = this.readNumber(payload.height);
		if (payload.maxHeight !== undefined) this.maxHeight = this.readNumber(payload.maxHeight);
		if (payload.itemsTotal !== undefined) this.itemsTotal = this.readNumber(payload.itemsTotal);
		if (payload.pageSize !== undefined) this.pageSize = this.readNumber(payload.pageSize);

		if (payload.startIndex !== undefined) {
			this.startIndex = this.readNumber(payload.startIndex);
			if (this.avgRowHeight > 0 && this.startIndex !== this.initialStartIndex) {
				this.avgLocked = true;
			}
			if (this.requestedStartIndex === this.startIndex) {
				this.requestedStartIndex = null;
			}
		}

		this.reflectState();
		if (viewportChanged) this.setViewport();
		this.scheduleMeasure();

		if (finishedLoading && this.scrollCheckPending) {
			this.scrollCheckPending = false;
			this.requestPageDebounced();
		}
	}

	destroy(): void {
		this.requestPageDebounced.cancel();
		this.widgetEl?.removeEventListener('scroll', this.handleScroll);
		window.removeEventListener('resize', this.handleViewportResize);
		this.listResizeObserver?.disconnect();
		this.rowsObserver?.disconnect();
		this.loadingEl?.remove();
		this.loadingEl = undefined;
		this.spacerTopEl?.remove();
		this.spacerBottomEl?.remove();
		super.destroy();
	}

	private setupSpacers(): void {
		this.spacerTopEl = this.createSpacer('top');
		this.spacerBottomEl = this.createSpacer('bottom');
		this.widgetEl.insertBefore(this.spacerTopEl, this.lazyListPlaceholderEl);
		this.widgetEl.appendChild(this.spacerBottomEl);
	}

	private createSpacer(edge: 'top' | 'bottom'): HTMLDivElement {
		const spacer = document.createElement('div');
		spacer.className = `lazylist-spacer lazylist-spacer-${edge}`;
		spacer.setAttribute('aria-hidden', 'true');
		return spacer;
	}

	private observeRows(): void {
		this.rowsObserver = new MutationObserver(() => {
			this.scheduleMeasure();
		});
		this.rowsObserver.observe(this.lazyListPlaceholderEl, { childList: true, subtree: true });
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
		if (this.lazyListPlaceholderEl) this.lazyListPlaceholderEl.inert = this.isLoading;
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
			return;
		}

		const start = Math.min(this.startIndex, this.itemsTotal);
		const rendered = Math.min(rows.length, this.itemsTotal - start);
		const below = Math.max(0, this.itemsTotal - start - rendered);

		this.spacerTopEl.style.height = `${start * avg}px`;
		this.spacerBottomEl.style.height = `${below * avg}px`;
	}

	private captureAverage(rows: HTMLElement[]): void {
		if (this.avgLocked || this.isLoading || rows.length === 0) return;

		const next = this.measureStride(rows);
		if (next <= 0) return;
		this.avgRowHeight = next;
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
	}

	private requestPageForScroll(): void {
		if (!this.enabled || this.isLoading || this.avgRowHeight <= 0 || this.pageSize <= 0 || !this.actions) return;

		const rows = this.getRows();
		if (rows.length === 0 || this.itemsTotal === 0) return;

		const firstVisible = Math.max(0, Math.floor(this.widgetEl.scrollTop / this.avgRowHeight));
		const loadedEnd = this.startIndex + rows.length;
		if (firstVisible >= this.startIndex && firstVisible < loadedEnd) {
			this.requestedStartIndex = null;
			return;
		}

		const maxStart = Math.max(0, this.itemsTotal - this.pageSize);
		const pageStart = Math.min(maxStart, Math.floor(firstVisible / this.pageSize) * this.pageSize);
		if (pageStart === this.startIndex || pageStart === this.requestedStartIndex) return;

		this.requestedStartIndex = pageStart;
		this.actions.OnScroll(pageStart, this.pageSize);
	}

	private getListEl(): HTMLElement | null {
		if (!this.lazyListPlaceholderEl) return null;
		return this.lazyListPlaceholderEl.querySelector<HTMLElement>(':scope > .list.list-group') ?? this.lazyListPlaceholderEl.querySelector<HTMLElement>('.list.list-group');
	}

	private getRows(): HTMLElement[] {
		const list = this.getListEl();
		if (!list) return [];
		return Array.from(list.querySelectorAll<HTMLElement>('.lazylist-row'));
	}

	private readNumber(value: number | undefined): number {
		const parsed = Helpers.toNumber(value);
		if (parsed == null || !Number.isFinite(parsed) || parsed <= 0) return 0;
		return parsed;
	}
}
