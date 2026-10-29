import { BaseComponent, type BaseComponentInit } from '@core/base';

interface IFilters extends BaseComponentInit {
	actions: {
		OnApply: () => void;
		OnToggle: (isOpen: boolean) => void;
	};
	enabled: boolean;
	hasApplyButton: boolean;
	textApply: string;
	textSeeMore: string;
	theme: string;
}

type Placement = 'bottom' | 'top';

const PLACEHOLDER_CLASSES = ['filters-always', 'filters-maybe', 'filters-never'] as const;

// Clicks inside floating layers opened from a filter (tippy-based dropdowns, date pickers,
// DropdownSearch) land outside the panel, but must not close it.
const FLOATING_LAYERS_SELECTOR = '[data-tippy-root], .flatpickr-calendar, .vscomp-dropbox-container';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const VIEWPORT_MARGIN = 8;

// Elements that render a box. Block wrappers such as div[data-block] use `display: contents`
// and have no box of their own, so they are replaced by the boxes inside them.
function boxesOf(el: Element): Element[] {
	if (getComputedStyle(el).display !== 'contents') return [el];
	return Array.from(el.children).flatMap(boxesOf);
}

function widthOf(item: HTMLElement): number {
	const rects = boxesOf(item)
		.map((box) => box.getBoundingClientRect())
		.filter((rect) => rect.width > 0);
	if (rects.length === 0) return 0;

	return Math.max(...rects.map((rect) => rect.right)) - Math.min(...rects.map((rect) => rect.left));
}

export default class Filters extends BaseComponent {
	private actions!: IFilters['actions'];
	private enabled = true;
	private hasApplyButton = true;
	private textApply = 'Apply';
	private textSeeMore = 'See more';
	private theme = '';

	private isOpen = false;
	private placement: Placement = 'bottom';
	private frame = 0;

	private alwaysEl: HTMLElement | null = null;
	private maybeEl: HTMLElement | null = null;
	private neverEl: HTMLElement | null = null;
	private actionsEl: HTMLElement | null = null;

	private moreEl!: HTMLButtonElement;
	private moreCountEl!: HTMLSpanElement;
	private moreLabelEl!: HTMLSpanElement;
	private panelEl!: HTMLDivElement;
	private panelContentEl!: HTMLDivElement;
	private panelFooterEl!: HTMLDivElement;
	private applyEl!: HTMLButtonElement;

	private resizeObserver?: ResizeObserver;
	private mutationObserver?: MutationObserver;
	private panelResizeObserver?: ResizeObserver;

	constructor(init: IFilters) {
		super(init);

		if (!this.widgetEl) {
			console.warn('Filters: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.applyConfig(init);
		this.build();
		this.observe();
		this.render();
		this.evaluate();
	}

	parametersChanged(payload: IFilters): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) return;

		if (this.widgetEl !== liveEl) {
			this.teardown();
			this.widgetEl = liveEl;
			this.build();
			this.observe();
		}

		const wasEnabled = this.enabled;
		this.applyConfig(payload);
		if (wasEnabled && !this.enabled) this.close(false);

		this.render();
		this.scheduleEvaluate();
	}

	destroy(): void {
		this.teardown();
		super.destroy();
	}

	private applyConfig(payload: Partial<IFilters>): void {
		if (payload.actions) this.actions = payload.actions;
		if (payload.enabled !== undefined) this.enabled = payload.enabled !== false;
		if (payload.hasApplyButton !== undefined) this.hasApplyButton = payload.hasApplyButton !== false;
		if (payload.textApply !== undefined) this.textApply = payload.textApply || 'Apply';
		if (payload.textSeeMore !== undefined) this.textSeeMore = payload.textSeeMore || 'See more';
		if (payload.theme !== undefined) this.theme = payload.theme ?? '';
	}

