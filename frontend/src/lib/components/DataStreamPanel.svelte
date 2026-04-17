<script lang="ts">
	import { onDestroy } from 'svelte';
	import { currentStation, currentReading, readingHistory, type CosmicReading } from '$lib/stores/cosmic';
	import { subscribeToStation } from '$lib/stores/socket';
	import { get } from 'svelte/store';

	export let open = false;

	let feedEntries: CosmicReading[] = [];
	let chartData: { t: number; counts: number; norm: number }[] = [];

	const W = 560;
	const H = 160;
	const PAD = { top: 10, right: 50, bottom: 20, left: 55 };
	const plotW = W - PAD.left - PAD.right;
	const plotH = H - PAD.top - PAD.bottom;

	function buildChartData(history: CosmicReading[]) {
		chartData = history.map((r) => ({
			t: new Date(r.timestamp).getTime(),
			counts: r.counts,
			norm: r.normalized
		}));
	}

	function scaleX(t: number): number {
		if (chartData.length < 2) return PAD.left;
		const tMin = chartData[0].t;
		const tMax = chartData[chartData.length - 1].t;
		const range = tMax - tMin || 1;
		return PAD.left + ((t - tMin) / range) * plotW;
	}

	function scaleY(val: number, min: number, max: number): number {
		const range = max - min || 1;
		return PAD.top + plotH - ((val - min) / range) * plotH;
	}

	function polyline(points: { x: number; y: number }[]): string {
		return points.map((p) => `${p.x},${p.y}`).join(' ');
	}

	// reload history if panel opened and store is empty
	$: {
		if (open && $currentStation && $readingHistory.length === 0) {
			subscribeToStation($currentStation);
		}
	}

	$: {
		const h = $readingHistory;
		buildChartData(h);
		feedEntries = [...h].reverse().slice(0, 50);
	}

	function formatTime(ts: string): string {
		const d = new Date(ts);
		return d.toLocaleTimeString('en-US', {
			hour: '2-digit', minute: '2-digit', second: '2-digit',
			hour12: false, timeZone: 'UTC'
		});
	}

	$: countsMin = chartData.length ? Math.min(...chartData.map((d) => d.counts)) * 0.98 : 0;
	$: countsMax = chartData.length ? Math.max(...chartData.map((d) => d.counts)) * 1.02 : 1;

	$: countsLine = chartData.map((d) => ({ x: scaleX(d.t), y: scaleY(d.counts, countsMin, countsMax) }));
	$: normLine = chartData.map((d) => ({ x: scaleX(d.t), y: scaleY(d.norm, 0, 1) }));
</script>

