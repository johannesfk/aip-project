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

<div class="relative flex min-h-screen items-center justify-center bg-slate-950">
	<canvas
		bind:this={canvas}
		width={GRID_WIDTH * CELL_SIZE}
		height={GRID_HEIGHT * CELL_SIZE}
		class="border border-indigo-950 shadow-[0_0_40px_rgba(30,30,100,0.3)] [image-rendering:pixelated]"
	></canvas>

	{#if currentScreen === 'menu'}
		<div
			class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 text-white"
		>
			<h1 class="m-0 font-mono text-[2.5rem] font-bold text-sky-400">Stealth Patrol</h1>
			<p class="m-0 mb-4 font-mono text-[1.1rem] text-slate-300">Select a level</p>
			<div class="grid w-full max-w-[600px] grid-cols-5 gap-3 px-4">
				{#each LEVEL_NAMES as _, i (i)}
					<button
						class="relative flex flex-col items-center justify-center rounded-md border border-indigo-900 bg-indigo-950 py-3 px-2 font-mono text-gray-200 transition-all duration-150 cursor-pointer enabled:hover:-translate-y-0.5 enabled:hover:border-sky-400 enabled:hover:bg-indigo-900 disabled:cursor-not-allowed disabled:opacity-40 {completed[
							i
						]
							? 'border-emerald-300'
							: ''} {focusedButtonIndex === i
							? '-translate-y-px !border-sky-400 !bg-indigo-900 shadow-[0_0_10px] shadow-sky-400/50'
							: ''}"
						disabled={i >= unlocked}
						onclick={() => startLevel(i)}
						onmouseenter={() => {
							focusedButtonIndex = i;
						}}
					>
						<span class="text-xl font-bold">{i + 1}</span>
						{#if completed[i]}
							<span class="absolute top-1 right-1.5 text-sm font-bold text-emerald-300">✓</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{:else if currentScreen === 'playing' && paused}
		<div
			class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/25 text-white"
		>
			<h2 class="m-0 font-mono text-[2rem] font-bold">Paused</h2>
			<div class="flex min-w-[180px] flex-col gap-2">
				{#each pauseActions as action, i (i)}
					<button
						class="cursor-pointer rounded border py-2.5 px-5 font-mono text-sm text-gray-200 transition-all duration-150 text-center hover:border-sky-400 {action.isPrimary
							? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
							: 'border-indigo-900 bg-indigo-950 hover:bg-indigo-900'} {focusedButtonIndex === i
							? action.isPrimary
								? '-translate-y-px !border-sky-400 !bg-slate-700 shadow-[0_0_10px] shadow-sky-400/50'
								: '-translate-y-px !border-sky-400 !bg-indigo-900 shadow-[0_0_10px] shadow-sky-400/50'
							: ''}"
						onclick={action.action}
						onmouseenter={() => {
							focusedButtonIndex = i;
						}}
					>
						{action.label}
					</button>
				{/each}
			</div>
			<p class="mt-2 font-mono text-xs text-white">Use Arrow keys / Enter to navigate</p>
		</div>
	{:else if currentScreen === 'levelComplete'}
		<div
			class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-red-950/25 text-white"
		>
			<h2 class="m-0 font-mono text-[2rem] font-bold text-emerald-300">Level Complete!</h2>
			<p class="m-0 font-mono text-base text-slate-400">
				{LEVEL_NAMES[currentLevelIndex]} finished
			</p>
			<div class="flex min-w-[180px] flex-col gap-2">
				{#each levelCompleteActions as action, i (i)}
					<button
						class="cursor-pointer rounded border py-2.5 px-5 font-mono text-sm text-gray-200 transition-all duration-150 text-center hover:border-sky-400 {action.isPrimary
							? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
							: 'border-indigo-900 bg-indigo-950 hover:bg-indigo-900'} {focusedButtonIndex === i
							? action.isPrimary
								? '-translate-y-px !border-sky-400 !bg-slate-700 shadow-[0_0_10px] shadow-sky-400/50'
								: '-translate-y-px !border-sky-400 !bg-indigo-900 shadow-[0_0_10px] shadow-sky-400/50'
							: ''}"
						onclick={action.action}
						onmouseenter={() => {
							focusedButtonIndex = i;
						}}
					>
						{action.label}
					</button>
				{/each}
			</div>
			<p class="mt-2 font-mono text-xs text-white">Use Arrow keys / Enter to navigate</p>
		</div>
	{:else if currentScreen === 'gameOver'}
		<div
			class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-red-950/25 text-white"
		>
			<h2 class="m-0 font-mono text-[2rem] font-bold text-red-400">Caught!</h2>
			<p class="m-0 font-mono text-base text-slate-400">The guards spotted you.</p>
			<div class="flex min-w-[180px] flex-col gap-2">
				{#each gameOverActions as action, i (i)}
					<button
						class="cursor-pointer rounded border py-2.5 px-5 font-mono text-sm text-gray-200 transition-all duration-150 text-center hover:border-sky-400 {action.isPrimary
							? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
							: 'border-indigo-900 bg-indigo-950 hover:bg-indigo-900'} {focusedButtonIndex === i
							? action.isPrimary
								? '-translate-y-px !border-sky-400 !bg-slate-700 shadow-[0_0_10px] shadow-sky-400/50'
								: '-translate-y-px !border-sky-400 !bg-indigo-900 shadow-[0_0_10px] shadow-sky-400/50'
							: ''}"
						onclick={action.action}
						onmouseenter={() => {
							focusedButtonIndex = i;
						}}
					>
						{action.label}
					</button>
				{/each}
			</div>
			<p class="mt-2 font-mono text-xs text-white">Use Arrow keys / Enter to navigate</p>
		</div>
	{/if}
</div>
