import { BaseComponent, type BaseComponentInit } from '@core/base';
import { clearStickyBand, pinTopFor, scrollportOf, setStickyBand } from '@utils/sticky-offset';

interface FilterBarInit extends BaseComponentInit {
	enabled: boolean;
	isSticky: boolean;
	theme: string;
}

export default class FilterBar extends BaseComponent {
	private filterbarEl: HTMLElement | null = null;
	private frame = 0;
	private isSticky = false;
	private placeholderEl?: HTMLDivElement;
	private resizeObserver?: ResizeObserver;
	private sentinelEl?: HTMLDivElement;
	private stuck = false;
	private wrapperEl: HTMLDivElement | null = null;

	private scheduleUpdate = (): void => {
		if (this.frame) {
			return;
		}

		this.frame = requestAnimationFrame(() => {
			this.frame = 0;
			this.updateSticky();
		});
	};

	constructor(init: FilterBarInit) {
		super(init);

		if (!this.widgetEl) {
			console.warn('FilterBar: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.filterbarEl = this.widgetEl.classList.contains('filterbar') ? this.widgetEl : this.widgetEl.querySelector<HTMLElement>('.filterbar');
		this.wrapperEl = (this.filterbarEl ?? this.widgetEl).querySelector<HTMLDivElement>('.filterbar-wrapper');

		if (!this.filterbarEl || !this.wrapperEl) {
			console.warn('FilterBar: .filterbar-wrapper not found for runtimeId', init.runtimeId);
			return;
		}

		this.setSticky(Boolean(init.isSticky));
	}

	parametersChanged(payload: FilterBarInit): void {
		if (!this.filterbarEl || payload.isSticky === undefined || payload.isSticky === this.isSticky) {
			return;
		}

		this.setSticky(Boolean(payload.isSticky));
	}

	private setSticky(isSticky: boolean): void {
		this.isSticky = isSticky;
		this.filterbarEl!.dataset.issticky = isSticky ? 'true' : 'false';

		if (isSticky) {
			this.enableSticky();
			return;
		}

		this.disableSticky();
	}

	private enableSticky(): void {
		if (!this.sentinelEl) {
			const sentinel = document.createElement('div');
			sentinel.className = 'filterbar-sentinel';
			sentinel.setAttribute('aria-hidden', 'true');
			this.filterbarEl!.before(sentinel);
			this.sentinelEl = sentinel;
		}

		if (!this.resizeObserver && this.filterbarEl) {
			this.resizeObserver = new ResizeObserver(() => this.scheduleUpdate());
			this.resizeObserver.observe(this.filterbarEl);
		}

		document.addEventListener('scroll', this.scheduleUpdate, { capture: true, passive: true });
		window.addEventListener('resize', this.scheduleUpdate, { passive: true });
		this.scheduleUpdate();
	}

	private disableSticky(): void {
		document.removeEventListener('scroll', this.scheduleUpdate, { capture: true });
		window.removeEventListener('resize', this.scheduleUpdate);
		this.resizeObserver?.disconnect();
		this.resizeObserver = undefined;
		cancelAnimationFrame(this.frame);
		this.frame = 0;
		this.unpin();
		this.sentinelEl?.remove();
		this.sentinelEl = undefined;
	}

	private updateSticky(): void {
		if (!this.isSticky || !this.sentinelEl || !this.filterbarEl) {
			return;
		}

		const scrollport = scrollportOf(this.filterbarEl);
		const rootTop = scrollport ? scrollport.getBoundingClientRect().top : 0;
		const sentinelTop = this.sentinelEl.getBoundingClientRect().top;

		if (sentinelTop < rootTop) {
			this.pin();
			return;
		}

		if (this.stuck) {
			this.unpin();
		}
	}

	private pin(): void {
		if (!this.wrapperEl || !this.filterbarEl) {
			return;
		}

		const height = Math.round(this.wrapperEl.getBoundingClientRect().height);

		if (!this.placeholderEl) {
			this.placeholderEl = document.createElement('div');
			this.placeholderEl.className = 'filterbar-placeholder';
			this.placeholderEl.setAttribute('aria-hidden', 'true');
			this.wrapperEl.before(this.placeholderEl);
		}

		this.placeholderEl.style.height = `${height}px`;
		this.filterbarEl.dataset.isstuck = 'true';
		this.stuck = true;

		const anchor = this.placeholderEl.getBoundingClientRect();
		this.wrapperEl.style.top = `${pinTopFor(this.filterbarEl)}px`;
		this.wrapperEl.style.left = `${anchor.left}px`;
		this.wrapperEl.style.width = `${anchor.width}px`;
		setStickyBand(this.runtimeId, this.filterbarEl, height);
	}

	private unpin(): void {
		if (!this.stuck && !this.placeholderEl) {
			return;
		}

		this.stuck = false;
		if (this.filterbarEl) {
			delete this.filterbarEl.dataset.isstuck;
		}
		if (this.wrapperEl) {
			this.wrapperEl.style.top = '';
			this.wrapperEl.style.left = '';
			this.wrapperEl.style.width = '';
		}
		this.placeholderEl?.remove();
		this.placeholderEl = undefined;
		clearStickyBand(this.runtimeId);
	}

	destroy(): void {
		this.disableSticky();
		super.destroy();
	}
}
