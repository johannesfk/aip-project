// ---------------------------------------------------------------------------
// Level — Multi-level map parser and level definitions
// ---------------------------------------------------------------------------
// Levels are authored as 20×30 string arrays where each character is:
//   `#` = WALL   (blocks movement and vision)
//   `.` = EMPTY  (walkable, does not block vision)
//   `C` = COVER  (blocks movement and vision — impassable obstacle)
//   `E` = EXIT   (walkable, parsed as EMPTY — the exit position is extracted)
//
// Entity placements (player spawn, guards, keycards) are specified separately
// so that maps remain visually clean. The exit may be authored with `E` in the
// map or passed explicitly as `exitPos` (the explicit value is the fallback).
// ---------------------------------------------------------------------------

import { CellType, Direction, type LevelData, type Position, type GuardDef } from './types';

const H = 20;
const W = 30;

/** Parse a 20×30 string array into a `CellType` grid.  Any character that is
 *  not `.`, `C`, or `E` is treated as WALL.  The first `E` encountered is
 *  returned as the extracted exit position; it is rendered as EMPTY in the grid. */
function parseMap(rows: string[]): { grid: CellType[][]; exitPos: Position | null } {
	const grid: CellType[][] = [];
	let exitPos: Position | null = null;
	for (let y = 0; y < H; y++) {
		const row = rows[y] ?? '#'.repeat(W);
		const cells: CellType[] = [];
		for (let x = 0; x < W; x++) {
			const ch = row[x] ?? '#';
			if (ch === '.') cells.push(CellType.EMPTY);
			else if (ch === 'C') cells.push(CellType.COVER);
			else if (ch === 'E') {
				cells.push(CellType.EMPTY);
				if (!exitPos) exitPos = { x, y };
			} else cells.push(CellType.WALL);
		}
		grid.push(cells);
	}
	return { grid, exitPos };
}

export const TOTAL_LEVELS = 7;

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
		'#..........................E.#', // 18
		'##############################' // 19
	];
	const { grid, exitPos: mapExitPos } = parseMap(map);
	const playerStart: Position = { x: 2, y: 2 };
	const keycardPositions: Position[] = [
		{ x: 6, y: 3 },
		{ x: 24, y: 3 },
		{ x: 15, y: 10 },
		{ x: 5, y: 16 },
		{ x: 26, y: 16 }
	];
	const exitPos = mapExitPos ?? { x: 27, y: 18 };
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
// Level 2 — "The Courtyard" (open space with scattered cover pillars)
// ========================================================================
function level2(): LevelData {
	const map = [
		// 0         1         2
		// 012345678901234567890123456789
		'##############################', // 0
		'#............................#', // 1
		'#....CC.......CC.............#', // 2
		'#....CC.......CC.............#', // 3
		'#............................#', // 4
		'#............................#', // 5
		'#.........CC.................#', // 6
		'#.........CC.................#', // 7
		'#............................#', // 8
		'#............................#', // 9
		'#....CC.........CC...........#', // 10
		'#....CC.........CC...........#', // 11
		'#............................#', // 12
		'#............................#', // 13
		'#.......CC........CC.........#', // 14
		'#.......CC........CC.........#', // 15
		'#............................#', // 16
		'#............................#', // 17
		'#............E...............#', // 18
		'##############################' // 19
	];
	const { grid, exitPos: mapExitPos } = parseMap(map);
	const playerStart: Position = { x: 2, y: 2 };
	const keycardPositions: Position[] = [
		{ x: 27, y: 2 },
		{ x: 2, y: 18 },
		{ x: 15, y: 10 }
	];
	const exitPos = mapExitPos ?? { x: 27, y: 18 };
	const guardDefs: GuardDef[] = [
		{
			pos: { x: 7, y: 5 },
			facing: Direction.RIGHT,
			patrolRoute: [
				{ x: 3, y: 5 },
				{ x: 25, y: 5 }
			]
		},
		{
			pos: { x: 20, y: 13 },
			facing: Direction.DOWN,
			patrolRoute: [
				{ x: 20, y: 9 },
				{ x: 20, y: 16 }
			]
		}
	];
	return { name: LEVEL_NAMES[1], grid, playerStart, guardDefs, keycardPositions, exitPos };
}

