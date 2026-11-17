import { BaseComponent, type BaseComponentInit } from '@core/base';
import Helpers from '@utils/helpers';

interface IPopupContent extends BaseComponentInit {
	actions: {
		OnClose: () => void;
	};
	closeOnEsc: boolean;
	height: number;
	minHeight: number;
	theme: string;
	url: string;
}

const FRAME_CLASS = 'popup-content-frame';
const FRAME_HEIGHT_VAR = '--popupcontent-frame-height';
const FRAME_AUTO_HEIGHT_ATTR = 'data-frameautoheight';
// How deep to look for the elements that stretch to the iframe's viewport.
const FRAME_CHAIN_DEPTH = 10;

export default class PopupContent extends BaseComponent {
	private closeButton!: HTMLButtonElement;
	private closeOnEsc!: boolean;
	private frameEl: HTMLIFrameElement | null = null;
	private frameMeasureFrame = 0;
	private unbindFrameContent?: () => void;
	private height!: number;
	private minHeight!: number;
	private popupContentBody!: HTMLDivElement;
	private popupContentFooter!: HTMLDivElement;
	private popupContentHeader!: HTMLDivElement;
	private readonly actions!: IPopupContent['actions'];
	private resizeFrame = 0;
	private resizeObserver!: ResizeObserver;
	private url = '';

	private readonly onClickClose = (): void => {
		this.actions.OnClose();
	};
	private readonly onKeyDown = (event: KeyboardEvent): void => {
		if (this.closeOnEsc && event.key === 'Escape') {
			this.actions.OnClose();
		}
	};
	private readonly onResize = (): void => {
		cancelAnimationFrame(this.resizeFrame);
		this.resizeFrame = requestAnimationFrame(() => {
			this.renderVariables();
		});
		this.scheduleFrameMeasure();
	};
	private readonly onFrameLoad = (): void => {
		this.bindFrameContent();
	};
	private readonly scheduleFrameMeasure = (): void => {
		if (!this.unbindFrameContent) return;
		cancelAnimationFrame(this.frameMeasureFrame);
		this.frameMeasureFrame = requestAnimationFrame(() => this.measureFrameContent());
	};

