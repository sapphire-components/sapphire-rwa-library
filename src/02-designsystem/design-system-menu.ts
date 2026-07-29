import { BaseComponent, type BaseComponentInit } from '@core/base';

interface IDesignSystemMenu extends BaseComponentInit {}

const SCROLL_STATE_KEY = 'designSystemMenuScrollTop';

export default class DesignSystemMenu extends BaseComponent {
	private collapseEl: HTMLDivElement | null = null;
	private expandEl: HTMLDivElement | null = null;
	private filterInputEl: HTMLInputElement | null = null;
	private scrollContainerEl: HTMLElement | null = null;

	private readonly onExpandClick = (): void => {
		this.expandAll();
	};

	private readonly onCollapseClick = (): void => {
		this.collapseAll();
	};

	private readonly onExpandKeyDown = (event: KeyboardEvent): void => {
		if (!this.isActionKey(event)) return;
		event.preventDefault();
		this.expandAll();
	};

	private readonly onCollapseKeyDown = (event: KeyboardEvent): void => {
		if (!this.isActionKey(event)) return;
		event.preventDefault();
		this.collapseAll();
	};

	private readonly onLinkClick = (event: MouseEvent): void => {
		const target = event.target as HTMLElement | null;
		if (!target?.closest('a[data-link]')) return;
		this.storeScrollPosition();
	};

	constructor(init: IDesignSystemMenu) {
		super(init);

		this.expandEl = document.querySelector('.design-system-menu-expand');
		this.collapseEl = document.querySelector('.design-system-menu-collapse');
		this.filterInputEl = document.querySelector('.form-control');
		this.scrollContainerEl = this.widgetEl.querySelector('.layoutaside-body');

		this.bindEvents();
		this.restoreScrollPosition();
	}

	private isActionKey(event: KeyboardEvent): boolean {
		return event.key === 'Enter' || event.key === ' ';
	}

	private setInteractiveElement(element: HTMLElement | null): void {
		if (!element) return;
		if (element.tabIndex < 0) {
			element.tabIndex = 0;
		}
		if (!element.getAttribute('role')) {
			element.setAttribute('role', 'button');
		}
	}

	filterLinks(): void {
		const filterValue = this.filterInputEl?.value.trim().toLowerCase() ?? '';
		const linkElements = this.widgetEl.querySelectorAll<HTMLAnchorElement>('.layoutaside-body a[data-link]');

		if (filterValue.length < 2) {
			linkElements.forEach((linkEl) => {
				linkEl.style.display = 'block';
				linkEl.style.color = '';
				linkEl.style.backgroundColor = '';
			});
			return;
		}

		linkElements.forEach((linkEl) => {
			const linkText = linkEl.textContent?.trim().toLowerCase() ?? '';
			const linkHref = linkEl.getAttribute('href')?.trim().toLowerCase() ?? '';
			const isMatch = linkText.includes(filterValue) || linkHref.includes(filterValue);

			linkEl.style.display = isMatch ? 'block' : 'none';
			linkEl.style.color = isMatch ? 'var(--color-neutral-10)' : '';
			linkEl.style.backgroundColor = isMatch ? 'var(--color-success-light)' : '';

			if (!isMatch) return;

			let parentDropdown = linkEl.closest<HTMLElement>('.dropdownmenu');
			while (parentDropdown) {
				parentDropdown.style.display = 'block';
				window.SapphireRWALibrary.DropdownMenu.getInstance(parentDropdown)?.open();
				parentDropdown = parentDropdown.parentElement?.closest<HTMLElement>('.dropdownmenu') ?? null;
			}
		});
	}

	bindEvents(): void {
		this.setInteractiveElement(this.expandEl);
		this.setInteractiveElement(this.collapseEl);

		this.expandEl?.addEventListener('click', this.onExpandClick);
		this.expandEl?.addEventListener('keydown', this.onExpandKeyDown);
		this.collapseEl?.addEventListener('click', this.onCollapseClick);
		this.collapseEl?.addEventListener('keydown', this.onCollapseKeyDown);
		this.scrollContainerEl?.addEventListener('click', this.onLinkClick);
	}

	private storeScrollPosition(): void {
		if (!this.scrollContainerEl) return;
		window.SapphireRWALibrary.State[SCROLL_STATE_KEY] = this.scrollContainerEl.scrollTop;
	}

	private restoreScrollPosition(): void {
		const scrollTop = window.SapphireRWALibrary.State[SCROLL_STATE_KEY];
		if (typeof scrollTop !== 'number' || !this.scrollContainerEl) return;

		requestAnimationFrame(() => {
			if (this.scrollContainerEl) {
				this.scrollContainerEl.scrollTop = scrollTop;
			}
		});
	}

	expandAll(): void {
		this.widgetEl.querySelectorAll('.dropdownmenu').forEach((item) => {
			window.SapphireRWALibrary.DropdownMenu.getInstance(item as HTMLElement)?.open();
		});
	}

	collapseAll(): void {
		this.widgetEl.querySelectorAll('.dropdownmenu').forEach((item) => {
			window.SapphireRWALibrary.DropdownMenu.getInstance(item as HTMLElement)?.close();
		});
	}

	destroy() {
		this.expandEl?.removeEventListener('click', this.onExpandClick);
		this.expandEl?.removeEventListener('keydown', this.onExpandKeyDown);
		this.collapseEl?.removeEventListener('click', this.onCollapseClick);
		this.collapseEl?.removeEventListener('keydown', this.onCollapseKeyDown);
		this.scrollContainerEl?.removeEventListener('click', this.onLinkClick);
		super.destroy();
	}
}