// ========================================================================
// Level 3 — "The Corridor" (S-shaped corridor with side rooms)
// ========================================================================
function level3(): LevelData {
	const map = [
		// 0         1         2
		// 012345678901234567890123456789
		'##############################', // 0
		'#............................#', // 1
		'#............................#', // 2
		'#.....................########', // 3
		'#.................#...#......#', // 4
		'#.................#...#.CC...#', // 5
		'#.................#...#.CC...#', // 6
		'#.................#...#......#', // 7
		'#.................#...#......#', // 8
		'##########...................#', // 9
		'#........#..#................#', // 10
		'#........#..#................#', // 11
		'#........#..#................#', // 12
		'#........#..#................#', // 13
		'#........#..#................#', // 14
		'###########..................#', // 15
		'#............................#', // 16
		'#............................#', // 17
		'#..........................E.#', // 18
		'##############################' // 19
	];
	const { grid, exitPos: mapExitPos } = parseMap(map);
	const playerStart: Position = { x: 2, y: 1 };
	const keycardPositions: Position[] = [
		{ x: 7, y: 2 },
		{ x: 15, y: 10 },
		{ x: 25, y: 17 }
	];
	const exitPos = mapExitPos ?? { x: 27, y: 18 };
	const guardDefs: GuardDef[] = [
		{
			pos: { x: 12, y: 2 },
			facing: Direction.RIGHT,
			patrolRoute: [
				{ x: 3, y: 2 },
				{ x: 18, y: 2 }
			]
		},
		{
			pos: { x: 20, y: 16 },
			facing: Direction.LEFT,
			patrolRoute: [
				{ x: 15, y: 16 },
				{ x: 27, y: 16 }
			]
		}
	];
	return { name: LEVEL_NAMES[2], grid, playerStart, guardDefs, keycardPositions, exitPos };
}

// ========================================================================
// Level 4 — "The Barracks" (alcoves off a main corridor)
// ========================================================================
function level4(): LevelData {
	const map = [
		// 0         1         2
		// 012345678901234567890123456789
		'##############################', // 0
		'#............................#', // 1
		'#............................#', // 2
		'#............................#', // 3
		'#.#####..#####....#####......#', // 4
		'#.#...#..#...#....#...#......#', // 5
		'#.#...#..#...#....#...#...#..#', // 6
		'#.#.C.#..#...#....#.C.#...#..#', // 7
		'#.#...#..#...#....#...#####..#', // 8
		'#............................#', // 9
		'#............................#', // 10
		'#.#...#..#...#....#...###....#', // 11
		'#.#...#..#.CC#....#...#......#', // 12
		'#.#...#..#...#....#...#......#', // 13
		'#.#...#..#...#.#..#...#...####', // 14
		'#.#####..#####.#..#####......#', // 15
		'#..............#............E#', // 16
		'#..............#.............#', // 17
		'#..............#.............#', // 18
		'##############################' // 19
	];
	const { grid, exitPos: mapExitPos } = parseMap(map);
	const playerStart: Position = { x: 2, y: 1 };
	const keycardPositions: Position[] = [
		{ x: 4, y: 6 },
		{ x: 12, y: 14 },
		{ x: 20, y: 13 }
	];
	const exitPos = mapExitPos ?? { x: 27, y: 18 };
	const guardDefs: GuardDef[] = [
		{
			pos: { x: 5, y: 9 },
			facing: Direction.RIGHT,
			patrolRoute: [
				{ x: 2, y: 9 },
				{ x: 8, y: 2 },
				{ x: 16, y: 2 }
			]
		},
		{
			pos: { x: 12, y: 10 },
			facing: Direction.RIGHT,
			patrolRoute: [
				{ x: 4, y: 12 },
				{ x: 3, y: 17 },
				{ x: 15, y: 10 }
			]
		},
		{
			pos: { x: 20, y: 9 },
			facing: Direction.RIGHT,
			patrolRoute: [
				{ x: 17, y: 9 },
				{ x: 20, y: 2 },
				{ x: 26, y: 9 }
			]
		}
	];
	return { name: LEVEL_NAMES[3], grid, playerStart, guardDefs, keycardPositions, exitPos };
}

