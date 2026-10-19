import Helpers from '@utils/helpers';
import { BaseComponent, type BaseComponentInit } from '@core/base';
import { LocalStorageKeys } from '@utils/local-storage-keys';

interface LayoutWrapperInit extends BaseComponentInit {
	theme: string;
	density: string;
}

export default class LayoutWrapper extends BaseComponent {
	private auxiliarOverlayObserver?: ResizeObserver;
	private auxiliarOverlaySkip = false;
	private documentationCloseEl: HTMLButtonElement | null = null;
	private layoutWrapperEl: HTMLDivElement | null;

	private onDocumentationCloseClick = (): void => {
		Helpers.writeToLocalStorage(LocalStorageKeys.showDocumentation, false);
		document.body.dataset.showdocumentation = 'false';
		this.syncDesignSystemAuxiliarOverlay();
	};

	constructor(configOptions: LayoutWrapperInit) {
		super(configOptions);

		this.layoutWrapperEl = document.querySelector<HTMLDivElement>('.layoutwrapper');

		if (!this.layoutWrapperEl) {
			return;
		}

		this.applyStoredDocumentationVisibility();
		this.bindDocumentationClose();
		this.bindDesignSystemAuxiliarOverlay();
	}

	private isDocumentationLayout(wrapper: HTMLElement): boolean {
		return wrapper.classList.contains('designsystem') || wrapper.hasAttribute('data-documentationwidth');
	}

	private applyStoredDocumentationVisibility(): void {
		const wrapper = this.layoutWrapperEl;
		if (!wrapper || !this.isDocumentationLayout(wrapper)) {
			return;
		}

		if (Helpers.readFromLocalStorage<boolean>(LocalStorageKeys.showDocumentation) === false) {
			document.body.dataset.showdocumentation = 'false';
		}
	}

	private bindDocumentationClose(): void {
		const wrapper = this.layoutWrapperEl;
		if (!wrapper || !this.isDocumentationLayout(wrapper)) {
			return;
		}

		const auxiliar = wrapper.querySelector<HTMLElement>('.layoutwrapper-body-auxiliar');
		if (!auxiliar) {
			return;
		}

		let button = auxiliar.querySelector<HTMLButtonElement>(':scope > .layoutwrapper-body-auxiliar-close');
		if (!button) {
			button = document.createElement('button');
			button.type = 'button';
			button.className = 'btn btn-icon btn-xsmall btn-tertiary layoutwrapper-body-auxiliar-close';
			button.setAttribute('aria-label', 'Close documentation');
			button.innerHTML = Helpers.placeIcon('x', 's');
			button.querySelector('.svg-icon')?.setAttribute('aria-hidden', 'true');
			auxiliar.prepend(button);
		}

		this.documentationCloseEl = button;
		button.addEventListener('click', this.onDocumentationCloseClick);
	}

	private bindDesignSystemAuxiliarOverlay(): void {
		const wrapper = this.layoutWrapperEl;
		if (!wrapper?.classList.contains('designsystem')) {
			return;
		}

		this.auxiliarOverlayObserver = new ResizeObserver(() => {
			if (this.auxiliarOverlaySkip) {
				return;
			}
			this.syncDesignSystemAuxiliarOverlay();
		});
		this.auxiliarOverlayObserver.observe(document.documentElement);
		this.auxiliarOverlayObserver.observe(wrapper);

		const body = wrapper.querySelector<HTMLElement>('.layoutwrapper-body');
		const content = wrapper.querySelector<HTMLElement>('.layoutwrapper-body-content');
		const auxiliar = wrapper.querySelector<HTMLElement>('.layoutwrapper-body-auxiliar');
		if (body) {
			this.auxiliarOverlayObserver.observe(body);
		}
		if (content) {
			this.auxiliarOverlayObserver.observe(content);
		}
		if (auxiliar) {
			this.auxiliarOverlayObserver.observe(auxiliar);
		}

		this.syncDesignSystemAuxiliarOverlay();
	}

	private syncDesignSystemAuxiliarOverlay = (): void => {
		const wrapper = this.layoutWrapperEl;
		if (!wrapper?.classList.contains('designsystem')) {
			return;
		}

		const auxiliar = wrapper.querySelector<HTMLElement>('.layoutwrapper-body-auxiliar');
		if (!auxiliar || getComputedStyle(auxiliar).display === 'none') {
			delete wrapper.dataset.auxiliaroverlay;
			return;
		}

		const wasOverlay = wrapper.dataset.auxiliaroverlay === 'true';
		if (wasOverlay) {
			delete wrapper.dataset.auxiliaroverlay;
		}

		const overflows = auxiliar.getBoundingClientRect().right > document.documentElement.clientWidth + 1;
		if (overflows) {
			wrapper.dataset.auxiliaroverlay = 'true';
		}

		if (wasOverlay || overflows) {
			this.auxiliarOverlaySkip = true;
			requestAnimationFrame(() => {
				this.auxiliarOverlaySkip = false;
			});
		}
	};

	destroy(): void {
		this.documentationCloseEl?.removeEventListener('click', this.onDocumentationCloseClick);
		this.auxiliarOverlayObserver?.disconnect();
		super.destroy();
	}
}
