import { BaseComponent, type BaseComponentInit } from '@core/base';
import { INTERVAL_TICK_EVENT, type IntervalTickDetail } from '@/03-core/clientactions/interval';

export interface IIntervalListener extends BaseComponentInit {
	actions: {
		/** Triggers the block's OnTick Event. May return a promise when the handler is async. */
		OnTick: (intervalId: string, count: number) => unknown;
	};
	/** When false, ticks are ignored. Defaults to true. */
	enabled?: boolean;
	/** Interval to listen to. Empty listens to every interval. */
	intervalId: string;
}

// Receives ticks from SapphireRWALibrary.Interval and raises OnTick.
// Destroying the block only removes the listener; the interval keeps running.
export default class IntervalListener extends BaseComponent {
	#actions!: IIntervalListener['actions'];
	#enabled = true;
	#intervalId = '';
	#busy = false;

	private readonly onTick = (event: Event): void => {
		const detail = (event as CustomEvent<IntervalTickDetail>).detail;
		if (!detail || !this.#enabled) return;
		if (this.#intervalId && detail.id !== this.#intervalId) return;

		// Skip ticks while the previous OnTick handler is still running.
		if (this.#busy) return;

		let result: unknown;
		try {
			result = this.#actions.OnTick(detail.id, detail.count);
		} catch (error) {
			console.error('IntervalListener: OnTick failed', error);
			return;
		}

		if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
			this.#busy = true;
			Promise.resolve(result)
				.catch((error) => console.error('IntervalListener: OnTick failed', error))
				.finally(() => {
					this.#busy = false;
				});
		}
	};

	constructor(init: IIntervalListener) {
		super(init);
		this.applyConfig(init);
		window.addEventListener(INTERVAL_TICK_EVENT, this.onTick);
	}

	parametersChanged(payload: Partial<IIntervalListener>): void {
		console.log('IntervalListener: parametersChanged', payload);
		this.applyConfig(payload);
	}

	destroy(): void {
		window.removeEventListener(INTERVAL_TICK_EVENT, this.onTick);
		super.destroy();
	}

	private applyConfig(payload: Partial<IIntervalListener>): void {
		if (payload.actions !== undefined) this.#actions = payload.actions;
		if (payload.enabled !== undefined) this.#enabled = payload.enabled !== false;
		if (payload.intervalId !== undefined) this.#intervalId = (payload.intervalId ?? '').trim();
	}
}
