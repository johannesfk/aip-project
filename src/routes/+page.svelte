<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Stealth Patrol — AI Programming Project</title>
</svelte:head>

<div
	class="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-8 text-center text-white"
>
	<h1 class="m-0 font-mono text-[2.5rem] font-bold text-sky-400">Stealth Patrol</h1>
	<p class="m-0 font-mono text-[1.1rem] text-slate-300">AI-based Stealth Game</p>

	<div class="mt-4 flex max-w-3xl flex-row flex-wrap justify-center gap-4">
		<div class="w-60 rounded-lg border border-slate-800 bg-slate-900 p-4 text-left">
			<h2 class="mb-2 font-mono text-base font-medium text-slate-200">Finite State Machine</h2>
			<p class="m-0 text-sm leading-relaxed text-gray-300">
				Guard AI uses a 4-state FSM: <strong class="text-sky-400"
					>PATROL → ALERT → CHASE → SEARCH</strong
				>. Each state defines unique behavior, speed, and transition conditions.
			</p>
		</div>
		<div class="w-60 rounded-lg border border-slate-800 bg-slate-900 p-4 text-left">
			<h2 class="mb-2 font-mono text-base font-medium text-slate-200">A* Pathfinding</h2>
			<p class="m-0 text-sm leading-relaxed text-gray-300">
				Guards navigate the grid using the A* algorithm with Manhattan heuristic. Toggle between <strong
					class="text-sky-400">A*</strong
				>
				and <strong class="text-sky-400">BFS</strong> in-game to compare node exploration counts in real-time.
			</p>
		</div>
		<div class="w-60 rounded-lg border border-slate-800 bg-slate-900 p-4 text-left">
			<h2 class="mb-2 font-mono text-base font-medium text-slate-200">Sensing System</h2>
			<p class="m-0 text-sm leading-relaxed text-gray-300">
				Guards detect the player via <strong class="text-sky-400">vision cones</strong>
				(line-of-sight raycasting) and <strong class="text-sky-400">hearing radius</strong> (proximity-based,
				amplified when sprinting). Guards remember the last known player position.
			</p>
		</div>
	</div>

	<a
		href={resolve('/game')}
		class="m-5 inline-flex h-12 cursor-pointer items-center justify-center rounded border border-slate-700 bg-slate-800 px-8 font-mono text-xl font-semibold text-sky-400 transition-all duration-150 hover:border-sky-400 hover:bg-slate-700 active:scale-[0.98]"
	>
		Play Game
	</a>

	<div class="flex max-w-[500px] flex-col gap-2 text-sm text-white">
		<p><strong>Goal:</strong> Collect all 5 keycards and reach the exit without getting caught.</p>
		<p>
			<strong>Controls:</strong>
			<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
			/ Arrow Keys to move,
			<kbd>Shift</kbd>
			to sprint,
			<kbd>R</kbd>
			to restart.
		</p>
		<p>
			<strong>Toggle:</strong>
			<kbd>T</kbd>
			(A*/BFS),
			<kbd>V</kbd>
			(vision cones),
			<kbd>H</kbd>
			(hearing),
			<kbd>P</kbd>
			(paths).
		</p>
	</div>
</div>
