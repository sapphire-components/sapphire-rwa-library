import { BaseComponent, type BaseComponentInit } from '../../core/base';
import Helpers from '../../09-utils/helpers';

interface ITippyOptions {
	allowHTML: boolean;
	appendTo: any | string;
	arrow: boolean;
	content: HTMLElement | string | null;
	delay: any | { Hide: number; Show: number };
	flip?: boolean;
	hideOnClick: boolean;
	inlinePositioning: boolean;
	interactive: boolean;
	maxWidth: any;
	offset?: [number, number];
	onClickOutside: (instance: TippyInstance, event: Event) => void;
	onCreate: (instance: TippyInstance) => void;
	onDestroy: (instance: TippyInstance) => void;
	onHidden: (instance: TippyInstance) => void;
	onHide: () => void;
	onMount: (instance: TippyInstance) => void;
	onShow: (instance: TippyInstance) => void;
	onShown: (instance: TippyInstance) => void;
	onTrigger: (instance: TippyInstance, event: Event) => void;
	onUntrigger: (instance: TippyInstance, event: Event) => void;
	placement: string;
	popperOptions: {};
	trigger: string;
}

interface IOverlayConfigOptions extends BaseComponentInit {
	actions: {
		OnHide: () => void;
		OnShow: () => void;
	};
	contentId: string;
	externalContentId: string;
	externalTriggerId: string;
	focusOnClose: boolean;
	focusOnOpen: boolean;
	height: number;
	iframeURL: string;
	maxHeight: number;
	options: ITippyOptions;
	padding: string;
	persistent: boolean;
	theme: string;
	triggerId: string;
	width: number;
}

export default class Overlay extends BaseComponent {
	private actions!: IOverlayConfigOptions['actions'];
	private bootstrapOptions: Partial<ITippyOptions> = {};
	private configOptions!: IOverlayConfigOptions;
	private focusOnClose!: boolean;
	private focusOnOpen!: boolean;
	private isClickTrigger: boolean = false;
	private padding!: string;
	private theme!: string;
	private tippyOptions!: ITippyOptions;
	private triggerElement: HTMLElement | null = null;
	private triggerId!: string;
	tippyInstance!: TippyInstance;

