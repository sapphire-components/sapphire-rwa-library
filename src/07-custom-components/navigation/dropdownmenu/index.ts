import Helpers from '@utils/helpers';
import { BaseComponent, type BaseComponentInit } from '@core/base';
import { LocalStorageKeys } from '@utils/local-storage-keys';

interface DropdownMenuInit extends BaseComponentInit {
	isOpen: boolean;
	screenName?: string;
}

export default class DropdownMenu extends BaseComponent {
	private headerEl!: HTMLElement;
	private isOpen!: boolean;
	private screenName = '';
	private itemsObserver?: MutationObserver;

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

		this.screenName = init.screenName || DropdownMenu.getCurrentScreenName();

		setTimeout(() => {
			if (this.applyActiveState()) return;

			// Items links are often loaded asynchronously (after this menu initializes),
			// so keep watching until an active link shows up.
			this.itemsObserver = new MutationObserver(() => {
				if (this.applyActiveState()) {
					this.itemsObserver?.disconnect();
					this.itemsObserver = undefined;
				}
			});
			this.itemsObserver.observe(this.widgetEl, { childList: true, subtree: true });
		}, 0);

		this.bindEvents();
	}

	/** Marks `.aspx` links for the current screen, then opens/highlights the menu if it has an `a.active`. Returns true when one was found. */
	private applyActiveState(): boolean {
		this.markTraditionalLinksActive(this.screenName);

		const activeChild = this.widgetEl.querySelector<HTMLAnchorElement>('a.active');
		if (!activeChild) return false;

		this.widgetEl.dataset.isactive = 'true';
		this.widgetEl.dataset.isopen = 'true';

		if (this.widgetEl.dataset.rootlevel === 'true') {
			requestAnimationFrame(() => {
				if (!this.isVerticallyInView(activeChild)) {
					activeChild.scrollIntoView({ block: 'center', inline: 'nearest' });
				}
			});
		}

		return true;
	}

	/**
	 * Adds `active` to links in this menu that point to the traditional (`.aspx`) version
	 * of the current screen, e.g. screen `EmergencyArticle_Screen` matches
	 * `.../EmergencyArticle_Screen.aspx` (query string and hash are ignored).
	 */
	markTraditionalLinksActive(screenName: string): void {
		if (!screenName) return;

		const target = `${screenName}.aspx`.toLowerCase();

		this.widgetEl.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
			const lastSegment = link.pathname.split('/').pop()?.toLowerCase();
			if (lastSegment === target) {
				link.classList.add('active');
			}
		});
	}

	/** Last segment of the current Reactive URL, e.g. `/App/EmergencyArticle_Screen` → `EmergencyArticle_Screen`. */
	private static getCurrentScreenName(): string {
		const lastSegment = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
		return decodeURIComponent(lastSegment);
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
		this.itemsObserver?.disconnect();
		this.itemsObserver = undefined;
		this.headerEl.removeEventListener('click', this.onClickHeader);
		this.headerEl.removeEventListener('keydown', this.onKeyDownHeader);
	}
}
