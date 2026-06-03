// ---------------------------------------------------------------------------
// Level — Procedural grid generation and entity placement
// ---------------------------------------------------------------------------
// The level is a 30×20 grid divided into three horizontal zones separated
// by walls with deliberate gaps.  Three guards patrol one zone each, five
// keycards are scattered across the map, and the exit is tucked into the
// bottom-right corner behind the third zone.
// ---------------------------------------------------------------------------

import { CellType, Direction, type LevelData, type Position, type GuardDef } from './types';

/**
 * Build the 30 × 20 grid programmatically.
 *
 * Layout:
 *  - Border walls on all four edges.
 *  - Two horizontal dividing walls at rows 8 and 13, each with intentional
 *    gaps that the player must pass through.
 *  - A handful of interior COVER pillars that create interesting line-of-sight
 *    puzzles.
 */
function buildGrid(): CellType[][] {
	const H = 20;
	const W = 30;
	const grid: CellType[][] = [];

	for (let y = 0; y < H; y++) {
		const row: CellType[] = [];
		for (let x = 0; x < W; x++) {
			if (y === 0 || y === H - 1 || x === 0 || x === W - 1) {
				row.push(CellType.WALL); // Border
			} else if (y === 8 && (x < 13 || x > 16)) {
				row.push(CellType.WALL); // Upper dividing wall (gap at columns 13-16)
			} else if (y === 13 && x !== 4 && x !== 5 && x !== 6 && x !== 24 && x !== 25 && x !== 26) {
				row.push(CellType.WALL); // Lower dividing wall (gaps at 4-6 and 24-26)
			}
			// COVER pillars — block both movement and vision
			else if ((y === 4 || y === 5) && (x === 8 || x === 9 || x === 21)) {
				row.push(CellType.COVER); // Top-zone pillars
			} else if (y === 10 && (x === 9 || x === 20)) {
				row.push(CellType.COVER); // Middle-zone pillars
			} else if (y === 15 && x === 14) {
				row.push(CellType.COVER); // Bottom-zone pillar
			} else {
				row.push(CellType.EMPTY);
			}
		}
		grid.push(row);
	}
	return grid;
}

/**
 * Assemble the complete level definition: grid, player spawn, keycards,
 * exit, and three guard patrol routes.
 */
export function createLevel(): LevelData {
	const grid = buildGrid();

	const playerStart: Position = { x: 2, y: 2 };

	// Five keycards spread across all three zones.
	const keycardPositions: Position[] = [
		{ x: 6, y: 3 },
		{ x: 24, y: 3 },
		{ x: 15, y: 10 },
		{ x: 5, y: 16 },
		{ x: 26, y: 16 },
	];

	const exitPos: Position = { x: 27, y: 18 };

	// Each guard patrols a rectangular loop within its own zone.
	const guardDefs: GuardDef[] = [
		{
			// Top zone (rows 1-7)
			pos: { x: 20, y: 6 },
			facing: Direction.RIGHT,
			patrolRoute: [
				{ x: 3, y: 3 },
				{ x: 27, y: 3 },
				{ x: 27, y: 6 },
				{ x: 3, y: 6 },
			],
		},
		{
			// Middle zone (rows 9-12)
			pos: { x: 15, y: 10 },
			facing: Direction.RIGHT,
			patrolRoute: [
				{ x: 3, y: 10 },
				{ x: 27, y: 10 },
				{ x: 27, y: 11 },
				{ x: 3, y: 11 },
			],
		},
		{
			// Bottom zone (rows 14-18)
			pos: { x: 3, y: 15 },
			facing: Direction.RIGHT,
			patrolRoute: [
				{ x: 3, y: 15 },
				{ x: 27, y: 15 },
				{ x: 27, y: 17 },
				{ x: 3, y: 17 },
			],
		},
	];

	return { grid, playerStart, guardDefs, keycardPositions, exitPos };
}