	constructor(init: IPopupContent) {
		super(init);

		if (!this.widgetEl) {
			console.warn('PopupContent: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;
		this.height = init.height;
		this.minHeight = init.minHeight;
		this.closeOnEsc = init.closeOnEsc;
		this.url = init.url ?? '';
		this.closeButton = this.widgetEl.querySelector<HTMLButtonElement>('.popup-content-close button')!;
		this.popupContentHeader = this.widgetEl.querySelector<HTMLDivElement>('.popup-content-header')!;
		this.popupContentBody = this.widgetEl.querySelector<HTMLDivElement>('.popup-content-body')!;
		this.popupContentFooter = this.widgetEl.querySelector<HTMLDivElement>('.popup-content-footer')!;

		this.bindEvents();
		this.renderUrl();
		this.renderVariables();

		setTimeout(() => {
			this.widgetEl.focus();
		}, 0);
	}

	bindEvents(): void {
		this.closeButton?.addEventListener('click', this.onClickClose);
		document.addEventListener('keydown', this.onKeyDown);

		this.resizeObserver = new ResizeObserver(this.onResize);
		this.resizeObserver.observe(document.documentElement);
		this.popupContentHeader && this.resizeObserver.observe(this.popupContentHeader);
		this.popupContentBody && this.resizeObserver.observe(this.popupContentBody);
		this.popupContentFooter && this.resizeObserver.observe(this.popupContentFooter);
	}

	renderVariables(): void {
		const bodyHeight = this.popupContentBody ? Helpers.getOuterSize(this.popupContentBody).height : 0;
		const footerHeight = this.popupContentFooter ? Helpers.getOuterSize(this.popupContentFooter).height : 0;
		const footerTop = this.popupContentFooter ? this.popupContentFooter.getBoundingClientRect().top : 0;
		const headerHeight = this.popupContentHeader ? Helpers.getOuterSize(this.popupContentHeader).height : 0;

		this.setVariable('--popupcontentbody-height', `${bodyHeight}px`);
		this.setVariable('--popupcontentfooter-height', `${footerHeight}px`);
		this.setVariable('--popupcontentfooter-top', `${footerTop}px`);
		this.setVariable('--popupcontentheader-height', `${headerHeight}px`);

		if (this.height) {
			this.widgetEl.style.removeProperty('--popupcontent-min-height');
			this.setVariable('--popupcontent-height', `${this.height}px`);
		} else if (this.minHeight) {
			this.widgetEl.style.removeProperty('--popupcontent-height');
			this.setVariable('--popupcontent-min-height', `${this.minHeight}px`);
		} else {
			this.widgetEl.style.removeProperty('--popupcontent-height');
			this.widgetEl.style.removeProperty('--popupcontent-min-height');
		}
	}

	renderUrl(): void {
		const url = this.url.trim();

		if (!url) {
			this.removeFrame();
			this.widgetEl.removeAttribute('data-hasurl');
			return;
		}

		if (!this.frameEl) {
			this.frameEl = document.createElement('iframe');
			this.frameEl.className = FRAME_CLASS;
			this.frameEl.addEventListener('load', this.onFrameLoad);
			// src goes on before the iframe is attached, so no about:blank load fires first.
			this.frameEl.setAttribute('src', url);
			this.widgetEl.append(this.frameEl);
		} else if (this.frameEl.getAttribute('src') !== url) {
			this.frameEl.setAttribute('src', url);
		}

		this.widgetEl.setAttribute('data-hasurl', 'true');
	}

	private removeFrame(): void {
		this.clearFrameContent();
		this.frameEl?.removeEventListener('load', this.onFrameLoad);
		this.frameEl?.remove();
		this.frameEl = null;
	}

	// The loaded page's document, or null when it cannot be read (another
	// origin) or has no body yet.
	private getFrameDocument(): Document | null {
		try {
			const doc = this.frameEl?.contentDocument;
			return doc?.body ? doc : null;
		} catch {
			return null;
		}
	}

	// Called on every iframe load, including navigation inside it. When the page
	// can be read, the iframe takes the height of its content and follows it as
	// it changes. Otherwise the popup keeps the full available height.
	private bindFrameContent(): void {
		this.clearFrameContent();
		const doc = this.getFrameDocument();
		const win = doc?.defaultView;
		if (!doc || !win) return;

		const schedule = this.scheduleFrameMeasure;
		const mutationObserver = new win.MutationObserver(schedule);
		mutationObserver.observe(doc.documentElement, { attributes: true, characterData: true, childList: true, subtree: true });
		const resizeObserver = new win.ResizeObserver(schedule);
		resizeObserver.observe(doc.documentElement);
		// Changes that resize content without touching the DOM: images and other
		// media finishing loading, transitions and animations ending, web fonts.
		const events = ['load', 'transitionend', 'animationend'];
		events.forEach((name) => doc.addEventListener(name, schedule, true));
		doc.fonts?.ready.then(schedule).catch(() => undefined);

		this.unbindFrameContent = () => {
			mutationObserver.disconnect();
			resizeObserver.disconnect();
			events.forEach((name) => doc.removeEventListener(name, schedule, true));
		};
		this.widgetEl.setAttribute(FRAME_AUTO_HEIGHT_ATTR, 'true');
		this.measureFrameContent();
	}

	private clearFrameContent(): void {
		cancelAnimationFrame(this.frameMeasureFrame);
		this.unbindFrameContent?.();
		this.unbindFrameContent = undefined;
		this.widgetEl.removeAttribute(FRAME_AUTO_HEIGHT_ATTR);
		this.widgetEl.style.removeProperty(FRAME_HEIGHT_VAR);
	}

	// Pages often stretch to the iframe (html/body at 100%, a layout with
	// min-height 100vh, an inner scroll container), so their size only echoes
	// the iframe's. To read the content's own height, the iframe is collapsed
	// to 0, the scroll heights are read, and it is restored, all before the next
	// paint, so nothing flickers. Scroll positions are put back afterwards.
	private measureFrameContent(): void {
		const frame = this.frameEl;
		const doc = this.getFrameDocument();
		if (!frame || !doc || !frame.isConnected || frame.getClientRects().length === 0) return;

		const win = doc.defaultView!;
		const scrollers = this.getFrameScrollers(doc, frame.clientHeight);
		const scrollTops = scrollers.map((el) => el.scrollTop);

		const previousStyle = frame.getAttribute('style');
		frame.style.cssText = 'flex:none;height:0;min-height:0;';
		const height = scrollers.reduce((max, el) => Math.max(max, el.scrollHeight + el.getBoundingClientRect().top + win.scrollY), doc.documentElement.scrollHeight);
		if (previousStyle === null) frame.removeAttribute('style');
		else frame.setAttribute('style', previousStyle);

		scrollers.forEach((el, index) => {
			if (el.scrollTop !== scrollTops[index]) el.scrollTop = scrollTops[index];
		});

		if (height > 0) this.setVariable(FRAME_HEIGHT_VAR, `${Math.ceil(height)}px`);
	}

	// The document's scrolling element plus every scroll container that
	// stretches to the iframe's viewport, found by walking down from body
	// through elements as tall as the viewport (and display: contents wrappers).
	private getFrameScrollers(doc: Document, viewportHeight: number): Element[] {
		const win = doc.defaultView!;
		const scrollers = new Set<Element>([doc.scrollingElement ?? doc.documentElement]);
		const walk = (el: Element, depth: number) => {
			if (depth > FRAME_CHAIN_DEPTH) return;
			Array.from(el.children).forEach((child) => {
				const style = win.getComputedStyle(child);
				if (style.display === 'contents') return walk(child, depth + 1);
				if (viewportHeight <= 0 || child.getBoundingClientRect().height < viewportHeight - 1) return;
				if (style.overflowY === 'auto' || style.overflowY === 'scroll') scrollers.add(child);
				walk(child, depth + 1);
			});
		};
		walk(doc.body, 0);
		return Array.from(scrollers);
	}

	private setVariable(name: string, value: string): void {
		if (this.widgetEl.style.getPropertyValue(name) === value) {
			return;
		}

		this.widgetEl.style.setProperty(name, value);
	}

	parametersChanged(payload: IPopupContent): void {
		if (!this.widgetEl) {
			return;
		}

		this.closeOnEsc = payload.closeOnEsc;
		this.height = payload.height;
		this.minHeight = payload.minHeight;
		this.url = payload.url ?? '';

		this.renderUrl();
		this.renderVariables();
	}

	destroy(): void {
		this.closeButton?.removeEventListener('click', this.onClickClose);
		document.removeEventListener('keydown', this.onKeyDown);
		cancelAnimationFrame(this.resizeFrame);
		this.resizeObserver?.disconnect();
		this.removeFrame();
		super.destroy();
	}
}
