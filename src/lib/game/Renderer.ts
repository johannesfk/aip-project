import {
	CellType,
	Direction,
	GuardState,
	type GameState,
	type GuardEntity,
	type KeycardState,
	type Position,
	CELL_SIZE,
	GRID_WIDTH,
	GRID_HEIGHT,
	GUARD_HEARING_SPRINT_RANGE
} from './types';

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

export class Renderer {
	private ctx: CanvasRenderingContext2D;
	private grid: CellType[][];
	private width: number;
	private height: number;
	private time: number = 0;

	constructor(ctx: CanvasRenderingContext2D, grid: CellType[][]) {
		this.ctx = ctx;
		this.grid = grid;
		this.width = GRID_WIDTH * CELL_SIZE;
		this.height = GRID_HEIGHT * CELL_SIZE;
	}

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

		if (state.paused) {
			this.drawPauseOverlay();
		} else if (state.gameOver) {
			this.drawOverlay(state);
		}
	}

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

	private drawGuards(state: GameState): void {
		for (const guard of state.guards) {
			if (state.showPaths) this.drawPath(guard);
			if (state.showVisionCones) this.drawVisionCone(guard);
			if (state.showHearingRadius) this.drawHearingRadius(guard, state.playerSprinting);
			this.drawGuardBody(guard);
			this.drawStateIndicator(guard);
		}
	}

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

		const facingAngle = facingToAngle(guard.facing);
		const eyeX = px + Math.cos(facingAngle) * r * 0.5;
		const eyeY = py + Math.sin(facingAngle) * r * 0.5;
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(eyeX, eyeY, 2.5, 0, Math.PI * 2);
		ctx.fill();
	}

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

	private drawVisionCone(guard: GuardEntity): void {
		const ctx = this.ctx;
		const angle = facingToAngle(guard.facing);
		const halfAngle = (guard.visionAngle * Math.PI) / 360;
		const range = guard.visionRange * CELL_SIZE;

		ctx.fillStyle = COLORS.visionCone;
		ctx.beginPath();
		ctx.moveTo(guard.pos.x, guard.pos.y);
		ctx.arc(guard.pos.x, guard.pos.y, range, angle - halfAngle, angle + halfAngle);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = 'rgba(255, 82, 82, 0.25)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(guard.pos.x, guard.pos.y);
		ctx.arc(guard.pos.x, guard.pos.y, range, angle - halfAngle, angle + halfAngle);
		ctx.closePath();
		ctx.stroke();
	}

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

	private drawPath(guard: GuardEntity): void {
		const ctx = this.ctx;
		const path = guard.path;
		if (path.length === 0 || guard.pathIndex >= path.length) return;

		ctx.fillStyle = COLORS.pathLine;
		for (let i = guard.pathIndex; i < path.length; i++) {
			const cx = path[i].x * CELL_SIZE + CELL_SIZE / 2;
			const cy = path[i].y * CELL_SIZE + CELL_SIZE / 2;
			ctx.beginPath();
			ctx.arc(cx, cy, 2, 0, Math.PI * 2);
			ctx.fill();
		}

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

	private drawUI(state: GameState): void {
		const ctx = this.ctx;
		const padding = 10;

		ctx.fillStyle = COLORS.uiText;
		ctx.font = 'bold 13px monospace';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';
		ctx.fillText(`Keycards: ${state.collectedCount}/${state.totalKeycards}`, padding, padding);

		ctx.textAlign = 'right';
		ctx.fillText(
			`Algo: ${state.algorithm.toUpperCase()} | Nodes: ${state.nodesExplored}`,
			this.width - padding,
			padding
		);

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

	private drawPauseOverlay(): void {
		const ctx = this.ctx;
		ctx.fillStyle = COLORS.overlayBg;
		ctx.fillRect(0, 0, this.width, this.height);

		ctx.fillStyle = COLORS.uiText;
		ctx.font = 'bold 36px monospace';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('PAUSED', this.width / 2, this.height / 2 - 20);

		ctx.font = '14px monospace';
		ctx.fillText('Press Esc to resume', this.width / 2, this.height / 2 + 20);
	}

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
