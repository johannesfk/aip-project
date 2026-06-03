import { CellType, Direction, type LevelData, type Position, type GuardDef } from './types';

function buildGrid(): CellType[][] {
	const H = 20;
	const W = 30;
	const grid: CellType[][] = [];

	for (let y = 0; y < H; y++) {
		const row: CellType[] = [];
		for (let x = 0; x < W; x++) {
			// Border walls
			if (y === 0 || y === H - 1 || x === 0 || x === W - 1) {
				row.push(CellType.WALL);
			}
			// Dividing wall at row 8 (gap in middle)
			else if (y === 8 && (x < 13 || x > 16)) {
				row.push(CellType.WALL);
			}
			// Dividing wall at row 13 (two gaps)
			else if (y === 13 && x !== 4 && x !== 5 && x !== 6 && x !== 24 && x !== 25 && x !== 26) {
				row.push(CellType.WALL);
			}
			// Some interior pillars for interesting LOS
			else if (y === 4 && (x === 8 || x === 21)) {
				row.push(CellType.COVER);
			} else if (y === 10 && (x === 9 || x === 20)) {
				row.push(CellType.COVER);
			} else if (y === 15 && x === 14) {
				row.push(CellType.COVER);
			} else {
				row.push(CellType.EMPTY);
			}
		}
		grid.push(row);
	}
	return grid;
}

export function createLevel(): LevelData {
	const grid = buildGrid();

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
			// Guard 1: patrols top zone (rows 1-7)
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
			// Guard 2: patrols middle zone (rows 9-12)
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
			// Guard 3: patrols bottom zone (rows 14-18)
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

	return { grid, playerStart, guardDefs, keycardPositions, exitPos };
}
