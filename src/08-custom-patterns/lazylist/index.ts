import { BaseComponent, type BaseComponentInit } from '@core/base';
import Helpers from '@utils/helpers';
import { createSpinner } from '@utils/loader';

const RESIZE_DEBOUNCE_MS = 100;
const SKELETON_OVERSCAN = 4;
const SKELETON_BAR_WIDTHS = ['72%', '46%', '64%', '38%'];

interface ILazyList extends BaseComponentInit {
	actions: {
		OnScroll: (startIndex: number, pageSize: number) => void;
	};
	enabled: boolean;
	isLoading: boolean;
	rowHeight: number;
	itemsTotal: number;
	pageSize: number;
	startIndex: number;
}

export default class LazyList extends BaseComponent {
	private actions!: ILazyList['actions'];
	private isLoading = false;
	private itemsTotal!: number;
	private listEl?: HTMLElement;
	private loadingEl?: HTMLElement;
	private pageSize!: number;
	private resizeDebounced?: ((...args: Parameters<ResizeObserverCallback>) => void) & { cancel: () => void };
	private resizeObserver?: ResizeObserver;
	private rowHeight!: number;
	private scrollFrame = 0;
	private skeletonColumnCount = 0;
	private skeletonPool: HTMLElement[] = [];

	constructor(init: ILazyList) {
		super(init);

		if (!this.widgetEl) {
			console.warn('LazyList: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.isLoading = init.isLoading;
		this.itemsTotal = init.itemsTotal;
		this.pageSize = init.pageSize;
		this.rowHeight = init.rowHeight;
		this.evaluateTableHeight();

		this.resizeDebounced = Helpers.debounce(() => {
			this.evaluateTableHeight();
			this.bindList();
			this.syncSkeletons();
			this.updateLoadingState();
		}, RESIZE_DEBOUNCE_MS);
		this.resizeObserver = new ResizeObserver(this.resizeDebounced);
		this.resizeObserver.observe(this.widgetEl);

		this.applyColumnTemplate();
		this.bindList();
		this.updateLoadingState();
		this.scheduleSkeletonSync();
	}

	private readonly onListScroll = (): void => {
		this.scheduleSkeletonSync();
		this.placeLoadingShield();
	};

	private readonly blockLoadingInteraction = (event: Event): void => {
		event.preventDefault();
	};

	private readonly onListScrollEnd = (): void => {
		this.emitOnScroll();
	};

	private applyColumnTemplate(): void {
		const rowEl = this.widgetEl.querySelector<HTMLElement>('.lazylist-row');
		if (!rowEl) return;

		const columnEls = [...rowEl.querySelectorAll<HTMLElement>(':scope > div > div')];
		if (!columnEls.length) return;

		const hasWidthFull = columnEls.some((columnEl) => columnEl.classList.contains('width-full'));
		const templateColumns = hasWidthFull ? columnEls.map((columnEl) => (columnEl.classList.contains('width-full') ? 'minmax(0, 1fr)' : 'max-content')).join(' ') : `repeat(${columnEls.length}, auto)`;

		this.widgetEl.style.setProperty('--lazylist-template-columns', templateColumns);
	}

	evaluateTableHeight(): void {
		const tableHeight = this.itemsTotal * this.rowHeight;
		this.widgetEl.style.setProperty('--lazylist-row-height', `${this.rowHeight}px`);
		this.widgetEl.style.setProperty('--lazylist-visible-rows', `${this.pageSize}`);
		this.widgetEl.style.setProperty('--lazylist-container-height', `${tableHeight}px`);
	}

	parametersChanged(payload: ILazyList): void {
		if (!this.widgetEl) return;

		this.actions = payload.actions;
		this.isLoading = payload.isLoading;
		this.itemsTotal = payload.itemsTotal;
		this.pageSize = payload.pageSize;
		this.rowHeight = payload.rowHeight;
		this.applyColumnTemplate();
		this.evaluateTableHeight();
		this.bindList();
		this.updateLoadingState();
		this.syncSkeletons();
	}

	private bindList(): void {
		const nextList = this.widgetEl.querySelector<HTMLElement>('.list.list-group') ?? undefined;
		if (nextList === this.listEl) return;

		this.listEl?.removeEventListener('scroll', this.onListScroll);
		this.listEl?.removeEventListener('scrollend', this.onListScrollEnd);
		this.clearSkeletons();
		this.listEl = nextList;
		this.listEl?.addEventListener('scroll', this.onListScroll, { passive: true });
		this.listEl?.addEventListener('scrollend', this.onListScrollEnd);
	}

	private updateLoadingState(): void {
		const listEl = this.listEl;
		if (!listEl) return;

		listEl.classList.toggle('is-loading', this.isLoading);
		listEl.setAttribute('aria-busy', this.isLoading ? 'true' : 'false');

		if (!this.isLoading) {
			this.loadingEl?.remove();
			this.loadingEl = undefined;
			return;
		}

		if (!this.loadingEl) {
			this.loadingEl = document.createElement('div');
			this.loadingEl.className = 'lazylist-loading';
			this.loadingEl.setAttribute('aria-hidden', 'true');
			this.loadingEl.appendChild(createSpinner());
			this.loadingEl.addEventListener('wheel', this.blockLoadingInteraction, { passive: false });
			this.loadingEl.addEventListener('touchmove', this.blockLoadingInteraction, { passive: false });
		}

		if (this.loadingEl.parentElement !== listEl) {
			listEl.appendChild(this.loadingEl);
		}

		this.placeLoadingShield();
	}

	private placeLoadingShield(): void {
		const listEl = this.listEl;
		if (!this.isLoading || !this.loadingEl || !listEl) return;

		this.loadingEl.style.height = `${listEl.clientHeight}px`;
		this.loadingEl.style.top = `${listEl.scrollTop}px`;
		this.loadingEl.style.width = `${listEl.clientWidth}px`;
	}

	private emitOnScroll(): void {
		const listEl = this.listEl;
		if (!listEl || this.rowHeight <= 0) return;

		const maxIndex = Math.max(0, this.itemsTotal - 1);
		const startIndex = Math.min(maxIndex, Math.floor(listEl.scrollTop / this.rowHeight));

		console.log(startIndex, this.pageSize);

		this.actions.OnScroll(startIndex, this.pageSize);
	}

	private scheduleSkeletonSync(): void {
		if (this.scrollFrame) return;

		this.scrollFrame = requestAnimationFrame(() => {
			this.scrollFrame = 0;
			this.syncSkeletons();
		});
	}

	private syncSkeletons(): void {
		const listEl = this.listEl;
		if (!listEl || this.rowHeight <= 0 || this.itemsTotal <= 0) {
			this.clearSkeletons();
			return;
		}

		const columnCount = this.getColumnCount();
		if (!columnCount) return;

		if (columnCount !== this.skeletonColumnCount) {
			this.clearSkeletons();
			this.skeletonColumnCount = columnCount;
		}

		const indexes = this.visibleSkeletonIndexes(listEl.querySelectorAll('.lazylist-row').length);
		while (this.skeletonPool.length < indexes.length) {
			const skeleton = this.createSkeletonRow(columnCount);
			this.skeletonPool.push(skeleton);
			listEl.appendChild(skeleton);
		}
		while (this.skeletonPool.length > indexes.length) {
			this.skeletonPool.pop()?.remove();
		}

		const columnTemplate = getComputedStyle(listEl).gridTemplateColumns;
		const rowWidth = listEl.clientWidth;
		indexes.forEach((index, poolIndex) => {
			const skeleton = this.skeletonPool[poolIndex];
			skeleton.style.gridTemplateColumns = columnTemplate;
			skeleton.style.top = `${index * this.rowHeight}px`;
			skeleton.style.width = `${rowWidth}px`;
		});
	}

	private visibleSkeletonIndexes(loadedCount: number): number[] {
		const listEl = this.listEl;
		if (!listEl) return [];

		const first = Math.max(loadedCount, Math.floor(listEl.scrollTop / this.rowHeight) - SKELETON_OVERSCAN);
		const last = Math.min(this.itemsTotal - 1, Math.ceil((listEl.scrollTop + listEl.clientHeight) / this.rowHeight) - 1 + SKELETON_OVERSCAN);
		if (last < first) return [];

		const indexes: number[] = [];
		for (let index = first; index <= last; index++) {
			indexes.push(index);
		}
		return indexes;
	}

	private getColumnCount(): number {
		const rowEl = this.widgetEl.querySelector<HTMLElement>('.lazylist-row');
		if (!rowEl) return 0;
		return rowEl.querySelectorAll(':scope > div > div').length;
	}

	private createSkeletonRow(columnCount: number): HTMLElement {
		const row = document.createElement('div');
		row.className = 'lazylist-skeleton';
		row.setAttribute('aria-hidden', 'true');

		for (let column = 0; column < columnCount; column++) {
			const bar = document.createElement('span');
			bar.style.width = SKELETON_BAR_WIDTHS[column % SKELETON_BAR_WIDTHS.length];
			row.appendChild(bar);
		}

		return row;
	}

	private clearSkeletons(): void {
		this.skeletonPool.forEach((skeleton) => skeleton.remove());
		this.skeletonPool = [];
		this.skeletonColumnCount = 0;
	}

	destroy() {
		if (this.scrollFrame) {
			cancelAnimationFrame(this.scrollFrame);
			this.scrollFrame = 0;
		}
		this.resizeDebounced?.cancel();
		this.resizeDebounced = undefined;
		this.resizeObserver?.disconnect();
		this.resizeObserver = undefined;
		this.listEl?.removeEventListener('scroll', this.onListScroll);
		this.listEl?.removeEventListener('scrollend', this.onListScrollEnd);
		this.listEl = undefined;
		this.loadingEl?.remove();
		this.loadingEl = undefined;
		this.clearSkeletons();
		super.destroy();
	}
}
