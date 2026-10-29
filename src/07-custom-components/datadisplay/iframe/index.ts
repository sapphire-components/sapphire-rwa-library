import { BaseComponent, type BaseComponentInit } from '@core/base';

interface IIframe extends BaseComponentInit {
	actions: {};
	autoHeight: boolean;
	enabled: boolean;
	height: number;
	maxHeight: number;
	minHeight: number;
	theme: string;
	url: string;
}

const FRAME_CLASS = 'iframe-frame';
const AUTO_HEIGHT_STYLE_ID = 'sapphire-iframe-autoheight';

export default class Iframe extends BaseComponent {
	private autoHeight = false;
	private contentObserver: ResizeObserver | null = null;
	private frameEl: HTMLIFrameElement | null = null;
	private height = 0;
	private maxHeight = 0;
	private minHeight = 0;
	private url = '';

	private readonly onFrameLoad = (): void => {
		if (!this.autoHeight || !this.frameEl) return;
		this.syncAutoHeight();
	};

	constructor(init: IIframe) {
		super(init);

		if (!this.widgetEl) {
			console.warn('Iframe: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.applyConfig(init);
		this.render();
	}

	parametersChanged(payload: IIframe): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) return;

		if (this.widgetEl !== liveEl) {
			this.detachFrame();
			this.widgetEl = liveEl;
		}

		this.applyConfig(payload);
		this.render();
	}

	destroy(): void {
		const frame = this.frameEl;
		this.detachFrame();
		frame?.remove();
		super.destroy();
	}

	private applyConfig(payload: Partial<IIframe>): void {
		if (payload.autoHeight !== undefined) this.autoHeight = Boolean(payload.autoHeight);
		if (payload.height !== undefined) this.height = this.readSize(payload.height);
		if (payload.maxHeight !== undefined) this.maxHeight = this.readSize(payload.maxHeight);
		if (payload.minHeight !== undefined) this.minHeight = this.readSize(payload.minHeight);
		if (payload.url !== undefined) this.url = payload.url ?? '';
	}

	private render(): void {
		const frame = this.ensureFrame();
		if (!frame) return;

		this.applyBounds(frame);
		const srcChanged = this.applyUrl(frame);

		if (!this.autoHeight) {
			this.applyFixedHeight(frame);
			return;
		}

		if (srcChanged) {
			this.disconnectContentObserver();
			this.setPx(frame, 'height', this.height);
			return;
		}

		this.syncAutoHeight();
	}

	private ensureFrame(): HTMLIFrameElement | null {
		const root = this.widgetEl;
		if (!root) return null;

		const existing = root.querySelector<HTMLIFrameElement>(`:scope > iframe.${FRAME_CLASS}`);
		if (existing && existing === this.frameEl) return existing;

		this.detachFrame();

		const frame = existing ?? document.createElement('iframe');
		frame.className = FRAME_CLASS;
		frame.addEventListener('load', this.onFrameLoad);
		if (!frame.isConnected) root.append(frame);
		this.frameEl = frame;
		return frame;
	}

	private applyBounds(frame: HTMLIFrameElement): void {
		this.setPx(frame, 'max-height', this.maxHeight);
		this.setPx(frame, 'min-height', this.minHeight);
	}

	private applyUrl(frame: HTMLIFrameElement): boolean {
		const next = this.url.trim();
		const current = frame.getAttribute('src') ?? '';
		if (current === next) return false;

		this.disconnectContentObserver();
		if (next) frame.setAttribute('src', next);
		else frame.removeAttribute('src');
		return true;
	}

	private applyFixedHeight(frame: HTMLIFrameElement): void {
		this.disconnectContentObserver();
		this.removeAutoHeightStyle();
		frame.removeAttribute('scrolling');
		this.setPx(frame, 'height', this.height);
	}

	private syncAutoHeight(): void {
		const frame = this.frameEl;
		if (!frame || !this.autoHeight || !this.url.trim()) return;

		const doc = this.contentDocument(frame);
		if (!doc?.documentElement) {
			this.setPx(frame, 'height', this.height);
			return;
		}

		this.ensureAutoHeightStyle(doc);

		const raw = this.measureContentHeight(doc);
		const next = this.clamp(raw);
		if (next > 0) this.setPx(frame, 'height', next);

		const overflows = this.maxHeight > 0 && raw > this.maxHeight;
		frame.setAttribute('scrolling', overflows ? 'auto' : 'no');
		this.observeContent(doc);
	}

	private contentDocument(frame: HTMLIFrameElement): Document | null {
		try {
			return frame.contentDocument;
		} catch {
			return null;
		}
	}

	private measureContentHeight(doc: Document): number {
		const html = doc.documentElement;
		const body = doc.body;
		return Math.ceil(Math.max(html.scrollHeight, body?.scrollHeight ?? 0, body?.offsetHeight ?? 0));
	}

	private clamp(value: number): number {
		let next = value;
		if (this.minHeight > 0) next = Math.max(next, this.minHeight);
		if (this.maxHeight > 0) next = Math.min(next, this.maxHeight);
		return next;
	}

	private ensureAutoHeightStyle(doc: Document): void {
		if (doc.getElementById(AUTO_HEIGHT_STYLE_ID)) return;

		const style = doc.createElement('style');
		style.id = AUTO_HEIGHT_STYLE_ID;
		style.textContent = 'html, body { height: auto !important; min-height: 0 !important; }';
		(doc.head ?? doc.documentElement).append(style);
	}

	private removeAutoHeightStyle(): void {
		const frame = this.frameEl;
		if (!frame) return;
		this.contentDocument(frame)?.getElementById(AUTO_HEIGHT_STYLE_ID)?.remove();
	}

	private observeContent(doc: Document): void {
		if (this.contentObserver || !doc.documentElement) return;

		this.contentObserver = new ResizeObserver(() => {
			this.syncAutoHeight();
		});
		this.contentObserver.observe(doc.documentElement);
		if (doc.body) this.contentObserver.observe(doc.body);
	}

	private disconnectContentObserver(): void {
		this.contentObserver?.disconnect();
		this.contentObserver = null;
	}

	private detachFrame(): void {
		this.disconnectContentObserver();
		this.frameEl?.removeEventListener('load', this.onFrameLoad);
		this.frameEl = null;
	}

	private setPx(el: HTMLElement, property: 'height' | 'max-height' | 'min-height', value: number): void {
		if (value > 0) el.style.setProperty(property, `${value}px`);
		else el.style.removeProperty(property);
	}

	private readSize(value: number): number {
		const size = Number(value);
		return Number.isFinite(size) && size > 0 ? size : 0;
	}
}
