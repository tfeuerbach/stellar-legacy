<script lang="ts">
	import { currentReading, nmdbCredit } from '$lib/stores/cosmic';
</script>

<div class="credits-watermark">
	{#if $currentReading}
		<p class="station-credit">{$currentReading.stationName} — {$currentReading.credit}</p>
	{/if}
	<p class="nmdb-credit">{nmdbCredit}</p>
</div>

<style>
	.credits-watermark {
		position: fixed;
		bottom: 16px;
		right: 20px;
		z-index: 50;
		text-align: right;
		max-width: 380px;
		pointer-events: none;
		user-select: none;
	}

	.station-credit {
		font-family: var(--font-mono);
		font-size: 0.55rem;
		color: rgba(232, 230, 225, 0.3);
		line-height: 1.5;
		letter-spacing: 0.02em;
	}

	.nmdb-credit {
		font-family: var(--font-mono);
		font-size: 0.5rem;
		color: rgba(232, 230, 225, 0.2);
		line-height: 1.5;
		margin-top: 2px;
		letter-spacing: 0.02em;
	}
</style>