	private build(): void {
		[this.alwaysEl, this.maybeEl, this.neverEl] = PLACEHOLDER_CLASSES.map((name) => this.widgetEl.querySelector<HTMLElement>(`:scope > .${name}`));
		this.actionsEl = this.widgetEl.querySelector<HTMLElement>(':scope > .filters-actions');

		this.moreEl = document.createElement('button');
		this.moreEl.type = 'button';
		this.moreEl.className = 'btn btn-small filters-more';
		this.moreEl.setAttribute('aria-haspopup', 'dialog');
		this.moreEl.setAttribute('aria-expanded', 'false');
		this.moreEl.hidden = true;

		this.moreCountEl = document.createElement('span');
		this.moreCountEl.className = 'filters-more-count';

		this.moreLabelEl = document.createElement('span');
		this.moreLabelEl.className = 'filters-more-label';

		this.moreEl.append(this.moreCountEl, this.moreLabelEl);
		// Sits right before the permanent Actions, or at the end of the row when there are none.
		this.widgetEl.insertBefore(this.moreEl, this.actionsEl);

		this.panelEl = document.createElement('div');
		this.panelEl.className = 'filters-panel';
		this.panelEl.setAttribute('role', 'dialog');

		this.panelContentEl = document.createElement('div');
		this.panelContentEl.className = 'filters-panel-content';

		this.panelFooterEl = document.createElement('div');
		this.panelFooterEl.className = 'filters-panel-footer';

		this.applyEl = document.createElement('button');
		this.applyEl.type = 'button';
		this.applyEl.className = 'btn btn-primary btn-small filters-apply';

		this.panelFooterEl.append(this.applyEl);
		this.panelEl.append(this.panelContentEl, this.panelFooterEl);

		this.moreEl.addEventListener('click', this.onMoreClick);
		this.applyEl.addEventListener('click', this.onApplyClick);
		this.panelEl.addEventListener('keydown', this.onPanelKeyDown);
	}

	private observe(): void {
		this.resizeObserver = new ResizeObserver(this.scheduleEvaluate);
		this.observeItems();

		// Filters added or removed (If / List widgets) change what fits on the row.
		this.mutationObserver = new MutationObserver(() => {
			this.observeItems();
			this.scheduleEvaluate();
		});
		for (const el of [this.alwaysEl, this.maybeEl, this.neverEl, this.actionsEl]) {
			if (el) this.mutationObserver.observe(el, { childList: true });
		}

		this.panelResizeObserver = new ResizeObserver(this.schedulePosition);
	}

	private observeItems(): void {
		if (!this.resizeObserver) return;

		// Re-observe from scratch so removed filters are released.
		this.resizeObserver.disconnect();
		this.resizeObserver.observe(this.widgetEl);
		if (this.actionsEl) this.resizeObserver.observe(this.actionsEl);
		for (const item of [...this.items(this.alwaysEl), ...this.items(this.maybeEl)]) {
			for (const box of boxesOf(item)) this.resizeObserver.observe(box);
		}
	}

	private teardown(): void {
		this.close(false, false);
		cancelAnimationFrame(this.frame);
		this.frame = 0;

		this.resizeObserver?.disconnect();
		this.resizeObserver = undefined;
		this.mutationObserver?.disconnect();
		this.mutationObserver = undefined;
		this.panelResizeObserver?.disconnect();
		this.panelResizeObserver = undefined;

		this.moreEl?.removeEventListener('click', this.onMoreClick);
		this.applyEl?.removeEventListener('click', this.onApplyClick);
		this.panelEl?.removeEventListener('keydown', this.onPanelKeyDown);
		this.moreEl?.remove();
		this.panelEl?.remove();

		for (const item of this.items(this.maybeEl)) delete item.dataset.filtersoverflow;
	}

	private render(): void {
		this.widgetEl.dataset.open = this.isOpen ? 'true' : 'false';
		this.moreEl.disabled = !this.enabled;
		this.moreLabelEl.textContent = this.textSeeMore;
		this.applyEl.textContent = this.textApply;
		this.applyEl.disabled = !this.enabled;
		this.panelFooterEl.hidden = !this.hasApplyButton;
		this.panelEl.dataset.theme = this.theme;
		this.panelEl.dataset.density = this.widgetEl.dataset.density ?? '';
		this.panelEl.setAttribute('aria-label', this.textSeeMore);
	}

