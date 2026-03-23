import { BaseComponent, type BaseComponentInit } from '../../core/base';
import Helpers from '../../09-utils/helpers';

interface DropdownMenuInit extends BaseComponentInit {
	actions: {
		SetIsOpen: (isOpen: boolean) => void;
	};
	isOpen: boolean;
}

export default class DropdownMenu extends BaseComponent {
	private actions!: DropdownMenuInit['actions'];
	private mutationObserver?: MutationObserver;

	constructor(init: DropdownMenuInit) {
		super(init);

		if (!this.widgetEl) {
			console.warn('DropdownMenu: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.actions = init.actions;

		const isRootLevel = this.widgetEl.parentElement?.closest('.dropdownmenu') === null;
		this.widgetEl.dataset.rootlevel = isRootLevel ? 'true' : 'false';

		this.mutationObserver = new MutationObserver(() => {
			const isOpen = this.widgetEl.getAttribute('data-isopen') === 'true';
			Helpers.writeToLocalStorage(`dropdownmenu-${this.runtimeId}`, isOpen);
		});

		this.mutationObserver.observe(this.widgetEl, {
			attributes: true,
			attributeFilter: ['data-isopen', 'class'],
			childList: true,
			subtree: true,
		});

		const isOpen = Helpers.readFromLocalStorage<boolean>(`dropdownmenu-${this.runtimeId}`);
		if (isOpen) {
			this.widgetEl.setAttribute('data-isopen', 'true');
			this.actions.SetIsOpen(true);
		}

		setTimeout(() => {
			if (this.checkAnyActiveChild()) {
				this.widgetEl.setAttribute('data-isactive', 'true');
				this.widgetEl.setAttribute('data-isopen', 'true');
				this.actions.SetIsOpen(true);
			}
		}, 0);
	}

	checkAnyActiveChild(): boolean {
		return !!this.widgetEl.querySelector('a.active');
	}

	parametersChanged(payload: DropdownMenuInit): void {
		console.log(payload);
	}

	destroy() {
		this.mutationObserver?.disconnect();
		this.mutationObserver = undefined;
	}
}
