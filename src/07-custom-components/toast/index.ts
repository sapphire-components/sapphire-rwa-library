import Helpers from '@utils/helpers';
import { tmplToastMessage } from './templates';

export interface IToastMessage {
	body: string;
	hasClose: boolean;
	id: number;
	timeToLive: number;
	title: string;
	type: string;
}

export default class Toast {
	private elCloseAll: HTMLButtonElement | null = null;
	private elToastContainer: HTMLElement | null = null;
	private list: IToastMessage[] = [];
	private nextId = 0;

	constructor() {}

	createToastNotification(message: IToastMessage): void {
		message.id = ++this.nextId;

		if (message.type === 'Entities.Alert.Info') {
			message.type = 'alert-info';
		}

		this.list.push(message);
		this.addToastMessage(message);
	}

	clearToastNotifications(): void {
		this.list = [];
		this.elToastContainer?.remove();
		this.elToastContainer = null;
		this.elCloseAll = null;
	}

	addToastMessage(message: IToastMessage): void {
		if (!this.elToastContainer) {
			this.elToastContainer = document.createElement('div');
			this.elToastContainer.className = 'toast';
			document.getElementById('transitionContainer')?.prepend(this.elToastContainer);
			this.ensureCloseAllButton();
		}

		let fragment = tmplToastMessage.content.cloneNode(true) as HTMLElement;
		let toastMessage = fragment.querySelector('.toast-notification') as HTMLElement;
		let toastMessageTitle = fragment.querySelector('.toast-notification-content-text-title') as HTMLElement;
		let toastMessageBody = fragment.querySelector('.toast-notification-content-text-body') as HTMLElement;
		let toastMessageClose = fragment.querySelector('.toast-notification-content-close') as HTMLElement;

		toastMessage.setAttribute('data-id', String(message.id));
		toastMessage.setAttribute('data-type', message.type);
		toastMessage.style.setProperty('--time-to-live', `${message.timeToLive}s`);
		toastMessageTitle.innerText = message.title || '';
		toastMessageBody.innerHTML = message.body;

		if (message.hasClose) {
			toastMessage.classList.add('has-close');
			toastMessageClose.innerHTML = Helpers.placeIcon('x');
		}

		// Icon
		let toastMessageIcon = toastMessage.querySelector('.toast-notification-content-icon') as HTMLElement;

		switch (message.type) {
			case 'alert-error':
				toastMessageIcon.innerHTML = Helpers.placeIcon('warning-octagon', 'm');
				break;
			case 'alert-info':
				toastMessageIcon.innerHTML = Helpers.placeIcon('info', 'm');
				break;
			case 'alert-success':
				toastMessageIcon.innerHTML = Helpers.placeIcon('check-circle-bold', 'm');
				break;
			case 'alert-warning':
				toastMessageIcon.innerHTML = Helpers.placeIcon('warning', 'm');
				break;
			default:
				toastMessageIcon.innerHTML = Helpers.placeIcon('info', 'm');
				break;
		}

		this.elToastContainer.prepend(toastMessage);
		this.updateCloseAllVisibility();

		toastMessage.addEventListener('click', () => {
			this.dismissToastElement(toastMessage);
		});

		toastMessage.addEventListener('animationend', (animation: AnimationEvent) => {
			switch (animation.animationName) {
				case 'toast-destruction':
					toastMessage.remove();
					const position = this.list.indexOf(message);
					if (position > -1) {
						this.list.splice(position, 1);
					}
					if (this.list.length === 0) {
						this.elToastContainer?.remove();
						this.elToastContainer = null;
						this.elCloseAll = null;
					} else {
						this.updateCloseAllVisibility();
					}
					break;
				case 'toast-progress':
					if (message.timeToLive > 0) {
						this.dismissToastElement(toastMessage);
					}
					break;
			}
		});
	}

	removeToastMessage(id: number): void {
		this.elToastContainer?.querySelectorAll(`.toast-notification[data-id="${id}"]`).forEach((el) => {
			this.dismissToastElement(el);
		});
	}

	private closeAllToastMessages(): void {
		this.elToastContainer?.querySelectorAll('.toast-notification:not(.is-removing)').forEach((el) => {
			this.dismissToastElement(el);
		});
	}

	private dismissToastElement(el: Element): void {
		el.classList.add('is-removing');
		this.updateCloseAllVisibility();
	}

	private ensureCloseAllButton(): void {
		if (!this.elToastContainer || this.elCloseAll) {
			return;
		}

		this.elCloseAll = document.createElement('button');
		this.elCloseAll.type = 'button';
		this.elCloseAll.className = 'btn btn-xsmall toast-close-all';
		this.elCloseAll.textContent = 'Close all';
		this.elCloseAll.hidden = true;
		this.elCloseAll.addEventListener('click', (event: Event) => {
			event.stopPropagation();
			this.closeAllToastMessages();
		});
		this.elToastContainer.append(this.elCloseAll);
	}

	private updateCloseAllVisibility(): void {
		if (!this.elCloseAll) {
			return;
		}

		const visibleCount = this.elToastContainer?.querySelectorAll('.toast-notification:not(.is-removing)').length ?? 0;
		this.elCloseAll.hidden = visibleCount < 2;
	}
}
