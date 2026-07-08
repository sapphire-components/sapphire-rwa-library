import Helpers from '../../09-utils/helpers';
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
	private elToastContainer: HTMLElement | null = null;
	private list: IToastMessage[] = [];

	constructor() {}

	createToastNotification(message: IToastMessage): void {
		message.id = +new Date();

		if (message.type === 'Entities.Alert.Info') {
			message.type = 'alert-info';
		}

		this.list.push(message);
		this.addToastMessage(message);
	}

	clearToastNotifications(): void {
		this.list = [];
		this.elToastContainer?.remove();
	}

	addToastMessage(message: IToastMessage): void {
		if (!this.elToastContainer) {
			this.elToastContainer = document.createElement('div');
			this.elToastContainer.className = 'toast';
			document.getElementById('transitionContainer')?.prepend(this.elToastContainer);
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

		toastMessage.addEventListener('click', () => {
			this.removeToastMessage(message.id);
		});

		toastMessage.addEventListener('animationend', (animation: AnimationEvent) => {
			switch (animation.animationName) {
				case 'toast-destruction':
					const toastId = Number(toastMessage.dataset.id);
					toastMessage.remove();
					const position = this.list.findIndex((message: IToastMessage) => message.id === toastId);
					if (position > -1) {
						this.list.splice(position, 1);
					}
					if (this.list.length === 0) {
						this.elToastContainer?.remove();
						this.elToastContainer = null;
					}
					break;
				case 'toast-progress':
					if (message.timeToLive > 0) {
						toastMessage?.classList.add('is-removing');
					}
					break;
			}
		});
	}

	removeToastMessage(id: number): void {
		const elToRemove = document.querySelector(`.toast-notification[data-id="${id}"]`);
		elToRemove?.classList.add('is-removing');
	}
}
