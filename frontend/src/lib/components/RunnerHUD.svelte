<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getRunnerScore, isRunnerActive } from '$lib/scenes/runner';

	let score = 0;
	let high = 0;
	let showHint = true;
	let hintTimer: ReturnType<typeof setTimeout>;
	let pollInterval: ReturnType<typeof setInterval>;

	onMount(() => {
		hintTimer = setTimeout(() => {
			showHint = false;
		}, 5000);

		pollInterval = setInterval(() => {
			if (isRunnerActive()) {
				const s = getRunnerScore();
				score = s.distance;
				high = s.highScore;
			}
		}, 100);
	});

	onDestroy(() => {
		clearTimeout(hintTimer);
		clearInterval(pollInterval);
	});
</script>

<div class="runner-hud">
	<div class="scores">
		<span class="label">SEC</span>
		<span class="value">{score}</span>
		<span class="sep">|</span>
		<span class="label">HI</span>
		<span class="value">{high}</span>
	</div>

	{#if showHint}
		<div class="hint" class:fade={!showHint}>
			A/D to switch lanes, SPACE to dash
		</div>
	{/if}
</div>

<style>
	.runner-hud {
		position: fixed;
		top: 60px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 80;
		font-family: var(--font-mono);
		pointer-events: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.scores {
		display: flex;
		align-items: baseline;
		gap: 6px;
		background: rgba(10, 10, 16, 0.5);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(232, 230, 225, 0.08);
		border-radius: 6px;
		padding: 6px 12px;
	}

	.label {
		font-size: 0.55rem;
		color: rgba(232, 230, 225, 0.35);
		letter-spacing: 0.1em;
	}

	.value {
		font-size: 0.85rem;
		color: rgba(232, 230, 225, 0.8);
		font-variant-numeric: tabular-nums;
		min-width: 3ch;
		text-align: right;
	}

	.sep {
		color: rgba(232, 230, 225, 0.15);
		font-size: 0.7rem;
	}

	.hint {
		font-size: 0.6rem;
		color: rgba(232, 230, 225, 0.4);
		background: rgba(10, 10, 16, 0.4);
		padding: 4px 10px;
		border-radius: 4px;
		transition: opacity 1s ease;
	}

	.hint.fade {
		opacity: 0;
	}

	@media (max-width: 640px) {
		.runner-hud {
			top: 70px;
		}

		.hint {
			font-size: 0.55rem;
		}
	}
</style>
