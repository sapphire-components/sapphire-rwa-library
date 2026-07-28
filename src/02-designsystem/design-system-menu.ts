import { BaseComponent, type BaseComponentInit } from '@core/base';

interface IDesignSystemMenu extends BaseComponentInit {}

export default class DesignSystemMenu extends BaseComponent {
	private collapseEl: HTMLDivElement | null = null;
	private expandEl: HTMLDivElement | null = null;
	private filterInputEl: HTMLInputElement | null = null;

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

	private readonly onFilterInput = (): void => {
		this.filterLinks();
	};

	constructor(init: IDesignSystemMenu) {
		super(init);

		this.expandEl = document.querySelector('.design-system-menu-expand');
		this.collapseEl = document.querySelector('.design-system-menu-collapse');
		this.filterInputEl = document.querySelector('.form-control.input-xsmall');

		this.bindEvents();
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

	private filterLinks(): void {
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
		this.filterInputEl?.addEventListener('input', this.onFilterInput);
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
		this.filterInputEl?.removeEventListener('input', this.onFilterInput);
		super.destroy();
	}
}
