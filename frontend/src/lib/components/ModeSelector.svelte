<script lang="ts">
	import { renderMode, type RenderMode } from '$lib/stores/cosmic';

	const modes: { id: RenderMode; label: string }[] = [
		{ id: 'noise', label: 'Noise' },
		{ id: 'pipes', label: 'Pipes' },
		{ id: 'crossing', label: 'Crossing' },
		{ id: 'runner', label: 'Runner' },
		{ id: 'voxel', label: 'Voxel' }
	];
</script>

<div class="mode-selector">
	{#each modes as mode}
		<button
			class="mode-btn"
			class:active={$renderMode === mode.id}
			on:click={() => renderMode.set(mode.id)}
		>
			{mode.label}
		</button>
	{/each}
</div>

<style>
	.mode-selector {
		display: flex;
		gap: 2px;
		background: rgba(10, 10, 16, 0.6);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(232, 230, 225, 0.08);
		border-radius: 8px;
		padding: 3px;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.mode-selector::-webkit-scrollbar {
		display: none;
	}

	.mode-btn {
		padding: 6px 12px;
		border-radius: 6px;
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
		transition: all 0.2s ease;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.mode-btn:hover {
		color: var(--color-text);
	}

	.mode-btn.active {
		color: var(--color-text);
		background: rgba(232, 230, 225, 0.1);
	}

	@media (max-width: 640px) {
		.mode-btn {
			padding: 5px 10px;
			font-size: 0.6rem;
		}
	}
</style>
