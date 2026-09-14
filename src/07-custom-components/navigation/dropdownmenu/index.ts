import Helpers from '@utils/helpers';
import { BaseComponent, type BaseComponentInit } from '@core/base';
import { LocalStorageKeys } from '@utils/local-storage-keys';

interface DropdownMenuInit extends BaseComponentInit {
	isOpen: boolean;
}

export default class DropdownMenu extends BaseComponent {
	private headerEl!: HTMLElement;
	private isOpen!: boolean;

	private readonly onClickHeader = (): void => {
		if (this.isOpen) {
			this.close();
		} else {
			this.open();
		}
	};

	private readonly onKeyDownHeader = (event: KeyboardEvent): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			this.onClickHeader();
		}
	};

	private setOpen(isOpen: boolean): void {
		if (this.isOpen === isOpen) return;

		this.isOpen = isOpen;
		this.widgetEl.dataset.isopen = isOpen ? 'true' : 'false';
		Helpers.writeToLocalStorage(LocalStorageKeys.dropdownMenu(this.runtimeId), isOpen);
	}

	open(): void {
		this.setOpen(true);
	}

	close(): void {
		this.setOpen(false);
	}

	constructor(init: DropdownMenuInit) {
		super(init);

		if (!this.widgetEl) {
			console.warn('DropdownMenu: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.isOpen = init.isOpen;
		this.headerEl = this.widgetEl.querySelector('.dropdownmenu-header') as HTMLElement;

		const isRootLevel = this.widgetEl.parentElement?.closest('.dropdownmenu') === null;
		this.widgetEl.dataset.rootlevel = isRootLevel ? 'true' : 'false';

		this.isOpen = Helpers.readFromLocalStorage<boolean>(LocalStorageKeys.dropdownMenu(this.runtimeId)) ?? false;

		if (this.isOpen) {
			this.widgetEl.dataset.isopen = 'true';
		}

		setTimeout(() => {
			const activeChild = this.widgetEl.querySelector<HTMLAnchorElement>('a.active');
			if (!activeChild) return;

			this.widgetEl.dataset.isactive = 'true';
			this.widgetEl.dataset.isopen = 'true';

			if (isRootLevel) {
				requestAnimationFrame(() => {
					if (!this.isVerticallyInView(activeChild)) {
						activeChild.scrollIntoView({ block: 'center', inline: 'nearest' });
					}
				});
			}
		}, 0);

		this.bindEvents();
	}

	private isVerticallyInView(el: HTMLElement): boolean {
		const scrollParent = el.closest<HTMLElement>('.layoutaside-body');
		const elRect = el.getBoundingClientRect();

		if (!scrollParent) {
			return elRect.top >= 0 && elRect.bottom <= window.innerHeight;
		}

		const parentRect = scrollParent.getBoundingClientRect();
		return elRect.top >= parentRect.top && elRect.bottom <= parentRect.bottom;
	}

	bindEvents(): void {
		this.headerEl.addEventListener('click', this.onClickHeader);
		this.headerEl.addEventListener('keydown', this.onKeyDownHeader);
	}

	parametersChanged(): void {}

	destroy() {
		this.headerEl.removeEventListener('click', this.onClickHeader);
		this.headerEl.removeEventListener('keydown', this.onKeyDownHeader);
	}
}
