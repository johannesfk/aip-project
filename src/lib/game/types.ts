// ---------------------------------------------------------------------------
// Stealth Patrol — Shared types, enums, and tuning constants
// ---------------------------------------------------------------------------

/** Pixels per grid cell (determines canvas size: 30×30 px ticks). */
export const CELL_SIZE = 30;

/** Number of columns in the grid. */
export const GRID_WIDTH = 30;

/** Number of rows in the grid. */
export const GRID_HEIGHT = 20;

/**
 * The three terrain types that make up every cell in the level grid.
 *
 * - `EMPTY` — walkable, does not block vision.
 * - `WALL`  — blocks both movement and line-of-sight.
 * - `COVER` — blocks movement and line-of-sight (impassable obstacle).
 */
export enum CellType {
	EMPTY = 0,
	WALL = 1,
	COVER = 2,
}

/** Cardinal direction the guard is currently looking toward. */
export enum Direction {
	UP = 'UP',
	DOWN = 'DOWN',
	LEFT = 'LEFT',
	RIGHT = 'RIGHT',
}

/**
 * The four states of the guard Finite State Machine.
 *
 * ```
 * PATROL ──(see/hear)──▶ ALERT ──(confirm sight)──▶ CHASE
 *    ▲                       │                          │
 *    └──(timer)── SEARCH ◀──┘                          │
 *                           (lose sight + timer) ───────┘
 * ```
 */
export enum GuardState {
	/** Follow a predefined set of waypoints at slow speed. */
	PATROL = 'PATROL',
	/** Move to the last known player position for closer investigation. */
	ALERT = 'ALERT',
	/** Pursue the player via A\* / BFS pathfinding at high speed. */
	CHASE = 'CHASE',
	/** Wander near the last-known position before giving up and returning to PATROL. */
	SEARCH = 'SEARCH',
}

/** Grid- or pixel-space coordinate. */
export interface Position {
	x: number;
	y: number;
}

/** Snapshot of the keyboard state each frame. */
export interface InputState {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
	sprint: boolean;
	restart: boolean;
}

/**
 * Runtime data for a single guard entity.
 *
 * The engine mutates this object directly during simulation; a deep-cloned
 * snapshot is exposed to the renderer via `GameState` so the visual layer
 * never modifies game state.
 */
export interface GuardEntity {
	/** Unique guard index (0-2). */
	id: number;
	/** Current pixel position (center of the guard diamond). */
	pos: Position;
	/** Spawn pixel position — restored on restart. */
	spawnPos: Position;
	/** Current FSM state. */
	state: GuardState;
	/** Cardinal direction the guard is facing (controls vision cone). */
	facing: Direction;
	/** Ordered list of grid-cell waypoints visited during PATROL. */
	patrolRoute: Position[];
	/** Index into `patrolRoute` of the next waypoint to reach. */
	patrolIndex: number;
	/** Grid-cell position where the player was last seen or heard (null if none). */
	lastKnownPlayerPos: Position | null;
	/** Time spent in the current state (seconds). */
	stateTimer: number;
	/** Time spent in SEARCH state (seconds). */
	searchTimer: number;
	/** Time elapsed since the guard last had visual contact during CHASE (seconds). */
	loseSightTimer: number;
	/**
	 * Tracks how long the guard has been stationary after reaching the
	 * ALERT destination.  Set to `-1` while still en route.
	 */
	reachedTimer: number;
	/** Current A\* / BFS path (list of grid cells). */
	path: Position[];
	/** Current step index within `path`. */
	pathIndex: number;
	/** Movement speed in pixels per second (varies per FSM state). */
	speed: number;
	/** Vision range in grid cells. */
	visionRange: number;
	/** Vision cone arc in degrees (full angle, not half). */
	visionAngle: number;
	/** Hearing radius in grid cells (Manhattan distance). */
	hearingRange: number;
	/** Cumulative number of graph nodes visited by pathfinding for this guard. */
	nodesExplored: number;
}

/** Level-authoring data for a single guard. */
export interface GuardDef {
	pos: Position;
	patrolRoute: Position[];
	facing: Direction;
}

/** Static level data loaded once at startup. */
export interface LevelData {
	/** 2-D grid of `CellType` values (row-major). */
	grid: CellType[][];
	/** Grid cell where the player spawns. */
	playerStart: Position;
	/** Guard definitions (spawn position, patrol route, facing). */
	guardDefs: GuardDef[];
	/** Grid cells containing collectible keycards. */
	keycardPositions: Position[];
	/** Grid cell of the exit. */
	exitPos: Position;
}

/** Snapshot of a single keycard sent to the renderer. */
export interface KeycardState {
	pos: Position;
	collected: boolean;
}

/**
 * Complete frame snapshot produced by `GameEngine.update()` and consumed
 * by the renderer.
 *
 * All objects are deep-cloned to prevent the renderer from accidentally
 * mutating engine state.
 */
export interface GameState {
	playerPos: Position;
	playerSprinting: boolean;
	guards: GuardEntity[];
	keycards: KeycardState[];
	exitPos: Position;
	collectedCount: number;
	totalKeycards: number;
	gameOver: boolean;
	won: boolean;
	paused: boolean;
	message: string;
	showVisionCones: boolean;
	showHearingRadius: boolean;
	showPaths: boolean;
	nodesExplored: number;
	algorithm: string;
}

// ---------------------------------------------------------------------------
// Tuning constants (pixels, cells, seconds)
// ---------------------------------------------------------------------------

/** Unit vectors for each cardinal direction (used for vision-cone math). */
export const DIRECTION_VECTORS: Record<Direction, Position> = {
	[Direction.UP]: { x: 0, y: -1 },
	[Direction.DOWN]: { x: 0, y: 1 },
	[Direction.LEFT]: { x: -1, y: 0 },
	[Direction.RIGHT]: { x: 1, y: 0 },
};

/** Player base movement speed (px/s). */
export const PLAYER_SPEED = 140;

/** Multiplier applied to `PLAYER_SPEED` while sprinting. */
export const PLAYER_SPRINT_MULTIPLIER = 1.6;

/** Guard movement speed per FSM state (px/s). */
export const GUARD_SPEEDS: Record<GuardState, number> = {
	[GuardState.PATROL]: 50,
	[GuardState.ALERT]: 75,
	[GuardState.CHASE]: 105,
	[GuardState.SEARCH]: 45,
};

/** How far the guard can see (grid cells, Euclidean). */
export const GUARD_VISION_RANGE = 6;

/** Full-angle arc of the vision cone (degrees). */
export const GUARD_VISION_ANGLE = 60;

/** Hearing radius while the player walks (grid cells, Manhattan). */
export const GUARD_HEARING_RANGE = 3;

/** Hearing radius while the player sprints (grid cells, Manhattan). */
export const GUARD_HEARING_SPRINT_RANGE = 6;

/** Seconds of lost visual contact before CHASE transitions to SEARCH. */
export const CHASE_LOSE_SIGHT_TIME = 2.0;

/** Seconds the guard spends wandering in SEARCH before returning to PATROL. */
export const SEARCH_DURATION = 5.0;

/** Seconds the guard pauses after reaching the ALERT investigation point. */
export const ALERT_PAUSE_TIME = 0.8;