	private handleTriggerKeydown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') {
			return;
		}
		event.preventDefault();
		const instance = this.tippyInstance;
		if (!instance) return;
		if (instance.state.isVisible) {
			instance.hide();
		} else {
			instance.show();
			const popper = this.tippyInstance?.popper;
			if (!popper) return;
			const firstItem = popper.querySelector<HTMLElement>('[role="menuitem"], button, [href], input, [tabindex]:not([tabindex="-1"])');
			firstItem?.focus();
		}
	};

	private handleDocumentKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Escape' || event.key === 'Esc') {
			this.tippyInstance?.hide();
			return;
		}

		if (event.key !== 'Tab') return;

		const popper = this.tippyInstance?.popper;
		if (!popper) return;

		const active = document.activeElement as HTMLElement | null;
		if (!active || !popper.contains(active)) return;

		const focusables = Array.from(popper.querySelectorAll<HTMLElement>('[role="menuitem"], button, [href], input, [tabindex]:not([tabindex="-1"])'));
		if (focusables.length === 0) return;

		const first = focusables[0];
		const last = focusables[focusables.length - 1];

		if (event.shiftKey && active === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus();
		}
	};

	constructor(configOptions: IOverlayConfigOptions) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('TippyTooltip: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		this.actions = configOptions.actions;
		this.configOptions = configOptions;
		this.focusOnClose = configOptions.focusOnClose;
		this.focusOnOpen = configOptions.focusOnOpen;
		this.padding = configOptions.padding;
		this.theme = configOptions.theme;
		this.tippyOptions = configOptions.options;

		this.isClickTrigger = this.tippyOptions.trigger.includes('click');

		if (this.configOptions.externalTriggerId) {
			this.triggerId = this.configOptions.externalTriggerId;
			if (this.isClickTrigger) {
				document.getElementById(this.configOptions.externalTriggerId)!.style.cursor = 'pointer';
			}
		} else {
			this.triggerId = this.configOptions.triggerId;
		}

		let allowHTML = false;
		let contentEl: HTMLElement | string | null = null;

		if (this.configOptions.externalContentId) {
			contentEl = document.getElementById(this.configOptions.externalContentId);
		} else if (this.configOptions.iframeURL) {
			allowHTML = true;
			contentEl = `<iframe src="${this.configOptions.iframeURL}" style="display:block; border:none; width:100%;"></iframe>`;
		} else {
			contentEl = document.getElementById(this.configOptions.contentId);
		}

		if (this.configOptions.width > this.tippyOptions.maxWidth) {
			this.tippyOptions.maxWidth = this.configOptions.width;
		}

		this.bootstrapOptions = {
			allowHTML: allowHTML,
			appendTo: this.tippyOptions.appendTo === 'body' ? () => document.body : 'parent',
			arrow: this.tippyOptions.arrow,
			content: contentEl,
			delay: [this.tippyOptions.delay.Show, this.tippyOptions.delay.Hide],
			hideOnClick: this.tippyOptions.hideOnClick,
			inlinePositioning: true,
			interactive: this.tippyOptions.interactive,
			maxWidth: isNaN(Number(this.tippyOptions.maxWidth)) ? 'none' : Number(this.tippyOptions.maxWidth),
			placement: this.tippyOptions.placement,
			trigger: this.tippyOptions.trigger,
			onCreate: (_instance: TippyInstance): void => {},
			onTrigger: (_instance: TippyInstance, event: Event) => {
				event.stopPropagation();
				let placement = this.tippyOptions.placement;
				if (window.SapphireRWALibrary.State.isRTL) {
					placement = placement.replace('-start', '-TEMP').replace('-end', '-start').replace('-TEMP', '-end');
				}
				_instance.setProps({
					placement: placement,
				});
			},
			onUntrigger: (_instance: TippyInstance, event: Event) => {
				event.stopPropagation();
			},
			onShow: (_instance: TippyInstance): void => {
				const trigger = _instance.reference as HTMLElement;
				const tooltip = _instance.popper as HTMLElement;
				const triggerWidth = trigger.getBoundingClientRect().width;

				tooltip.style.setProperty('--trigger-width', `${triggerWidth}px`);

				document.addEventListener('keydown', this.handleDocumentKeydown);

				this.actions.OnShow();
			},
			onMount: (_instance: TippyInstance) => {
				const box = _instance.popper.querySelector('.tippy-box') as HTMLElement;

				box.dataset.padding = this.padding;
				box.dataset.customtheme = this.theme;

				if (this.configOptions.persistent) {
					const alreadyHasCloseButton = box.querySelector('.overlay-close');
					if (alreadyHasCloseButton) {
						return;
					}

					box.dataset.persistent = 'true';

					const closeButton = document.createElement('div');
					closeButton.className = 'overlay-close';
					closeButton.innerHTML = Helpers.placeIcon('x', 's');
					box.appendChild(closeButton);

					closeButton.addEventListener('click', (event: Event) => {
						event.stopPropagation();
						event.preventDefault();
						console.log('closeButton clicked');
						_instance.hide();
					});
				}

				if (this.configOptions.height > 0) {
					box.style.height = `${this.configOptions.height}px`;
				}

				if (this.configOptions.width > 0) {
					box.style.width = `${this.configOptions.width}px`;
				}

				if (this.configOptions.iframeURL) {
					box.insertAdjacentHTML('afterbegin', '<div class="tippytooltip-loading"><div class="lds-ring"><div></div></div>');

					Helpers.dataList(box, 'customtheme').add('light');

					const iframe = _instance.popper.querySelector('iframe') as HTMLIFrameElement;
					iframe.setAttribute('scrolling', 'no');

					let iframeHTML: HTMLDocument;
					let iframeBody: HTMLElement;

					if (this.configOptions.height > 0) {
						iframe.style.height = `${this.configOptions.height}px`;
					}

					if (this.configOptions.width > 0) {
						iframe.style.width = `${this.configOptions.width}px`;
					}

					iframe.addEventListener('load', () => {
						box.querySelector('.tippytooltip-loading')?.remove();

						iframeHTML = iframe.contentDocument as HTMLDocument;
						iframeBody = iframeHTML.body as HTMLElement;

						if (this.configOptions.theme.includes('iframe-auto-size')) {
							iframeBody.classList.add('overlay-iframe-auto-size');
						} else {
							iframeBody.classList.add('overlay-iframe');
						}

						let timeout: number | undefined;
						const mutationObserver = new MutationObserver(() => {
							clearTimeout(timeout);

							timeout = window.setTimeout(() => {
								requestAnimationFrame(() => {
									console.log('mutationObserver');

									if (this.configOptions.theme.includes('iframe-auto-size')) {
										setIframeNaturalSize();
									}

									_instance.popperInstance?.update();
								});
							}, 100);
						});

						mutationObserver.observe(iframeBody, {
							attributes: true,
							attributeFilter: ['style'],
							childList: true,
							subtree: true,
						});
					});

					const setIframeNaturalSize = () => {
						console.log('setIframeNaturalSize');
						const layout = iframeBody.querySelector('.layout');
						if (!layout) return;
						const { width, height } = layout.getBoundingClientRect();
						iframe.style.width = `${width}px`;
						iframe.style.height = `${height}px`;
					};

					_instance.popperInstance?.update();
				}
			},
			onShown: (_instance: TippyInstance) => {
				if (!this.focusOnOpen) return;
				const firstItem = _instance.popper.querySelector<HTMLElement>('[role="menuitem"], button, [href], input, [tabindex]:not([tabindex="-1"])');
				firstItem?.focus();
			},
			onClickOutside: (_instance: TippyInstance, _event: Event) => {},
			onHide: () => {
				if (this.isClickTrigger) {
					document.removeEventListener('keydown', this.handleDocumentKeydown);
				}
				this.actions.OnHide();
			},
			onHidden: (_instance: TippyInstance) => {
				if (!this.focusOnClose) return;
				const trigger = _instance.reference as HTMLElement;
				trigger.focus();
			},
			onDestroy: (_instance: TippyInstance) => {},
		};

		if (!this.tippyOptions.flip) {
			this.bootstrapOptions.popperOptions = {
				modifiers: [
					{
						name: 'flip',
						enabled: false,
					},
				],
			};
		}

		const triggerElement = document.getElementById(this.triggerId);
		if (triggerElement) {
			triggerElement.classList.add('tippytooltip-trigger');
			triggerElement.tabIndex = 0;
			if (this.isClickTrigger) {
				triggerElement.addEventListener('keydown', this.handleTriggerKeydown);
			}
		}
		this.triggerElement = triggerElement;

		if (this.configOptions.persistent) {
			this.bootstrapOptions.interactive = true;
			this.bootstrapOptions.hideOnClick = false;
		}

		if (!this.theme.includes('disable-init')) {
			this.initializeTippy();
		}
	}

	initializeTippy(): void {
		this.tippyInstance = window.tippy(this.triggerElement, this.bootstrapOptions);
	}

	parametersChanged(payload: IOverlayConfigOptions): void {
		console.log(payload);
	}

	destroy() {
		if (this.isClickTrigger) {
			this.triggerElement?.removeEventListener('keydown', this.handleTriggerKeydown);
			document.removeEventListener('keydown', this.handleDocumentKeydown);
		}
		this.tippyInstance?.destroy?.();
	}
}