{#if open}
	<!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
	<div class="panel-backdrop" on:click={() => (open = false)}></div>
	<div class="panel">
		<div class="panel-header">
			<h3>
				Data Stream — {$currentStation || '...'}
				{#if $currentReading}
					<span class="header-seed">seed {$currentReading.normalized.toFixed(4)}</span>
				{/if}
			</h3>
			<button class="close-btn" on:click={() => (open = false)}>×</button>
		</div>

		<div class="chart-container">
			{#if chartData.length > 1}
				<svg viewBox="0 0 {W} {H}" class="chart">
				{#each [0, 0.25, 0.5, 0.75, 1] as frac}
						<line
							x1={PAD.left} y1={PAD.top + plotH * (1 - frac)}
							x2={PAD.left + plotW} y2={PAD.top + plotH * (1 - frac)}
							stroke="rgba(232,230,225,0.06)" stroke-width="0.5"
						/>
					{/each}

				<polyline
						points={polyline(countsLine)}
						fill="none" stroke="rgba(123,140,222,0.7)" stroke-width="1.5"
					/>

				<polyline
						points={polyline(normLine)}
						fill="none" stroke="rgba(222,154,123,0.6)" stroke-width="1.5"
						stroke-dasharray="4 3"
					/>

				<text x={PAD.left - 6} y={PAD.top + 4} class="axis-label" text-anchor="end" fill="rgba(123,140,222,0.5)">
						{countsMax.toFixed(0)}
					</text>
					<text x={PAD.left - 6} y={PAD.top + plotH + 4} class="axis-label" text-anchor="end" fill="rgba(123,140,222,0.5)">
						{countsMin.toFixed(0)}
					</text>

				<text x={PAD.left + plotW + 6} y={PAD.top + 4} class="axis-label" fill="rgba(222,154,123,0.5)">1.0</text>
					<text x={PAD.left + plotW + 6} y={PAD.top + plotH + 4} class="axis-label" fill="rgba(222,154,123,0.5)">0.0</text>

				<text x={PAD.left + 4} y={H - 3} class="axis-label" fill="rgba(123,140,222,0.5)">counts/s</text>
					<text x={PAD.left + plotW - 40} y={H - 3} class="axis-label" fill="rgba(222,154,123,0.5)">normalized</text>
				</svg>
			{:else}
				<div class="chart-empty">Waiting for data...</div>
			{/if}
		</div>

		<div class="feed">
			{#if feedEntries.length > 0}
				<div class="feed-header">
					<span class="fh-time">time (utc)</span>
					<span class="fh-counts">raw counts</span>
					<span class="fh-seed">seed</span>
					<span class="fh-delta">delta</span>
				</div>
			{/if}
			{#each feedEntries as entry}
				<div class="feed-row">
					<span class="feed-time">{formatTime(entry.timestamp)}</span>
					<span class="feed-counts">{entry.counts.toFixed(1)} c/s</span>
					<span class="feed-seed">{entry.normalized.toFixed(4)}</span>
					<span class="feed-delta" class:pos={entry.fluxDelta > 0} class:neg={entry.fluxDelta < 0}>
						{entry.fluxDelta > 0 ? '+' : ''}{entry.fluxDelta.toFixed(4)}
					</span>
				</div>
			{/each}
			{#if feedEntries.length === 0}
				<div class="feed-empty">No readings yet</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.panel-backdrop {
		position: fixed;
		inset: 0;
		z-index: 199;
		background: rgba(0, 0, 0, 0.4);
	}

	.panel {
		position: fixed;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		z-index: 200;
		width: min(640px, calc(100vw - 32px));
		max-height: 70vh;
		background: rgba(8, 8, 14, 0.96);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(232, 230, 225, 0.08);
		border-bottom: none;
		border-radius: 14px 14px 0 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 18px;
		border-bottom: 1px solid rgba(232, 230, 225, 0.06);
	}

	.panel-header h3 {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--color-text);
		letter-spacing: 0.04em;
		display: flex;
		align-items: baseline;
		gap: 10px;
	}

	.header-seed {
		font-size: 0.6rem;
		color: rgba(222, 154, 123, 0.5);
		font-weight: 400;
	}

	.close-btn {
		font-size: 1.2rem;
		color: var(--color-text-muted);
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		color: var(--color-text);
		background: rgba(232, 230, 225, 0.08);
	}

	.chart-container {
		padding: 12px 16px;
		border-bottom: 1px solid rgba(232, 230, 225, 0.06);
	}

	.chart {
		width: 100%;
		height: auto;
	}

	:global(.axis-label) {
		font-family: var(--font-mono);
		font-size: 8px;
	}

	.chart-empty {
		text-align: center;
		padding: 30px;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}

	.feed {
		flex: 1;
		overflow-y: auto;
		padding: 8px 16px;
		max-height: 200px;
	}

	.feed::-webkit-scrollbar {
		width: 4px;
	}

	.feed::-webkit-scrollbar-thumb {
		background: rgba(232, 230, 225, 0.1);
		border-radius: 2px;
	}

	.feed-header {
		display: flex;
		gap: 12px;
		padding: 0 0 6px;
		margin-bottom: 4px;
		font-family: var(--font-mono);
		font-size: 0.5rem;
		color: rgba(232, 230, 225, 0.2);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		border-bottom: 1px solid rgba(232, 230, 225, 0.06);
	}

	.fh-time { min-width: 70px; }
	.fh-counts { min-width: 80px; }
	.fh-seed { min-width: 100px; }
	.fh-delta { min-width: 60px; }

	.feed-row {
		display: flex;
		gap: 12px;
		padding: 4px 0;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: rgba(232, 230, 225, 0.4);
		border-bottom: 1px solid rgba(232, 230, 225, 0.03);
	}

	.feed-time {
		color: rgba(232, 230, 225, 0.25);
		min-width: 70px;
	}

	.feed-counts {
		min-width: 80px;
	}

	.feed-seed {
		min-width: 100px;
		color: rgba(222, 154, 123, 0.5);
	}

	.feed-delta.pos {
		color: rgba(120, 222, 150, 0.5);
	}

	.feed-delta.neg {
		color: rgba(222, 120, 120, 0.5);
	}

	.feed-empty {
		text-align: center;
		padding: 20px;
		font-family: var(--font-mono);
		font-size: 0.65rem;
		color: var(--color-text-muted);
	}
</style>
