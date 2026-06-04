// ---------------------------------------------------------------------------
// Renderer — Canvas 2D rendering for the Stealth Patrol game
// ---------------------------------------------------------------------------
// Draw order (back to front):
//   1. Background fill
//   2. Floor tiles + grid lines
//   3. Walls & cover (terrain)
//   4. Keycards (pulsing collectibles)
//   5. Exit (changes state when all keycards are collected)
//   6. Guard paths / vision cones / hearing radii (debug toggles)
//   7. Guard bodies + state indicators
//   8. Player
//   9. UI overlay (HUD + messages)
//  10. Pause / game-over overlay
// ---------------------------------------------------------------------------

import {
	CellType,
	GuardState,
	type GameState,
	type GuardEntity,
	type KeycardState,
	CELL_SIZE,
	GRID_WIDTH,
	GRID_HEIGHT,
	GUARD_HEARING_SPRINT_RANGE
} from './types';

// ---- Color palette ---------------------------------

const COLORS = {
	bg: '#0a0a1a',
	floor: '#0f0f23',
	gridLine: '#151530',
	wall: '#1a2a3a',
	wallBorder: '#2a3a4a',
	cover: '#1a2535',
	coverPattern: '#243040',
	player: '#4fc3f7',
	playerOutline: '#039be5',
	guard: '#ff5252',
	guardOutline: '#d32f2f',
	guardPatrol: '#4caf50',
	guardAlert: '#ffeb3b',
	guardChase: '#ff5252',
	guardSearch: '#ff9800',
	visionCone: 'rgba(255, 82, 82, 0.12)',
	hearingRadius: 'rgba(255, 171, 64, 0.08)',
	hearingRadiusActive: 'rgba(255, 171, 64, 0.15)',
	keycard: '#ffd740',
	keycardGlow: 'rgba(255, 215, 64, 0.3)',
	exit: '#69f0ae',
	exitGlow: 'rgba(105, 240, 174, 0.3)',
	pathLine: 'rgba(255, 82, 82, 0.4)',
	uiText: '#e0e0e0',
	uiBg: 'rgba(0, 0, 0, 0.7)',
	overlayBg: 'rgba(0, 0, 0, 0.1)',
	messageText: '#ffffff'
};

// ---- Helpers --------------------------------------------------------------

// ---- Renderer class -------------------------------------------------------

export class Renderer {
	private ctx: CanvasRenderingContext2D;
	private grid: CellType[][];
	private width: number;
	private height: number;

	/** Elapsed time accumulator used for pulsing animations (keycards, hearing). */
	private time: number = 0;

	constructor(ctx: CanvasRenderingContext2D, grid: CellType[][]) {
		this.ctx = ctx;
		this.grid = grid;
		this.width = GRID_WIDTH * CELL_SIZE;
		this.height = GRID_HEIGHT * CELL_SIZE;
	}

	/**
	 * Draw a complete frame.
	 *
	 * @param state Deep-cloned game snapshot (read-only for the renderer).
	 * @param dt    Delta time since last frame (seconds).
	 */
	render(state: GameState, dt: number): void {
		this.time += dt;
		const ctx = this.ctx;

		ctx.clearRect(0, 0, this.width, this.height);
		ctx.fillStyle = COLORS.bg;
		ctx.fillRect(0, 0, this.width, this.height);

		this.drawGrid();
		this.drawWallsAndCover();
		this.drawKeycards(state.keycards);
		this.drawExit(state);
		this.drawGuards(state);
		this.drawPlayer(state);
		this.drawUI(state);

		// Overlays — game-over handled by Svelte UI, kept here as fallback.
		if (state.gameOver) {
			this.drawOverlay(state);
		}
	}

	// ---- Terrain -----------------------------------------------------------

	/** Fill every cell with the floor colour and draw thin grid lines. */
	private drawGrid(): void {
		const ctx = this.ctx;
		for (let y = 0; y < GRID_HEIGHT; y++) {
			for (let x = 0; x < GRID_WIDTH; x++) {
				const px = x * CELL_SIZE;
				const py = y * CELL_SIZE;
				ctx.fillStyle = COLORS.floor;
				ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
				ctx.strokeStyle = COLORS.gridLine;
				ctx.lineWidth = 0.5;
				ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
			}
		}
	}

	/** Iterate over the grid and draw every WALL and COVER cell. */
	private drawWallsAndCover(): void {
		for (let y = 0; y < GRID_HEIGHT; y++) {
			for (let x = 0; x < GRID_WIDTH; x++) {
				if (this.grid[y][x] === CellType.WALL) {
					this.drawWall(x, y);
				} else if (this.grid[y][x] === CellType.COVER) {
					this.drawCover(x, y);
				}
			}
		}
	}

