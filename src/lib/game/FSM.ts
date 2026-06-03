// ---------------------------------------------------------------------------
// GuardFSM - Finite State Machine for guard AI
// ---------------------------------------------------------------------------
// This class is a standalone, reusable FSM implementation
// ---------------------------------------------------------------------------

import { GuardState } from './types';

type StateCallback = () => void;
type UpdateCallback = (dt: number) => void;

/**
 * A Finite State Machine used to model guard behaviour.
 *
 * Each state may register three lifecycle hooks:
 *  - `onEnter`  — fired once when the state becomes active.
 *  - `onUpdate` — called every frame with the delta-time.
 *  - `onExit`   — fired once when leaving the state.
 *
 * Transitions happen explicitly via `transition()`; the FSM ignores
 * duplicate transitions (transitioning to the current state is a no-op).
 */
export class GuardFSM {
	private _state: GuardState;

	/** Time spent in the current state (seconds), reset on every transition. */
	private stateElapsed: number = 0;

	private onEnter: Map<GuardState, StateCallback> = new Map();
	private onExit: Map<GuardState, StateCallback> = new Map();
	private onUpdate: Map<GuardState, UpdateCallback> = new Map();

	constructor(initial: GuardState) {
		this._state = initial;
	}

	/**
	 * Register lifecycle callbacks for a single state.
	 *
	 * @param state     The FSM state to configure.
	 * @param callbacks Optional `onEnter`, `onExit`, and `onUpdate` handlers.
	 */
	register(
		state: GuardState,
		callbacks: {
			onEnter?: StateCallback;
			onExit?: StateCallback;
			onUpdate?: UpdateCallback;
		},
	): void {
		if (callbacks.onEnter) this.onEnter.set(state, callbacks.onEnter);
		if (callbacks.onExit) this.onExit.set(state, callbacks.onExit);
		if (callbacks.onUpdate) this.onUpdate.set(state, callbacks.onUpdate);
	}

	/**
	 * Transition to a new state, firing the `onExit` hook of the current
	 * state and the `onEnter` hook of the target state.  The per-state
	 * elapsed-time counter is reset.
	 */
	transition(to: GuardState): void {
		if (to === this._state) return;
		const exitCb = this.onExit.get(this._state);
		if (exitCb) exitCb();
		this._state = to;
		this.stateElapsed = 0;
		const enterCb = this.onEnter.get(this._state);
		if (enterCb) enterCb();
	}

	/** Advance the FSM by `dt` seconds, calling the active state's `onUpdate`. */
	update(dt: number): void {
		this.stateElapsed += dt;
		const updateCb = this.onUpdate.get(this._state);
		if (updateCb) updateCb(dt);
	}

	/** The currently active state. */
	get state(): GuardState {
		return this._state;
	}

	/** Seconds since the last transition. */
	get elapsed(): number {
		return this.stateElapsed;
	}
}
