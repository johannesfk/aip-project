// ---------------------------------------------------------------------------
// Pathfinding — A* and BFS implementations with node-counting
// ---------------------------------------------------------------------------
// Both algorithms operate on a uniform-cost grid (all edges cost 1).
// They exclude WALL and COVER cells from the neighbour set, producing
// identical results but very different node-exploration profiles.
// The `PathResult.nodesExplored` counter is used for the in-game
// comparison between algorithms.
// ---------------------------------------------------------------------------

import { CellType, type Position, CELL_SIZE } from './types';

/** Compact string key for use in `Map` and `Set`. */
function key(p: Position): string {
	return `${p.x},${p.y}`;
}

/** Chebyshev distance heuristic — admissible on an 8-connected uniform-cost grid. */
function chebyshev(a: Position, b: Position): number {
	return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/**
 * Return the 8-connected neighbours of `pos` that are inside the grid
 * bounds and are **not** walls or cover cells.
 *
 * Diagonal moves are only allowed when both adjacent cardinal cells are
 * walkable, preventing the guard from cutting through wall corners.
 */
function getNeighbors(grid: CellType[][], pos: Position): Position[] {
	const dirs = [
		{ x: 0, y: -1, diagonal: false },
		{ x: 0, y: 1, diagonal: false },
		{ x: -1, y: 0, diagonal: false },
		{ x: 1, y: 0, diagonal: false },
		{ x: -1, y: -1, diagonal: true },
		{ x: 1, y: -1, diagonal: true },
		{ x: -1, y: 1, diagonal: true },
		{ x: 1, y: 1, diagonal: true }
	];
	const result: Position[] = [];

	for (const d of dirs) {
		const nx = pos.x + d.x;
		const ny = pos.y + d.y;

		// Grid bounds and cell walkability.
		if (
			ny < 0 ||
			ny >= grid.length ||
			nx < 0 ||
			nx >= grid[0].length ||
			grid[ny][nx] === CellType.WALL ||
			grid[ny][nx] === CellType.COVER
		) {
			continue;
		}

		// Corner-cutting prevention for diagonals.
		if (d.diagonal) {
			const cx1 = pos.x + d.x;
			const cy1 = pos.y;
			const cx2 = pos.x;
			const cy2 = pos.y + d.y;
			if (
				grid[cy1][cx1] === CellType.WALL ||
				grid[cy1][cx1] === CellType.COVER ||
				grid[cy2][cx2] === CellType.WALL ||
				grid[cy2][cx2] === CellType.COVER
			) {
				continue;
			}
		}

		result.push({ x: nx, y: ny });
	}

	return result;
}

/** Walk backward through `cameFrom` to build the path from start to goal. */
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

/** Return value shared by both pathfinding functions. */
export interface PathResult {
	/** Ordered list of grid cells from start to goal (inclusive).  Empty if no path. */
	path: Position[];
	/** How many nodes were popped from the frontier before finding the goal. */
	nodesExplored: number;
}

/**
 * A\* search on a uniform-cost 8-connected grid.
 *
 * Uses the Chebyshev distance as an admissible heuristic.  The open set
 * is managed with a linear scan (sufficient for a 30×20 grid).
 */
export function aStar(grid: CellType[][], start: Position, goal: Position): PathResult {
	// f(n) = g(n) + h(n)
	const openSet: { pos: Position; f: number; g: number }[] = [];
	const cameFrom = new Map<string, Position>();
	const gScore = new Map<string, number>();
	const startKey = key(start);

	openSet.push({ pos: start, f: chebyshev(start, goal), g: 0 });
	gScore.set(startKey, 0);

	let nodesExplored = 0;

	while (openSet.length > 0) {
		nodesExplored++;

		// Find the node with the lowest f-score (linear scan).
		let lowestIdx = 0;
		for (let i = 1; i < openSet.length; i++) {
			if (openSet[i].f < openSet[lowestIdx].f) lowestIdx = i;
		}
		const current = openSet.splice(lowestIdx, 1)[0];

		// Goal test.
		if (current.pos.x === goal.x && current.pos.y === goal.y) {
			return { path: reconstructPath(cameFrom, current.pos), nodesExplored };
		}

		for (const neighbor of getNeighbors(grid, current.pos)) {
			const tentativeG = current.g + 1; // all edges cost 1
			const nKey = key(neighbor);

			if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
				cameFrom.set(nKey, current.pos);
				gScore.set(nKey, tentativeG);
				openSet.push({
					pos: neighbor,
					f: tentativeG + chebyshev(neighbor, goal),
					g: tentativeG
				});
			}
		}
	}

	// No path found.
	return { path: [], nodesExplored };
}

/**
 * Breadth-First Search — guaranteed to find the shortest path on a
 * uniform-cost graph, but explores many more nodes than A\*.
 */
export function bfs(grid: CellType[][], start: Position, goal: Position): PathResult {
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

/** Convert a grid-cell position to the pixel position at the cell's center. */
export function cellCenter(cell: Position): Position {
	return {
		x: cell.x * CELL_SIZE + CELL_SIZE / 2,
		y: cell.y * CELL_SIZE + CELL_SIZE / 2
	};
}

/** Convert a pixel position to the containing grid-cell coordinates. */
export function pixelToCell(px: number, py: number): Position {
	return {
		x: Math.floor(px / CELL_SIZE),
		y: Math.floor(py / CELL_SIZE)
	};
}
