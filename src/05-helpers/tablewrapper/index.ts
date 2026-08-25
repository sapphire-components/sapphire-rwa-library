import { BaseComponent, type BaseComponentInit } from '@core/base';
import { createLoadingOverlay } from '@utils/loader';

interface TableWrapperConfigOptions extends BaseComponentInit {
	actions: {
		OnRowClick: (rowId: string) => void;
		OnReorder: (rowIds: string) => void;
	};
	clickableRows: boolean;
	height: number;
	isLoading: boolean;
	isPristine: boolean;
	isStickyHeader: boolean;
	maxHeight: number;
	pageCount: number;
	reorderableRows: boolean;
}

export default class TableWrapper extends BaseComponent {
	private actions!: TableWrapperConfigOptions['actions'];
	private clickableRows = false;
	private configOptions!: TableWrapperConfigOptions;
	private hasMaxHeight = false;
	private isLoading = false;
	private isPristine = true;
	private isStickyHeader = false;
	private loadingEl?: HTMLDivElement;
	private pageCount = 0;
	private reorderableRows = true;
	private syncing = false;
	private tableEl!: HTMLTableElement;
	private tableHeaderCloneEl!: HTMLDivElement;
	private tableHeaderEl!: HTMLDivElement;
	private theadEl!: HTMLTableSectionElement;

	private dragActive = false;
	private dragPointerId: number | null = null;
	private dragRow: HTMLTableRowElement | null = null;
	private dragStartOrder: string[] = [];
	private dragStartY = 0;
	private ignoreNextClick = false;

	private static readonly DRAG_THRESHOLD_PX = 2;
	private static readonly INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, label, [role="button"], [role="link"], [contenteditable="true"]';
	private static readonly ROW_SELECTOR = ':scope > tbody > tr';

	private handleRowClick = (event: Event): void => {
		if (this.ignoreNextClick) return;

		const target = event.target as HTMLElement | null;
		if (target?.closest(TableWrapper.INTERACTIVE_SELECTOR)) return;

		const row = event.currentTarget as HTMLElement;
		const rowId = row?.dataset.rowid ?? 'missing rowid';

		this.actions.OnRowClick(rowId);
	};

	private handleCaptureClick = (event: Event): void => {
		if (!this.ignoreNextClick) return;
		this.ignoreNextClick = false;
		event.preventDefault();
		event.stopPropagation();
	};

	private handlePointerDown = (event: PointerEvent): void => {
		if (!this.reorderableRows || this.isLoading || event.button !== 0) return;
		if ((event.target as HTMLElement | null)?.closest(TableWrapper.INTERACTIVE_SELECTOR)) return;

		const row = this.getBodyRowFromEvent(event);
		if (!row) return;

		this.dragRow = row;
		this.dragPointerId = event.pointerId;
		this.dragStartY = event.clientY;
		this.dragActive = false;
		this.dragStartOrder = this.getRowIds();

		document.addEventListener('pointermove', this.handlePointerMove);
		document.addEventListener('pointerup', this.handlePointerUp);
		document.addEventListener('pointercancel', this.handlePointerUp);
	};

	private handlePointerMove = (event: PointerEvent): void => {
		if (event.pointerId !== this.dragPointerId || !this.dragRow) return;

		if (!this.dragActive) {
			if (Math.abs(event.clientY - this.dragStartY) < TableWrapper.DRAG_THRESHOLD_PX) return;
			this.dragActive = true;
			this.dragRow.classList.add('is-dragging');
			document.body.style.cursor = 'grabbing';
			document.body.style.userSelect = 'none';
		}

		event.preventDefault();
		this.reorderToPointer(event.clientY);
	};

	private handlePointerUp = (event: PointerEvent): void => {
		if (event.pointerId !== this.dragPointerId) return;
		this.finishPointerDrag();
	};

	constructor(configOptions: TableWrapperConfigOptions) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('TableWrapper: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		this.configOptions = configOptions;

		this.actions = this.configOptions.actions;
		this.clickableRows = this.configOptions.clickableRows;
		this.isLoading = this.configOptions.isLoading;
		this.isPristine = this.configOptions.isPristine;
		this.isStickyHeader = this.configOptions.isStickyHeader && !this.configOptions.maxHeight;
		this.pageCount = this.configOptions.pageCount;
		this.reorderableRows = this.configOptions.reorderableRows;

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

		this.augmentRows();

		this.handleClickableRows();
		this.handleReorderableRows();

		this.tableEl.addEventListener('pointerdown', this.handlePointerDown);
		this.tableEl.addEventListener('click', this.handleCaptureClick, true);
	}

	augmentRows(): void {
		setTimeout(() => {
			this.getBodyRows().forEach((row) => {
				const firstTdWithRowId = row.querySelector<HTMLTableCellElement>('td[data-rowid]');
				if (firstTdWithRowId) {
					row.dataset.rowid = firstTdWithRowId.dataset.rowid;
				} else {
					row.dataset.rowid = '';
				}
			});
		}, 0);
	}