	/** Dark solid block with a lighter inset border. */
	private drawWall(x: number, y: number): void {
		const ctx = this.ctx;
		const px = x * CELL_SIZE;
		const py = y * CELL_SIZE;
		ctx.fillStyle = COLORS.wall;
		ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
		ctx.strokeStyle = COLORS.wallBorder;
		ctx.lineWidth = 1;
		ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
	}

	/** Similar to a wall but with a cross-hatch pattern to distinguish it visually. */
	private drawCover(x: number, y: number): void {
		const ctx = this.ctx;
		const px = x * CELL_SIZE;
		const py = y * CELL_SIZE;
		ctx.fillStyle = COLORS.cover;
		ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
		ctx.strokeStyle = COLORS.coverPattern;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(px + 4, py + 4);
		ctx.lineTo(px + CELL_SIZE - 4, py + CELL_SIZE - 4);
		ctx.moveTo(px + CELL_SIZE - 4, py + 4);
		ctx.lineTo(px + 4, py + CELL_SIZE - 4);
		ctx.stroke();
		ctx.strokeStyle = COLORS.wallBorder;
		ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
	}

	// ---- Entities ----------------------------------------------------------

	/** Pulsing yellow collectibles.  Collected keycards are hidden. */
	private drawKeycards(keycards: KeycardState[]): void {
		const ctx = this.ctx;
		const pulse = Math.sin(this.time * 3) * 0.3 + 0.7;

		for (const k of keycards) {
			if (k.collected) continue;
			const cx = k.pos.x * CELL_SIZE + CELL_SIZE / 2;
			const cy = k.pos.y * CELL_SIZE + CELL_SIZE / 2;
			const r = 6 + pulse * 3;

			ctx.fillStyle = COLORS.keycardGlow;
			ctx.beginPath();
			ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
			ctx.fill();

			ctx.fillStyle = COLORS.keycard;
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			ctx.fill();

			ctx.fillStyle = '#fff';
			ctx.beginPath();
			ctx.arc(cx, cy, 2, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	/**
	 * Draw the exit cell.  When all keycards are collected it glows bright
	 * green and shows "EXIT"; otherwise it displays a locked "X".
	 */
	private drawExit(state: GameState): void {
		const ctx = this.ctx;
		const pos = state.exitPos;
		const px = pos.x * CELL_SIZE;
		const py = pos.y * CELL_SIZE;
		const allCollected = state.collectedCount >= state.totalKeycards;

		const glowColor = allCollected ? COLORS.exitGlow : 'rgba(105, 240, 174, 0.1)';
		ctx.fillStyle = glowColor;
		ctx.fillRect(px - 3, py - 3, CELL_SIZE + 6, CELL_SIZE + 6);

		ctx.strokeStyle = allCollected ? COLORS.exit : '#2a5a3a';
		ctx.lineWidth = allCollected ? 2 : 1;
		ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);

		if (allCollected) {
			ctx.fillStyle = COLORS.exit;
			ctx.font = `bold ${CELL_SIZE * 0.45}px monospace`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('EXIT', px + CELL_SIZE / 2, py + CELL_SIZE / 2);
		} else {
			ctx.fillStyle = '#2a5a3a';
			ctx.font = `${CELL_SIZE * 0.5}px monospace`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('X', px + CELL_SIZE / 2, py + CELL_SIZE / 2);
		}
	}

	// ---- Guards ------------------------------------------------------------

	/** Draw debug overlays first (behind the guard body), then the guard itself. */
	private drawGuards(state: GameState): void {
		for (const guard of state.guards) {
			if (state.showPaths) this.drawPath(guard);
			if (state.showVisionCones) this.drawVisionCone(guard);
			if (state.showHearingRadius) this.drawHearingRadius(guard, state.playerSprinting);
			this.drawGuardBody(guard);
			this.drawStateIndicator(guard);
		}
	}

	/** Red diamond body with a white "eye" indicating facing direction. */
	private drawGuardBody(guard: GuardEntity): void {
		const ctx = this.ctx;
		const px = guard.pos.x;
		const py = guard.pos.y;
		const r = 10;

		ctx.fillStyle = COLORS.guard;
		ctx.strokeStyle = COLORS.guardOutline;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(px, py - r);
		ctx.lineTo(px + r, py);
		ctx.lineTo(px, py + r);
		ctx.lineTo(px - r, py);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		const facingAngle = guard.facing + guard.facingSway;
		const eyeX = px + Math.cos(facingAngle) * r * 0.5;
		const eyeY = py + Math.sin(facingAngle) * r * 0.5;
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(eyeX, eyeY, 2.5, 0, Math.PI * 2);
		ctx.fill();
	}

	/**
	 * Coloured dot + ring above the guard, matching the active FSM state:
	 *   Green  = PATROL
	 *   Yellow = ALERT
	 *   Red    = CHASE
	 *   Orange = SEARCH
	 */
	private drawStateIndicator(guard: GuardEntity): void {
		const ctx = this.ctx;
		const px = guard.pos.x;
		const py = guard.pos.y;

		const stateColors: Record<GuardState, string> = {
			[GuardState.PATROL]: COLORS.guardPatrol,
			[GuardState.ALERT]: COLORS.guardAlert,
			[GuardState.CHASE]: COLORS.guardChase,
			[GuardState.SEARCH]: COLORS.guardSearch
		};

		const color = stateColors[guard.state];

		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(px, py - 14, 3.5, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.globalAlpha = 0.5;
		ctx.beginPath();
		ctx.arc(px, py - 14, 5.5, 0, Math.PI * 2);
		ctx.stroke();
		ctx.globalAlpha = 1;
	}

	// ---- Vision cone (ray-cast, occlusion-aware) --------------------------

	/**
	 * Draw the guard's vision cone using raycasting so that walls and cover
	 * cells physically block (occlude) the visible area.
	 *
	 * Algorithm:
	 *   1. Cast `numRays` rays at evenly spaced angles across the vision arc.
	 *   2. Step each ray forward by `stepSize` until it either hits a blocking
	 *      cell (WALL or COVER) or reaches `maxDist`.
	 *   3. Collect the endpoints and build a filled polygon: guard → endpoints → guard.
	 *   4. Stroke the polygon outline for clarity.
	 */
	private drawVisionCone(guard: GuardEntity): void {
		const ctx = this.ctx;
		const gx = guard.pos.x;
		const gy = guard.pos.y;
		const angle = guard.facing + guard.facingSway;
		const halfAngle = (guard.visionAngle * Math.PI) / 360;
		const maxDist = guard.visionRange * CELL_SIZE;
		const numRays = 48;

		const endpoints: { x: number; y: number }[] = [];
		const stepSize = CELL_SIZE * 0.4;

		for (let i = 0; i <= numRays; i++) {
			const rayAngle = angle - halfAngle + (2 * halfAngle * i) / numRays;
			const dx = Math.cos(rayAngle);
			const dy = Math.sin(rayAngle);

			let dist = 0;
			let blocked = false;

			while (dist < maxDist && !blocked) {
				dist += stepSize;
				const cx = Math.floor((gx + dx * dist) / CELL_SIZE);
				const cy = Math.floor((gy + dy * dist) / CELL_SIZE);

				if (cy < 0 || cy >= this.grid.length || cx < 0 || cx >= this.grid[0].length) {
					dist -= stepSize;
					blocked = true;
					break;
				}

				const cell = this.grid[cy][cx];
				if (cell === CellType.WALL || cell === CellType.COVER) {
					// Step back to just before the blocking cell.
					dist = Math.max(0, dist - stepSize);
					blocked = true;
					break;
				}
			}

			if (!blocked) dist = maxDist;

			endpoints.push({ x: gx + dx * dist, y: gy + dy * dist });
		}

		ctx.fillStyle = COLORS.visionCone;
		ctx.beginPath();
		ctx.moveTo(gx, gy);
		for (let i = 0; i < endpoints.length; i++) {
			ctx.lineTo(endpoints[i].x, endpoints[i].y);
		}
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = 'rgba(255, 82, 82, 0.25)';
		ctx.lineWidth = 1;
		ctx.stroke();
	}

	// ---- Hearing radius ---------------------------------------------------

	/**
	 * Solid circle at the base hearing range, plus a pulsing outer ring
	 * when the player is sprinting (extended range).
	 */
	private drawHearingRadius(guard: GuardEntity, playerSprinting: boolean): void {
		const ctx = this.ctx;
		const rangePx = guard.hearingRange * CELL_SIZE;
		const sprintRangePx = GUARD_HEARING_SPRINT_RANGE * CELL_SIZE;
		const pulse = playerSprinting ? Math.sin(this.time * 8) * 0.3 + 0.7 : 1;

		ctx.fillStyle = COLORS.hearingRadius;
		ctx.beginPath();
		ctx.arc(guard.pos.x, guard.pos.y, rangePx, 0, Math.PI * 2);
		ctx.fill();

		if (playerSprinting) {
			ctx.strokeStyle = COLORS.hearingRadiusActive;
			ctx.lineWidth = 1.5;
			ctx.globalAlpha = pulse;
			ctx.beginPath();
			ctx.arc(guard.pos.x, guard.pos.y, sprintRangePx * pulse, 0, Math.PI * 2);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
	}

	// ---- Path visualization -----------------------------------------------

	/** Draw the guard's planned path as a dotted line with cell-center dots. */
	private drawPath(guard: GuardEntity): void {
		const ctx = this.ctx;
		const path = guard.path;
		if (path.length === 0 || guard.pathIndex >= path.length) return;

		// Draw dots at each remaining cell center.
		ctx.fillStyle = COLORS.pathLine;
		for (let i = guard.pathIndex; i < path.length; i++) {
			const cx = path[i].x * CELL_SIZE + CELL_SIZE / 2;
			const cy = path[i].y * CELL_SIZE + CELL_SIZE / 2;
			ctx.beginPath();
			ctx.arc(cx, cy, 2, 0, Math.PI * 2);
			ctx.fill();
		}

		// Draw a dashed line from the guard's current position.
		if (path.length > guard.pathIndex) {
			ctx.strokeStyle = COLORS.pathLine;
			ctx.lineWidth = 1;
			ctx.setLineDash([3, 3]);
			ctx.beginPath();
			ctx.moveTo(guard.pos.x, guard.pos.y);
			for (let i = guard.pathIndex; i < path.length; i++) {
				const cx = path[i].x * CELL_SIZE + CELL_SIZE / 2;
				const cy = path[i].y * CELL_SIZE + CELL_SIZE / 2;
				ctx.lineTo(cx, cy);
			}
			ctx.stroke();
			ctx.setLineDash([]);
		}
	}

	// ---- Player ------------------------------------------------------------

	/** Blue circle with a subtle sprint trail and a specular highlight. */
	private drawPlayer(state: GameState): void {
		const ctx = this.ctx;
		const px = state.playerPos.x;
		const py = state.playerPos.y;
		const r = 9;

		if (state.playerSprinting) {
			ctx.fillStyle = 'rgba(79, 195, 247, 0.15)';
			ctx.beginPath();
			ctx.arc(px, py, r + 4, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.fillStyle = COLORS.player;
		ctx.strokeStyle = COLORS.playerOutline;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.arc(px, py, r, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
		ctx.beginPath();
		ctx.arc(px - 2, py - 2, r * 0.35, 0, Math.PI * 2);
		ctx.fill();
	}

	// ---- HUD ---------------------------------------------------------------

	/** Draw the persistent in-game UI: keycard counter, algorithm label, controls hint, messages. */
	private drawUI(state: GameState): void {
		const ctx = this.ctx;
		const padding = 10;

		// Keycard counter (top-left).
		ctx.fillStyle = COLORS.uiText;
		ctx.font = 'bold 13px monospace';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';
		ctx.fillText(`Keycards: ${state.collectedCount}/${state.totalKeycards}`, padding, padding);

		// Algorithm + node counter (top-right).
		ctx.textAlign = 'right';
		ctx.fillText(
			`Algo: ${state.algorithm.toUpperCase()} | Nodes: ${state.nodesExplored}`,
			this.width - padding,
			padding
		);

		// Controls hint (bottom center).
		if (!state.gameOver) {
			ctx.textAlign = 'center';
			ctx.fillStyle = 'rgba(224, 224, 224, 0.8)';
			ctx.font = '10px monospace';
			ctx.fillText(
				'WASD: Move | Shift: Sprint | Esc: Pause | R: Restart | T: Algo | V/H/P: Toggle',
				this.width / 2,
				this.height - padding - 3
			);
		}

		// Transient message (e.g., "Keycard collected!").
		if (state.message) {
			ctx.fillStyle = COLORS.messageText;
			ctx.globalAlpha = 0.95;
			ctx.font = 'bold 16px monospace';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(state.message, this.width / 2, this.height - 45);
			ctx.globalAlpha = 1;
		}
	}

	// ---- Overlays ----------------------------------------------------------

	/** Full-screen overlay for win / lose. */
	private drawOverlay(state: GameState): void {
		const ctx = this.ctx;
		ctx.fillStyle = COLORS.overlayBg;
		ctx.fillRect(0, 0, this.width, this.height);

		ctx.fillStyle = state.won ? COLORS.exit : COLORS.guard;
		ctx.font = 'bold 36px monospace';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(state.won ? 'MISSION COMPLETE' : 'CAUGHT!', this.width / 2, this.height / 2 - 20);

		ctx.fillStyle = COLORS.uiText;
		ctx.font = '16px monospace';
		ctx.fillText('Press R to restart', this.width / 2, this.height / 2 + 20);
	}
}
