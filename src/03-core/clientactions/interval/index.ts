// Named intervals that live on `window`, independent of any screen or block.
// Each tick is broadcast as a DOM CustomEvent on `window`; the IntervalListener block
// turns it into an OutSystems Event. Navigating to another screen does not stop an
// interval: it runs until Clear or ClearAll is called (or the page is reloaded).
//
// Per-tab (default): the interval exists only in the tab that started it.
//
// Shared across tabs (`sharedAcrossTabs = true`): every open tab of the same app knows
// the interval and raises its ticks, but only one tab (the leader) runs the timer.
// - State (milliseconds, on/off, count) is replicated through a BroadcastChannel.
// - The leader is elected with a Web Lock per interval. When the leader tab closes,
//   the next tab in the lock queue takes over and continues the count.
// - Pause / Resume / SetMilliseconds / Clear from any tab apply to every tab.
// - A tab opened later asks for the current shared intervals and joins them.

export const INTERVAL_TICK_EVENT = 'sapphire-interval-tick';

export interface IntervalTickDetail {
	/** Interval id. */
	id: string;
	/** Number of ticks since Start (Pause/Resume does not reset it). */
	count: number;
	/** Current cadence in milliseconds. */
	milliseconds: number;
	/** True when the interval is shared across tabs. */
	shared: boolean;
	/** Date.now() when the tick fired (in the leader tab for shared intervals). */
	timestamp: number;
}

interface IntervalEntry {
	id: string;
	milliseconds: number;
	count: number;
	active: boolean;
	shared: boolean;
	timer: number | null;
	/** Shared only: this tab currently holds the Web Lock and runs the timer. */
	isLeader: boolean;
	/** Shared only: cancels a queued lock request. */
	lockAbort: AbortController | null;
	/** Shared only: releases a held lock. */
	releaseLock: (() => void) | null;
}

interface SharedState {
	id: string;
	milliseconds: number;
	active: boolean;
	count: number;
	/** Restart the timer from now (Start, SetMilliseconds). */
	restart: boolean;
}

type ChannelMessage =
	| { type: 'state'; state: SharedState }
	| { type: 'tick'; detail: IntervalTickDetail }
	| { type: 'clear'; id: string }
	| { type: 'sync-request' };

interface IntervalHost {
	intervals: Map<string, IntervalEntry>;
	channel: BroadcastChannel | null;
}

type HostWindow = Window & { __sapphireIntervals?: IntervalHost };

// Kept on window so a second load of the library still sees (and can clear) running intervals.
function host(): IntervalHost {
	const win = window as HostWindow;
	if (!win.__sapphireIntervals) {
		win.__sapphireIntervals = { intervals: new Map(), channel: null };
	}
	return win.__sapphireIntervals;
}

function registry(): Map<string, IntervalEntry> {
	return host().intervals;
}

// ---------------------------------------------------------------------------
// Cross-tab plumbing
// ---------------------------------------------------------------------------

function sharingSupported(): boolean {
	return typeof BroadcastChannel !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.locks;
}

/** Scope channel and locks to the app (first path segment), so apps on the same server don't mix. */
function appScope(): string {
	return window.location.pathname.split('/').filter(Boolean)[0] ?? '';
}

function lockName(id: string): string {
	return `sapphire-interval:${appScope()}:${id}`;
}

/** Opens the channel once per page. Called on library init so new tabs join existing shared intervals. */
export function initSharedIntervals(): void {
	const h = host();
	if (h.channel || !sharingSupported()) return;

	h.channel = new BroadcastChannel(`sapphire-interval:${appScope()}`);
	h.channel.onmessage = (event: MessageEvent<ChannelMessage>) => onChannelMessage(event.data);
	post({ type: 'sync-request' });
}

function post(message: ChannelMessage): void {
	host().channel?.postMessage(message);
}

function onChannelMessage(message: ChannelMessage): void {
	switch (message.type) {
		case 'state':
			applySharedState(message.state);
			break;
		case 'tick': {
			const { detail } = message;
			let entry = registry().get(detail.id);
			if (!entry || !entry.shared) {
				// Missed the state message (e.g. tab opened mid-way): join from the tick.
				entry = applySharedState({ id: detail.id, milliseconds: detail.milliseconds, active: true, count: detail.count, restart: false });
			}
			entry.count = detail.count;
			dispatchTick(detail);
			break;
		}
		case 'clear':
			removeEntry(message.id, false);
			break;
		case 'sync-request':
			registry().forEach((entry) => {
				if (entry.shared && entry.isLeader) post({ type: 'state', state: toState(entry, false) });
			});
			break;
	}
}