	handleClickableRows(): void {
		setTimeout(() => {
			this.tableEl.querySelectorAll<HTMLElement>('tbody .table-row').forEach((row) => {
				if (this.clickableRows) {
					if (!row.classList.contains('is-clickable')) {
						row.classList.add('is-clickable');
						row.addEventListener('click', this.handleRowClick);
					}
				} else if (row.classList.contains('is-clickable')) {
					row.classList.remove('is-clickable');
					row.removeEventListener('click', this.handleRowClick);
				}
			});
		}, 0);
	}

	handleReorderableRows(): void {
		this.widgetEl.dataset.reorderablerows = this.reorderableRows ? 'true' : 'false';
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

		this.augmentRows();

		if (payload.clickableRows !== undefined && payload.clickableRows !== this.clickableRows) {
			this.clickableRows = payload.clickableRows;
			this.handleClickableRows();
		}

		if (payload.reorderableRows !== undefined && payload.reorderableRows !== this.reorderableRows) {
			this.reorderableRows = payload.reorderableRows;
			this.handleReorderableRows();
		}

		if (payload.isLoading !== undefined && payload.isLoading !== this.isLoading) {
			this.isPristine = false;
			this.isLoading = payload.isLoading;
			this.reflectStateAttributes();
			this.updateLoadingState();
			if (!payload.isLoading) {
				this.reflectPageCount();
			}
			this.handleClickableRows();
		}

		if (payload.pageCount !== undefined && payload.pageCount !== this.pageCount) {
			this.isPristine = false;
			this.pageCount = payload.pageCount;
			this.reflectPageCount();
			this.handleClickableRows();
		}

		if (payload.isPristine !== undefined && payload.isPristine !== this.isPristine) {
			this.isPristine = payload.isPristine;
			this.reflectStateAttributes();
			this.reflectPageCount();
			this.handleClickableRows();
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
		if (this.pageCount === 0 && !this.isPristine) {
			this.widgetEl.dataset.norecords = 'true';
		} else {
			this.widgetEl.dataset.norecords = 'false';
		}
	}

	destroy() {
		this.finishPointerDrag();
		this.tableEl?.removeEventListener('pointerdown', this.handlePointerDown);
		this.tableEl?.removeEventListener('click', this.handleCaptureClick, true);
		this.loadingEl?.remove();
		this.loadingEl = undefined;
		super.destroy();
	}

	private getBodyRows(): HTMLTableRowElement[] {
		return Array.from(this.tableEl.querySelectorAll<HTMLTableRowElement>(TableWrapper.ROW_SELECTOR));
	}

	private getBodyRowFromEvent(event: Event): HTMLTableRowElement | null {
		const target = event.target as HTMLElement | null;
		const row = target?.closest('tr');
		if (!row || row.parentElement?.tagName !== 'TBODY') return null;
		if (row.closest('table') !== this.tableEl) return null;
		return row as HTMLTableRowElement;
	}

	private getRowId(row: HTMLTableRowElement): string {
		return row.dataset.rowid ?? 'missing rowid';
	}

	private getRowIds(): string[] {
		return this.getBodyRows().map((row) => this.getRowId(row));
	}

	private reorderToPointer(clientY: number): void {
		if (!this.dragRow) return;

		const rows = this.getBodyRows().filter((row) => row !== this.dragRow);
		let insertBefore: HTMLTableRowElement | null = null;
		for (const row of rows) {
			const rect = row.getBoundingClientRect();
			if (clientY < rect.top + rect.height / 2) {
				insertBefore = row;
				break;
			}
		}

		if (insertBefore) {
			if (this.dragRow.nextElementSibling === insertBefore) return;
			insertBefore.parentElement?.insertBefore(this.dragRow, insertBefore);
			return;
		}

		const lastTbody = this.tableEl.querySelector(':scope > tbody:last-of-type');
		if (!lastTbody) return;
		if (this.dragRow.parentElement === lastTbody && !this.dragRow.nextElementSibling) return;
		lastTbody.appendChild(this.dragRow);
	}

	private finishPointerDrag(): void {
		document.removeEventListener('pointermove', this.handlePointerMove);
		document.removeEventListener('pointerup', this.handlePointerUp);
		document.removeEventListener('pointercancel', this.handlePointerUp);
		document.body.style.cursor = '';
		document.body.style.userSelect = '';

		this.dragRow?.classList.remove('is-dragging');

		if (this.dragActive) {
			this.ignoreNextClick = true;
			window.setTimeout(() => {
				this.ignoreNextClick = false;
			}, 300);

			const newOrder = this.getRowIds();
			if (newOrder.join('\0') !== this.dragStartOrder.join('\0')) {
				this.actions.OnReorder?.(JSON.stringify(newOrder));
			}
		}

		this.dragActive = false;
		this.dragPointerId = null;
		this.dragRow = null;
		this.dragStartOrder = [];
		this.dragStartY = 0;
	}
}
