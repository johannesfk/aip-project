// ---------------------------------------------------------------------------
// GameEngine — Core simulation: player movement, guard AI, and win/lose logic
// ---------------------------------------------------------------------------
// The engine is entirely deterministic except for the random-walk used
// during the SEARCH state.  It receives keyboard input, advances the
// simulation by `dt` seconds, and produces a deep-cloned `GameState`
// snapshot that the renderer consumes without side effects.
// ---------------------------------------------------------------------------

import {
	CellType,
	Direction,
	GuardState,
	type GameState,
	type GuardEntity,
	type InputState,
	type KeycardState,
	type LevelData,
	type Position,
	CELL_SIZE,
	GUARD_SPEEDS,
	GUARD_HEARING_RANGE,
	GUARD_HEARING_SPRINT_RANGE,
	PLAYER_SPEED,
	PLAYER_SPRINT_MULTIPLIER,
	CHASE_LOSE_SIGHT_TIME,
	SEARCH_DURATION,
	GUARD_VISION_RANGE,
	GUARD_VISION_ANGLE
} from './types';
import { aStar, bfs, cellCenter, pixelToCell } from './Pathfinding';

// ---- Geometry helpers -----------------------------------------------------

/** Manhattan distance between two positions (grid- or pixel-space). */
function manhattan(a: Position, b: Position): number {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Convert a cardinal direction to a radian angle (right = 0, CCW). */
function facingToAngle(facing: Direction): number {
	switch (facing) {
		case Direction.RIGHT:
			return 0;
		case Direction.DOWN:
			return Math.PI / 2;
		case Direction.LEFT:
			return Math.PI;
		case Direction.UP:
			return -Math.PI / 2;
	}
}

/** Snap a radian angle to the nearest cardinal direction. */
function angleToFacing(angle: number): Direction {
	const normalized = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
	if (normalized < Math.PI / 4 || normalized > 7 * (Math.PI / 4)) return Direction.RIGHT;
	if (normalized < 3 * (Math.PI / 4)) return Direction.DOWN;
	if (normalized < 5 * (Math.PI / 4)) return Direction.LEFT;
	return Direction.UP;
}

/** Move `pos` toward `target` at `speed` px/s, clamping overshoot. */
function moveToward(pos: Position, target: Position, speed: number, dt: number): void {
	const dx = target.x - pos.x;
	const dy = target.y - pos.y;
	const dist = Math.sqrt(dx * dx + dy * dy);
	if (dist < 0.5) {
		pos.x = target.x;
		pos.y = target.y;
		return;
	}
	const step = Math.min(speed * dt, dist);
	pos.x += (dx / dist) * step;
	pos.y += (dy / dist) * step;
}

/**
 * Bresenham's line algorithm in grid-cell space.
 *
 * Returns every intermediate cell between `from` and `to` (exclusive of
 * `from`, inclusive of `to`).  Used for line-of-sight occlusion checks.
 */
function bresenhamLine(from: Position, to: Position): Position[] {
	const cells: Position[] = [];
	let x0 = from.x;
	let y0 = from.y;
	const x1 = to.x;
	const y1 = to.y;
	const dx = Math.abs(x1 - x0);
	const dy = Math.abs(y1 - y0);
	const sx = x0 < x1 ? 1 : -1;
	const sy = y0 < y1 ? 1 : -1;
	let err = dx - dy;

	while (x0 !== x1 || y0 !== y1) {
		const e2 = 2 * err;
		if (e2 > -dy) {
			err -= dy;
			x0 += sx;
		}
		if (e2 < dx) {
			err += dx;
			y0 += sy;
		}
		cells.push({ x: x0, y: y0 });
	}

	return cells;
}

// ---- GameEngine -----------------------------------------------------------

export class GameEngine {
	// Static level data
	private grid: CellType[][];
	private playerStart: Position;
	private exitPos: Position;

	// Mutable simulation state
	private playerPos: Position;
	private playerSprinting: boolean = false;
	private guards: GuardEntity[] = [];
	private keycards: KeycardState[];
	private collectedCount: number = 0;
	private totalKeycards: number;
	private gameOver: boolean = false;
	private won: boolean = false;
	private message: string = '';
	private messageTimer: number = 0;

	// Toggles driven by keyboard shortcuts
	showVisionCones: boolean = true;
	showHearingRadius: boolean = true;
	showPaths: boolean = true;

	/** Which pathfinding algorithm guards use this frame.  Toggled with T. */
	algorithm: 'astar' | 'bfs' = 'astar';

	/** Cumulative node count across all guards and all frames. */
	totalNodesExplored: number = 0;

	constructor(level: LevelData) {
		this.grid = level.grid;
		this.playerStart = level.playerStart;
		this.playerPos = cellCenter(level.playerStart);
		this.totalKeycards = level.keycardPositions.length;
		this.keycards = level.keycardPositions.map((p) => ({ pos: p, collected: false }));
		this.exitPos = level.exitPos;

		// Spawn guards from level definitions.
		for (let i = 0; i < level.guardDefs.length; i++) {
			const def = level.guardDefs[i];
			const guard: GuardEntity = {
				id: i,
				pos: cellCenter(def.pos),
				spawnPos: cellCenter(def.pos),
				state: GuardState.PATROL,
				facing: def.facing,
				patrolRoute: def.patrolRoute,
				patrolIndex: 0,
				lastKnownPlayerPos: null,
				stateTimer: 0,
				searchTimer: 0,
				loseSightTimer: 0,
				reachedTimer: -1,
				path: [],
				pathIndex: 0,
				speed: GUARD_SPEEDS[GuardState.PATROL],
				visionRange: GUARD_VISION_RANGE,
				visionAngle: GUARD_VISION_ANGLE,
				hearingRange: GUARD_HEARING_RANGE,
				nodesExplored: 0
			};
			// Begin patrolling toward the first waypoint.
			this.setPathTo(guard, def.patrolRoute[0]);
			this.guards.push(guard);
		}
	}

	// --- Public API ---------------------------------------------------------

	/**
	 * Advance the simulation by `dt` seconds.
	 *
	 * @returns A deep-cloned `GameState` snapshot for the renderer.
	 */
	update(dt: number, input: InputState): GameState {
		// Restart takes precedence over everything.
		if (input.restart) {
			this.reset(input);
			return this.getState();
		}

		// Game-over: freeze the world, only tick the message timer.
		if (this.gameOver) {
			this.updateMessageTimer(dt);
			return this.getState();
		}

		this.updatePlayer(dt, input);
		this.updateGuards(dt);
		this.checkKeycardCollection();
		this.checkWinLose();
		this.updateMessageTimer(dt);

		return this.getState();
	}

	/** Produce a deep-cloned snapshot of the current game state. */
	getState(): GameState {
		return {
			playerPos: { ...this.playerPos },
			playerSprinting: this.playerSprinting,
			guards: this.guards.map((g) => ({ ...g, pos: { ...g.pos }, path: [...g.path] })),
			keycards: this.keycards.map((k) => ({ ...k })),
			exitPos: { ...this.exitPos },
			collectedCount: this.collectedCount,
			totalKeycards: this.totalKeycards,
			gameOver: this.gameOver,
			won: this.won,
			message: this.message,
			showVisionCones: this.showVisionCones,
			showHearingRadius: this.showHearingRadius,
			showPaths: this.showPaths,
			nodesExplored: this.totalNodesExplored,
			algorithm: this.algorithm
		};
	}

	// --- Reset --------------------------------------------------------------

	/** Restore all mutable state to its initial values (press R). */
	private reset(input: InputState): void {
		this.gameOver = false;
		this.won = false;
		this.message = '';
		this.messageTimer = 0;
		this.collectedCount = 0;
		this.playerSprinting = false;
		this.totalNodesExplored = 0;
		for (const k of this.keycards) k.collected = false;
		this.playerPos = cellCenter(this.playerStart);
		for (const guard of this.guards) {
			guard.pos = { ...guard.spawnPos };
			guard.state = GuardState.PATROL;
			guard.loseSightTimer = 0;
			guard.reachedTimer = -1;
			guard.searchTimer = 0;
			guard.lastKnownPlayerPos = null;
			guard.nodesExplored = 0;
			guard.speed = GUARD_SPEEDS[GuardState.PATROL];
			guard.patrolIndex = 0;
			this.setPathTo(guard, guard.patrolRoute[0]);
		}
		input.restart = false;
	}

	// --- Player movement ----------------------------------------------------

	/**
	 * Apply keyboard input to the player position with axis-independent
	 * wall-sliding collision.
	 */
	private updatePlayer(dt: number, input: InputState): void {
		let dx = 0;
		let dy = 0;
		if (input.up) dy -= 1;
		if (input.down) dy += 1;
		if (input.left) dx -= 1;
		if (input.right) dx += 1;

		if (dx === 0 && dy === 0) {
			this.playerSprinting = false;
			return;
		}

		// Normalize diagonal movement (1 / √2 ≈ 0.7071).
		if (dx !== 0 && dy !== 0) {
			dx *= 0.7071;
			dy *= 0.7071;
		}

		this.playerSprinting = input.sprint;
		const speed = PLAYER_SPEED * (input.sprint ? PLAYER_SPRINT_MULTIPLIER : 1);
		const step = speed * dt;
		const newX = this.playerPos.x + dx * step;
		const newY = this.playerPos.y + dy * step;

		const newCellX = Math.floor(newX / CELL_SIZE);
		const newCellY = Math.floor(newY / CELL_SIZE);
		const oldCellX = Math.floor(this.playerPos.x / CELL_SIZE);
		const oldCellY = Math.floor(this.playerPos.y / CELL_SIZE);

		// Axis-independent wall sliding: try moving in both axes, then each
		// axis separately (sliding along the wall).
		const canMoveX = this.isWalkable(newCellX, oldCellY);
		const canMoveY = this.isWalkable(oldCellX, newCellY);
		const canMoveBoth = this.isWalkable(newCellX, newCellY);

		if (canMoveBoth) {
			this.playerPos.x = newX;
			this.playerPos.y = newY;
		} else if (canMoveX) {
			this.playerPos.x = newX;
		} else if (canMoveY) {
			this.playerPos.y = newY;
		}
	}

	// --- Guard AI — FSM orchestration ---------------------------------------

	/** Tick every guard: increment stateTimer, then run FSM logic. */
	private updateGuards(dt: number): void {
		for (const guard of this.guards) {
			guard.stateTimer += dt;
			this.updateGuardState(guard, dt);
		}
	}

	/**
	 * The guard Finite State Machine.
	 *
	 * Transitions are driven by three sensing queries every frame:
	 *  1. `canSeePlayer` — vision-cone + line-of-sight check.
	 *  2. `canHearPlayer` — proximity check (amplified when sprinting).
	 *  3. Timer thresholds (lose-sight, search-duration, alert-pause).
	 *
	 * State diagram:
	 * ```
	 * PATROL ──(see)───────▶ CHASE
	 *    │                    │ (lose sight >2s)
	 *    │ (hear)             ▼
	 *    ├──────────────▶ SEARCH ──(timer 5s)──▶ PATROL
	 *    │                    │ (see/hear)
	 *    ▼                    ▼
	 *  ALERT ──(see)──────▶ CHASE
	 *    │
	 *    └──(reach target + pause 0.8s)──▶ PATROL
	 * ```
	 */
	private updateGuardState(guard: GuardEntity, dt: number): void {
		const canSee = this.canSeePlayer(guard);
		const canHear = this.canHearPlayer(guard);
		const pc = this.getPlayerCell();

		switch (guard.state) {
			// ---- PATROL -----------------------------------------------------
			case GuardState.PATROL:
				if (canSee) {
					this.transitionGuard(guard, GuardState.CHASE);
					guard.lastKnownPlayerPos = pc;
					guard.loseSightTimer = 0;
					this.setPathTo(guard, pc);
				} else if (canHear) {
					this.transitionGuard(guard, GuardState.ALERT);
					guard.lastKnownPlayerPos = pc;
					this.setPathTo(guard, pc);
				} else {
					this.moveToPatrolWaypoint(guard, dt);
				}
				break;

			// ---- ALERT -----------------------------------------------------
			case GuardState.ALERT:
				if (canSee) {
					this.transitionGuard(guard, GuardState.CHASE);
					guard.lastKnownPlayerPos = pc;
					guard.loseSightTimer = 0;
					this.setPathTo(guard, pc);
				} else if (this.hasReachedPathEnd(guard)) {
					// Arrived at investigation point — pause briefly.
					if (guard.reachedTimer < 0) guard.reachedTimer = 0;
					guard.reachedTimer += dt;
					if (guard.reachedTimer > 0.8) {
						this.transitionGuard(guard, GuardState.PATROL);
						this.setPathTo(guard, guard.patrolRoute[guard.patrolIndex]);
					}
				} else {
					guard.reachedTimer = -1;
					this.followPath(guard, dt);
				}
				break;

			// ---- CHASE -----------------------------------------------------
			case GuardState.CHASE:
				if (canSee) {
					// Continuously re-path toward the player.
					guard.loseSightTimer = 0;
					guard.lastKnownPlayerPos = pc;
					this.setPathTo(guard, pc);
					this.followPath(guard, dt);
				} else {
					guard.loseSightTimer += dt;
					if (guard.loseSightTimer >= CHASE_LOSE_SIGHT_TIME) {
						this.transitionGuard(guard, GuardState.SEARCH);
						guard.searchTimer = 0;
						this.pickSearchTarget(guard);
					} else {
						// Still following the last-known path.
						this.followPath(guard, dt);
					}
				}
				break;

			// ---- SEARCH ----------------------------------------------------
			case GuardState.SEARCH:
				guard.searchTimer += dt;
				if (canSee) {
					this.transitionGuard(guard, GuardState.CHASE);
					guard.lastKnownPlayerPos = pc;
					guard.loseSightTimer = 0;
					this.setPathTo(guard, pc);
				} else if (canHear) {
					this.transitionGuard(guard, GuardState.ALERT);
					guard.lastKnownPlayerPos = pc;
					this.setPathTo(guard, pc);
				} else if (guard.searchTimer >= SEARCH_DURATION) {
					this.transitionGuard(guard, GuardState.PATROL);
					this.setPathTo(guard, guard.patrolRoute[guard.patrolIndex]);
				} else if (this.hasReachedPathEnd(guard)) {
					this.pickSearchTarget(guard);
				} else {
					this.followPath(guard, dt);
				}
				break;
		}
	}

	/**
	 * Move the guard to a new FSM state, resetting the per-state timer and
	 * switching to the movement speed appropriate for the target state.
	 */
	private transitionGuard(guard: GuardEntity, to: GuardState): void {
		if (guard.state === to) return;
		guard.state = to;
		guard.stateTimer = 0;
		guard.reachedTimer = -1;
		guard.speed = GUARD_SPEEDS[to];
	}

	// --- Sensing ------------------------------------------------------------

	/**
	 * Three-step vision check:
	 *  1. Is the player within the vision range (Euclidean)?
	 *  2. Is the player within the vision cone arc (± half-angle)?
	 *  3. Is there an unobstructed line-of-sight (Bresenham)?
	 */
	private canSeePlayer(guard: GuardEntity): boolean {
		const gc = pixelToCell(guard.pos.x, guard.pos.y);
		const pc = this.getPlayerCell();
		const dx = pc.x - gc.x;
		const dy = pc.y - gc.y;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist > guard.visionRange) return false;
		if (dist < 0.5) return true; // same cell

		// Angle check within the vision cone.
		const angleToPlayer = Math.atan2(dy, dx);
		const facingAngle = facingToAngle(guard.facing);
		let diff = angleToPlayer - facingAngle;
		while (diff > Math.PI) diff -= 2 * Math.PI;
		while (diff < -Math.PI) diff += 2 * Math.PI;

		const halfAngle = (guard.visionAngle * Math.PI) / 360;
		if (Math.abs(diff) > halfAngle) return false;

		return this.hasLineOfSight(gc, pc);
	}

	/** Check whether every intermediate cell between `from` and `to` is free of walls and cover. */
	private hasLineOfSight(from: Position, to: Position): boolean {
		const cells = bresenhamLine(from, to);
		for (const cell of cells) {
			const t = this.grid[cell.y]?.[cell.x];
			if (t === CellType.WALL || t === CellType.COVER) return false;
		}
		return true;
	}

	/** Proximity check using Manhattan distance; range doubles when the player sprints. */
	private canHearPlayer(guard: GuardEntity): boolean {
		const gc = pixelToCell(guard.pos.x, guard.pos.y);
		const pc = this.getPlayerCell();
		const dist = manhattan(gc, pc);
		const range = this.playerSprinting ? GUARD_HEARING_SPRINT_RANGE : GUARD_HEARING_RANGE;
		return dist <= range;
	}

	// --- Movement helpers ---------------------------------------------------

	/**
	 * Advance the guard along its patrol route.  When the current waypoint
	 * is reached, cycle to the next one and re-path.
	 */
	private moveToPatrolWaypoint(guard: GuardEntity, dt: number): void {
		if (guard.patrolRoute.length === 0) return;

		if (this.hasReachedPathEnd(guard)) {
			guard.patrolIndex = (guard.patrolIndex + 1) % guard.patrolRoute.length;
			this.setPathTo(guard, guard.patrolRoute[guard.patrolIndex]);
		}

		this.followPath(guard, dt);
	}

	/**
	 * Move the guard one step along its current path toward the next cell
	 * center.  When close enough, advance `pathIndex`.
	 */
	private followPath(guard: GuardEntity, dt: number): void {
		if (guard.path.length === 0 || guard.pathIndex >= guard.path.length) return;

		const target = cellCenter(guard.path[guard.pathIndex]);
		const dx = target.x - guard.pos.x;
		const dy = target.y - guard.pos.y;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < 1.5) {
			guard.pathIndex++;
			if (guard.pathIndex >= guard.path.length) {
				this.snapGuardToCell(guard);
				return;
			}
			this.followPath(guard, dt);
			return;
		}

		moveToward(guard.pos, target, guard.speed, dt);

		// Update the guard's facing direction based on movement.
		if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
			guard.facing = angleToFacing(Math.atan2(dy, dx));
		}
	}

	/** True when the guard has exhausted or moved past its current path. */
	private hasReachedPathEnd(guard: GuardEntity): boolean {
		return guard.path.length === 0 || guard.pathIndex >= guard.path.length;
	}

	/** Snap the guard's pixel position to the center of the cell it currently occupies. */
	private snapGuardToCell(guard: GuardEntity): void {
		const cell = pixelToCell(guard.pos.x, guard.pos.y);
		guard.pos = cellCenter(cell);
	}

	// --- Pathfinding dispatch -----------------------------------------------

	/**
	 * Compute a path from the guard's current cell to `goal` using the
	 * currently selected algorithm (A\* or BFS).  The guard's
	 * `nodesExplored` accumulator and the engine-wide total are both updated.
	 */
	private setPathTo(guard: GuardEntity, goal: Position): void {
		const start = pixelToCell(guard.pos.x, guard.pos.y);
		if (start.x === goal.x && start.y === goal.y) {
			guard.path = [];
			guard.pathIndex = 0;
			return;
		}

		const result =
			this.algorithm === 'astar' ? aStar(this.grid, start, goal) : bfs(this.grid, start, goal);

		guard.nodesExplored += result.nodesExplored;
		this.totalNodesExplored += result.nodesExplored;

		if (result.path.length > 0) {
			guard.path = result.path;
			// Skip the first cell if it's the one we're already standing in.
			guard.pathIndex = result.path[0].x === start.x && result.path[0].y === start.y ? 1 : 0;
		} else {
			guard.path = [];
			guard.pathIndex = 0;
		}
	}

	/**
	 * Pick a random walkable cell near `lastKnownPlayerPos` (±2 cells)
	 * and path toward it.  This gives the SEARCH behaviour a natural
	 * "sweep the area" feel.
	 */
	private pickSearchTarget(guard: GuardEntity): void {
		if (!guard.lastKnownPlayerPos) {
			this.setPathTo(guard, guard.patrolRoute[guard.patrolIndex]);
			return;
		}

		const cx = guard.lastKnownPlayerPos.x;
		const cy = guard.lastKnownPlayerPos.y;
		const candidates: Position[] = [];

		for (let dy = -2; dy <= 2; dy++) {
			for (let dx = -2; dx <= 2; dx++) {
				const nx = cx + dx;
				const ny = cy + dy;
				if (
					ny >= 0 &&
					ny < this.grid.length &&
					nx >= 0 &&
					nx < this.grid[0].length &&
					this.grid[ny][nx] === CellType.EMPTY // SEARCH only targets open cells
				) {
					candidates.push({ x: nx, y: ny });
				}
			}
		}

		if (candidates.length > 0) {
			const pick = candidates[Math.floor(Math.random() * candidates.length)];
			this.setPathTo(guard, pick);
		}
	}

	// --- Keycard collection -------------------------------------------------

	/** If the player stands on an uncollected keycard cell, collect it. */
	private checkKeycardCollection(): void {
		const pc = this.getPlayerCell();
		for (const k of this.keycards) {
			if (k.collected) continue;
			if (pc.x === k.pos.x && pc.y === k.pos.y) {
				k.collected = true;
				this.collectedCount++;
				this.showMessage(`Keycard collected! (${this.collectedCount}/${this.totalKeycards})`);
			}
		}
	}

	// --- Win / lose ---------------------------------------------------------

	/**
	 * - Lose: the player shares a cell with a guard that is actively CHASING.
	 * - Win: the player reaches the exit with all keycards collected.
	 */
	private checkWinLose(): void {
		const pc = this.getPlayerCell();

		for (const guard of this.guards) {
			const gc = pixelToCell(guard.pos.x, guard.pos.y);
			if (pc.x === gc.x && pc.y === gc.y && guard.state === GuardState.CHASE) {
				this.gameOver = true;
				this.won = false;
				return;
			}
		}

		if (pc.x === this.exitPos.x && pc.y === this.exitPos.y) {
			if (this.collectedCount >= this.totalKeycards) {
				this.gameOver = true;
				this.won = true;
			} else if (this.message !== 'Collect all keycards first!') {
				this.showMessage('Collect all keycards first!');
			}
		}
	}

	// --- Message system -----------------------------------------------------

	/** Display a temporary on-screen message that fades after 2 seconds. */
	private showMessage(msg: string): void {
		this.message = msg;
		this.messageTimer = 2.0;
	}

	/** Decrement the message timer; clear the message when it expires (unless game over). */
	private updateMessageTimer(dt: number): void {
		if (this.messageTimer > 0) {
			this.messageTimer -= dt;
			if (this.messageTimer <= 0 && !this.gameOver) {
				this.message = '';
			}
		}
	}

	// --- Collision / utilities ----------------------------------------------

	/** True if the cell at (x, y) is inside the grid and not a wall or cover. */
	private isWalkable(x: number, y: number): boolean {
		if (y < 0 || y >= this.grid.length || x < 0 || x >= this.grid[0].length) return false;
		const cell = this.grid[y][x];
		return cell !== CellType.WALL && cell !== CellType.COVER;
	}

	/** Return the grid-cell coordinates the player's center occupies. */
	private getPlayerCell(): Position {
		return pixelToCell(this.playerPos.x, this.playerPos.y);
	}
}
