import Locale, { type MessageKey } from '@/03-core/locale';
import { BaseComponent, type BaseComponentInit } from '@core/base';
import { hour12 as clockHour12, parseTime, periodOf } from '@custom-components/datetime/hourpicker/time';

interface IWhoWhenWhereLog extends BaseComponentInit {
	action: MessageKey;
	date: Date; // YYYY-MM-DD
	hour12: boolean;
	locale: string;
	location: string;
	onBehalfOf: string;
	specialty: string;
	time: string; // HH:MM
	who: string;
}

function populated(value: string | undefined): string {
	return typeof value === 'string' ? value.trim() : '';
}

function formatDate(value: Date | null | undefined): string {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';

	const year = value.getUTCFullYear();
	const month = String(value.getUTCMonth() + 1).padStart(2, '0');
	const day = String(value.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function formatTime(value: string, useHour12: boolean): string {
	const parsed = parseTime(value);
	if (!parsed) return value;

	const minutes = String(parsed.minutes).padStart(2, '0');
	if (!useHour12) {
		return `${String(parsed.hours).padStart(2, '0')}:${minutes}`;
	}

	return `${clockHour12(parsed.hours)}:${minutes} ${periodOf(parsed.hours).toUpperCase()}`;
}

export default class WhoWhenWhereLog extends BaseComponent {
	#action: MessageKey | '' = '';
	#date = '';
	#hour12 = false;
	#locale = '';
	#location = '';
	#onBehalfOf = '';
	#specialty = '';
	#time = '';
	#who = '';

	constructor(init: IWhoWhenWhereLog) {
		super(init);

		if (!this.widgetEl) {
			console.warn('WhoWheWhereLog: root element not found for runtimeId', init.runtimeId);
			return;
		}

		console.log(init);

		this.applyConfig(init);
		this.render();
	}

	parametersChanged(payload: IWhoWhenWhereLog): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) return;

		if (this.widgetEl !== liveEl) {
			this.widgetEl = liveEl;
		}

		this.applyConfig(payload);
		this.render();
	}

	destroy() {
		this.widgetEl?.replaceChildren();
		super.destroy();
	}

	private applyConfig(payload: Partial<IWhoWhenWhereLog>): void {
		if (payload.action !== undefined) this.#action = populated(payload.action) as MessageKey;
		if (payload.date !== undefined) this.#date = formatDate(payload.date);
		if (payload.hour12 !== undefined) this.#hour12 = payload.hour12 === true;
		if (payload.locale !== undefined) this.#locale = populated(payload.locale);
		if (payload.time !== undefined) this.#time = populated(payload.time);
		if (payload.who !== undefined) this.#who = populated(payload.who);
		if (payload.specialty !== undefined) this.#specialty = populated(payload.specialty);
		if (payload.location !== undefined) this.#location = populated(payload.location);
		if (payload.onBehalfOf !== undefined) this.#onBehalfOf = populated(payload.onBehalfOf);
	}

	private render(): void {
		if (!this.widgetEl) return;

		this.widgetEl.classList.add('whowhewherelog');
		this.widgetEl.textContent = this.sentence();
	}

	private sentence(): string {
		const parts: string[] = [];

		if (this.#action) parts.push(this.text(this.#action));
		if (this.#date) parts.push(this.text('on'), this.#date);
		if (this.#time) parts.push(this.text('at'), formatTime(this.#time, this.#hour12));
		if (this.#who) parts.push(this.text('by'), this.#who);
		if (this.#specialty) parts.push(this.text('from'), this.#specialty);
		if (this.#location) parts.push(this.text('in'), this.#location);
		if (this.#onBehalfOf) parts.push(this.text('onBehalfOf'), this.#onBehalfOf);

		return parts.join(' ');
	}

	private text(key: MessageKey): string {
		return Locale.translate(key, this.#locale);
	}
}
