export const CELL_SIZE = 30;
export const GRID_WIDTH = 30;
export const GRID_HEIGHT = 20;

export enum CellType {
	EMPTY = 0,
	WALL = 1,
	COVER = 2,
}

export enum Direction {
	UP = 'UP',
	DOWN = 'DOWN',
	LEFT = 'LEFT',
	RIGHT = 'RIGHT',
}

export enum GuardState {
	PATROL = 'PATROL',
	ALERT = 'ALERT',
	CHASE = 'CHASE',
	SEARCH = 'SEARCH',
}

export interface Position {
	x: number;
	y: number;
}

export interface InputState {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
	sprint: boolean;
	restart: boolean;
}

export interface GuardEntity {
	id: number;
	pos: Position;
	state: GuardState;
	facing: Direction;
	patrolRoute: Position[];
	patrolIndex: number;
	lastKnownPlayerPos: Position | null;
	stateTimer: number;
	searchTimer: number;
	loseSightTimer: number;
	reachedTimer: number;
	path: Position[];
	pathIndex: number;
	speed: number;
	visionRange: number;
	visionAngle: number;
	hearingRange: number;
	nodesExplored: number;
}

export interface GuardDef {
	pos: Position;
	patrolRoute: Position[];
	facing: Direction;
}

export interface LevelData {
	grid: CellType[][];
	playerStart: Position;
	guardDefs: GuardDef[];
	keycardPositions: Position[];
	exitPos: Position;
}

export interface KeycardState {
	pos: Position;
	collected: boolean;
}

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
	message: string;
	showVisionCones: boolean;
	showHearingRadius: boolean;
	showPaths: boolean;
	nodesExplored: number;
	algorithm: string;
}

export const DIRECTION_VECTORS: Record<Direction, Position> = {
	[Direction.UP]: { x: 0, y: -1 },
	[Direction.DOWN]: { x: 0, y: 1 },
	[Direction.LEFT]: { x: -1, y: 0 },
	[Direction.RIGHT]: { x: 1, y: 0 },
};

export const PLAYER_SPEED = 140;
export const PLAYER_SPRINT_MULTIPLIER = 1.6;

export const GUARD_SPEEDS: Record<GuardState, number> = {
	[GuardState.PATROL]: 50,
	[GuardState.ALERT]: 75,
	[GuardState.CHASE]: 105,
	[GuardState.SEARCH]: 45,
};

export const GUARD_VISION_RANGE = 6;
export const GUARD_VISION_ANGLE = 60;
export const GUARD_HEARING_RANGE = 3;
export const GUARD_HEARING_SPRINT_RANGE = 6;
export const CHASE_LOSE_SIGHT_TIME = 2.0;
export const SEARCH_DURATION = 5.0;
export const ALERT_PAUSE_TIME = 0.8;
