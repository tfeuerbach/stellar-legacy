<script lang="ts">
	import { stations, currentStation, currentReading } from '$lib/stores/cosmic';
	import { subscribeToStation } from '$lib/stores/socket';

	let isOpen = false;
	let dropdownEl: HTMLDivElement;

	function selectStation(code: string) {
		subscribeToStation(code);
		isOpen = false;
	}

	function handleClickOutside(e: MouseEvent) {
		if (dropdownEl && !dropdownEl.contains(e.target as Node)) {
			isOpen = false;
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div class="station-selector" bind:this={dropdownEl}>
	<button class="selector-trigger" on:click={() => (isOpen = !isOpen)}>
		<span class="station-label">
			{#if $currentStation}
				{@const stationInfo = $stations.find(s => s.code === $currentStation)}
				<span class="station-code">{$currentStation}</span>
				<span class="station-name">{stationInfo?.name || $currentReading?.stationName || '...'}</span>
			{:else}
				<span class="station-code">---</span>
				<span class="station-name">Select Station</span>
			{/if}
		</span>
		<svg
			class="chevron"
			class:open={isOpen}
			width="12"
			height="12"
			viewBox="0 0 12 12"
			fill="none"
		>
			<path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" />
		</svg>
	</button>

	{#if isOpen}
		<div class="dropdown">
			{#each $stations as station}
				<button
					class="dropdown-item"
					class:active={$currentStation === station.code}
					on:click={() => selectStation(station.code)}
				>
					<span class="item-code">{station.code}</span>
					<span class="item-name">{station.name}</span>
					<span class="item-meta" title="Geomagnetic cutoff rigidity — minimum energy (in gigavolts) a cosmic ray needs to reach this station. Lower = more exposed to cosmic rays.">{station.rigidity.toFixed(2)} GV</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.station-selector {
		position: relative;
		z-index: 100;
	}

	.selector-trigger {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		background: rgba(10, 10, 16, 0.7);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(232, 230, 225, 0.08);
		border-radius: 8px;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-text);
		transition:
			border-color 0.3s ease,
			background 0.3s ease;
		letter-spacing: 0.05em;
	}

	.selector-trigger:hover {
		border-color: rgba(232, 230, 225, 0.2);
		background: rgba(10, 10, 16, 0.85);
	}

	.station-label {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.station-code {
		font-weight: 700;
		color: var(--color-accent);
	}

	.station-name {
		color: var(--color-text-muted);
	}

	.chevron {
		transition: transform 0.2s ease;
		opacity: 0.5;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.dropdown {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		min-width: min(280px, calc(100vw - 32px));
		max-width: calc(100vw - 32px);
		max-height: 320px;
		overflow-y: auto;
		background: rgba(10, 10, 16, 0.92);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(232, 230, 225, 0.08);
		border-radius: 8px;
		padding: 4px;
	}

	.dropdown::-webkit-scrollbar {
		width: 4px;
	}

	.dropdown::-webkit-scrollbar-track {
		background: transparent;
	}

	.dropdown::-webkit-scrollbar-thumb {
		background: rgba(232, 230, 225, 0.15);
		border-radius: 2px;
	}

	.dropdown-item {
		display: flex;
		align-items: baseline;
		gap: 8px;
		width: 100%;
		padding: 8px 10px;
		border-radius: 6px;
		font-size: 0.72rem;
		text-align: left;
		transition: background 0.15s ease;
	}

	.dropdown-item:hover {
		background: rgba(232, 230, 225, 0.06);
	}

	.dropdown-item.active {
		background: rgba(123, 140, 222, 0.12);
	}

	.item-code {
		font-weight: 700;
		color: var(--color-accent);
		min-width: 48px;
	}

	.item-name {
		flex: 1;
		color: var(--color-text);
	}

	.item-meta {
		color: var(--color-text-muted);
		font-size: 0.65rem;
	}

	@media (max-width: 640px) {
		.selector-trigger {
			padding: 8px 10px;
			font-size: 0.65rem;
			max-width: 55vw;
		}

		.station-name {
			display: none;
		}

		.dropdown {
			max-height: 60vh;
		}

		.item-name {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}
</style>
