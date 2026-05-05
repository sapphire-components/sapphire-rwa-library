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

		this.bindEvents();

		this.unwrapParent();
	}

	bindEvents(): void {
		this.widgetEl.addEventListener('click', this.onTabHeaderClick);
	}

	parametersChanged(payload: TabHeaderConfigOptions): void {
		console.log(payload);
	}

	destroy() {
		this.widgetEl.removeEventListener('click', this.onTabHeaderClick);
		super.destroy();
	}

	private unwrapParent(): void {
		const parent = this.widgetEl.parentElement;
		if (!parent || !parent.parentElement) return;
		parent.replaceWith(this.widgetEl);
	}
}
