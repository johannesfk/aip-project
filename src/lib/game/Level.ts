// ---------------------------------------------------------------------------
// Level — Multi-level map parser and level definitions
// ---------------------------------------------------------------------------
// Levels are authored as 20×30 string arrays where each character is:
//   `#` = WALL   (blocks movement and vision)
//   `.` = EMPTY  (walkable, does not block vision)
//   `C` = COVER  (blocks movement and vision — impassable obstacle)
//
// Entity placements (player spawn, guards, keycards, exit) are specified
// separately so that maps remain visually clean.
// ---------------------------------------------------------------------------

import { CellType, Direction, type LevelData, type Position, type GuardDef } from './types';

const H = 20;
const W = 30;

/** Parse a 20×30 string array into a `CellType` grid.  Any character that is
 *  not `.` or `C` is treated as WALL. */
function parseMap(rows: string[]): CellType[][] {
	const grid: CellType[][] = [];
	for (let y = 0; y < H; y++) {
		const row = rows[y] ?? '#'.repeat(W);
		const cells: CellType[] = [];
		for (let x = 0; x < W; x++) {
			const ch = row[x] ?? '#';
			if (ch === '.') cells.push(CellType.EMPTY);
			else if (ch === 'C') cells.push(CellType.COVER);
			else cells.push(CellType.WALL);
		}
		grid.push(cells);
	}
	return grid;
}

export const TOTAL_LEVELS = 10;

export const LEVEL_NAMES: string[] = [
	'Level 1',
	'Level 2',
	'Level 3',
	'Level 4',
	'Level 5',
	'Level 6',
	'Level 7',
	'Level 8',
	'Level 9',
	'Level 10'
];

// ========================================================================
// Level 1 — Three horizontal rooms (original layout)
// ========================================================================
function level1(): LevelData {
	const map = [
		// 0         1         2
		// 012345678901234567890123456789
		'##############################', // 0
		'#............................#', // 1
		'#............................#', // 2
		'#............................#', // 3
		'#.......CC...........C.......#', // 4
		'#.......C............C.......#', // 5
		'#............................#', // 6
		'#............................#', // 7
		'############....##############', // 8
		'#............................#', // 9
		'#......C............C........#', // 10
		'#...................C........#', // 11
		'#............................#', // 12
		'####...#################...###', // 13
		'#............................#', // 14
		'#.............C..............#', // 15
		'#............................#', // 16
		'#............................#', // 17
		'#............................#', // 18
		'##############################' // 19
	];
	const grid = parseMap(map);
	const playerStart: Position = { x: 2, y: 2 };
	const keycardPositions: Position[] = [
		{ x: 6, y: 3 },
		{ x: 24, y: 3 },
		{ x: 15, y: 10 },
		{ x: 5, y: 16 },
		{ x: 26, y: 16 }
	];
	const exitPos: Position = { x: 27, y: 18 };
	const guardDefs: GuardDef[] = [
		{
			pos: { x: 20, y: 6 },
			facing: Direction.RIGHT,
			patrolRoute: [
				{ x: 3, y: 3 },
				{ x: 27, y: 3 },
				{ x: 27, y: 6 },
				{ x: 3, y: 6 }
			]
		},
		{
			pos: { x: 15, y: 10 },
			facing: Direction.RIGHT,
			patrolRoute: [
				{ x: 3, y: 10 },
				{ x: 27, y: 10 },
				{ x: 27, y: 11 },
				{ x: 3, y: 11 }
			]
		},
		{
			pos: { x: 3, y: 15 },
			facing: Direction.RIGHT,
			patrolRoute: [
				{ x: 3, y: 15 },
				{ x: 27, y: 15 },
				{ x: 27, y: 17 },
				{ x: 3, y: 17 }
			]
		}
	];
	return { name: LEVEL_NAMES[0], grid, playerStart, guardDefs, keycardPositions, exitPos };
}

// ========================================================================
// Level 2 — Open courtyard with scattered cover pillars
// ========================================================================
function level2(): LevelData {
	const map = [
		'##############################',
		'#............................#',
		'#......C.........C...........#',
		'#......C.........C...........#',
		'#............................#',
		'#............................#',
		'#............................#',
		'#............................#',
		'#......C.........C...........#',
		'#......C.........C...........#',
		'#............................#',
		'#............................#',
		'#............................#',
		'#......C.........C...........#',
		'#......C.........C...........#',
		'#............................#',
		'#............................#',
		'#............................#',
		'#............................#',
		'##############################'
	];
	const grid = parseMap(map);
	const playerStart: Position = { x: 2, y: 2 };
	const keycardPositions: Position[] = [
		{ x: 27, y: 2 },
		{ x: 2, y: 18 }
	];
	const exitPos: Position = { x: 27, y: 18 };
	const guardDefs: GuardDef[] = [
		{
			pos: { x: 15, y: 10 },
			facing: Direction.RIGHT,
			patrolRoute: [
				{ x: 5, y: 10 },
				{ x: 25, y: 10 }
			]
		}
	];
	return { name: LEVEL_NAMES[1], grid, playerStart, guardDefs, keycardPositions, exitPos };
}

// ========================================================================
// Placeholder levels 3–10 — minimal open box so the menu & progression
// system can be tested before the real maps are designed.
// ========================================================================
function placeholderLevel(index: number): LevelData {
	const map: string[] = [];
	for (let y = 0; y < H; y++) {
		if (y === 0 || y === H - 1) {
			map.push('#'.repeat(W));
		} else {
			map.push('#' + '.'.repeat(W - 2) + '#');
		}
	}
	const grid = parseMap(map);
	const playerStart: Position = { x: 2, y: 2 };
	const keycardPositions: Position[] = [{ x: 27, y: 2 }];
	const exitPos: Position = { x: 27, y: 18 };
	const guardDefs: GuardDef[] = [];
	return {
		name: LEVEL_NAMES[index] ?? `Level ${index + 1}`,
		grid,
		playerStart,
		guardDefs,
		keycardPositions,
		exitPos
	};
}

const levelBuilders: (() => LevelData)[] = [
	level1,
	level2,
	() => placeholderLevel(2),
	() => placeholderLevel(3),
	() => placeholderLevel(4),
	() => placeholderLevel(5),
	() => placeholderLevel(6),
	() => placeholderLevel(7),
	() => placeholderLevel(8),
	() => placeholderLevel(9)
];

/**
 * Build a `LevelData` instance for the given zero-based index.
 *
 * @throws if the index is out of range (`0` to `TOTAL_LEVELS - 1`).
 */
export function createLevel(index: number): LevelData {
	if (index < 0 || index >= TOTAL_LEVELS) {
		throw new Error(`Level index ${index} out of range (0–${TOTAL_LEVELS - 1})`);
	}
	return levelBuilders[index]();
}
