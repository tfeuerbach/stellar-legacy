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
		right: 16px;
		z-index: 50;
		text-align: right;
		max-width: min(380px, calc(100vw - 32px));
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

	@media (max-width: 640px) {
		.credits-watermark {
			bottom: 8px;
			right: 10px;
			max-width: 60vw;
		}

		.station-credit {
			font-size: 0.5rem;
		}

		.nmdb-credit {
			font-size: 0.45rem;
		}
	}
</style>