function toState(entry: IntervalEntry, restart: boolean): SharedState {
	return { id: entry.id, milliseconds: entry.milliseconds, active: entry.active, count: entry.count, restart };
}

/** Creates or updates the local replica of a shared interval. */
function applySharedState(state: SharedState): IntervalEntry {
	const intervals = registry();
	let entry = intervals.get(state.id);

	if (entry && !entry.shared) {
		// A per-tab interval with the same id is replaced by the shared one.
		removeEntry(entry.id, false);
		entry = undefined;
	}

	if (!entry) {
		entry = createEntry(state.id, state.milliseconds, true);
		entry.count = state.count;
		entry.active = state.active;
		intervals.set(entry.id, entry);
		joinLeaderElection(entry);
		return entry;
	}

	const msChanged = entry.milliseconds !== state.milliseconds;
	entry.milliseconds = state.milliseconds;
	entry.active = state.active;
	entry.count = state.count;
	syncTimer(entry, state.restart || msChanged);
	return entry;
}

/** Runs the timer while this tab holds the lock. Resolves (releasing the lock) on Clear. */
function lead(entry: IntervalEntry): Promise<void> | undefined {
	// Cleared or replaced while queued.
	if (registry().get(entry.id) !== entry) return undefined;

	entry.lockAbort = null;
	entry.isLeader = true;
	syncTimer(entry, true);

	return new Promise<void>((resolve) => {
		entry.releaseLock = resolve;
	});
}

function joinLeaderElection(entry: IntervalEntry): void {
	const abort = new AbortController();
	entry.lockAbort = abort;

	navigator.locks
		.request(lockName(entry.id), { signal: abort.signal }, () => lead(entry))
		.catch(() => {
			// AbortError when the request is cancelled while queued.
		});
}

/**
 * The starting tab takes the lock first when it is free, and only then tells the other tabs.
 * Lock requests and channel messages are not ordered across tabs, so posting first could let
 * another (possibly hidden, throttled) tab become the leader.
 */
function startSharedAsLeader(entry: IntervalEntry): void {
	navigator.locks
		.request(lockName(entry.id), { ifAvailable: true }, (lock) => {
			if (!lock) {
				// Another tab holds this id's lock: announce and queue normally.
				post({ type: 'state', state: toState(entry, true) });
				joinLeaderElection(entry);
				return undefined;
			}
			const held = lead(entry);
			if (held) post({ type: 'state', state: toState(entry, true) });
			return held;
		})
		.catch(() => undefined);
}

function leaveLeaderElection(entry: IntervalEntry): void {
	entry.lockAbort?.abort();
	entry.lockAbort = null;
	entry.releaseLock?.();
	entry.releaseLock = null;
	entry.isLeader = false;
}

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------

function createEntry(id: string, milliseconds: number, shared: boolean): IntervalEntry {
	return { id, milliseconds, count: 0, active: true, shared, timer: null, isLeader: false, lockAbort: null, releaseLock: null };
}

function runsTimer(entry: IntervalEntry): boolean {
	return !entry.shared || entry.isLeader;
}

/** Starts, stops, or restarts the timer so it matches `entry.active`. Only the timer owner runs it. */
function syncTimer(entry: IntervalEntry, restart: boolean): void {
	const shouldRun = entry.active && runsTimer(entry);

	if (!shouldRun) {
		stopTimer(entry);
		return;
	}

	if (entry.timer === null || restart) {
		stopTimer(entry);
		entry.timer = window.setInterval(() => tick(entry), entry.milliseconds);
	}
}

function stopTimer(entry: IntervalEntry): void {
	if (entry.timer !== null) {
		window.clearInterval(entry.timer);
		entry.timer = null;
	}
}

function tick(entry: IntervalEntry): void {
	entry.count += 1;
	const detail: IntervalTickDetail = {
		id: entry.id,
		count: entry.count,
		milliseconds: entry.milliseconds,
		shared: entry.shared,
		timestamp: Date.now(),
	};
	dispatchTick(detail);
	if (entry.shared) post({ type: 'tick', detail });
}

