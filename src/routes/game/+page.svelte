<script lang="ts">
	import { GameEngine } from '$lib/game/GameEngine';
	import { Renderer } from '$lib/game/Renderer';
	import { createLevel, TOTAL_LEVELS, LEVEL_NAMES } from '$lib/game/Level';
	import type { InputState } from '$lib/game/types';
	import { GRID_WIDTH, GRID_HEIGHT, CELL_SIZE } from '$lib/game/types';

	type Screen = 'menu' | 'playing' | 'levelComplete' | 'gameOver';

	let canvas = $state<HTMLCanvasElement>();
	let currentScreen = $state<Screen>('menu');
	let currentLevelIndex = $state(0);
	let completed = $state<boolean[]>(Array(TOTAL_LEVELS).fill(false));
	let unlocked = $state(1); // 1-based: levels 1..unlocked are playable
	let paused = $state(false);
	let focusedButtonIndex = $state(0);
	let gameKey = $state(0); // increments to force game-loop restart

	// Mutable input state shared with the game loop
	const input: InputState = {
		up: false,
		down: false,
		left: false,
		right: false,
		sprint: false,
		restart: false
	};

	// Load progress from localStorage once on mount
	$effect(() => {
		try {
			const raw = localStorage.getItem('stealth-patrol-progress');
			if (raw) {
				const data = JSON.parse(raw);
				if (Array.isArray(data.completed) && data.completed.length === TOTAL_LEVELS) {
					completed = data.completed;
				}
				if (typeof data.unlocked === 'number') {
					unlocked = Math.min(Math.max(data.unlocked, 1), TOTAL_LEVELS);
				}
			}
		} catch {
			// ignore parse errors
		}
	});

	function saveProgress() {
		try {
			localStorage.setItem('stealth-patrol-progress', JSON.stringify({ completed, unlocked }));
		} catch {
			// ignore storage errors
		}
	}

	function startLevel(index: number) {
		currentLevelIndex = index;
		currentScreen = 'playing';
		paused = false;
		focusedButtonIndex = 0;
		gameKey++;
	}

	function goToMenu() {
		currentScreen = 'menu';
		paused = false;
		focusedButtonIndex = 0;
	}

	function handleLevelComplete() {
		const nextIndex = currentLevelIndex + 1;
		const newCompleted = [...completed];
		newCompleted[currentLevelIndex] = true;
		completed = newCompleted;
		if (nextIndex >= unlocked && nextIndex < TOTAL_LEVELS) {
			unlocked = nextIndex + 1;
		}
		saveProgress();
		currentScreen = 'levelComplete';
		focusedButtonIndex = 0;
	}

	function handleGameOver() {
		currentScreen = 'gameOver';
		focusedButtonIndex = 0;
	}

	// -----------------------------------------------------------------------
	// Data-driven menu actions
	// -----------------------------------------------------------------------

	interface MenuAction {
		label: string;
		action: () => void;
		isPrimary?: boolean;
	}

	const pauseActions: MenuAction[] = $derived([
		{
			label: 'Resume',
			action: () => {
				paused = false;
				focusedButtonIndex = 0;
			}
		},
		{ label: 'Restart', action: () => startLevel(currentLevelIndex) },
		{ label: 'Menu', action: goToMenu }
	]);

	const levelCompleteActions: MenuAction[] = $derived([
		...(currentLevelIndex + 1 < TOTAL_LEVELS
			? [
					{
						label: 'Next Level',
						action: () => startLevel(currentLevelIndex + 1),
						isPrimary: true as const
					}
				]
			: []),
		{ label: 'Replay', action: () => startLevel(currentLevelIndex) },
		{ label: 'Menu', action: goToMenu }
	]);

	const gameOverActions: MenuAction[] = $derived([
		{ label: 'Retry', action: () => startLevel(currentLevelIndex), isPrimary: true },
		{ label: 'Menu', action: goToMenu }
	]);

	// -----------------------------------------------------------------------
	// Generic keyboard navigation helpers
	// -----------------------------------------------------------------------

	/** Navigate a grid layout (level select). Returns true when Enter/Space is pressed. */
	function navigateGrid(e: KeyboardEvent, cols: number, total: number): boolean {
		switch (e.key) {
			case 'ArrowLeft':
				if (focusedButtonIndex % cols > 0) focusedButtonIndex--;
				e.preventDefault();
				break;
			case 'ArrowRight':
				if (focusedButtonIndex % cols < cols - 1 && focusedButtonIndex + 1 < total)
					focusedButtonIndex++;
				e.preventDefault();
				break;
			case 'ArrowUp':
				if (focusedButtonIndex >= cols) focusedButtonIndex -= cols;
				e.preventDefault();
				break;
			case 'ArrowDown':
				if (focusedButtonIndex + cols < total) focusedButtonIndex += cols;
				e.preventDefault();
				break;
			case 'Enter':
			case ' ':
				e.preventDefault();
				return true;
		}
		return false;
	}

	/** Navigate a vertical list (pause / end screens). Returns true when Enter/Space/Escape is pressed. */
	function navigateList(e: KeyboardEvent, total: number): boolean {
		switch (e.key) {
			case 'ArrowUp':
				focusedButtonIndex = focusedButtonIndex <= 0 ? total - 1 : focusedButtonIndex - 1;
				e.preventDefault();
				break;
			case 'ArrowDown':
				focusedButtonIndex = focusedButtonIndex >= total - 1 ? 0 : focusedButtonIndex + 1;
				e.preventDefault();
				break;
			case 'Enter':
			case ' ':
				e.preventDefault();
				return true;
			case 'Escape':
				e.preventDefault();
				return true;
		}
		return false;
	}

	// -----------------------------------------------------------------------
	// Global keyboard handling
	// -----------------------------------------------------------------------

	function onKeyDown(e: KeyboardEvent) {
		const key = e.key;

		if (currentScreen === 'playing') {
			if (key === 'Escape') {
				if (paused) {
					pauseActions[0].action(); // Resume
				} else {
					paused = true;
					// Clear movement input so the player doesn't drift on resume
					input.up = false;
					input.down = false;
					input.left = false;
					input.right = false;
					input.sprint = false;
				}
				e.preventDefault();
				return;
			}

			if (paused) {
				if (navigateList(e, pauseActions.length)) {
					if (e.key === 'Escape') {
						pauseActions[0].action(); // Resume
					} else {
						pauseActions[focusedButtonIndex].action();
					}
				}
				return;
			}

			const k = key.toLowerCase();
			let handled = false;
			switch (k) {
				case 'w':
				case 'arrowup':
					input.up = true;
					handled = true;
					break;
				case 's':
				case 'arrowdown':
					input.down = true;
					handled = true;
					break;
				case 'a':
				case 'arrowleft':
					input.left = true;
					handled = true;
					break;
				case 'd':
				case 'arrowright':
					input.right = true;
					handled = true;
					break;
				case 'shift':
					input.sprint = true;
					handled = true;
					break;
				case 'r':
					input.restart = true;
					handled = true;
					break;
				case 't':
					if (engineRef) engineRef.algorithm = engineRef.algorithm === 'astar' ? 'bfs' : 'astar';
					handled = true;
					break;
				case 'v':
					if (engineRef) engineRef.showVisionCones = !engineRef.showVisionCones;
					handled = true;
					break;
				case 'h':
					if (engineRef) engineRef.showHearingRadius = !engineRef.showHearingRadius;
					handled = true;
					break;
				case 'p':
					if (engineRef) engineRef.showPaths = !engineRef.showPaths;
					handled = true;
					break;
			}
			if (handled) e.preventDefault();
			return;
		}

		// Non-playing screens
		if (key === 'Escape') {
			goToMenu();
			e.preventDefault();
			return;
		}

		if (currentScreen === 'menu') {
			if (navigateGrid(e, 5, unlocked)) {
				startLevel(focusedButtonIndex);
			}
		} else if (currentScreen === 'levelComplete') {
			if (navigateList(e, levelCompleteActions.length)) {
				if (e.key === 'Escape') {
					goToMenu();
				} else {
					levelCompleteActions[focusedButtonIndex].action();
				}
			}
		} else if (currentScreen === 'gameOver') {
			if (navigateList(e, gameOverActions.length)) {
				if (e.key === 'Escape') {
					goToMenu();
				} else {
					gameOverActions[focusedButtonIndex].action();
				}
			}
		}
	}

	function onKeyUp(e: KeyboardEvent) {
		if (currentScreen !== 'playing') return;
		const k = e.key.toLowerCase();
		switch (k) {
			case 'w':
			case 'arrowup':
				input.up = false;
				break;
			case 's':
			case 'arrowdown':
				input.down = false;
				break;
			case 'a':
			case 'arrowleft':
				input.left = false;
				break;
			case 'd':
			case 'arrowright':
				input.right = false;
				break;
			case 'shift':
				input.sprint = false;
				break;
		}
	}

	// Register global keyboard listeners once
	$effect(() => {
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
		};
	});

	// -----------------------------------------------------------------------
	// Game loop — only active while currentScreen === 'playing'
	// -----------------------------------------------------------------------
	let engineRef: GameEngine | null = null;

	$effect(() => {
		if (currentScreen !== 'playing') return;

		// Reading gameKey ensures the effect re-initialises on restart
		void gameKey;

		const c = canvas;
		if (!c) return;

		const level = createLevel(currentLevelIndex);
		const ctx = c.getContext('2d');
		if (!ctx) return;

		const engine = new GameEngine(level);
		const renderer = new Renderer(ctx, level.grid);
		engineRef = engine;

		// Reset input
		input.up = false;
		input.down = false;
		input.left = false;
		input.right = false;
		input.sprint = false;
		input.restart = false;
		paused = false;
		focusedButtonIndex = 0;

		let running = true;
		let lastTime = performance.now();

		function gameLoop(time: number): void {
			if (!running) return;
			const dt = Math.min((time - lastTime) / 1000, 0.1);
			lastTime = time;

			if (paused) {
				renderer.render(engine.getState(), dt);
			} else {
				const state = engine.update(dt, input);
				input.restart = false;

				if (state.gameOver) {
					running = false;
					engineRef = null;
					if (state.won) {
						handleLevelComplete();
					} else {
						handleGameOver();
					}
					return;
				}

				renderer.render(state, dt);
			}

			requestAnimationFrame(gameLoop);
		}

		requestAnimationFrame(gameLoop);

		return () => {
			running = false;
			engineRef = null;
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

	{#if currentScreen === 'menu'}
		<div class="overlay menu-overlay">
			<h1 class="title">Stealth Patrol</h1>
			<p class="subtitle">Select a level</p>
			<div class="level-grid">
				{#each LEVEL_NAMES as name, i (i)}
					<button
						class="level-btn"
						class:completed={completed[i]}
						class:locked={i >= unlocked}
						class:focused={focusedButtonIndex === i}
						disabled={i >= unlocked}
						onclick={() => startLevel(i)}
						onmouseenter={() => {
							focusedButtonIndex = i;
						}}
					>
						<span class="level-number">{i + 1}</span>
						<span class="level-name">{name}</span>
						{#if completed[i]}
							<span class="check">✓</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{:else if currentScreen === 'playing' && paused}
		<div class="overlay pause-overlay">
			<h2 class="end-title">Paused</h2>
			<div class="btn-col">
				{#each pauseActions as action, i (i)}
					<button
						class="btn"
						class:primary={action.isPrimary}
						class:focused={focusedButtonIndex === i}
						onclick={action.action}
						onmouseenter={() => {
							focusedButtonIndex = i;
						}}
					>
						{action.label}
					</button>
				{/each}
			</div>
			<p class="hint">Use Arrow keys / Enter to navigate</p>
		</div>
	{:else if currentScreen === 'levelComplete'}
		<div class="overlay end-overlay">
			<h2 class="end-title success">Level Complete!</h2>
			<p class="end-subtitle">{LEVEL_NAMES[currentLevelIndex]} finished</p>
			<div class="btn-col">
				{#each levelCompleteActions as action, i (i)}
					<button
						class="btn"
						class:primary={action.isPrimary}
						class:focused={focusedButtonIndex === i}
						onclick={action.action}
						onmouseenter={() => {
							focusedButtonIndex = i;
						}}
					>
						{action.label}
					</button>
				{/each}
			</div>
			<p class="hint">Use Arrow keys / Enter to navigate</p>
		</div>
	{:else if currentScreen === 'gameOver'}
		<div class="overlay end-overlay">
			<h2 class="end-title failure">Caught!</h2>
			<p class="end-subtitle">The guards spotted you.</p>
			<div class="btn-col">
				{#each gameOverActions as action, i (i)}
					<button
						class="btn"
						class:primary={action.isPrimary}
						class:focused={focusedButtonIndex === i}
						onclick={action.action}
						onmouseenter={() => {
							focusedButtonIndex = i;
						}}
					>
						{action.label}
					</button>
				{/each}
			</div>
			<p class="hint">Use Arrow keys / Enter to navigate</p>
		</div>
	{/if}
</div>

<style>
	.game-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background: #050510;
		position: relative;
	}

	.game-canvas {
		border: 1px solid #1a1a3a;
		box-shadow: 0 0 40px rgba(30, 30, 100, 0.3);
		image-rendering: pixelated;
	}

	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.menu-overlay {
		background: rgba(5, 5, 16, 0.95);
	}

	.pause-overlay {
		background: rgba(5, 5, 16, 0.92);
	}

	.end-overlay {
		background: rgba(5, 5, 16, 0.92);
	}

	.title {
		font-size: 2.5rem;
		font-weight: bold;
		color: #4fc3f7;
		margin: 0;
		font-family: monospace;
	}

	.subtitle {
		font-size: 1.1rem;
		color: #a0a0c0;
		margin: 0 0 1rem;
		font-family: monospace;
	}

	.level-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.75rem;
		max-width: 600px;
		width: 100%;
		padding: 0 1rem;
	}

	.level-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 0.5rem;
		background: #1a1a3a;
		border: 1px solid #2a2a5a;
		border-radius: 6px;
		color: #e0e0e0;
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: monospace;
		position: relative;
	}

	.level-btn:hover:not(:disabled) {
		background: #2a2a5a;
		border-color: #4fc3f7;
		transform: translateY(-2px);
	}

	.level-btn.focused {
		background: #2a2a5a;
		border-color: #4fc3f7;
		box-shadow: 0 0 10px rgba(79, 195, 247, 0.5);
		transform: translateY(-1px);
	}

	.level-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.level-btn.completed {
		border-color: #69f0ae;
	}

	.level-number {
		font-size: 1.25rem;
		font-weight: bold;
	}

	.level-name {
		font-size: 0.7rem;
		color: #a0a0c0;
		margin-top: 0.25rem;
	}

	.check {
		position: absolute;
		top: 4px;
		right: 6px;
		color: #69f0ae;
		font-size: 0.9rem;
		font-weight: bold;
	}

	.end-title {
		font-size: 2rem;
		font-weight: bold;
		margin: 0;
		font-family: monospace;
	}

	.end-title.success {
		color: #69f0ae;
	}

	.end-title.failure {
		color: #ff5252;
	}

	.end-subtitle {
		font-size: 1rem;
		color: #a0a0c0;
		margin: 0;
		font-family: monospace;
	}

	.btn-col {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 180px;
	}

	.btn {
		padding: 0.6rem 1.2rem;
		background: #1a1a3a;
		border: 1px solid #2a2a5a;
		border-radius: 4px;
		color: #e0e0e0;
		cursor: pointer;
		font-family: monospace;
		font-size: 0.9rem;
		transition: all 0.15s ease;
		text-align: center;
	}

	.btn:hover {
		background: #2a2a5a;
		border-color: #4fc3f7;
	}

	.btn.focused {
		background: #2a2a5a;
		border-color: #4fc3f7;
		box-shadow: 0 0 10px rgba(79, 195, 247, 0.5);
		transform: translateY(-1px);
	}

	.btn.primary {
		background: #2a3a5a;
		border-color: #3a4a6a;
	}

	.btn.primary:hover,
	.btn.primary.focused {
		background: #3a4a6a;
		border-color: #4fc3f7;
	}

	.hint {
		font-size: 0.75rem;
		color: #606080;
		font-family: monospace;
		margin-top: 0.5rem;
	}
</style>
