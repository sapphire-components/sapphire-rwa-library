import { BaseComponent, type BaseComponentInit } from '@core/base';
import Helpers from '@utils/helpers';
import { createLoadingOverlay } from '@utils/loader';
import { clearStickyBand, pinTopFor, setStickyBand, subscribeStickyOffset } from '@utils/sticky-offset';

interface TableWrapperConfigOptions extends BaseComponentInit {
	actions: {
		OnReorder: (rowIds: string) => void;
		OnReorderInput: (rowIds: string, newOrders: string) => void;
		OnRowClick: (rowId: string) => void;
	};
	clickableRows: boolean;
	height: number;
	isLoading: boolean;
	isPristine: boolean;
	isStickyHeader: boolean;
	maxHeight: number;
	pageCount: number;
	reorderImmediately: boolean;
	reorderInputColumn: number;
	reorderableRows: boolean;
}

export default class TableWrapper extends BaseComponent {
	private actions!: TableWrapperConfigOptions['actions'];
	private clickableRows = false;
	private configOptions!: TableWrapperConfigOptions;
	private dragActive = false;
	private dragPointerId: number | null = null;
	private dragRow: HTMLTableRowElement | null = null;
	private dragStartOrder: string[] = [];
	private dragStartY = 0;
	private hasMaxHeight = false;
	private headerResizeObserver?: ResizeObserver;
	private ignoreNextClick = false;
	private isLoading = false;
	private isPristine = true;
	private isStickyHeader = false;
	private loadingEl?: HTMLDivElement;
	private pageCount = 0;
	private pendingEditOrder: HTMLTableRowElement[] = [];
	private pendingTargetByRow = new WeakMap<HTMLTableRowElement, number>();
	private reorderCommitEl?: HTMLButtonElement;
	private reorderImmediately = true;
	private reorderInputColumn = 1;
	private reorderOriginByRow = new WeakMap<HTMLTableRowElement, number>();
	private reorderValueOnFocus = new WeakMap<HTMLInputElement, string>();
	private reorderPanelEl?: HTMLDivElement;
	private reorderableRows;
	private stickyFrame = 0;
	private stickyListening = false;
	private stickyShellEl?: HTMLDivElement;
	private tableEl!: HTMLTableElement;
	private tableHeaderCloneEl?: HTMLElement;
	private tableHeaderEl?: HTMLElement;
	private unsubscribeStickyOffset?: () => void;

	private static readonly DRAG_THRESHOLD_PX = 2;
	private static readonly INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, label, [role="button"], [role="link"], [contenteditable="true"]';
	private static readonly GRIP_CLASS = 'dots-six-vertical';
	private static readonly POSITION_CLASS = 'tablewrapper-reorder-position';
	private static readonly REORDER_CELL_CLASS = 'tablewrapper-reorder-cell';
	private static readonly ROW_SELECTOR = ':scope > tbody > tr';
	private static readonly STASH_CLASS = 'tablewrapper-reorder-stashed';

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

	private handleTargetKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter' && event.key !== 'Escape') return;

		event.preventDefault();
		event.stopPropagation();

		const targetEl = event.currentTarget as HTMLInputElement;
		if (event.key === 'Escape') {
			this.revertTargetPosition(targetEl);
			if (this.isStagedReorder()) this.syncStagedTarget(targetEl);
			return;
		}

