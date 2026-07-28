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
			if (this.checkAnyActiveChild()) {
				this.widgetEl.dataset.isactive = 'true';
				this.widgetEl.dataset.isopen = 'true';
			}
		}, 0);

		this.bindEvents();
	}

	bindEvents(): void {
		this.headerEl.addEventListener('click', this.onClickHeader);
		this.headerEl.addEventListener('keydown', this.onKeyDownHeader);
	}

	checkAnyActiveChild(): boolean {
		return !!this.widgetEl.querySelector('a.active');
	}

	parametersChanged(): void {}

	destroy() {
		this.headerEl.removeEventListener('click', this.onClickHeader);
		this.headerEl.removeEventListener('keydown', this.onKeyDownHeader);
	}
}
