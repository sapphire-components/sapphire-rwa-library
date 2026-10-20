import { BaseComponent, type BaseComponentInit } from '@core/base';
import { clearStickyBand, pinTopFor, setStickyBand } from '@utils/sticky-offset';

interface IBackofficeHeader extends BaseComponentInit {
	actions: {};
	enabled: boolean;
	isSticky: boolean;
	theme: string;
}

export default class BackofficeHeader extends BaseComponent {
	private frame = 0;
	private headEl: HTMLDivElement | null = null;
	private headerEl: HTMLElement | null = null;
	private isSticky = false;
	private placeholderEl?: HTMLDivElement;
	private resizeObserver?: ResizeObserver;
	private sentinelEl?: HTMLDivElement;
	private stuck = false;

	private scheduleUpdate = (): void => {
		if (this.frame) {
			return;
		}

		this.frame = requestAnimationFrame(() => {
			this.frame = 0;
			this.updateSticky();
		});
	};

	constructor(init: IBackofficeHeader) {
		super(init);

		if (!this.widgetEl) {
			console.warn('BackofficeHeader: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.headerEl = this.widgetEl.classList.contains('backofficeheader') ? this.widgetEl : this.widgetEl.querySelector<HTMLElement>('.backofficeheader');
		this.headEl = (this.headerEl ?? this.widgetEl).querySelector<HTMLDivElement>('.backofficeheader-head');

		if (!this.headerEl || !this.headEl) {
			console.warn('BackofficeHeader: .backofficeheader-head not found for runtimeId', init.runtimeId);
			return;
		}

		this.setSticky(Boolean(init.isSticky));
	}

	parametersChanged(payload: IBackofficeHeader): void {
		if (!this.headerEl || payload.isSticky === undefined || payload.isSticky === this.isSticky) {
			return;
		}

		this.setSticky(Boolean(payload.isSticky));
	}

	private setSticky(isSticky: boolean): void {
		this.isSticky = isSticky;
		this.headerEl!.dataset.issticky = isSticky ? 'true' : 'false';

		if (isSticky) {
			this.enableSticky();
			return;
		}

		this.disableSticky();
	}

	private enableSticky(): void {
		if (!this.sentinelEl && this.headEl) {
			const sentinel = document.createElement('div');
			sentinel.className = 'backofficeheader-sentinel';
			sentinel.setAttribute('aria-hidden', 'true');
			this.headEl.before(sentinel);
			this.sentinelEl = sentinel;
		}

		if (!this.resizeObserver && this.headEl) {
			this.resizeObserver = new ResizeObserver(() => this.scheduleUpdate());
			this.resizeObserver.observe(this.headEl);
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
		if (!this.isSticky || !this.sentinelEl || !this.headerEl) {
			return;
		}

		const pinLine = pinTopFor(this.headerEl);
		const sentinelTop = this.sentinelEl.getBoundingClientRect().top;

		if (sentinelTop < pinLine) {
			this.pin();
			return;
		}

		if (this.stuck) {
			this.unpin();
		}
	}

	private pin(): void {
		if (!this.headEl || !this.headerEl) {
			return;
		}

		const box = this.headEl.getBoundingClientRect();
		const marginBottom = parseFloat(getComputedStyle(this.headEl).marginBottom) || 0;
		const height = Math.round(box.height);
		const reserved = Math.round(box.height + marginBottom);

		if (!this.placeholderEl) {
			this.placeholderEl = document.createElement('div');
			this.placeholderEl.className = 'backofficeheader-placeholder';
			this.placeholderEl.setAttribute('aria-hidden', 'true');
			this.headEl.before(this.placeholderEl);
		}

		this.placeholderEl.style.height = `${reserved}px`;
		this.headerEl.dataset.isstuck = 'true';
		this.stuck = true;

		const anchor = this.placeholderEl.getBoundingClientRect();
		this.headEl.style.top = `${pinTopFor(this.headerEl)}px`;
		this.headEl.style.left = `${anchor.left}px`;
		this.headEl.style.width = `${anchor.width}px`;
		setStickyBand(this.runtimeId, this.headerEl, height);
	}

	private unpin(): void {
		if (!this.stuck && !this.placeholderEl) {
			return;
		}

		this.stuck = false;
		if (this.headerEl) {
			delete this.headerEl.dataset.isstuck;
		}
		if (this.headEl) {
			this.headEl.style.top = '';
			this.headEl.style.left = '';
			this.headEl.style.width = '';
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