	private items(placeholder: HTMLElement | null): HTMLElement[] {
		return placeholder ? (Array.from(placeholder.children) as HTMLElement[]) : [];
	}

	private readonly scheduleEvaluate = (): void => {
		if (this.frame || this.isOpen) return;

		this.frame = requestAnimationFrame(() => {
			this.frame = 0;
			this.evaluate();
		});
	};

	// Shows Maybe items in order while they fit on the row next to the Always items.
	// The first one that does not fit, and every one after it, moves to the panel.
	private evaluate(): void {
		if (this.isOpen || !this.widgetEl.isConnected) return;

		const alwaysItems = this.items(this.alwaysEl);
		const maybeItems = this.items(this.maybeEl);
		const neverCount = this.items(this.neverEl).length;

		for (const item of maybeItems) delete item.dataset.filtersoverflow;

		const style = getComputedStyle(this.widgetEl);
		const gap = parseFloat(style.columnGap) || 0;
		const actionsWidth = this.actionsEl?.getBoundingClientRect().width ?? 0;
		const available =
			this.widgetEl.clientWidth - (parseFloat(style.paddingInlineStart) || 0) - (parseFloat(style.paddingInlineEnd) || 0) - (actionsWidth > 0 ? actionsWidth + gap : 0);

		const alwaysWidths = alwaysItems.map(widthOf);
		const maybeWidths = maybeItems.map(widthOf);

		const fitting = (reserved: number): number => {
			let used = alwaysWidths.reduce((sum, width, index) => sum + width + (index > 0 ? gap : 0), 0);
			let count = 0;

			for (const width of maybeWidths) {
				const next = used + (used > 0 ? gap : 0) + width;
				if (next > available - reserved) break;
				used = next;
				count++;
			}

			return count;
		};

		let visibleCount = fitting(0);
		let hiddenCount = maybeItems.length - visibleCount + neverCount;

		if (hiddenCount > 0) {
			this.updateMoreLabel(hiddenCount);
			this.moreEl.hidden = false;
			visibleCount = fitting(this.moreEl.getBoundingClientRect().width + gap);
			hiddenCount = maybeItems.length - visibleCount + neverCount;
		}

		maybeItems.slice(visibleCount).forEach((item) => {
			item.dataset.filtersoverflow = 'true';
		});

		this.updateMoreLabel(hiddenCount);
		this.moreEl.hidden = hiddenCount === 0;
	}

	private updateMoreLabel(count: number): void {
		this.moreCountEl.textContent = `+${count}`;
	}

	private readonly onMoreClick = (): void => {
		if (this.isOpen) {
			this.close(true);
			return;
		}
		this.open();
	};

	private readonly onApplyClick = (): void => {
		if (!this.enabled) return;
		this.actions?.OnApply();
		this.close(true);
	};

	private readonly onPanelKeyDown = (event: KeyboardEvent): void => {
		if (event.key === 'Tab') this.trapTab(event);
	};

	private readonly onDocumentKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape' && event.key !== 'Esc') return;
		// Dropdowns inside the panel close themselves first and mark the event as handled.
		if (event.defaultPrevented) return;