// ========================================================================
// Level 5 — "The Warehouse" (open center with cover pillars)
// ========================================================================
function level5(): LevelData {
	const map = [
		// 0         1         2
		// 012345678901234567890123456789
		'##############################', // 0
		'#............................#', // 1
		'#...######################...#', // 2
		'#...#....................#...#', // 3
		'#...#....................#...#', // 4
		'#...#..C....C....C....C..#...#', // 5
		'#...#....................#...#', // 6
		'#...#....................#...#', // 7
		'#...#....C.....C....C....#...#', // 8
		'#...#....................#...#', // 9
		'#...#....................#...#', // 10
		'#...#..C....C....C....C..#...#', // 11
		'#...#....................#...#', // 12
		'#...#....................#...#', // 13
		'#...#.....C....C.........#...#', // 14
		'#...#########....#########...#', // 15
		'#............................#', // 16
		'#............................#', // 17
		'#.............E..............#', // 18
		'##############################' // 19
	];
	const { grid, exitPos: mapExitPos } = parseMap(map);
	const playerStart: Position = { x: 10, y: 18 };
	const keycardPositions: Position[] = [
		{ x: 5, y: 3 },
		{ x: 24, y: 3 },
		{ x: 15, y: 13 },
		{ x: 24, y: 13 }
	];
	const exitPos = mapExitPos ?? { x: 27, y: 18 };
	const guardDefs: GuardDef[] = [
		{
			pos: { x: 3, y: 1 },
			facing: Direction.RIGHT,
			patrolRoute: [
				{ x: 2, y: 17 },
				{ x: 20, y: 17 },
				{ x: 27, y: 1 },
				{ x: 2, y: 1 }
			]
		},
		{
			pos: { x: 12, y: 6 },
			facing: Direction.RIGHT,
			patrolRoute: [
				{ x: 6, y: 6 },
				{ x: 24, y: 6 }
			]
		},
		{
			pos: { x: 12, y: 10 },
			facing: Direction.LEFT,
			patrolRoute: [
				{ x: 6, y: 10 },
				{ x: 24, y: 10 }
			]
		}
	];
	return { name: LEVEL_NAMES[4], grid, playerStart, guardDefs, keycardPositions, exitPos };
}

