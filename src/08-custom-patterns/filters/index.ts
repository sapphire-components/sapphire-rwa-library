import { BaseComponent, type BaseComponentInit } from '@core/base';
import { clearStickyBand, pinTopFor, scrollportOf, setStickyBand, subscribeStickyOffset } from '@utils/sticky-offset';

interface IFilters extends BaseComponentInit {
	actions: {
		OnApply: () => void;
		OnClear: () => void;
		OnToggle: (isOpen: boolean) => void;
	};
	enabled: boolean;
	hasApplyButton: boolean;
	hasClear: boolean;
	isSticky: boolean;
	textApply: string;
	textClear: string;
	textSeeMore: string;
	theme: string;
}

type Placement = 'bottom' | 'top';

const PLACEHOLDER_CLASSES = ['filters-always', 'filters-maybe', 'filters-never'] as const;

// Clicks inside floating layers opened from a filter (tippy-based dropdowns, date pickers,
// DropdownSearch) land outside the panel, but must not close it.
const FLOATING_LAYERS_SELECTOR = '[data-tippy-root], .flatpickr-calendar, .vscomp-dropbox-container';

// Plain platform inputs (text, number, email, date...) and Dropdowns (select). Their value is a property, so Filters
// reflects it on the field as data-filtersactive for counting and styling.
// SapphireInput wraps one of these but reports its own state.
const PLAIN_FIELD_SELECTOR =
	"select, input:not([type='checkbox'], [type='radio'], [type='hidden'], [type='button'], [type='submit'], [type='reset'], [type='file'], [type='range'], [type='color'], [type='image'])";

// Platform Dropdowns use list positions (0, 1, 2...) as option values; the Empty Text option is -1.
const SELECT_EMPTY_VALUE = '-1';

// A filter is active when it holds a value. Add a component's selector here to count it,
// plus the attribute it toggles when that happens. Checkboxes change a property rather
// than an attribute, so they are picked up through `change` events instead.
const ACTIVE_SELECTOR = [
	".sapphiredropdown[data-hasvalue='true']",
	".sapphireinput[data-hascontent='true']",
	".checkboxlabel input[type='checkbox']:checked",
	"[data-filtersactive='true']",
].join(', ');
// The platform keeps an input's `value` attribute in sync with its value, including values set by screen logic.
const ACTIVE_ATTRIBUTES = ['data-hasvalue', 'data-hascontent', 'checked', 'value'];

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const VIEWPORT_MARGIN = 8;

