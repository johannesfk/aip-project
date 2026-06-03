import { GuardState } from './types';

type StateCallback = () => void;
type UpdateCallback = (dt: number) => void;

export class GuardFSM {
	private _state: GuardState;
	private stateElapsed: number = 0;
	private onEnter: Map<GuardState, StateCallback> = new Map();
	private onExit: Map<GuardState, StateCallback> = new Map();
	private onUpdate: Map<GuardState, UpdateCallback> = new Map();

	constructor(initial: GuardState) {
		this._state = initial;
	}

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

	transition(to: GuardState): void {
		if (to === this._state) return;
		const exitCb = this.onExit.get(this._state);
		if (exitCb) exitCb();
		this._state = to;
		this.stateElapsed = 0;
		const enterCb = this.onEnter.get(this._state);
		if (enterCb) enterCb();
	}

	update(dt: number): void {
		this.stateElapsed += dt;
		const updateCb = this.onUpdate.get(this._state);
		if (updateCb) updateCb(dt);
	}

	get state(): GuardState {
		return this._state;
	}

	get elapsed(): number {
		return this.stateElapsed;
	}
}
