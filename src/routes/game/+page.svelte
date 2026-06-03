<script lang="ts">
	import { GameEngine } from '$lib/game/GameEngine';
	import { Renderer } from '$lib/game/Renderer';
	import { createLevel } from '$lib/game/Level';
	import type { InputState } from '$lib/game/types';
	import { GRID_WIDTH, GRID_HEIGHT, CELL_SIZE } from '$lib/game/types';

	let canvas = $state<HTMLCanvasElement>();

	$effect(() => {
		const c = canvas;
		if (!c) return;

		const level = createLevel();
		const ctx = c.getContext('2d');
		if (!ctx) return;

		const engine = new GameEngine(level);
		const renderer = new Renderer(ctx, level.grid);

		const input: InputState = {
			up: false,
			down: false,
			left: false,
			right: false,
			sprint: false,
			restart: false,
		};

		function onKey(e: KeyboardEvent, pressed: boolean): void {
			const key = e.key.toLowerCase();
			let handled = false;

			switch (key) {
				case 'w':
				case 'arrowup':
					input.up = pressed;
					handled = true;
					break;
				case 's':
				case 'arrowdown':
					input.down = pressed;
					handled = true;
					break;
				case 'a':
				case 'arrowleft':
					input.left = pressed;
					handled = true;
					break;
				case 'd':
				case 'arrowright':
					input.right = pressed;
					handled = true;
					break;
				case 'shift':
					input.sprint = pressed;
					handled = true;
					break;
				case 'r':
					if (pressed) input.restart = true;
					handled = true;
					break;
				case 't':
					if (pressed) {
						engine.algorithm = engine.algorithm === 'astar' ? 'bfs' : 'astar';
					}
					handled = true;
					break;
				case 'v':
					if (pressed) engine.showVisionCones = !engine.showVisionCones;
					handled = true;
					break;
				case 'h':
					if (pressed) engine.showHearingRadius = !engine.showHearingRadius;
					handled = true;
					break;
				case 'p':
					if (pressed) engine.showPaths = !engine.showPaths;
					handled = true;
					break;
				case 'escape':
					if (pressed) engine.paused = !engine.paused;
					handled = true;
					break;
				default:
					break;
			}

			if (handled) e.preventDefault();
		}

		function onKeyDown(e: KeyboardEvent): void {
			onKey(e, true);
		}
		function onKeyUp(e: KeyboardEvent): void {
			onKey(e, false);
		}

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);

		let running = true;
		let lastTime = performance.now();

		function gameLoop(time: number): void {
			if (!running) return;
			const dt = Math.min((time - lastTime) / 1000, 0.1);
			lastTime = time;

			const state = engine.update(dt, input);
			renderer.render(state, dt);
			input.restart = false;

			requestAnimationFrame(gameLoop);
		}

		requestAnimationFrame(gameLoop);

		return () => {
			running = false;
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
		};
	});
</script>

<svelte:head>
	<title>Stealth Patrol — AI Game</title>
</svelte:head>

<div class="game-wrapper">
	<canvas
		bind:this={canvas}
		width={GRID_WIDTH * CELL_SIZE}
		height={GRID_HEIGHT * CELL_SIZE}
		class="game-canvas"
	></canvas>
</div>

<style>
	.game-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background: #050510;
	}

	.game-canvas {
		border: 1px solid #1a1a3a;
		box-shadow: 0 0 40px rgba(30, 30, 100, 0.3);
		image-rendering: pixelated;
	}
</style>
