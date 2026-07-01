/**
 * Prevents "machine-gun" activations of clickable elements (anything matching
 * `targets`, e.g. `.btn`, whether it is a <button>, <div>, <span>, ...).
 *
 * Behaviour:
 *  - The first activation (click or Enter) in a quiet period passes through.
 *  - Any further activation while the element is cooling down is blocked AND
 *    restarts the cooldown timer, so continuous pressing keeps the element
 *    locked until the user pauses for the full `cooldown` duration.
 *
 * Implementation notes:
 *  - Listeners are attached once on `document` in the capture phase so the gate
 *    runs before OutSystems' own handlers and works for SPA-injected elements
 *    without any per-element wiring or MutationObserver.
 *  - We do not use `pointer-events: none` while locked: we need to keep
 *    receiving events so repeated presses can reset the timer.
 */

export interface ClickCooldownOptions {
	/** CSS selector for elements that should be rate-limited. */
	targets?: string;
	/** CSS selector; matching elements (or descendants of them) are never gated. */
	exceptions?: string;
	/** Cooldown window in milliseconds. */
	cooldown?: number;
	/** Class applied to an element while it is cooling down. */
	cooldownClass?: string;
}

export interface ClickCooldownController {
	/** Merge new options into the live configuration. */
	update(options: ClickCooldownOptions): void;
	/** Current resolved configuration. */
	readonly config: Required<ClickCooldownOptions>;
	/** Remove listeners and clear all pending cooldowns. */
	destroy(): void;
}

const DEFAULTS: Required<ClickCooldownOptions> = {
	targets: '.btn',
	exceptions: '[data-no-cooldown]',
	cooldown: 600,
	cooldownClass: 'is-cooldown',
};

/** Native elements that synthesise a `click` when activated with Enter. */
const NATIVE_ACTIVATION_SELECTOR = 'button, a[href], input, summary';

interface CooldownState {
	timerId: number;
}

let controller: ClickCooldownController | null = null;

export function installClickCooldown(options: ClickCooldownOptions = {}): ClickCooldownController {
	// Idempotent: reconfigure the existing installation instead of stacking listeners.
	if (controller) {
		controller.update(options);
		return controller;
	}

	const config: Required<ClickCooldownOptions> = { ...DEFAULTS, ...stripUndefined(options) };
	const states = new WeakMap<Element, CooldownState>();

	const lock = (el: Element): void => {
		const existing = states.get(el);
		if (existing) {
			window.clearTimeout(existing.timerId);
		} else {
			el.classList.add(config.cooldownClass);
			el.setAttribute('aria-disabled', 'true');
		}

		const timerId = window.setTimeout(() => unlock(el), config.cooldown);
		states.set(el, { timerId });
	};

	const unlock = (el: Element): void => {
		const state = states.get(el);
		if (state) {
			window.clearTimeout(state.timerId);
			states.delete(el);
		}
		el.classList.remove(config.cooldownClass);
		el.removeAttribute('aria-disabled');
	};

	const block = (event: Event): void => {
		event.preventDefault();
		event.stopImmediatePropagation();
	};

	/** Returns the gated target for an event, or null if it should be ignored. */
	const resolveTarget = (event: Event): Element | null => {
		const origin = event.target;
		if (!(origin instanceof Element)) {
			return null;
		}

		const target = origin.closest(config.targets);
		if (!target) {
			return null;
		}

		if (config.exceptions && (target.matches(config.exceptions) || origin.closest(config.exceptions))) {
			return null;
		}

		return target;
	};

	const handleActivation = (event: Event, target: Element): void => {
		if (states.has(target)) {
			// Already cooling down: this is a repeat press -> block and restart.
			block(event);
			lock(target);
			return;
		}

		// Leading edge: let it through, then start the cooldown.
		lock(target);
	};

	const onClick = (event: MouseEvent): void => {
		const target = resolveTarget(event);
		if (target) {
			handleActivation(event, target);
		}
	};

	const onKeydown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter') {
			return;
		}
		// Native controls turn Enter into a synthetic click; let `onClick` own them
		// so a single Enter is not counted twice.
		if (event.target instanceof Element && event.target.closest(NATIVE_ACTIVATION_SELECTOR)) {
			return;
		}

		const target = resolveTarget(event);
		if (target) {
			handleActivation(event, target);
		}
	};

	document.addEventListener('click', onClick, true);
	document.addEventListener('keydown', onKeydown, true);

	controller = {
		config,
		update(next: ClickCooldownOptions): void {
			Object.assign(config, stripUndefined(next));
		},
		destroy(): void {
			document.removeEventListener('click', onClick, true);
			document.removeEventListener('keydown', onKeydown, true);
			controller = null;
		},
	};

	return controller;
}

function stripUndefined(options: ClickCooldownOptions): ClickCooldownOptions {
	const result: ClickCooldownOptions = {};
	for (const key of Object.keys(options) as (keyof ClickCooldownOptions)[]) {
		if (options[key] !== undefined) {
			(result as Record<string, unknown>)[key] = options[key];
		}
	}
	return result;
}
