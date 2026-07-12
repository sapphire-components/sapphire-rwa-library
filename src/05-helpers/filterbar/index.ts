import { BaseComponent, type BaseComponentInit } from '@core/base';

interface FilterBarInit extends BaseComponentInit {
	enabled: boolean;
	theme: string;
}

export default class FilterBar extends BaseComponent {
	private lastWidgetRect?: { top: number; width: number; height: number };
	private placeholderEl!: HTMLDivElement;
	private wrapperEl!: HTMLDivElement;

	constructor(init: FilterBarInit) {
		super(init);

		if (!this.widgetEl) {
			console.warn('FilterBar: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.wrapperEl = this.widgetEl.querySelector<HTMLDivElement>('.filterbar-wrapper')!;

		this.createPlaceholder();
		this.setWidgetRect();

		this.observeLayoutResize(this.handleLayoutResize);
	}

	private handleLayoutResize = (_entries: ResizeObserverEntry[]): void => {
		if (this.widgetEl.dataset.isfixed === 'true') {
			this.wrapperEl.style.width = this.placeholderEl.getBoundingClientRect().width + 'px';
		}
	};

	createPlaceholder(): void {
		this.placeholderEl = document.createElement('div');
		this.placeholderEl.setAttribute('aria-hidden', 'true');
		this.placeholderEl.classList.add('filterbar-placeholder');
		this.wrapperEl.parentElement?.insertBefore(this.placeholderEl, this.wrapperEl);
	}

	setWidgetRect(): void {
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

	destroy(): void {
		super.destroy();
		this.placeholderEl.remove();
	}
}