		targetEl.blur();
	};

	private handleTargetBlur = (event: FocusEvent): void => {
		const targetEl = event.currentTarget as HTMLInputElement;
		if (this.isStagedReorder()) {
			this.syncStagedTarget(targetEl);
			return;
		}

		this.applyTargetPosition(targetEl);
	};

	private handleTargetInput = (): void => {
		if (!this.isStagedReorder()) return;
		this.updateCommitButton();
	};

	private handleTargetPointerDown = (event: PointerEvent): void => {
		event.stopPropagation();
	};

	private handleTargetFocus = (event: FocusEvent): void => {
		const targetEl = event.currentTarget as HTMLInputElement;
		this.reorderValueOnFocus.set(targetEl, targetEl.value);
		targetEl.select();
	};

	private handlePointerDown = (event: PointerEvent): void => {
		if (!this.reorderableRows || this.isLoading || event.button !== 0) return;
		if ((event.target as HTMLElement | null)?.closest(TableWrapper.INTERACTIVE_SELECTOR)) return;

		const row = this.getBodyRowFromEvent(event);
		if (!row) return;

		const cell = this.getReorderCell(row);
		const target = event.target as Node | null;
		if (!cell || !target || !cell.contains(target) || !this.isRowReorderable(row)) return;

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
		this.updateReorderPositions();
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
		this.reorderImmediately = this.configOptions.reorderImmediately;
		this.reorderInputColumn = this.resolveReorderInputColumn(this.configOptions.reorderInputColumn);
		this.reorderableRows = this.configOptions.reorderableRows;

		this.tableEl = this.widgetEl.querySelector<HTMLTableElement>('table')!;
		this.bindTableElements();

		this.reflectStateAttributes();
		this.reflectPageCount();
		this.updateLoadingState();

		this.setWidgetRect();

		this.observeLayoutResize(this.handleLayoutResize);

		if (this.isStickyHeader) {
			this.enableStickyHeader();
		}

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

				const explicitOrder = this.getExplicitRowOrder(row);
				if (explicitOrder === null) {
					delete row.dataset.roworder;
				} else {
					row.dataset.roworder = explicitOrder;
				}
			});
			this.syncReorderUi();
			this.scheduleStickyUpdate();
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
		this.widgetEl.dataset.reorderondrop = this.reorderImmediately ? 'true' : 'false';
		this.syncReorderUi();
	}

	private bindTableElements(): void {
		this.tableEl = this.widgetEl.querySelector<HTMLTableElement>('table') ?? this.tableEl;
		const thead = this.tableEl?.querySelector<HTMLTableSectionElement>('thead');
		this.tableHeaderEl = thead?.querySelector<HTMLElement>('.table-header:not(.table-header-clone)') ?? undefined;
	}

	private enableStickyHeader(): void {
		this.bindStickyListeners();
		this.refreshStickyHeader();
	}

	private disableStickyHeader(): void {
		this.stickyListening = false;
		document.removeEventListener('scroll', this.scheduleStickyUpdate, true);
		window.removeEventListener('resize', this.scheduleStickyUpdate);
		this.widgetEl?.removeEventListener('scroll', this.onWrapperScroll);
		this.unsubscribeStickyOffset?.();
		this.unsubscribeStickyOffset = undefined;
		this.headerResizeObserver?.disconnect();
		this.headerResizeObserver = undefined;
		cancelAnimationFrame(this.stickyFrame);
		this.stickyFrame = 0;
		this.releaseStickyHeader();
		this.stickyShellEl?.remove();
		this.stickyShellEl = undefined;
		this.tableHeaderCloneEl = undefined;
	}

	private bindStickyListeners(): void {
		if (this.stickyListening) {
			return;
		}

		this.stickyListening = true;
		document.addEventListener('scroll', this.scheduleStickyUpdate, { capture: true, passive: true });
		window.addEventListener('resize', this.scheduleStickyUpdate, { passive: true });
		this.widgetEl.addEventListener('scroll', this.onWrapperScroll, { passive: true });
		this.unsubscribeStickyOffset = subscribeStickyOffset(this.scheduleStickyUpdate);
		this.headerResizeObserver = new ResizeObserver(() => this.scheduleStickyUpdate());
		this.headerResizeObserver.observe(this.widgetEl);
	}

	private refreshStickyHeader(): void {
		if (!this.isStickyHeader) {
			return;
		}

		this.bindTableElements();
		this.rebuildHeaderClone();
		if (this.tableHeaderEl) {
			this.headerResizeObserver?.observe(this.tableHeaderEl);
		}
		this.scheduleStickyUpdate();
	}

	private rebuildHeaderClone(): void {
		const wasFixed = this.stickyShellEl?.dataset.isfixed === 'true';
		const top = this.stickyShellEl?.style.top ?? '';
		const left = this.stickyShellEl?.style.left ?? '';
		const width = this.stickyShellEl?.style.width ?? '';
		const height = this.stickyShellEl?.style.height ?? '';

		this.stickyShellEl?.remove();
		this.stickyShellEl = undefined;
		this.tableHeaderCloneEl = undefined;

		if (!this.tableHeaderEl || !this.tableEl) {
			return;
		}

		const shell = document.createElement('div');
		shell.className = 'tablewrapper-sticky-header';
		shell.setAttribute('aria-hidden', 'true');
		if (this.widgetEl.dataset.density) {
			shell.dataset.density = this.widgetEl.dataset.density;
		}

		const table = document.createElement('table');
		table.className = this.tableEl.className;
		const thead = document.createElement('thead');
		const clone = this.tableHeaderEl.cloneNode(true) as HTMLElement;
		clone.classList.add('table-header-clone');
		clone.querySelectorAll<HTMLElement>('.sortable-icon').forEach((icon) => {
			icon.style.opacity = '0';
		});
		thead.appendChild(clone);
		table.appendChild(thead);
		shell.appendChild(table);

		if (wasFixed) {
			shell.dataset.isfixed = 'true';
			shell.style.top = top;
			shell.style.left = left;
			shell.style.width = width;
			shell.style.height = height;
		}

		document.body.appendChild(shell);
		this.stickyShellEl = shell;
		this.tableHeaderCloneEl = clone;
	}

	private scheduleStickyUpdate = (): void => {
		if (!this.isStickyHeader || !this.stickyListening || this.stickyFrame) {
			return;
		}

		this.stickyFrame = requestAnimationFrame(() => {
			this.stickyFrame = 0;
			this.updateStickyHeader();
		});
	};

	private updateStickyHeader = (): void => {
		if (!this.isStickyHeader || !this.tableEl || !this.tableHeaderEl || !this.stickyShellEl || !this.tableHeaderCloneEl) {
			return;
		}

		const pinTop = pinTopFor(this.widgetEl);
		const tableRect = this.tableEl.getBoundingClientRect();
		const headerHeight = this.tableHeaderEl.getBoundingClientRect().height;
		const shouldPin = headerHeight > 0 && tableRect.top < pinTop && tableRect.bottom > pinTop + headerHeight;

		this.stickyShellEl.dataset.isfixed = shouldPin ? 'true' : 'false';

		if (!shouldPin) {
			this.clearCloneWidths();
			clearStickyBand(this.runtimeId);
			return;
		}

		const rect = this.widgetEl.getBoundingClientRect();
		const scrollbar = rect.width - this.widgetEl.clientWidth;
		const left = getComputedStyle(this.widgetEl).direction === 'rtl' ? rect.left + scrollbar : rect.left;
		const innerTable = this.stickyShellEl.querySelector<HTMLTableElement>('table');

		this.stickyShellEl.style.top = `${pinTop}px`;
		this.stickyShellEl.style.left = `${left}px`;
		this.stickyShellEl.style.width = `${this.widgetEl.clientWidth}px`;
		this.stickyShellEl.style.height = `${headerHeight}px`;
		if (innerTable) {
			innerTable.style.width = `${this.tableEl.scrollWidth}px`;
		}
		this.copyHeaderWidths();
		this.onWrapperScroll();
		setStickyBand(this.runtimeId, this.widgetEl, Math.round(headerHeight));
	};

	private releaseStickyHeader(): void {
		clearStickyBand(this.runtimeId);
		this.clearCloneWidths();
		if (!this.stickyShellEl) {
			return;
		}

		this.stickyShellEl.dataset.isfixed = 'false';
		this.stickyShellEl.style.top = '';
		this.stickyShellEl.style.left = '';
		this.stickyShellEl.style.width = '';
		this.stickyShellEl.style.height = '';
	}

	private copyHeaderWidths(): void {
		if (!this.tableHeaderEl || !this.tableHeaderCloneEl) {
			return;
		}

		const source = this.tableHeaderEl.querySelectorAll<HTMLTableCellElement>('th');
		const target = this.tableHeaderCloneEl.querySelectorAll<HTMLTableCellElement>('th');
		const count = Math.min(source.length, target.length);

		for (let i = 0; i < count; i++) {
			const width = source[i].getBoundingClientRect().width;
			target[i].style.width = `${width}px`;
			target[i].style.minWidth = `${width}px`;
			target[i].style.maxWidth = `${width}px`;
		}
	}

	private clearCloneWidths(): void {
		this.tableHeaderCloneEl?.querySelectorAll<HTMLTableCellElement>('th').forEach((cell) => {
			cell.style.width = '';
			cell.style.minWidth = '';
			cell.style.maxWidth = '';
		});
	}

	private onWrapperScroll = (): void => {
		if (!this.stickyShellEl) {
			return;
		}

		this.stickyShellEl.scrollLeft = this.widgetEl.scrollLeft;
	};

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
		this.scheduleStickyUpdate();
	};

	parametersChanged(payload: TableWrapperConfigOptions): void {
		if (!this.widgetEl) return;

		if (payload.height !== undefined) {
			this.configOptions.height = payload.height;
		}
		if (payload.maxHeight !== undefined) {
			this.configOptions.maxHeight = payload.maxHeight;
		}
		if (payload.isStickyHeader !== undefined) {
			this.configOptions.isStickyHeader = payload.isStickyHeader;
		}
		if (payload.height !== undefined || payload.maxHeight !== undefined) {
			this.setWidgetRect();
		}

		const nextSticky = Boolean(this.configOptions.isStickyHeader) && !this.configOptions.maxHeight;
		if (nextSticky !== this.isStickyHeader) {
			this.isStickyHeader = nextSticky;
			this.reflectStateAttributes();
			if (nextSticky) {
				this.enableStickyHeader();
			} else {
				this.disableStickyHeader();
			}
		}

		this.augmentRows();
		this.refreshStickyHeader();

		if (payload.clickableRows !== undefined && payload.clickableRows !== this.clickableRows) {
			this.clickableRows = payload.clickableRows;
			this.handleClickableRows();
		}

		if (payload.reorderableRows !== undefined && payload.reorderableRows !== this.reorderableRows) {
			this.reorderableRows = payload.reorderableRows;
			this.handleReorderableRows();
		}

		if (payload.reorderImmediately !== undefined && payload.reorderImmediately !== this.reorderImmediately) {
			this.reorderImmediately = payload.reorderImmediately;
			this.handleReorderableRows();
		}

		if (payload.reorderInputColumn !== undefined) {
			const nextColumn = this.resolveReorderInputColumn(payload.reorderInputColumn);
			if (nextColumn !== this.reorderInputColumn) {
				this.reorderInputColumn = nextColumn;
				this.syncReorderUi();
			}
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
			this.updateCommitButton();
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
		this.removeReorderUi();
		this.disableStickyHeader();
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

	private isRowReorderable(row: HTMLTableRowElement): boolean {
		const cell = row.querySelector<HTMLElement>('td[data-rowisreorderable]');
		const raw = cell?.dataset.rowisreorderable?.trim().toLowerCase() ?? '';
		return raw !== 'false';
	}

	private getExplicitRowOrder(row: HTMLTableRowElement): string | null {
		const cell = row.querySelector<HTMLElement>('td[data-roworder]');
		const raw = cell?.dataset.roworder;
		if (raw === undefined) return null;

		const trimmed = raw.trim();
		return trimmed === '' ? null : trimmed;
	}

	private syncExplicitOrdersToVisual(): void {
		this.getBodyRows().forEach((row, index) => {
			const cell = row.querySelector<HTMLElement>('td[data-roworder]');
			if (!cell) {
				delete row.dataset.roworder;
				return;
			}

			const order = String(index + 1);
			cell.dataset.roworder = order;
			row.dataset.roworder = order;
		});
	}

	private getRowIds(): string[] {
		const rowIds = this.getBodyRows().map((row) => this.getRowId(row));
		if (rowIds.length === 0) {
			console.warn('TableWrapper: No row IDs found.');
		} else if (rowIds.some((id) => id == null || id === '')) {
			console.warn('TableWrapper: Some rows have invalid IDs.', rowIds);
		}
		return rowIds;
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
			const orderChanged = newOrder.join('\0') !== this.dragStartOrder.join('\0');
			if (orderChanged) this.syncExplicitOrdersToVisual();
			if (this.reorderImmediately && orderChanged) {
				this.actions.OnReorder?.(JSON.stringify(newOrder));
			}
			this.dragActive = false;
			this.updateReorderPositions();
			this.updateCommitButton();
		}

		this.dragActive = false;
		this.dragPointerId = null;
		this.dragRow = null;
		this.dragStartOrder = [];
		this.dragStartY = 0;
	}

	private isStagedReorder(): boolean {
		return Boolean(this.reorderableRows && !this.reorderImmediately);
	}

	private syncReorderUi(): void {
		if (!this.tableEl) return;

		if (!this.reorderableRows) {
			this.removeReorderUi();
			return;
		}

		if (this.reorderImmediately) {
			this.removeReorderPanel();
		} else if (!this.reorderPanelEl) {
			this.ensureReorderPanel();
			this.captureReorderOrigins();
		}

		this.updateReorderPositions();
		this.updateCommitButton();
	}

	private ensureReorderPanel(): void {
		if (this.reorderPanelEl) return;

		const panel = document.createElement('div');
		panel.className = 'tablewrapper-reorder-panel';

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'btn btn-primary btn-small tablewrapper-reorder-commit';
		button.textContent = 'Apply order';
		button.addEventListener('click', this.handleCommitReorder);

		panel.appendChild(button);
		this.tableEl.before(panel);

		this.reorderPanelEl = panel;
		this.reorderCommitEl = button;
	}

	private handleCommitReorder = (event: Event): void => {
		event.preventDefault();
		event.stopPropagation();
		if (!this.isStagedReorder() || this.isLoading) return;

		const active = document.activeElement;
		if (active instanceof HTMLInputElement && active.classList.contains('tablewrapper-reorder-target') && this.tableEl.contains(active)) {
			this.syncStagedTarget(active);
		}
		if (!this.isStagedDirty()) return;

		const inputCommits = this.pendingInputCommits();
		this.applyPendingTargetPositions();
		if (inputCommits.length > 0) {
			this.emitReorderInput(inputCommits);
		} else {
			this.actions.OnReorder?.(JSON.stringify(this.getRowIds()));
		}
		this.captureReorderOrigins();
		this.clearPendingTargets();
		this.updateReorderPositions();
		this.updateCommitButton();
	};

	private removeReorderPanel(): void {
		this.reorderCommitEl?.removeEventListener('click', this.handleCommitReorder);
		this.reorderPanelEl?.remove();
		this.reorderPanelEl = undefined;
		this.reorderCommitEl = undefined;
	}

	private removeReorderUi(): void {
		this.removeReorderPanel();
		this.tableEl?.querySelectorAll<HTMLTableCellElement>(`${TableWrapper.ROW_SELECTOR} > td`).forEach((cell) => {
			if (cell.querySelector(`:scope > .${TableWrapper.POSITION_CLASS}, :scope > .${TableWrapper.STASH_CLASS}`)) {
				this.restoreCell(cell);
			}
		});
		this.reorderOriginByRow = new WeakMap();
		this.clearPendingTargets();
	}

	private resolveReorderInputColumn(value: number | undefined): number {
		if (value === undefined || !Number.isInteger(value) || value < 1) return 1;
		return value;
	}

	private getReorderCell(row: HTMLTableRowElement): HTMLTableCellElement | null {
		const cells = row.querySelectorAll<HTMLTableCellElement>(':scope > td');
		return cells[this.reorderInputColumn - 1] ?? null;
	}

	private stashCell(cell: HTMLTableCellElement): void {
		Array.from(cell.childNodes).forEach((node) => {
			if (node instanceof HTMLElement) {
				if (node.classList.contains(TableWrapper.POSITION_CLASS) || node.classList.contains(TableWrapper.STASH_CLASS)) return;
				node.classList.add(TableWrapper.STASH_CLASS);
				return;
			}

			if (node.nodeType !== Node.TEXT_NODE || !(node.textContent ?? '').trim()) return;

			const wrap = document.createElement('span');
			wrap.className = TableWrapper.STASH_CLASS;
			wrap.dataset.reorderTextWrap = 'true';
			node.replaceWith(wrap);
			wrap.appendChild(node);
		});
	}

	private restoreCell(cell: HTMLTableCellElement): void {
		cell.classList.remove(TableWrapper.REORDER_CELL_CLASS);
		cell.querySelector(`:scope > .${TableWrapper.POSITION_CLASS}`)?.remove();
		cell.querySelectorAll<HTMLElement>(`:scope > .${TableWrapper.STASH_CLASS}`).forEach((node) => {
			node.classList.remove(TableWrapper.STASH_CLASS);
			if (node.dataset.reorderTextWrap === 'true') {
				node.replaceWith(...Array.from(node.childNodes));
			}
		});
	}

	private ensureRowPosition(row: HTMLTableRowElement): HTMLElement | null {
		const cell = this.getReorderCell(row);
		const existingPosition = row.querySelector<HTMLElement>(`:scope > td > .${TableWrapper.POSITION_CLASS}`);
		if (existingPosition) {
			const host = existingPosition.parentElement as HTMLTableCellElement | null;
			if (host && host !== cell) {
				this.restoreCell(host);
			} else if (cell && host === cell) {
				this.prepareReorderCell(cell, existingPosition);
				return existingPosition;
			}
		}

		if (!cell) return null;

		this.stashCell(cell);

		const existing = cell.querySelector<HTMLElement>(`:scope > .${TableWrapper.POSITION_CLASS}`);
		if (existing) {
			this.prepareReorderCell(cell, existing);
			return existing;
		}

		const position = document.createElement('div');
		position.className = TableWrapper.POSITION_CLASS;

		const originEl = document.createElement('span');
		originEl.className = 'tablewrapper-reorder-origin';

		const arrowEl = document.createElement('span');
		arrowEl.className = 'tablewrapper-reorder-arrow';
		arrowEl.textContent = '→';

		const targetEl = document.createElement('input');
		targetEl.type = 'text';
		targetEl.inputMode = 'numeric';
		targetEl.autocomplete = 'off';
		targetEl.spellcheck = false;
		targetEl.className = 'tablewrapper-reorder-target';
		targetEl.setAttribute('aria-label', 'Move row to position');
		targetEl.addEventListener('keydown', this.handleTargetKeyDown);
		targetEl.addEventListener('pointerdown', this.handleTargetPointerDown);
		targetEl.addEventListener('focus', this.handleTargetFocus);
		targetEl.addEventListener('input', this.handleTargetInput);
		targetEl.addEventListener('blur', this.handleTargetBlur);

		position.append(originEl, arrowEl, targetEl);
		cell.appendChild(position);
		this.prepareReorderCell(cell, position);

		return position;
	}

	private prepareReorderCell(cell: HTMLTableCellElement, position: HTMLElement): void {
		cell.classList.add(TableWrapper.REORDER_CELL_CLASS);
		if (position.querySelector(`:scope > .${TableWrapper.GRIP_CLASS}`)) return;

		const holder = document.createElement('div');
		holder.innerHTML = Helpers.placeIcon('dots-six-vertical', 'm');
		const grip = holder.firstElementChild as HTMLElement;
		grip.classList.add(TableWrapper.GRIP_CLASS, 'tablewrapper-reorder-grip');
		grip.dataset.iconname = 'dots-six-vertical';
		grip.setAttribute('aria-hidden', 'true');
		position.prepend(grip);
	}

	private getRowOrigin(row: HTMLTableRowElement, index: number): number {
		const existing = this.reorderOriginByRow.get(row);
		if (existing !== undefined) return existing;

		const origin = index + 1;
		this.reorderOriginByRow.set(row, origin);
		return origin;
	}

	private captureReorderOrigins(): void {
		this.getBodyRows().forEach((row, index) => {
			this.reorderOriginByRow.set(row, index + 1);
		});
	}

	private isStagedDirty(): boolean {
		const rows = this.getBodyRows();
		if (rows.some((row, index) => this.getRowOrigin(row, index) !== index + 1)) return true;

		return rows.some((row, index) => this.stagedTargetPosition(row, index) !== null);
	}

	private stagedTargetPosition(row: HTMLTableRowElement, index: number): number | null {
		const targetEl = row.querySelector<HTMLInputElement>('.tablewrapper-reorder-target');
		if (!targetEl) return null;

		const position = this.parseTargetPosition(targetEl.value);
		if (position === null || position === index + 1) return null;

		if (document.activeElement === targetEl) {
			const snapshot = this.reorderValueOnFocus.get(targetEl);
			if (snapshot !== undefined && targetEl.value.trim() === snapshot.trim()) return null;
			return position;
		}

		const pending = this.pendingTargetByRow.get(row);
		if (pending === undefined || pending === index + 1) return null;
		return pending;
	}

	private clearPendingTarget(row: HTMLTableRowElement): void {
		this.pendingTargetByRow.delete(row);
		this.pendingEditOrder = this.pendingEditOrder.filter((entry) => entry !== row);
	}

	private clearPendingTargets(): void {
		this.pendingTargetByRow = new WeakMap();
		this.pendingEditOrder = [];
	}

	private rememberPendingTarget(row: HTMLTableRowElement, position: number): void {
		this.pendingTargetByRow.set(row, position);
		this.pendingEditOrder = this.pendingEditOrder.filter((entry) => entry !== row);
		this.pendingEditOrder.push(row);
	}

	private rowFromTarget(targetEl: HTMLInputElement): HTMLTableRowElement | null {
		const row = targetEl.closest('tr');
		if (!row || row.parentElement?.tagName !== 'TBODY') return null;
		return row as HTMLTableRowElement;
	}

	// Keeps a typed position on the input until Apply order. Does not move the row.
	private syncStagedTarget(targetEl: HTMLInputElement): void {
		const row = this.rowFromTarget(targetEl);
		if (!row || !this.isRowReorderable(row)) return;

		const rows = this.getBodyRows();
		const index = rows.indexOf(row);
		let position = this.parseTargetPosition(targetEl.value);
		if (position === null) {
			this.revertTargetPosition(targetEl);
			position = this.parseTargetPosition(targetEl.value);
		}

		const snapshot = this.reorderValueOnFocus.get(targetEl);
		const unchanged = snapshot !== undefined && targetEl.value.trim() === snapshot.trim();
		if (index < 0 || position === null || position === index + 1) {
			this.clearPendingTarget(row);
		} else if (!unchanged) {
			this.rememberPendingTarget(row, position);
		}

		this.updateReorderPositions();
		this.updateCommitButton();
	}

	private pendingInputCommits(): { rowId: string; order: number }[] {
		return this.pendingEditOrder.flatMap((row) => {
			const order = this.pendingTargetByRow.get(row);
			return order === undefined ? [] : [{ rowId: this.getRowId(row), order }];
		});
	}

	private emitReorderInput(commits: { rowId: string; order: number }[]): void {
		if (commits.length === 0) return;
		this.actions.OnReorderInput?.(JSON.stringify(commits.map((commit) => commit.rowId)), JSON.stringify(commits.map((commit) => commit.order)));
	}

	private applyPendingTargetPositions(): void {
		const moves = this.pendingEditOrder.flatMap((row) => {
			const position = this.pendingTargetByRow.get(row);
			return position === undefined ? [] : [{ row, position }];
		});

		let moved = false;
		for (const move of moves) {
			if (this.moveRowToPosition(move.row, move.position)) moved = true;
		}
		if (moved) this.syncExplicitOrdersToVisual();
	}

	private parseTargetPosition(raw: string): number | null {
		const trimmed = raw.trim();
		if (!/^\d+$/.test(trimmed)) return null;

		const position = Number(trimmed);
		if (!Number.isSafeInteger(position) || position < 1) return null;
		return position;
	}

	private revertTargetPosition(targetEl: HTMLInputElement): void {
		const snapshot = this.reorderValueOnFocus.get(targetEl);
		if (snapshot !== undefined) {
			targetEl.value = snapshot;
			return;
		}

		const row = targetEl.closest('tr');
		if (!row || row.parentElement?.tagName !== 'TBODY') return;

		const index = this.getBodyRows().indexOf(row as HTMLTableRowElement);
		if (index >= 0) targetEl.value = String(index + 1);
	}

	private moveRowToPosition(row: HTMLTableRowElement, position: number): boolean {
		const rows = this.getBodyRows();
		const fromIndex = rows.indexOf(row);
		const toIndex = position - 1;
		if (fromIndex < 0 || toIndex < 0 || toIndex >= rows.length || fromIndex === toIndex) {
			return false;
		}

		if (fromIndex < toIndex) {
			rows[toIndex].after(row);
		} else {
			rows[toIndex].before(row);
		}
		return true;
	}

	private applyTargetPosition(targetEl: HTMLInputElement): void {
		if (this.isLoading || !this.reorderableRows || !this.reorderImmediately) return;

		const row = targetEl.closest('tr');
		if (!row || row.parentElement?.tagName !== 'TBODY') return;

		const tableRow = row as HTMLTableRowElement;
		if (!this.isRowReorderable(tableRow)) return;

		const explicitOrder = this.getExplicitRowOrder(tableRow);
		if (explicitOrder !== null && targetEl.value.trim() === explicitOrder) return;

		const rows = this.getBodyRows();
		const position = this.parseTargetPosition(targetEl.value);
		if (position === null) {
			this.revertTargetPosition(targetEl);
			return;
		}

		// A position past this page cannot be applied in the DOM. Still commit it
		// so the parent can reorder the row outside the current page.
		const withinPage = position <= rows.length;
		const moved = withinPage && this.moveRowToPosition(tableRow, position);
		if (moved) this.syncExplicitOrdersToVisual();
		if (withinPage) {
			this.updateReorderPositions();
			if (!moved) return;
		} else {
			targetEl.value = String(position);
		}

		this.emitReorderInput([{ rowId: this.getRowId(tableRow), order: position }]);
	}

	private updateReorderPositions(): void {
		if (!this.reorderableRows) return;

		const rows = this.getBodyRows();
		const staged = this.isStagedReorder();
		const dirty = staged && this.isStagedDirty();

		rows.forEach((row, index) => {
			const position = this.ensureRowPosition(row);
			if (!position) return;

			const originEl = position.querySelector('.tablewrapper-reorder-origin');
			const targetEl = position.querySelector<HTMLInputElement>('.tablewrapper-reorder-target');
			if (!originEl || !targetEl) return;

			const reorderable = this.isRowReorderable(row);
			position.parentElement?.classList.toggle('is-inactive', !reorderable);

			const current = index + 1;
			const explicitOrder = this.dragActive ? null : this.getExplicitRowOrder(row);
			const inputValue = explicitOrder ?? String(current);
			const pending = this.pendingTargetByRow.get(row);
			if (staged) {
				const origin = this.getRowOrigin(row, index);
				originEl.textContent = origin === current ? inputValue : String(origin);
			}
			if (document.activeElement !== targetEl) {
				targetEl.value = pending !== undefined ? String(pending) : inputValue;
			}
			targetEl.disabled = this.isLoading || !reorderable;
			if (reorderable) targetEl.removeAttribute('tabindex');
			else targetEl.tabIndex = -1;
			position.dataset.hasTarget = dirty ? 'true' : 'false';
		});
	}

	private updateCommitButton(): void {
		if (!this.reorderCommitEl) return;
		this.reorderCommitEl.disabled = this.isLoading || !this.isStagedDirty();
	}
}
