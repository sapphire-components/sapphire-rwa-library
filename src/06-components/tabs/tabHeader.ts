import { BaseComponent, type BaseComponentInit } from '../../core/base';
import Tabs from './tabs';

interface TabHeaderConfigOptions extends BaseComponentInit {
	enabled: boolean;
}

export default class TabHeader extends BaseComponent {
	private tabsHeaderContainerEl!: HTMLDivElement;
	private tabsEL!: HTMLDivElement;
	private index!: number;

	private readonly onTabHeaderClick = (event: MouseEvent): void => {
		event.preventDefault();
		event.stopPropagation();
		Tabs.getInstance(this.tabsEL)?.setTabIndex(this.index);
	};

	private readonly onTabHeaderKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			Tabs.getInstance(this.tabsEL)?.setTabIndex(this.index);
			return;
		}

		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		event.preventDefault();

		const tabs = Array.from(this.tabsHeaderContainerEl.querySelectorAll<HTMLDivElement>('.sapphire-tabheader'));
		if (tabs.length === 0) return;

		const currentIndex = tabs.indexOf(this.widgetEl as HTMLDivElement);
		const offset = event.key === 'ArrowRight' ? 1 : -1;
		const nextTab = tabs[(currentIndex + offset + tabs.length) % tabs.length];

		tabs.forEach((tab) => {
			tab.tabIndex = -1;
		});
		nextTab.tabIndex = 0;
		nextTab.focus();

		const targetIndex = Number(nextTab.dataset.index);
		if (!Number.isNaN(targetIndex)) {
			Tabs.getInstance(this.tabsEL)?.setTabIndex(targetIndex);
		}
	};

	constructor(configOptions: TabHeaderConfigOptions) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('TabHeader: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		this.tabsHeaderContainerEl = this.widgetEl.closest('.sapphire-tabs-header') as HTMLDivElement;
		this.tabsEL = this.widgetEl.closest('.sapphire-tabs') as HTMLDivElement;

		const all = [...this.tabsHeaderContainerEl.querySelectorAll('.sapphire-tabheader')];
		this.index = all.indexOf(this.widgetEl);
		this.widgetEl.dataset.index = this.index.toString();

		if (this.index === 0) {
			this.widgetEl.tabIndex = 0;
		} else {
			this.widgetEl.tabIndex = -1;
		}

		this.bindEvents();

		this.unwrapParent();
	}

	bindEvents(): void {
		this.widgetEl.addEventListener('click', this.onTabHeaderClick);
		this.widgetEl.addEventListener('keydown', this.onTabHeaderKeydown);
	}

	parametersChanged(payload: TabHeaderConfigOptions): void {
		console.log(payload);
	}

	destroy() {
		this.widgetEl.removeEventListener('click', this.onTabHeaderClick);
		this.widgetEl.removeEventListener('keydown', this.onTabHeaderKeydown);
		super.destroy();
	}

	private unwrapParent(): void {
		const parent = this.widgetEl.parentElement;
		if (!parent || !parent.parentElement) return;
		parent.replaceWith(this.widgetEl);
	}
}
