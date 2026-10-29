// Event bus between windows, tabs and iframes of the same origin, built on BroadcastChannel.
// API follows mitt: on, once, off, emit, with '*' to listen to every event.
//
// Works in OutSystems Reactive and Traditional. Traditional pages reload on every
// postback, so handlers must be registered again on each page load, and events
// emitted while no page is listening are lost.

export type EventMeta = {
	/** Event name. */
	type: string;
	/** Id of the bus that emitted the event. Equal to `bus.id` when it came from this window. */
	source: string;
};

export type EventHandler<T = any> = (payload: T, meta: EventMeta) => void;

type EventMessage = {
	type: string;
	payload: unknown;
	source: string;
};

export default class SapphireEventBus {
	readonly id = Math.random().toString(36).slice(2);

	private channel: BroadcastChannel;
	private handlers = new Map<string, Set<EventHandler>>();

	constructor(channelName: string) {
		this.channel = new BroadcastChannel(channelName);
		this.channel.onmessage = (event: MessageEvent<EventMessage>) => {
			const { type, payload, source } = event.data;
			this.dispatch(type, payload, source);
		};
	}

	/** Listen to an event. Returns a function that removes the listener. */
	on<T = any>(type: string, handler: EventHandler<T>): () => void {
		if (!this.handlers.has(type)) {
			this.handlers.set(type, new Set());
		}
		this.handlers.get(type)!.add(handler);
		return () => this.off(type, handler);
	}

	/** Listen to an event only once. */
	once<T = any>(type: string, handler: EventHandler<T>): () => void {
		const off = this.on<T>(type, (payload, meta) => {
			off();
			handler(payload, meta);
		});
		return off;
	}

	/** Remove one listener, or every listener of the event when no handler is given. */
	off<T = any>(type: string, handler?: EventHandler<T>): void {
		if (handler) {
			this.handlers.get(type)?.delete(handler);
		} else {
			this.handlers.delete(type);
		}
	}

	/** Send an event to this window and to every other window on the same channel. */
	emit<T = any>(type: string, payload?: T): void {
		// JSON round trip keeps only plain data, so OutSystems records and lists can be sent.
		const data = JSON.parse(JSON.stringify(payload ?? null));
		const message: EventMessage = { type, payload: data, source: this.id };

		this.channel.postMessage(message);

		// BroadcastChannel does not deliver to the sender, so run local handlers here.

		console.log('emit', type, data, this.id);

		this.dispatch(type, data, this.id);
	}

	private dispatch(type: string, payload: unknown, source: string): void {
		const meta: EventMeta = { type, source };
		const listeners = [...(this.handlers.get(type) ?? []), ...(this.handlers.get('*') ?? [])];

		for (const handler of listeners) {
			try {
				handler(payload, meta);
			} catch (error) {
				console.error(`SapphireEventBus | handler for "${type}" failed`, error);
			}
		}
	}
}