		event.preventDefault();
		this.close(true);
	};

	private readonly onDocumentPointerDown = (event: PointerEvent): void => {
		const target = event.target as Element | null;
		if (!target || this.panelEl.contains(target) || this.moreEl.contains(target)) return;
		if (target.closest(FLOATING_LAYERS_SELECTOR)) return;

		this.close(false);
	};

	private readonly schedulePosition = (): void => {
		requestAnimationFrame(() => this.position());
	};

	private open(): void {
		if (!this.enabled || this.isOpen) return;

		const rowRect = this.widgetEl.getBoundingClientRect();
		this.isOpen = true;

		// Keep the row's footprint while its placeholders live in the panel,
		// so nothing else on the screen moves.
		this.widgetEl.style.minHeight = `${rowRect.height}px`;
		for (const item of this.items(this.maybeEl)) delete item.dataset.filtersoverflow;

		for (const placeholder of [this.alwaysEl, this.maybeEl, this.neverEl]) {
			if (placeholder) this.panelContentEl.append(placeholder);
		}

		this.moreEl.setAttribute('aria-expanded', 'true');
		this.render();

		document.body.append(this.panelEl);
		this.panelEl.style.left = `${rowRect.left}px`;
		this.panelEl.style.width = `${rowRect.width}px`;
		this.panelEl.style.maxHeight = '';
		this.placement = this.choosePlacement(rowRect, this.panelEl.offsetHeight);
		this.position();

		this.panelResizeObserver?.observe(this.panelEl);
		document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
		document.addEventListener('keydown', this.onDocumentKeyDown);
		document.addEventListener('scroll', this.schedulePosition, { capture: true, passive: true });
		window.addEventListener('resize', this.schedulePosition, { passive: true });

		this.focusables()[0]?.focus();
		this.actions?.OnToggle(true);
	}

	private close(returnFocus: boolean, notify = true): void {
		if (!this.isOpen) return;

		this.isOpen = false;

		document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
		document.removeEventListener('keydown', this.onDocumentKeyDown);
		document.removeEventListener('scroll', this.schedulePosition, { capture: true });
		window.removeEventListener('resize', this.schedulePosition);
		this.panelResizeObserver?.unobserve(this.panelEl);

		// Placeholders go back in their original order, ahead of the button.
		for (const placeholder of [this.alwaysEl, this.maybeEl, this.neverEl]) {
			if (placeholder) this.widgetEl.insertBefore(placeholder, this.moreEl);
		}

		this.panelEl.remove();
		this.widgetEl.style.minHeight = '';
		this.moreEl.setAttribute('aria-expanded', 'false');
		this.render();
		this.evaluate();

		if (returnFocus && !this.moreEl.hidden) this.moreEl.focus();
		if (notify) this.actions?.OnToggle(false);
	}

	// Opens downwards from the top of the row. Flips upwards, anchored to the bottom
	// of the row, when there is not enough room below and more room above.
	private choosePlacement(rowRect: DOMRect, height: number): Placement {
		const below = window.innerHeight - rowRect.top - VIEWPORT_MARGIN;
		const above = rowRect.bottom - VIEWPORT_MARGIN;

		if (height <= below) return 'bottom';
		if (height <= above) return 'top';
		return above > below ? 'top' : 'bottom';
	}

	private position(): void {
		if (!this.isOpen) return;

		const rowRect = this.widgetEl.getBoundingClientRect();
		const maxHeight = this.placement === 'bottom' ? window.innerHeight - rowRect.top - VIEWPORT_MARGIN : rowRect.bottom - VIEWPORT_MARGIN;

		this.panelEl.dataset.placement = this.placement;
		this.panelEl.style.left = `${rowRect.left}px`;
		this.panelEl.style.width = `${rowRect.width}px`;
		this.panelEl.style.maxHeight = `${Math.max(maxHeight, 0)}px`;

		if (this.placement === 'bottom') {
			this.panelEl.style.top = `${rowRect.top}px`;
			this.panelEl.style.bottom = '';
		} else {
			this.panelEl.style.top = '';
			this.panelEl.style.bottom = `${window.innerHeight - rowRect.bottom}px`;
		}
	}

	private focusables(): HTMLElement[] {
		return Array.from(this.panelEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => !el.hidden && el.offsetParent !== null);
	}

	private trapTab(event: KeyboardEvent): void {
		const items = this.focusables();
		if (items.length === 0) return;

		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement as HTMLElement | null;

		if (event.shiftKey && active === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus();
		}
	}
}