function dispatchTick(detail: IntervalTickDetail): void {
	window.dispatchEvent(new CustomEvent<IntervalTickDetail>(INTERVAL_TICK_EVENT, { detail }));
}

function removeEntry(id: string, broadcast: boolean): boolean {
	const intervals = registry();
	const entry = intervals.get(id);
	if (!entry) return false;

	stopTimer(entry);
	leaveLeaderElection(entry);
	intervals.delete(id);
	if (broadcast && entry.shared) post({ type: 'clear', id });
	return true;
}

/** Applies a local change to a shared interval and tells the other tabs. */
function publish(entry: IntervalEntry, restart: boolean): void {
	syncTimer(entry, restart);
	if (entry.shared) post({ type: 'state', state: toState(entry, restart) });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function normalizeMilliseconds(value: unknown): number {
	const ms = Math.floor(Number(value));
	return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

function generateId(): string {
	const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
	return `interval-${random}`;
}

/**
 * Creates an interval and turns it on. The first tick fires after `milliseconds`.
 * An empty `id` generates one. Starting an id that already exists replaces it (count restarts at 0).
 * With `sharedAcrossTabs`, every tab of the app raises the ticks and one tab runs the timer.
 * Returns the interval id, or '' when `milliseconds` is not a positive number.
 */
function Start(id: string, milliseconds: number, sharedAcrossTabs = false): string {
	const ms = normalizeMilliseconds(milliseconds);
	if (!ms) {
		console.warn('Interval.Start: milliseconds must be a positive number, got', milliseconds);
		return '';
	}

	let shared = sharedAcrossTabs === true;
	if (shared && !sharingSupported()) {
		console.warn('Interval.Start: this browser cannot share intervals across tabs; running per tab instead.');
		shared = false;
	}
	if (shared) initSharedIntervals();

	const resolvedId = (id ?? '').trim() || generateId();
	const intervals = registry();
	const existing = intervals.get(resolvedId);

	// Same id, same mode, shared: keep the current leader and restart it with the new settings.
	if (existing && existing.shared && shared) {
		existing.milliseconds = ms;
		existing.count = 0;
		existing.active = true;
		publish(existing, true);
		return resolvedId;
	}

	if (existing) removeEntry(resolvedId, true);

	const entry = createEntry(resolvedId, ms, shared);
	intervals.set(resolvedId, entry);

	if (shared) {
		startSharedAsLeader(entry);
	} else {
		syncTimer(entry, true);
	}

	return resolvedId;
}

/** Turns an interval off. It stays registered and can be resumed. Returns false when the id is unknown. */
function Pause(id: string): boolean {
	const entry = registry().get(id);
	if (!entry) return false;
	entry.active = false;
	publish(entry, false);
	return true;
}

/** Turns a paused interval back on. The next tick fires a full `milliseconds` later. Returns false when the id is unknown. */
function Resume(id: string): boolean {
	const entry = registry().get(id);
	if (!entry) return false;
	if (!entry.active) {
		entry.active = true;
		publish(entry, true);
	}
	return true;
}

/**
 * Changes the cadence. A running interval restarts its timer, so the next tick fires
 * `milliseconds` from now. A paused interval keeps paused and uses the new value on Resume.
 * Returns false when the id is unknown or `milliseconds` is not a positive number.
 */
function SetMilliseconds(id: string, milliseconds: number): boolean {
	const entry = registry().get(id);
	const ms = normalizeMilliseconds(milliseconds);
	if (!entry || !ms) return false;

	entry.milliseconds = ms;
	publish(entry, true);
	return true;
}

/** Stops and removes an interval (in every tab, when shared). Returns false when the id is unknown. */
function Clear(id: string): boolean {
	return removeEntry(id, true);
}

/** Stops and removes every interval of this tab. Shared ones are removed from every tab. */
function ClearAll(): void {
	Array.from(registry().keys()).forEach((id) => removeEntry(id, true));
}

/** True when the interval exists and is on (not paused). For shared intervals, true in every tab, not only the leader. */
function IsActive(id: string): boolean {
	const entry = registry().get(id);
	return !!entry && entry.active;
}

export const Interval = {
	Start,
	Pause,
	Resume,
	SetMilliseconds,
	Clear,
	ClearAll,
	IsActive,
};
