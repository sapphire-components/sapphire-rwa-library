import { BaseComponent, type BaseComponentInit } from '@core/base';

interface ITitleLeadCaption extends BaseComponentInit {
	actions: {};
	captionClamp: number;
	enabled: boolean;
	leadClamp: number;
	theme: string;
	titleClamp: number;
}

export default class TitleLeadCaption extends BaseComponent {
	private captionClamp = 0;
	private leadClamp = 0;
	private titleClamp = 0;

	constructor(init: ITitleLeadCaption) {
		super(init);

		if (!this.widgetEl) {
			console.warn('TitleLeadCaption: root element not found for runtimeId', init.runtimeId);
			return;
		}

		this.applyConfig(init);
		this.applyClamps();
	}

	parametersChanged(payload: ITitleLeadCaption): void {
		const liveEl = document.getElementById(this.runtimeId);
		if (!liveEl) return;

		this.widgetEl = liveEl;
		this.applyConfig(payload);
		this.applyClamps();
	}

	destroy() {
		super.destroy();
	}

	private applyConfig(payload: Partial<ITitleLeadCaption>): void {
		if (payload.titleClamp !== undefined) this.titleClamp = this.readClamp(payload.titleClamp);
		if (payload.leadClamp !== undefined) this.leadClamp = this.readClamp(payload.leadClamp);
		if (payload.captionClamp !== undefined) this.captionClamp = this.readClamp(payload.captionClamp);
	}

	private applyClamps(): void {
		if (!this.widgetEl) return;

		this.setClamp(this.widgetEl.querySelector<HTMLElement>(':scope > .titleleadcaption-title'), this.titleClamp);
		this.setClamp(this.widgetEl.querySelector<HTMLElement>(':scope > .titleleadcaption-lead'), this.leadClamp);
		this.setClamp(this.widgetEl.querySelector<HTMLElement>(':scope > .titleleadcaption-caption'), this.captionClamp);
	}

	private setClamp(el: HTMLElement | null, lines: number): void {
		if (!el) return;

		if (lines > 0) {
			el.dataset.clamped = 'true';
			el.style.setProperty('--titleleadcaption-clamp', String(lines));
			return;
		}

		delete el.dataset.clamped;
		el.style.removeProperty('--titleleadcaption-clamp');
	}

	private readClamp(value: number): number {
		const lines = Math.floor(Number(value));
		return Number.isFinite(lines) && lines > 0 ? lines : 0;
	}
}
