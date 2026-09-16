import Helpers from '@utils/helpers';
import Overlay from '@/07-custom-components/overlay/overlay';
import { BaseComponent, type BaseComponentInit } from '@core/base';

interface TabsConfigOptions extends BaseComponentInit {
	actions: {
		OnChange: (tabIndex_in: number, tabIdentifier_in: string) => void;
	};
	activeTab: number;
	bottomDistance: number;
	enabled: boolean;
	hasScroll: boolean;
	height: number;
	isFullHeight: boolean;
	maxHeight: number;
	minHeight: number;
	theme: string;
}

export default class Tabs extends BaseComponent {
	private activeTab!: number;
	private configOptions!: TabsConfigOptions;
	private moreWidth!: number;
	private resizeObserver!: ResizeObserver;
	private tabsContentContainer!: HTMLDivElement;
	private tabsHeaderButton!: HTMLDivElement;
	private tabsHeaderContainer!: HTMLDivElement;
	private tabsHeaderItemsContainer!: HTMLDivElement;
	private tabsHeaderOverflow!: HTMLDivElement;
	private tippyTooltipEl!: HTMLDivElement;

	constructor(configOptions: TabsConfigOptions) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('Tabs: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		this.configOptions = configOptions;
		this.activeTab = configOptions.activeTab;

		this.tabsContentContainer = this.widgetEl.querySelector<HTMLDivElement>(`.sapphire-tabs-content`)!;
		this.tabsHeaderButton = this.widgetEl.querySelector<HTMLDivElement>(`.sapphire-tabs-header-button`)!;
		this.tabsHeaderContainer = this.widgetEl.querySelector<HTMLDivElement>(`.sapphire-tabs-header`)!;
		this.tabsHeaderItemsContainer = this.widgetEl.querySelector<HTMLDivElement>(`.sapphire-tabs-header-items`)!;
		this.tabsHeaderOverflow = this.widgetEl.querySelector<HTMLDivElement>(`.sapphire-tabs-header-overflow`)!;
		this.tippyTooltipEl = this.tabsHeaderContainer.querySelector<HTMLDivElement>(`.overlay`)!;

		this.moreWidth = this.tabsHeaderButton.offsetWidth + 8;

		this.setCSSProperties();
		this.reflectStateAttributes();

		Overlay.getInstance(this.tippyTooltipEl)?.initializeTippy();

		this.render();
		this.setTabsContentTop();

		this.resizeObserver = new ResizeObserver(() => {
			this.evaluateTabHeaderOverflow();
			this.setTabsContentTop();
		});
		this.resizeObserver.observe(this.widgetEl);
		this.observeLayoutResize(() => {
			this.setTabsContentTop();
		});
	}

	setCSSProperties(): void {
		if (this.configOptions.height) {
			this.widgetEl.style.height = `${this.configOptions.height}px`;
		} else {
			this.widgetEl.style.height = '';
		}
		if (this.configOptions.maxHeight) {
			this.widgetEl.style.maxHeight = `${this.configOptions.maxHeight}px`;
		} else {
			this.widgetEl.style.maxHeight = '';
		}
		if (this.configOptions.minHeight) {
			this.widgetEl.style.minHeight = `${this.configOptions.minHeight}px`;
		} else {
			this.widgetEl.style.minHeight = '';
		}

		this.widgetEl.style.setProperty('--tabs-bottom-distance', `${this.configOptions.bottomDistance || 0}px`);
	}

	reflectStateAttributes(): void {
		this.widgetEl.dataset.enabled = this.configOptions.enabled ? 'true' : 'false';
		this.widgetEl.dataset.hasscroll = this.configOptions.hasScroll ? 'true' : 'false';
		this.widgetEl.dataset.isfullheight = this.configOptions.isFullHeight ? 'true' : 'false';
	}

	setTabsContentTop(): void {
		if (!this.tabsContentContainer) return;

		if (!this.configOptions.isFullHeight) {
			this.widgetEl.style.removeProperty('--tabs-content-top');
			return;
		}

		const top = Math.max(0, Math.round(this.tabsContentContainer.getBoundingClientRect().top));
		const next = `${top}px`;
		if (this.widgetEl.style.getPropertyValue('--tabs-content-top') !== next) {
			this.widgetEl.style.setProperty('--tabs-content-top', next);
		}
	}

	render(): void {
		this.widgetEl.dataset.activetab = this.activeTab.toString();
		this.evaluateTabHeaderStatus();
		this.evaluateTabHeaderOverflow();
		this.evaluateTabContent();
	}

	evaluateTabHeaderStatus(): void {
		const allTabsHeadersArray = Array.from(this.tabsHeaderContainer.querySelectorAll<HTMLDivElement>(`.sapphire-tabheader`));

		allTabsHeadersArray.forEach((item: HTMLElement, index: number) => {
			if (index === this.activeTab) {
				item.dataset.active = 'true';
			} else {
				item.dataset.active = 'false';
			}
		});
	}