// How long fields are re-checked after a click or key press, in ms (see onDocumentInteraction).
const SETTLE_WINDOW = 1500;

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
	private hasClear = false;
	private textApply = 'Apply';
	private textClear = 'Clear';
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
	private moreActiveEl!: HTMLSpanElement;
	private panelEl!: HTMLDivElement;
	private panelContentEl!: HTMLDivElement;
	private panelFooterEl!: HTMLDivElement;
	private applyEl!: HTMLButtonElement;
	private clearEl!: HTMLButtonElement;
	private panelClearEl!: HTMLButtonElement;

	private resizeObserver?: ResizeObserver;
	private mutationObserver?: MutationObserver;
	private activeObserver?: MutationObserver;
	private activeSignature = '';
	private settleFrame = 0;
	private settleUntil = 0;
	private panelResizeObserver?: ResizeObserver;

	private isSticky = false;
	private stuck = false;
	private stickyFrame = 0;
	private sentinelEl?: HTMLDivElement;
	private stickyPlaceholderEl?: HTMLDivElement;
	private stickyResizeObserver?: ResizeObserver;
	private unsubscribeStickyOffset?: () => void;

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
		this.setSticky(Boolean(init.isSticky));
	}

	parametersChanged(payload: IFilters): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) return;

		const wasSticky = this.isSticky;

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

		const isSticky = payload.isSticky === undefined ? wasSticky : Boolean(payload.isSticky);
		if (isSticky !== this.isSticky || (isSticky && !this.sentinelEl)) this.setSticky(isSticky);
	}

	destroy(): void {
		this.teardown();
		super.destroy();
	}

	private applyConfig(payload: Partial<IFilters>): void {
		if (payload.actions) this.actions = payload.actions;
		if (payload.enabled !== undefined) this.enabled = payload.enabled !== false;
		if (payload.hasApplyButton !== undefined) this.hasApplyButton = payload.hasApplyButton !== false;
		if (payload.hasClear !== undefined) this.hasClear = payload.hasClear === true;
		if (payload.textApply !== undefined) this.textApply = payload.textApply || 'Apply';
		if (payload.textClear !== undefined) this.textClear = payload.textClear || 'Clear';
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

		this.moreActiveEl = document.createElement('span');
		this.moreActiveEl.className = 'filters-more-active';
		this.moreActiveEl.hidden = true;

		this.moreEl.append(this.moreCountEl, this.moreLabelEl, this.moreActiveEl);
		// See more, then Clear, sit right before the permanent Actions, or at the end of the row when there are none.
		this.clearEl = this.createClearButton();
		this.widgetEl.insertBefore(this.moreEl, this.actionsEl);
		this.widgetEl.insertBefore(this.clearEl, this.actionsEl);

		this.panelEl = document.createElement('div');
		this.panelEl.className = 'filters-panel';
		this.panelEl.setAttribute('role', 'dialog');

		this.panelContentEl = document.createElement('div');
		this.panelContentEl.className = 'filters-panel-content';

		this.panelFooterEl = document.createElement('div');
		this.panelFooterEl.className = 'filters-panel-footer';

		this.applyEl = this.createLabelledButton('btn btn-primary btn-small filters-apply');

		// Clear on the left of the footer, Apply on the right.
		this.panelClearEl = this.createClearButton();
		this.panelFooterEl.append(this.panelClearEl, this.applyEl);
		this.panelEl.append(this.panelContentEl, this.panelFooterEl);

		this.moreEl.addEventListener('click', this.onMoreClick);
		this.applyEl.addEventListener('click', this.onApplyClick);
		this.panelEl.addEventListener('keydown', this.onPanelKeyDown);
	}

	private createClearButton(): HTMLButtonElement {
		const button = this.createLabelledButton('btn btn-small filters-clear');
		button.hidden = true;
		button.addEventListener('click', this.onClearClick);
		return button;
	}

	// The label lives in its own span so it can change without replacing the button's children:
	// OutSystems UI appends a ripple span to any clicked `.btn` and removes it with removeChild
	// 1.8s later, which throws if the span is gone by then.
	private createLabelledButton(className: string): HTMLButtonElement {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = className;

		const label = document.createElement('span');
		label.className = 'filters-button-label';
		button.append(label);

		return button;
	}

	private setLabel(button: HTMLButtonElement, text: string): void {
		const label = button.querySelector<HTMLSpanElement>(':scope > .filters-button-label');
		if (label && label.textContent !== text) label.textContent = text;
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

		// A filter gaining or losing a value changes its styling and the active count on See more.
		// Placeholders are observed directly, so this keeps working while they sit in the panel.
		this.activeObserver = new MutationObserver(this.onActiveChange);
		for (const el of [this.alwaysEl, this.maybeEl, this.neverEl]) {
			if (!el) continue;
			this.activeObserver.observe(el, { attributeFilter: ACTIVE_ATTRIBUTES, subtree: true });
			el.addEventListener('input', this.onActiveChange);
			el.addEventListener('change', this.onActiveChange);
		}

		document.addEventListener('click', this.onDocumentInteraction, true);
		document.addEventListener('keyup', this.onDocumentInteraction, true);

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
		this.disableSticky();
		cancelAnimationFrame(this.frame);
		this.frame = 0;

		this.resizeObserver?.disconnect();
		this.resizeObserver = undefined;
		this.mutationObserver?.disconnect();
		this.mutationObserver = undefined;
		this.activeObserver?.disconnect();
		this.activeObserver = undefined;
		for (const el of [this.alwaysEl, this.maybeEl, this.neverEl]) {
			el?.removeEventListener('input', this.onActiveChange);
			el?.removeEventListener('change', this.onActiveChange);
		}
		this.panelResizeObserver?.disconnect();
		this.panelResizeObserver = undefined;
		document.removeEventListener('click', this.onDocumentInteraction, true);
		document.removeEventListener('keyup', this.onDocumentInteraction, true);
		cancelAnimationFrame(this.settleFrame);
		this.settleFrame = 0;

		this.moreEl?.removeEventListener('click', this.onMoreClick);
		this.applyEl?.removeEventListener('click', this.onApplyClick);
		this.clearEl?.removeEventListener('click', this.onClearClick);
		this.panelClearEl?.removeEventListener('click', this.onClearClick);
		this.panelEl?.removeEventListener('keydown', this.onPanelKeyDown);
		this.moreEl?.remove();
		this.clearEl?.remove();
		this.panelEl?.remove();

		for (const item of this.items(this.maybeEl)) delete item.dataset.filtersoverflow;
	}

	private render(): void {
		this.widgetEl.dataset.open = this.isOpen ? 'true' : 'false';
		this.moreEl.disabled = !this.enabled;
		this.moreLabelEl.textContent = this.textSeeMore;
		this.setLabel(this.applyEl, this.textApply);
		this.applyEl.disabled = !this.enabled;
		this.applyEl.hidden = !this.hasApplyButton;
		for (const button of [this.clearEl, this.panelClearEl]) {
			this.setLabel(button, this.textClear);
			button.disabled = !this.enabled;
		}
		this.updateClear();
		this.panelEl.dataset.theme = this.theme;
		this.panelEl.dataset.density = this.widgetEl.dataset.density ?? '';
		this.panelEl.setAttribute('aria-label', this.textSeeMore);
	}

	private items(placeholder: HTMLElement | null): HTMLElement[] {
		return placeholder ? (Array.from(placeholder.children) as HTMLElement[]) : [];
	}

	// Runs right away, not on the next evaluate, so the styling also follows while the panel is open.
	private readonly onActiveChange = (): void => {
		this.markPlainFields();
		this.activeSignature = this.readActiveSignature();
		this.updateClear();
		this.scheduleEvaluate();
	};

	// Screen logic can change a select's option or a checkbox without any event or attribute
	// change (e.g. a Clear handler resetting variables). Those changes nearly always follow a
	// click or key press, so after one, fields are re-checked each frame for a short while.
	private readonly onDocumentInteraction = (): void => {
		this.settleUntil = performance.now() + SETTLE_WINDOW;
		if (this.settleFrame) return;

		const tick = (): void => {
			this.markPlainFields();
			if (this.readActiveSignature() !== this.activeSignature) this.onActiveChange();

			this.settleFrame = performance.now() < this.settleUntil ? requestAnimationFrame(tick) : 0;
		};
		this.settleFrame = requestAnimationFrame(tick);
	};

	// Which filters are active, in order. Cheap to compare, so only real changes trigger a re-render.
	private readActiveSignature(): string {
		const all = [...this.items(this.alwaysEl), ...this.items(this.maybeEl), ...this.items(this.neverEl)];
		return all.map((item) => (this.countActive([item]) > 0 ? '1' : '0')).join('');
	}

	// Clear shows while any filter, on the row or hidden, is active. The panel footer
	// shows when it has something to hold.
	private updateClear(): void {
		const all = [...this.items(this.alwaysEl), ...this.items(this.maybeEl), ...this.items(this.neverEl)];
		const visible = this.hasClear && this.countActive(all) > 0;

		// Clearing hides the button under the user's focus; keep focus inside the panel.
		const refocus = !visible && this.isOpen && document.activeElement === this.panelClearEl;

		this.clearEl.hidden = !visible;
		this.panelClearEl.hidden = !visible;
		this.panelFooterEl.hidden = !this.hasApplyButton && !visible;

		if (refocus) this.focusables()[0]?.focus();
	}

	private markPlainFields(): void {
		for (const placeholder of [this.alwaysEl, this.maybeEl, this.neverEl]) {
			if (!placeholder) continue;

			for (const field of placeholder.querySelectorAll<HTMLInputElement | HTMLSelectElement>(PLAIN_FIELD_SELECTOR)) {
				if (field.closest('.sapphireinput')) continue;

				const value = field.value.trim();
				const isEmpty = value === '' || (field instanceof HTMLSelectElement && value === SELECT_EMPTY_VALUE);
				const active = isEmpty ? 'false' : 'true';
				if (field.dataset.filtersactive !== active) field.dataset.filtersactive = active;
			}
		}
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

		// Covers inputs added since the last change, and the initial values.
		this.markPlainFields();
		this.updateClear();

		const alwaysItems = this.items(this.alwaysEl);
		const maybeItems = this.items(this.maybeEl);
		const neverItems = this.items(this.neverEl);
		const neverCount = neverItems.length;

		for (const item of maybeItems) delete item.dataset.filtersoverflow;

		const style = getComputedStyle(this.widgetEl);
		const gap = parseFloat(style.columnGap) || 0;
		// Clear and Actions always stay on the row, so their space is reserved first.
		const endWidth = [this.clearEl, this.actionsEl]
			.map((el) => el?.getBoundingClientRect().width ?? 0)
			.filter((width) => width > 0)
			.reduce((sum, width) => sum + width + gap, 0);
		const available = this.widgetEl.clientWidth - (parseFloat(style.paddingInlineStart) || 0) - (parseFloat(style.paddingInlineEnd) || 0) - endWidth;

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
			// Measure with the largest count the badge can show, so the button never outgrows the space reserved for it.
			this.updateMoreLabel(hiddenCount, this.countActive([...maybeItems, ...neverItems]));
			this.moreEl.hidden = false;
			visibleCount = fitting(this.moreEl.getBoundingClientRect().width + gap);
			hiddenCount = maybeItems.length - visibleCount + neverCount;
		}

		maybeItems.slice(visibleCount).forEach((item) => {
			item.dataset.filtersoverflow = 'true';
		});

		this.updateMoreLabel(hiddenCount, this.countActive([...maybeItems.slice(visibleCount), ...neverItems]));
		this.moreEl.hidden = hiddenCount === 0;
	}

	private countActive(items: HTMLElement[]): number {
		return items.filter((item) => item.matches(ACTIVE_SELECTOR) || item.querySelector(ACTIVE_SELECTOR) !== null).length;
	}

	private updateMoreLabel(count: number, activeCount: number): void {
		this.moreCountEl.textContent = `+${count}`;
		this.moreActiveEl.textContent = String(activeCount);
		this.moreActiveEl.hidden = activeCount === 0;
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

	// Only notifies: the screen resets its own filter variables, and the active
	// styling, count and this button follow from the new values. The panel stays open.
	private readonly onClearClick = (): void => {
		if (!this.enabled) return;
		this.actions?.OnClear();
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

	// Sticky: same approach as FilterBar. A sentinel before the row tells when the row has
	// scrolled past the top of its scrollport; the row is then pinned with `position: fixed`
	// below any sticky bands above it (BackofficeHeader, FilterBar...), and a placeholder
	// keeps its space so the content below does not jump.
	private setSticky(isSticky: boolean): void {
		this.isSticky = isSticky;
		this.widgetEl.dataset.issticky = isSticky ? 'true' : 'false';

		if (isSticky) {
			this.enableSticky();
			return;
		}

		this.disableSticky();
	}

	private enableSticky(): void {
		if (!this.sentinelEl) {
			const sentinel = document.createElement('div');
			sentinel.className = 'filters-sentinel';
			sentinel.setAttribute('aria-hidden', 'true');
			this.widgetEl.before(sentinel);
			this.sentinelEl = sentinel;
		}

		if (!this.stickyResizeObserver) {
			this.stickyResizeObserver = new ResizeObserver(this.scheduleSticky);
			this.stickyResizeObserver.observe(this.widgetEl);
		}

		this.unsubscribeStickyOffset ??= subscribeStickyOffset(this.scheduleSticky);
		document.addEventListener('scroll', this.scheduleSticky, { capture: true, passive: true });
		window.addEventListener('resize', this.scheduleSticky, { passive: true });
		this.scheduleSticky();
	}

	private disableSticky(): void {
		document.removeEventListener('scroll', this.scheduleSticky, { capture: true });
		window.removeEventListener('resize', this.scheduleSticky);
		this.unsubscribeStickyOffset?.();
		this.unsubscribeStickyOffset = undefined;
		this.stickyResizeObserver?.disconnect();
		this.stickyResizeObserver = undefined;
		cancelAnimationFrame(this.stickyFrame);
		this.stickyFrame = 0;
		this.unpin();
		this.sentinelEl?.remove();
		this.sentinelEl = undefined;
	}

	private readonly scheduleSticky = (): void => {
		if (this.stickyFrame) return;

		this.stickyFrame = requestAnimationFrame(() => {
			this.stickyFrame = 0;
			this.updateSticky();
		});
	};

	private updateSticky(): void {
		if (!this.isSticky || !this.sentinelEl) return;

		const scrollport = scrollportOf(this.widgetEl);
		const rootTop = scrollport ? scrollport.getBoundingClientRect().top : 0;
		const sentinelTop = this.sentinelEl.getBoundingClientRect().top;

		if (sentinelTop < rootTop) {
			this.pin();
		} else if (this.stuck) {
			this.unpin();
		}

		if (this.isOpen) this.position();
	}

	private pin(): void {
		const height = Math.round(this.widgetEl.getBoundingClientRect().height);

		if (!this.stickyPlaceholderEl) {
			this.stickyPlaceholderEl = document.createElement('div');
			this.stickyPlaceholderEl.className = 'filters-placeholder';
			this.stickyPlaceholderEl.setAttribute('aria-hidden', 'true');
			this.widgetEl.before(this.stickyPlaceholderEl);
		}

		this.stickyPlaceholderEl.style.height = `${height}px`;
		this.widgetEl.dataset.isstuck = 'true';
		this.stuck = true;

		const anchor = this.stickyPlaceholderEl.getBoundingClientRect();
		this.widgetEl.style.top = `${pinTopFor(this.widgetEl)}px`;
		this.widgetEl.style.left = `${anchor.left}px`;
		this.widgetEl.style.width = `${anchor.width}px`;
		setStickyBand(this.runtimeId, this.widgetEl, height);
	}

	private unpin(): void {
		if (!this.stuck && !this.stickyPlaceholderEl) return;

		this.stuck = false;
		delete this.widgetEl.dataset.isstuck;
		this.widgetEl.style.top = '';
		this.widgetEl.style.left = '';
		this.widgetEl.style.width = '';
		this.stickyPlaceholderEl?.remove();
		this.stickyPlaceholderEl = undefined;
		clearStickyBand(this.runtimeId);
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
