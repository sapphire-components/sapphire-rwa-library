import DOMPurify from 'dompurify';
import { BaseComponent, type BaseComponentInit } from '../../core/base';
import { createSpinner } from '../../09-utils/loader';

export interface ISkeleton extends BaseComponentInit {
	display: { Bars: number; Loading: boolean; Circle: string };
	isWaiting: boolean;
}

export default class Skeleton extends BaseComponent {
	private barsCount: number;
	private barsEls: HTMLElement[];
	private display: { Bars: number; Loading: boolean; Circle: string };
	private spinnerEl?: HTMLElement;
	private circleEl?: HTMLElement;
	private loadersEl: HTMLElement;
	private template: HTMLTemplateElement;

	private static readonly CIRCLE_SIZES = ['s', 'm', 'l'];

	constructor(config: ISkeleton) {
		super(config);

		this.display = config.display;
		this.barsCount = this.display.Bars;
		this.loadersEl = this.widgetEl.querySelector('.skeleton-loaders') as HTMLElement;
		this.template = document.createElement('template');

		// Circle is optional (null | s | m | l). When set it renders a pulsing
		// shape that resolves like the bars. Whitelist the size before templating.
		const circleSize = Skeleton.CIRCLE_SIZES.includes(this.display.Circle) ? this.display.Circle : '';
		if (circleSize) {
			this.template.innerHTML += DOMPurify.sanitize(`<div class="circle circle--${circleSize}"></div>`);
		}

		if (this.display.Bars > 0) {
			this.template.innerHTML += DOMPurify.sanitize(`<div class="bars"></div>`);
		}

		this.loadersEl.appendChild(this.template.content);

		// Loading uses the shared spinner (09-utils/loader). Insert it before the
		// bars so the loaders keep their circle -> loading -> bars order.
		if (this.display.Loading) {
			this.spinnerEl = createSpinner();
			this.loadersEl.insertBefore(this.spinnerEl, this.loadersEl.querySelector('.bars'));
		}

		const barsEl = this.loadersEl.querySelector('.bars');
		if (barsEl) {
			for (let i = 0; i < this.barsCount; i++) {
				barsEl.innerHTML += DOMPurify.sanitize(`<span style="width:${100 - i * 20}%;">`);
			}
		}

		// Bars
		this.barsEls = Array.from(this.loadersEl.querySelectorAll('.bars span'));
		this.barsEls.forEach((item: HTMLElement, index: number) => {
			item.style.setProperty('--delay', `${index * 100}ms`);
			item.addEventListener('animationend', (animation: AnimationEvent) => {
				switch (animation.animationName) {
					case 'skeleton-destruction':
						item.style.display = 'none';
						if (index === this.barsCount - 1) {
							this.widgetEl.classList.add('is-resolved');
							//
							// const tooltipElement: HTMLElement = this.widgetEl.closest('[data-tippy-root]');
							// if (tooltipElement && tooltipElement._tippy) {
							// 	const instance = tooltipElement._tippy;
							// 	instance.popperInstance.update();
							// }
						}
						break;
				}
			});
		});

		// Loading
		this.spinnerEl?.addEventListener('animationend', (animation: AnimationEvent) => {
			switch (animation.animationName) {
				case 'skeleton-destruction':
					this.spinnerEl!.style.display = 'none';
					this.widgetEl.classList.add('is-resolved');
					//
					// const tooltipElement: HTMLElement = this.widgetEl.closest('[data-tippy-root]');
					// if (tooltipElement && tooltipElement._tippy) {
					// 	const instance = tooltipElement._tippy;
					// 	instance.popperInstance.update();
					// }
					break;
			}
		});

		// Circle
		this.circleEl = (this.loadersEl.querySelector('.circle') as HTMLElement | null) ?? undefined;
		this.circleEl?.addEventListener('animationend', (animation: AnimationEvent) => {
			switch (animation.animationName) {
				case 'skeleton-destruction':
					this.circleEl!.style.display = 'none';
					this.widgetEl.classList.add('is-resolved');
					break;
			}
		});
	}

	parametersChanged(payload: ISkeleton): void {
		if (payload.isWaiting) {
			this.widgetEl.classList.remove('is-resolved');
			this.barsEls?.forEach((item: HTMLElement) => {
				item.style.display = 'block';
				item.classList.remove('is-removing');
			});

			if (this.spinnerEl) {
				this.spinnerEl.style.display = 'block';
				this.spinnerEl.classList.remove('is-removing');
			}

			if (this.circleEl) {
				this.circleEl.style.display = 'block';
				this.circleEl.classList.remove('is-removing');
			}
		} else {
			this.barsEls.forEach((item: HTMLElement) => {
				item.classList.add('is-removing');
			});
			this.spinnerEl?.classList.add('is-removing');
			this.circleEl?.classList.add('is-removing');
		}
	}

	destroy(): void {}
}
