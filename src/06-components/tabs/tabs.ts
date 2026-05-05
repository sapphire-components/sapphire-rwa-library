import Helpers from '../../09-utils/helpers';
import { BaseComponent, type BaseComponentInit } from '../../core/base';

interface TabsConfigOptions extends BaseComponentInit {
	actions: {
		OnChange: (index_in: number) => void;
	};
	activeTab: number;
	enabled: boolean;
	height: number;
	maxHeight: number;
	minHeight: number;
	theme: string;
}

export default class Tabs extends BaseComponent {
	private activeTab!: number;
	private configOptions!: TabsConfigOptions;
	private tabsHeaderButton!: HTMLDivElement;
	private tabsHeaderContainer!: HTMLDivElement;
	private tabsHeaderOverflow!: HTMLDivElement;
	private tabsHeaderItemsContainer!: HTMLDivElement;
	private tippyInstance!: TippyInstance;
	private resizeObserver!: ResizeObserver;
	private moreWidth!: number;

	constructor(configOptions: TabsConfigOptions) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('Tabs: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		this.configOptions = configOptions;
		this.activeTab = configOptions.activeTab;

		this.tabsHeaderButton = this.widgetEl.querySelector<HTMLDivElement>(`.sapphire-tabs-header-button`)!;
		this.tabsHeaderOverflow = this.widgetEl.querySelector<HTMLDivElement>(`.sapphire-tabs-header-overflow`)!;
		this.tabsHeaderContainer = this.widgetEl.querySelector<HTMLDivElement>(`.sapphire-tabs-header`)!;
		this.tabsHeaderItemsContainer = this.widgetEl.querySelector<HTMLDivElement>(`.sapphire-tabs-header-items`)!;

		this.moreWidth = this.tabsHeaderButton.offsetWidth + 8;

		this.setCSSProperties();
		this.instanciateTippy();
		this.render();

		this.resizeObserver = new ResizeObserver(() => {
			this.evaluateTabHeaderOverflow();
		});
		this.resizeObserver.observe(this.widgetEl);
	}

	setCSSProperties(): void {
		if (this.configOptions.height) {
			this.widgetEl.style.setProperty('--tabs-height', `${this.configOptions.height}px`);
		}
		if (this.configOptions.maxHeight) {
			this.widgetEl.style.setProperty('--tabs-max-height', `${this.configOptions.maxHeight}px`);
		}
		if (this.configOptions.minHeight) {
			this.widgetEl.style.setProperty('--tabs-min-height', `${this.configOptions.minHeight}px`);
		}
	}

	instanciateTippy(): void {
		this.tippyInstance = window.tippy(this.tabsHeaderButton, {
			appendTo: () => document.body,
			arrow: false,
			content: this.tabsHeaderOverflow,
			interactive: true,
			placement: 'top-end',
			trigger: 'click',
		});
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
		if (this.configOptions.theme === 'pills') {
			return;
		}

		/* reset */
		this.tabsHeaderButton.style.display = 'none';
		const overflowedItems = Array.from(this.tabsHeaderOverflow.querySelectorAll<HTMLElement>('.sapphire-tabheader'));
		for (const item of overflowedItems) {
			item.classList.remove('is-overflowed');
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
				item.classList.add('is-overflowed');
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

	setTabIndex(index_in: number): void {
		this.tippyInstance.hide();
		this.activeTab = index_in;
		this.configOptions.actions.OnChange(this.activeTab);
		this.render();
	}

	parametersChanged(payload: TabsConfigOptions): void {
		if (!Helpers.areTheyEqual(payload.activeTab, this.activeTab)) {
			this.setTabIndex(payload.activeTab);
		}
	}

	destroy() {
		this.resizeObserver.disconnect();
		super.destroy();
	}
}
