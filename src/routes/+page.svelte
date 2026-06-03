<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Stealth Patrol — AI Programming Project</title>
</svelte:head>

<div
	class="bg-zinc-900 min-h-screen flex flex-col items-center justify-center p-2 text-center font-sans text-white"
>
	<h1 class="text-5xl font-bold text-blue-400">Stealth Patrol</h1>
	<p class="text-xl">AI-based Stealth Game</p>

	<div class="flex flex-row gap-4 max-w-3xl flex-wrap justify-center mt-8">
		<div class="p-2 border-zinc-800 bg-gray-900/70 shadow border rounded-2xl text-left w-60">
			<h2 class="text-xl mb-2 font-medium">Finite State Machine</h2>
			<p>
				Guard AI uses a 4-state FSM: <strong>PATROL → ALERT → CHASE → SEARCH</strong>. Each state
				defines unique behavior, speed, and transition conditions.
			</p>
		</div>
		<div class="p-2 border-zinc-800 bg-gray-900/70 shadow border rounded-2xl text-left w-60">
			<h2 class="text-xl mb-2 font-medium">A* Pathfinding</h2>
			<p>
				Guards navigate the grid using the A* algorithm with Manhattan heuristic. Toggle between <strong
					>A*</strong
				>
				and <strong>BFS</strong> in-game to compare node exploration counts in real-time.
			</p>
		</div>
		<div class="p-2 border-zinc-800 bg-gray-900/70 shadow border rounded-2xl text-left w-60">
			<h2 class="text-xl mb-2 font-medium">Sensing System</h2>
			<p>
				Guards detect the player via <strong>vision cones</strong> (line-of-sight raycasting) and
				<strong>hearing radius</strong> (proximity-based, amplified when sprinting). Guards remember the
				last known player position.
			</p>
		</div>
	</div>

	<a
		href={resolve('/game')}
		class="rounded bg-yellow-600 shadow hover:bg-yellow-600/95 inline-flex
	h-12 items-center justify-center m-5 px-5 text-2xl
	font-semibold active:scale-[0.98] active:transition-all">Play Game</a
	>

	<div class="flex flex-col gap-2">
		<p><strong>Goal:</strong> Collect all 5 keycards and reach the exit without getting caught.</p>
		<p>
			<strong>Controls:</strong>
			<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
			/ Arrow Keys to move, <kbd>Shift</kbd> to sprint, <kbd>R</kbd> to restart.
		</p>
		<p>
			<strong>Toggle:</strong> <kbd>T</kbd> (A*/BFS), <kbd>V</kbd> (vision cones), <kbd>H</kbd>
			(hearing), <kbd>P</kbd> (paths).
		</p>
	</div>
</div>

<!-- <style>
	.home {
		min-height: 100vh;
		background: #050510;
		color: #e0e0e0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		font-family: sans-serif;
		text-align: center;
		gap: 1.5rem;
	}

	h1 {
		font-size: 2.5rem;
		color: #4fc3f7;
		margin: 0;
	}

	.subtitle {
		color: #fff;
		margin: 0;
	}

	.ai-elements {
		display: flex;
		gap: 1rem;
		max-width: 800px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.card {
		background: #0f0f23;
		border: 1px solid #1a1a3a;
		border-radius: 8px;
		padding: 1rem;
		width: 240px;
		text-align: left;
	}

	.card h2 {
		font-size: 0.95rem;
		margin: 0 0 0.5rem 0;
		color: #69f0ae;
	}

	.card p {
		font-size: 0.8rem;
		color: #fff;
		line-height: 1.4;
		margin: 0;
	}

	strong {
		color: #ffd740;
	}

	.play-btn {
		display: inline-block;
		background: #4fc3f7;
		color: #050510;
		padding: 0.75rem 2.5rem;
		border-radius: 6px;
		text-decoration: none;
		font-size: 1.1rem;
		font-weight: bold;
		font-family: sans-serif;
		transition: background 0.2s;
	}

	.play-btn:hover {
		background: #81d4fa;
	}

	.info {
		font-size: 0.8rem;
		color: #fff;
		max-width: 500px;
	}

	.info p {
		margin: 0.25rem 0;
	}
</style> -->
