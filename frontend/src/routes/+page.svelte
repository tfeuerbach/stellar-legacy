<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import CosmicCanvas from '$lib/components/CosmicCanvas.svelte';
	import DataOverlay from '$lib/components/DataOverlay.svelte';
	import CreditsWatermark from '$lib/components/CreditsWatermark.svelte';
	import InfoTooltip from '$lib/components/InfoTooltip.svelte';
	import DataStreamPanel from '$lib/components/DataStreamPanel.svelte';
	import { stations, currentStation, renderMode } from '$lib/stores/cosmic';
	import { subscribeToStation } from '$lib/stores/socket';
	import { canvasRenderer } from '$lib/stores/screenshot';
	import { env } from '$env/dynamic/public';
	import RunnerHUD from '$lib/components/RunnerHUD.svelte';

	const API_URL = env.PUBLIC_API_URL || 'http://localhost:3001';
	const CAPTURE_INTERVAL_MS = 5 * 60 * 1000;

	let streamOpen = false;
	let captureInterval: ReturnType<typeof setInterval> | null = null;
	const lastCapturedTs: Record<string, string> = {};

	interface LatestReading {
		station_code: string;
		timestamp: string;
		normalized: number;
		flux_delta: number;
		credit_text: string;
	}

	function uploadBlob(blob: Blob, station: string, seed: number, credit: string, canvas: HTMLCanvasElement) {
		const form = new FormData();
		form.append('screenshot', blob, 'screenshot.jpg');
		form.append('station', station);
		form.append('mode', 'noise');
		form.append('seed', seed.toFixed(4));
		form.append('credit', credit);
		form.append('width', String(canvas.width));
		form.append('height', String(canvas.height));

		fetch(`${API_URL}/api/archive/upload`, { method: 'POST', body: form })
			.then((r) => r.json())
			.then((d) => { if (!d.ok) console.warn('Screenshot rejected:', station, d); })
			.catch((err) => console.warn('Screenshot upload failed:', station, err));
	}

	async function captureAllStations() {
		const ctx = get(canvasRenderer);
		const mode = get(renderMode);
		if (!ctx || mode !== 'noise') return;

		let readings: LatestReading[];
		try {
			const res = await fetch(`${API_URL}/api/readings/latest`);
			readings = await res.json();
		} catch {
			return;
		}

		if (!Array.isArray(readings) || readings.length === 0) return;

		const changed = readings.filter(
			(r) => lastCapturedTs[r.station_code] !== r.timestamp
		);
		if (changed.length === 0) return;

		const canvas = ctx.domElement;

		for (const r of changed) {
			ctx.renderForStation(r.station_code, r.normalized, r.flux_delta);
			await new Promise<void>((resolve) => {
				canvas.toBlob(
					(blob) => {
						if (blob && blob.size > 1024) {
							uploadBlob(blob, r.station_code, r.normalized, r.credit_text || '', canvas);
							lastCapturedTs[r.station_code] = r.timestamp;
						}
						resolve();
					},
					'image/jpeg',
					0.92
				);
			});
		}

		const current = get(currentStation);
		if (current) {
			const cur = readings.find((rd) => rd.station_code === current);
			if (cur) {
				ctx.renderForStation(cur.station_code, cur.normalized, cur.flux_delta);
			}
		}
	}

	onMount(() => {
		document.body.classList.add('on-home');

		const unsubStations = stations.subscribe((stationList) => {
			const active = get(currentStation);
			if (stationList.length > 0 && !active) {
				subscribeToStation(stationList[0].code);
			}
		});

		setTimeout(captureAllStations, 15_000);
		captureInterval = setInterval(captureAllStations, CAPTURE_INTERVAL_MS);

		return () => {
			unsubStations();
			document.body.classList.remove('on-home');
		};
	});

	onDestroy(() => {
		if (captureInterval) clearInterval(captureInterval);
	});
</script>

<svelte:head>
	<title>Stellar Legacy / Live</title>
	<meta name="description" content="Live cosmic ray visualizations seeded by neutron monitor data from stations around the world. Watch the cosmos shape noise, pipes, pedestrians, and voxel worlds in real time." />
	<link rel="canonical" href="https://stellar-legacy.tfeuerbach.dev" />
	<meta property="og:url" content="https://stellar-legacy.tfeuerbach.dev" />
	<meta property="og:title" content="Stellar Legacy / Live" />
	<meta property="og:description" content="Live cosmic ray visualizations seeded by neutron monitor data from stations around the world." />
	<meta name="twitter:title" content="Stellar Legacy / Live" />
	<meta name="twitter:description" content="Live cosmic ray visualizations seeded by neutron monitor data from stations around the world." />
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "WebApplication",
		"name": "Stellar Legacy",
		"url": "https://stellar-legacy.tfeuerbach.dev",
		"description": "Real-time cosmic ray visualizations driven by neutron monitor data from stations around the world.",
		"applicationCategory": "Visualization",
		"operatingSystem": "Web",
		"author": { "@type": "Person", "name": "Tyler Feuerbach", "url": "https://tfeuerbach.dev" },
		"isPartOf": { "@type": "WebSite", "name": "tfeuerbach.dev", "url": "https://tfeuerbach.dev" }
	})}</script>`}
</svelte:head>

<CosmicCanvas />
{#if $renderMode === 'runner'}
	<RunnerHUD />
{/if}
<DataOverlay />
<CreditsWatermark />

<div class="bottom-tools">
	<InfoTooltip />
	<button class="stream-btn" on:click={() => (streamOpen = true)} title="View data stream">
		<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
			<path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
		</svg>
	</button>
</div>

<DataStreamPanel bind:open={streamOpen} />

<style>
	:global(body.on-home) {
		overflow: hidden;
	}

	.bottom-tools {
		position: fixed;
		bottom: 130px;
		left: 16px;
		z-index: 60;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	@media (max-width: 640px) {
		.bottom-tools {
			bottom: 80px;
			left: 10px;
		}
	}

	.stream-btn {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 1px solid rgba(232, 230, 225, 0.15);
		color: rgba(232, 230, 225, 0.35);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.stream-btn:hover {
		color: var(--color-text);
		border-color: rgba(232, 230, 225, 0.35);
	}
</style>
