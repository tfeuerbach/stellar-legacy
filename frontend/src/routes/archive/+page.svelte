<script lang="ts">
	import { onMount } from 'svelte';
	import { stations } from '$lib/stores/cosmic';
	import { fade, fly } from 'svelte/transition';
	import { PUBLIC_API_URL } from '$env/static/public';

	const API_URL = PUBLIC_API_URL || 'http://localhost:3001';

	interface Reading {
		id: string;
		station_code: string;
		station_name: string;
		timestamp: string;
		raw_counts: number;
		normalized: number;
		flux_delta: number;
		is_anomalous: boolean;
	}

	interface RenderRecord {
		id: string;
		station_code: string;
		station_name: string;
		timestamp: string;
		render_mode: string;
		seed_value: number;
		file_type: string;
	}

	interface StationGroup {
		code: string;
		name: string;
		readings: Reading[];
	}

	let stationGroups: StationGroup[] = [];
	let renders: RenderRecord[] = [];
	let loading = true;
	let selectedStation = '';
	let lightboxSrc = '';

	function groupByStation(readings: Reading[]): StationGroup[] {
		const map = new Map<string, StationGroup>();
		for (const r of readings) {
			if (!map.has(r.station_code)) {
				map.set(r.station_code, { code: r.station_code, name: r.station_name, readings: [] });
			}
			map.get(r.station_code)!.readings.push(r);
		}
		return [...map.values()].sort((a, b) => {
			const aTs = a.readings[0]?.timestamp || '';
			const bTs = b.readings[0]?.timestamp || '';
			return new Date(bTs).getTime() - new Date(aTs).getTime();
		});
	}

	async function fetchData() {
		loading = true;
		try {
			const readingsUrl = selectedStation
				? `${API_URL}/api/stations/${selectedStation}/history?limit=200`
				: `${API_URL}/api/readings/history?limit=500`;

			const rendersUrl = selectedStation
				? `${API_URL}/api/archive?station=${selectedStation}&limit=100`
				: `${API_URL}/api/archive?limit=100`;

			const [readingsRes, rendersRes] = await Promise.all([
				fetch(readingsUrl),
				fetch(rendersUrl)
			]);

			const readingsData: Reading[] = await readingsRes.json();
			stationGroups = groupByStation(readingsData);

			renders = await rendersRes.json();
		} catch (e) {
			console.warn('Failed to fetch archive:', e);
		} finally {
			loading = false;
		}
	}

	function formatTime(ts: string): string {
		return new Date(ts).toLocaleTimeString('en-US', {
			hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false
		});
	}

	function formatDateTime(ts: string): string {
		return new Date(ts).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric',
			hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
		});
	}

	function handleFilter(code: string) {
		selectedStation = code;
		fetchData();
	}

	function deltaClass(d: number): string {
		if (d > 0.01) return 'delta-up';
		if (d < -0.01) return 'delta-down';
		return 'delta-flat';
	}

	function groupRendersByStation(items: RenderRecord[]): Record<string, RenderRecord[]> {
		const map: Record<string, RenderRecord[]> = {};
		for (const r of items) {
			if (!map[r.station_code]) map[r.station_code] = [];
			map[r.station_code].push(r);
		}
		return map;
	}

	let failedImages = new Set<string>();

	function imageUrl(id: string): string {
		return `${API_URL}/api/archive/${id}/image`;
	}

	function handleImgError(id: string) {
		failedImages.add(id);
		failedImages = failedImages;
		renders = renders.filter((r) => r.id !== id);
	}

	function openLightbox(id: string) {
		lightboxSrc = imageUrl(id);
	}

	function closeLightbox() {
		lightboxSrc = '';
	}

	onMount(() => fetchData());
</script>

