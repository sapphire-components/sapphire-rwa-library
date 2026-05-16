import { BaseComponent, type BaseComponentInit } from '../../core/base';
import Tabs from './tabs';

interface TabHeaderConfigOptions extends BaseComponentInit {
	enabled: boolean;
	identifier: string;
}

export default class TabHeader extends BaseComponent {
	private tabsHeaderContainerEl!: HTMLDivElement;
	private tabsEL!: HTMLDivElement;
	private index!: number;

	private readonly onTabHeaderClick = (event: MouseEvent): void => {
		event.preventDefault();
		event.stopPropagation();
		Tabs.getInstance(this.tabsEL)?.setTabIndex(this.index, this.identifier);
	};

	private readonly onTabHeaderKeydown = (event: KeyboardEvent): void => {
		const tabs = Tabs.getInstance(this.tabsEL);
		const isOverflowed = this.widgetEl.classList.contains('is-overflowed');

		if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
			event.preventDefault();
			tabs?.setTabIndex(this.index, this.identifier);
			return;
		}

		if (isOverflowed) {
			if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
				event.preventDefault();
				event.stopPropagation();
				tabs?.navigateOverflowFocus(this.widgetEl, event.key === 'ArrowDown' ? 1 : -1);
			}
			return;
		}

		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		event.preventDefault();

		const headerTabs = Array.from(this.tabsHeaderContainerEl.querySelectorAll<HTMLDivElement>('.sapphire-tabheader'));
		if (headerTabs.length === 0) return;

		const currentIndex = headerTabs.indexOf(this.widgetEl as HTMLDivElement);
		const offset = event.key === 'ArrowRight' ? 1 : -1;
		const nextTab = headerTabs[(currentIndex + offset + headerTabs.length) % headerTabs.length];

		headerTabs.forEach((tab) => {
			tab.tabIndex = -1;
		});
		nextTab.tabIndex = 0;
		nextTab.focus();

		const targetIndex = Number(nextTab.dataset.index);
		if (!Number.isNaN(targetIndex)) {
			tabs?.setTabIndex(targetIndex, this.identifier);
		}
	};

	constructor(configOptions: TabHeaderConfigOptions) {
		super(configOptions);

		if (!this.widgetEl) {
			console.warn('TabHeader: root element not found for runtimeId', configOptions.runtimeId);
			return;
		}

		this.identifier = configOptions.identifier;
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
