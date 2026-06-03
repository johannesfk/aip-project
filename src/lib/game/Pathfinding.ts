import { CellType, type Position, CELL_SIZE } from './types';

function key(p: Position): string {
	return `${p.x},${p.y}`;
}

function manhattan(a: Position, b: Position): number {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getNeighbors(grid: CellType[][], pos: Position): Position[] {
	const dirs = [
		{ x: 0, y: -1 },
		{ x: 0, y: 1 },
		{ x: -1, y: 0 },
		{ x: 1, y: 0 },
	];
	const result: Position[] = [];

	for (const d of dirs) {
		const nx = pos.x + d.x;
		const ny = pos.y + d.y;
		if (
			ny >= 0 &&
			ny < grid.length &&
			nx >= 0 &&
			nx < grid[0].length &&
			grid[ny][nx] !== CellType.WALL &&
			grid[ny][nx] !== CellType.COVER
		) {
			result.push({ x: nx, y: ny });
		}
	}

	return result;
}

function reconstructPath(cameFrom: Map<string, Position>, current: Position): Position[] {
	const path: Position[] = [current];
	let cur = current;
	while (cameFrom.has(key(cur))) {
		const prev = cameFrom.get(key(cur))!;
		path.unshift(prev);
		cur = prev;
	}
	return path;
}

export interface PathResult {
	path: Position[];
	nodesExplored: number;
}

export function aStar(
	grid: CellType[][],
	start: Position,
	goal: Position,
	allowCover: boolean = true,
): PathResult {
	const openSet: { pos: Position; f: number; g: number }[] = [];
	const cameFrom = new Map<string, Position>();
	const gScore = new Map<string, number>();
	const startKey = key(start);

	openSet.push({ pos: start, f: manhattan(start, goal), g: 0 });
	gScore.set(startKey, 0);

	let nodesExplored = 0;

	while (openSet.length > 0) {
		nodesExplored++;
		let lowestIdx = 0;
		for (let i = 1; i < openSet.length; i++) {
			if (openSet[i].f < openSet[lowestIdx].f) lowestIdx = i;
		}
		const current = openSet.splice(lowestIdx, 1)[0];

		if (current.pos.x === goal.x && current.pos.y === goal.y) {
			return { path: reconstructPath(cameFrom, current.pos), nodesExplored };
		}

		for (const neighbor of getNeighbors(grid, current.pos)) {
			const cellType = grid[neighbor.y][neighbor.x];
			if (cellType === CellType.COVER && !allowCover) continue;
			const tentativeG = current.g + 1;
			const nKey = key(neighbor);

			if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
				cameFrom.set(nKey, current.pos);
				gScore.set(nKey, tentativeG);
				openSet.push({
					pos: neighbor,
					f: tentativeG + manhattan(neighbor, goal),
					g: tentativeG,
				});
			}
		}
	}

	return { path: [], nodesExplored };
}

export function bfs(
	grid: CellType[][],
	start: Position,
	goal: Position,
): PathResult {
	const queue: Position[] = [start];
	const cameFrom = new Map<string, Position>();
	const visited = new Set<string>();
	visited.add(key(start));

	let nodesExplored = 0;

	while (queue.length > 0) {
		nodesExplored++;
		const current = queue.shift()!;

		if (current.x === goal.x && current.y === goal.y) {
			return { path: reconstructPath(cameFrom, current), nodesExplored };
		}

		for (const neighbor of getNeighbors(grid, current)) {
			const nKey = key(neighbor);
			if (!visited.has(nKey)) {
				visited.add(nKey);
				cameFrom.set(nKey, current);
				queue.push(neighbor);
			}
		}
	}

	return { path: [], nodesExplored };
}

export function cellCenter(cell: Position): Position {
	return {
		x: cell.x * CELL_SIZE + CELL_SIZE / 2,
		y: cell.y * CELL_SIZE + CELL_SIZE / 2,
	};
}

export function pixelToCell(px: number, py: number): Position {
	return {
		x: Math.floor(px / CELL_SIZE),
		y: Math.floor(py / CELL_SIZE),
	};
}
