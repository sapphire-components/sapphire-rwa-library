import { BaseComponent, type BaseComponentInit } from '../../core/base';

interface FilterBarInit extends BaseComponentInit {
	enabled: boolean;
	theme: string;
}

export default class FilterBar extends BaseComponent {
	private lastWidgetRect?: { top: number; width: number; height: number };
	private resizeObserver?: ResizeObserver;
	private resizeRafId?: number;
	private placeholderEl!: HTMLDivElement;
	private wrapperEl!: HTMLDivElement;
	private isFixed = false;

	constructor(init: FilterBarInit) {
		super(init);

		if (!this.widgetEl) {
			console.warn('FilterBar: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.wrapperEl = this.widgetEl.querySelector<HTMLDivElement>('.filterbar-wrapper')!;

		this.createPlaceholder();
		this.setWidgetRect();
		this.observeResize();
	}

	createPlaceholder(): void {
		this.placeholderEl = document.createElement('div');
		this.placeholderEl.setAttribute('aria-hidden', 'true');
		this.placeholderEl.classList.add('filterbar-placeholder');
		this.wrapperEl.parentElement?.insertBefore(this.placeholderEl, this.wrapperEl);
	}

	setWidgetRect(): void {
		if (this.isFixed) {
			return;
		}

		const top = Math.ceil(this.wrapperEl.offsetTop);
		const width = Math.ceil(this.wrapperEl.clientWidth);
		const height = Math.ceil(this.wrapperEl.clientHeight);

		const last = this.lastWidgetRect;
		if (last && last.top === top && last.width === width && last.height === height) {
			return;
		}
		this.lastWidgetRect = { top, width, height };

		this.widgetEl.style.setProperty('--filterbar-top', `${top}px`);
		this.widgetEl.style.setProperty('--filterbar-width', `${width}px`);
		this.widgetEl.style.setProperty('--filterbar-height', `${height}px`);
	}

	private observeResize(): void {
		this.resizeObserver = new ResizeObserver(() => {
			if (this.resizeRafId !== undefined) {
				return;
			}
			this.resizeRafId = window.requestAnimationFrame(() => {
				this.resizeRafId = undefined;
				this.setWidgetRect();
			});
		});

		this.resizeObserver.observe(this.widgetEl);
	}

	destroy(): void {
		if (this.resizeRafId !== undefined) {
			window.cancelAnimationFrame(this.resizeRafId);
			this.resizeRafId = undefined;
		}

		this.resizeObserver?.disconnect();
		this.resizeObserver = undefined;

		this.placeholderEl.remove();
	}
}