	evaluateTabHeaderOverflow(): void {
		if (this.configOptions.theme.includes('pills')) {
			this.tabsHeaderButton.remove();
			return;
		}

		/* reset */
		this.tabsHeaderButton.style.display = 'none';
		const overflowedItems = Array.from(this.tabsHeaderOverflow.querySelectorAll<HTMLElement>('.sapphire-tabheader'));
		for (const item of overflowedItems) {
			item.classList.remove('is-overflowed', 'overlay-item');
			this.tabsHeaderItemsContainer.appendChild(item);
		}

		/* evaluate */
		const allTabsHeadersArray = Array.from(this.tabsHeaderContainer.querySelectorAll<HTMLDivElement>(`.sapphire-tabheader`));
		const availableWidth = this.tabsHeaderContainer.clientWidth;
		const maxWidth = availableWidth - this.moreWidth;

		let usedWidth = 0;
		const visibleItems: HTMLElement[] = [];
		const overflowItems: HTMLElement[] = [];

		allTabsHeadersArray.forEach((item: HTMLElement) => {
			const itemWidth = item.offsetWidth;

			if (usedWidth + itemWidth <= maxWidth && overflowItems.length === 0) {
				usedWidth += itemWidth;
				visibleItems.push(item);
			} else {
				overflowItems.push(item);
			}
		});

		if (overflowItems.length > 0) {
			this.tabsHeaderButton.style.display = 'flex';
			overflowItems.forEach((item) => {
				item.classList.add('is-overflowed', 'overlay-item');
				item.tabIndex = 0;

				const myIndex = Number(item.dataset.index);
				if (myIndex === this.activeTab) {
					item.dataset.active = 'true';
				} else {
					item.dataset.active = 'false';
				}

				this.tabsHeaderOverflow.appendChild(item);
			});
		}

		if (this.activeTab >= visibleItems.length) {
			this.tabsHeaderButton.classList.add('is-active');
		} else {
			this.tabsHeaderButton.classList.remove('is-active');
		}
	}

	evaluateTabContent(): void {
		const allTabContents = this.widgetEl.querySelectorAll<HTMLDivElement>(`.sapphire-tabcontent`);
		allTabContents.forEach((tabContent: HTMLDivElement, index: number) => {
			if (index === this.activeTab) {
				tabContent.dataset.active = 'true';
			} else {
				tabContent.dataset.active = 'false';
			}
		});
	}

	setTabIndex(tabIndex_in: number, tabIdentifier_in: string): void {
		this.activeTab = tabIndex_in;
		Overlay.getInstance(this.tippyTooltipEl)?.tippyInstance.hide();

		this.configOptions.actions.OnChange(this.activeTab, tabIdentifier_in);
		this.render();
	}

	navigateOverflowFocus(currentItem: HTMLElement, offset: number): void {
		const items = Array.from(this.tabsHeaderOverflow.querySelectorAll<HTMLDivElement>('.sapphire-tabheader'));
		if (items.length === 0) return;

		const currentIndex = items.indexOf(currentItem as HTMLDivElement);
		if (currentIndex === -1) return;

		const next = items[(currentIndex + offset + items.length) % items.length];

		items.forEach((item) => {
			item.tabIndex = -1;
		});
		next.tabIndex = 0;
		next.focus();
	}

	parametersChanged(payload: TabsConfigOptions): void {
		if (!this.widgetEl) return;

		if (!Helpers.areTheyEqual(payload.activeTab, this.activeTab)) {
			this.setTabIndex(payload.activeTab, '');
		}

		const cssChanged =
			!Helpers.areTheyEqual(payload.bottomDistance, this.configOptions.bottomDistance) ||
			!Helpers.areTheyEqual(payload.height, this.configOptions.height) ||
			!Helpers.areTheyEqual(payload.maxHeight, this.configOptions.maxHeight) ||
			!Helpers.areTheyEqual(payload.minHeight, this.configOptions.minHeight);

		const attrsChanged =
			!Helpers.areTheyEqual(payload.enabled, this.configOptions.enabled) ||
			!Helpers.areTheyEqual(payload.hasScroll, this.configOptions.hasScroll) ||
			!Helpers.areTheyEqual(payload.isFullHeight, this.configOptions.isFullHeight);

		const themeChanged = !Helpers.areTheyEqual(payload.theme, this.configOptions.theme);

		this.configOptions = { ...this.configOptions, ...payload };

		if (cssChanged) {
			this.setCSSProperties();
		}
		if (attrsChanged) {
			this.reflectStateAttributes();
		}
		if (themeChanged) {
			this.evaluateTabHeaderOverflow();
		}

		this.setTabsContentTop();
	}

	destroy() {
		this.resizeObserver.disconnect();
		super.destroy();
	}
}