<svelte:head>
	<title>Stellar Legacy / Archive</title>
	<meta name="description" content="24-hour archive of cosmic ray readings and captured visualization screenshots from neutron monitor stations worldwide." />
	<link rel="canonical" href="https://stellar-legacy.tfeuerbach.dev/archive" />
	<meta property="og:url" content="https://stellar-legacy.tfeuerbach.dev/archive" />
	<meta property="og:title" content="Stellar Legacy / Archive" />
	<meta property="og:description" content="24-hour archive of cosmic ray readings and captured visualization screenshots from neutron monitor stations worldwide." />
	<meta name="twitter:title" content="Stellar Legacy / Archive" />
	<meta name="twitter:description" content="24-hour archive of cosmic ray readings and visualization screenshots." />
</svelte:head>

<div class="archive-page">
	<header class="archive-header">
		<h1 class="archive-title">Archive</h1>
		<p class="archive-subtitle">24-hour reading history and captured screenshots</p>

		<div class="filter-bar">
			<button
				class="filter-chip"
				class:active={selectedStation === ''}
				on:click={() => handleFilter('')}
			>
				All
			</button>
			{#each $stations as station}
				<button
					class="filter-chip"
					class:active={selectedStation === station.code}
					on:click={() => handleFilter(station.code)}
				>
					{station.code}
				</button>
			{/each}
		</div>
	</header>

	{#if renders.length > 0}
		<section class="screenshots-section" in:fly={{ y: 20, duration: 300 }}>
			<h2 class="section-title">Screenshots</h2>
			<p class="section-subtitle">Scroll to browse — click to view full resolution</p>

			{#if selectedStation}
				{@const grouped = groupRendersByStation(renders)}
				{#each Object.entries(grouped) as [code, stationRenders]}
					<div class="screenshot-group">
						<span class="group-label">{code}</span>
						<div class="screenshot-rail">
							{#each stationRenders as render, ri}
								<button
									class="screenshot-card"
									in:fade={{ duration: 200, delay: ri * 40 }}
									on:click={() => openLightbox(render.id)}
								>
									<img
										src={imageUrl(render.id)}
										alt="{render.station_code} {render.render_mode}"
										loading="lazy"
										on:error={() => handleImgError(render.id)}
									/>
									<div class="screenshot-meta">
										<span class="meta-mode">{render.render_mode}</span>
										<span class="meta-seed">{render.seed_value.toFixed(3)}</span>
										<span class="meta-time">{formatDateTime(render.timestamp)}</span>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			{:else}
				<div class="screenshot-rail">
					{#each renders as render, ri}
						<button
							class="screenshot-card"
							in:fade={{ duration: 200, delay: ri * 40 }}
							on:click={() => openLightbox(render.id)}
						>
							<img
								src={imageUrl(render.id)}
								alt="{render.station_code} {render.render_mode}"
								loading="lazy"
								on:error={() => handleImgError(render.id)}
							/>
							<div class="screenshot-meta">
								<span class="meta-station">{render.station_code}</span>
								<span class="meta-mode">{render.render_mode}</span>
								<span class="meta-seed">{render.seed_value.toFixed(3)}</span>
								<span class="meta-time">{formatDateTime(render.timestamp)}</span>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	{#each stationGroups as group, gi (group.code)}
		<section class="station-section" in:fly={{ y: 20, duration: 300, delay: gi * 60 }}>
			<div class="station-header">
				<span class="station-code">{group.code}</span>
				<span class="station-name">{group.name}</span>
				<span class="station-count">{group.readings.length} reading{group.readings.length !== 1 ? 's' : ''}</span>
			</div>

			<div class="readings-table">
				<div class="table-header">
					<span class="col-time">Time (UTC)</span>
					<span class="col-counts">Counts/s</span>
					<span class="col-seed">Seed</span>
					<span class="col-delta">Delta</span>
					<span class="col-flag">Flag</span>
				</div>
				{#each group.readings as reading, ri}
					<div
						class="table-row"
						class:anomalous={reading.is_anomalous}
						in:fade={{ duration: 150, delay: ri * 8 }}
					>
						<span class="col-time">{formatTime(reading.timestamp)}</span>
						<span class="col-counts">{reading.raw_counts.toFixed(1)}</span>
						<span class="col-seed">{reading.normalized.toFixed(4)}</span>
						<span class="col-delta {deltaClass(reading.flux_delta)}">
							{reading.flux_delta > 0 ? '+' : ''}{reading.flux_delta.toFixed(4)}
						</span>
						<span class="col-flag">
							{#if reading.is_anomalous}
								<span class="anomaly-badge" title="Anomalous (>3σ deviation)">!</span>
							{/if}
						</span>
					</div>
				{/each}
			</div>
		</section>
	{/each}

	{#if loading}
		<div class="loading" in:fade={{ duration: 200 }}>
			<span class="loading-text">Loading...</span>
		</div>
	{/if}

	{#if !loading && stationGroups.length === 0 && renders.length === 0}
		<div class="empty-state" in:fade={{ duration: 300 }}>
			<p class="empty-title">No data yet</p>
			<p class="empty-subtitle">The archive populates as the poller captures data and viewers generate screenshots.</p>
		</div>
	{/if}
</div>

{#if lightboxSrc}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="lightbox" on:click={closeLightbox} in:fade={{ duration: 150 }}>
		<img src={lightboxSrc} alt="Full resolution screenshot" />
		<button class="lightbox-close" on:click={closeLightbox}>×</button>
	</div>
{/if}

<style>
	.archive-page {
		min-height: 100vh;
		background: var(--color-bg);
		padding: 80px 24px 60px;
		overflow-y: auto;
	}

	.archive-header {
		max-width: 900px;
		margin: 0 auto 40px;
	}

	.archive-title {
		font-family: var(--font-display);
		font-size: 2.4rem;
		font-weight: 400;
		color: var(--color-text);
		letter-spacing: -0.03em;
		margin-bottom: 6px;
	}

	.archive-subtitle {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-text-muted);
		letter-spacing: 0.04em;
		margin-bottom: 28px;
	}

	.filter-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.filter-chip {
		padding: 5px 12px;
		border-radius: 20px;
		font-size: 0.65rem;
		font-family: var(--font-mono);
		letter-spacing: 0.06em;
		color: var(--color-text-muted);
		border: 1px solid rgba(232, 230, 225, 0.08);
		transition: all 0.2s ease;
	}

	.filter-chip:hover {
		color: var(--color-text);
		border-color: rgba(232, 230, 225, 0.2);
	}

	.filter-chip.active {
		color: var(--color-text);
		background: rgba(123, 140, 222, 0.12);
		border-color: rgba(123, 140, 222, 0.3);
	}

	.section-title {
		font-family: var(--font-display);
		font-size: 1.4rem;
		font-weight: 400;
		color: var(--color-text);
		margin-bottom: 4px;
	}

	.section-subtitle {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		color: var(--color-text-muted);
		margin-bottom: 20px;
	}

	.screenshots-section {
		max-width: 900px;
		margin: 0 auto 48px;
	}

	.screenshot-group {
		margin-bottom: 20px;
	}

	.group-label {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--color-accent);
		letter-spacing: 0.06em;
		margin-bottom: 8px;
	}

	.screenshot-rail {
		display: flex;
		gap: 14px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		-webkit-overflow-scrolling: touch;
		padding-bottom: 8px;
		scrollbar-width: thin;
		scrollbar-color: rgba(232, 230, 225, 0.12) transparent;
	}

	.screenshot-rail::-webkit-scrollbar {
		height: 5px;
	}

	.screenshot-rail::-webkit-scrollbar-track {
		background: transparent;
	}

	.screenshot-rail::-webkit-scrollbar-thumb {
		background: rgba(232, 230, 225, 0.12);
		border-radius: 4px;
	}

	.screenshot-card {
		flex: 0 0 280px;
		scroll-snap-align: start;
		border: 1px solid rgba(232, 230, 225, 0.08);
		border-radius: 10px;
		overflow: hidden;
		background: rgba(232, 230, 225, 0.02);
		transition: all 0.25s ease;
		cursor: pointer;
		padding: 0;
		text-align: left;
	}

	.screenshot-card:hover {
		border-color: rgba(232, 230, 225, 0.18);
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
	}

	.screenshot-card img {
		width: 100%;
		aspect-ratio: 16/9;
		object-fit: cover;
		display: block;
	}

	.screenshot-meta {
		padding: 8px 10px;
		display: flex;
		gap: 6px 10px;
		font-family: var(--font-mono);
		font-size: 0.55rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.meta-station {
		font-weight: 700;
		color: var(--color-accent);
		letter-spacing: 0.05em;
	}

	.meta-mode {
		color: rgba(232, 230, 225, 0.45);
	}

	.meta-seed {
		font-variant-numeric: tabular-nums;
		color: rgba(232, 230, 225, 0.35);
	}

	.meta-time {
		margin-left: auto;
		color: rgba(232, 230, 225, 0.3);
	}

	.station-section {
		max-width: 900px;
		margin: 0 auto 48px;
	}

	.station-header {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin-bottom: 12px;
		padding-bottom: 10px;
		border-bottom: 1px solid rgba(232, 230, 225, 0.06);
	}

	.station-code {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-accent);
		letter-spacing: 0.05em;
	}

	.station-name {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-text);
	}

	.station-count {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--color-text-muted);
		margin-left: auto;
	}

	.readings-table {
		border: 1px solid rgba(232, 230, 225, 0.06);
		border-radius: 8px;
		overflow: hidden;
	}

	.table-header {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr 1fr 0.4fr;
		padding: 8px 14px;
		background: rgba(232, 230, 225, 0.03);
		border-bottom: 1px solid rgba(232, 230, 225, 0.06);
		font-family: var(--font-mono);
		font-size: 0.58rem;
		font-weight: 600;
		color: var(--color-text-muted);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.table-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr 1fr 0.4fr;
		padding: 6px 14px;
		border-bottom: 1px solid rgba(232, 230, 225, 0.03);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		color: rgba(232, 230, 225, 0.55);
		transition: background 0.15s ease;
	}

	.table-row:last-child {
		border-bottom: none;
	}

	.table-row:hover {
		background: rgba(232, 230, 225, 0.02);
	}

	.table-row.anomalous {
		background: rgba(222, 154, 123, 0.06);
	}

	.col-counts {
		font-variant-numeric: tabular-nums;
	}

	.col-seed {
		font-variant-numeric: tabular-nums;
		color: rgba(232, 230, 225, 0.4);
	}

	.col-delta {
		font-variant-numeric: tabular-nums;
	}

	.delta-up { color: #7bde8c; }
	.delta-down { color: #de7b7b; }
	.delta-flat { color: rgba(232, 230, 225, 0.3); }

	.col-flag {
		text-align: center;
	}

	.anomaly-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: rgba(222, 154, 123, 0.2);
		color: var(--color-accent-warm);
		font-size: 0.6rem;
		font-weight: 700;
	}

	.loading, .empty-state {
		text-align: center;
		padding: 60px 20px;
	}

	.loading-text {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-text-muted);
		letter-spacing: 0.1em;
	}

	.empty-state {
		text-align: center;
	}

	.empty-state .empty-title {
		font-family: var(--font-display);
		font-size: 1.4rem;
		color: var(--color-text);
		margin-bottom: 8px;
	}

	.empty-state .empty-subtitle {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--color-text-muted);
		max-width: 400px;
		margin: 0 auto;
		line-height: 1.6;
	}

	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 1000;
		background: rgba(0, 0, 0, 0.92);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.lightbox img {
		max-width: 95vw;
		max-height: 95vh;
		object-fit: contain;
		border-radius: 4px;
	}

	.lightbox-close {
		position: absolute;
		top: 20px;
		right: 24px;
		font-size: 2rem;
		color: rgba(232, 230, 225, 0.6);
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.2s;
		line-height: 1;
	}

	.lightbox-close:hover {
		color: var(--color-text);
	}

	@media (max-width: 600px) {
		.archive-page {
			padding: 60px 12px 40px;
		}

		.archive-title {
			font-size: 1.8rem;
		}

		.table-header, .table-row {
			grid-template-columns: 1fr 1fr 1fr;
		}

		.col-delta, .col-flag {
			display: none;
		}

		.screenshot-card {
			flex: 0 0 200px;
		}

		.lightbox-close {
			top: 12px;
			right: 14px;
		}
	}
</style>