// ========================================================================
// Level 6 — "The Cells" (dense grid of small rooms)
// ========================================================================
function level6(): LevelData {
	const map = [
		// 0         1         2
		// 012345678901234567890123456789
		'##############################', // 0
		'#..........#...#......#......#', // 1
		'#..........#...#......#......#', // 2
		'########.......#..##..#..#...#', // 3
		'#......#...#...#..##..#..#...#', // 4
		'#......#...#####..##.....#####', // 5
		'#...#..#...#.......#.....#...#', // 6
		'#...#......#..CCC..####..#...#', // 7
		'#...#......#...C......#......#', // 8
		'#.######...#.....C....#......#', // 9
		'#......#..####...CC...#..#...#', // 10
		'#......#..#..#......E.#..#...#', // 11
		'#.........#..#####....#..#####', // 12
		'#.........#......######......#', // 13
		'########..#...#..#...........#', // 14
		'#......C..#...#..#..###..#####', // 15
		'#......C..#####..#..#........#', // 16
		'#...................#........#', // 17
		'#...................#......E.#', // 18
		'##############################' // 19
	];
	const { grid, exitPos: mapExitPos } = parseMap(map);
	const playerStart: Position = { x: 2, y: 2 };
	const keycardPositions: Position[] = [
		{ x: 13, y: 2 },
		{ x: 3, y: 6 },
		{ x: 2, y: 16 },
		{ x: 12, y: 14 },
		{ x: 28, y: 3 },
		{ x: 27, y: 17 }
	];
	const exitPos = mapExitPos ?? { x: 27, y: 18 };
	const guardDefs: GuardDef[] = [
		// {
		// 	pos: { x: 12, y: 3 },
		// 	facing: Direction.RIGHT,
		// 	patrolRoute: [
		// 		{ x: 12, y: 3 },
		// 		{ x: 5, y: 17 },
		// 		{ x: 13, y: 13 },
		// 		{ x: 26, y: 2 },
		// 		{ x: 24, y: 16 }
		// 	]
		// },
		// {
		// 	pos: { x: 8, y: 1 },
		// 	facing: Direction.DOWN,
		// 	patrolRoute: [
		// 		{ x: 9, y: 4 },
		// 		{ x: 2, y: 8 },
		// 		{ x: 5, y: 12 }
		// 	]
		// },
		// {
		// 	pos: { x: 18, y: 7 },
		// 	facing: Direction.DOWN,
		// 	patrolRoute: [
		// 		{ x: 12, y: 7 },
		// 		{ x: 20, y: 10 },
		// 		{ x: 17, y: 4 }
		// 	]
		// },
		// {
		// 	pos: { x: 17, y: 4 },
		// 	facing: Direction.RIGHT,
		// 	patrolRoute: [
		// 		{ x: 17, y: 2 },
		// 		{ x: 27, y: 8 }
		// 	]
		// }
	];
	return { name: LEVEL_NAMES[5], grid, playerStart, guardDefs, keycardPositions, exitPos };
}

// ========================================================================
// Level 8 — "The Crossroads" (plus sign with four wings)
// ========================================================================
function level8(): LevelData {
	const map = [
		// 0         1         2
		// 012345678901234567890123456789
		'##############################', // 0
		'#..........###..###..........#', // 1
		'#..........#......#..........#', // 2
		'#..........#......#..........#', // 3
		'#..........#......#..........#', // 4
		'#..........#......#..........#', // 5
		'#..........###..###..........#', // 6
		'#..........###..###..........#', // 7
		'#.##.#####...................#', // 8
		'#.#...#.......E......C..C....#', // 9
		'#.#...#..............C..C....#', // 10
		'#.######.#...................#', // 11
		'#..........###..###..........#', // 12
		'#..........###..###..........#', // 13
		'#..........###..###..........#', // 14
		'#..........###..###..........#', // 15
		'#..........###..###..........#', // 16
		'#..........###..###..........#', // 17
		'#..........###..###..........#', // 18
		'##############################' // 19
	];
	const { grid, exitPos: mapExitPos } = parseMap(map);
	const playerStart: Position = { x: 2, y: 1 };
	const keycardPositions: Position[] = [
		{ x: 2, y: 4 },
		{ x: 14, y: 3 },
		{ x: 14, y: 17 },
		{ x: 25, y: 9 }
	];
	const exitPos = mapExitPos ?? { x: 14, y: 9 };
	const guardDefs: GuardDef[] = [
		{
			pos: { x: 2, y: 6 },
			facing: Direction.DOWN,
			patrolRoute: [
				{ x: 2, y: 1 },
				{ x: 2, y: 7 }
			]
		},
		{
			pos: { x: 14, y: 2 },
			facing: Direction.DOWN,
			patrolRoute: [
				{ x: 14, y: 1 },
				{ x: 14, y: 5 }
			]
		},
		{
			pos: { x: 14, y: 16 },
			facing: Direction.DOWN,
			patrolRoute: [
				{ x: 14, y: 12 },
				{ x: 14, y: 18 }
			]
		},
		{
			pos: { x: 22, y: 9 },
			facing: Direction.DOWN,
			patrolRoute: [
				{ x: 20, y: 9 },
				{ x: 26, y: 9 }
			]
		}
	];
	return { name: LEVEL_NAMES[7], grid, playerStart, guardDefs, keycardPositions, exitPos };
}

const levelBuilders: (() => LevelData)[] = [level2, level3, level4, level5, level6, level1, level8];

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
