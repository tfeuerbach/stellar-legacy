<script lang="ts">
	import { currentReading, renderMode } from '$lib/stores/cosmic';

	let showPanel = false;
	let showMath = false;

	const descriptions: Record<string, { casual: string; math: string }> = {
		noise: {
			casual:
				'Neutron counts drive the balance between static grain and fluid motion. Higher cosmic ray activity pushes toward warmer tones and organic flow. Lower activity pulls toward cold, grainy static.',
			math: `seed = (counts - station_min) / (station_max - station_min)
blend = mix(whiteNoise, curlNoise_fluid, seed)
color = mix(coldPalette(blend), warmPalette(blend), seed)
speed = 0.15 + |delta| * 2.0`
		},
		pipes: {
			casual:
				'Classic Windows 3D Pipes screensaver, driven by cosmic data. Pipes grow through space making 90-degree turns with metallic reflections. Each station generates a unique color palette — complementary, triadic, analogous, or wide-spectrum — so switching stations completely changes the mood. Higher neutron flux spawns more pipes that travel faster. Delta controls camera orbit speed.',
			math: `pipe_count = 3 + seed * 6 + |delta| * 4
speed = 4 + seed * 8 + rand * 4
palette = station_hash % 5 color schemes
base_hue = (station_hash % 360) / 360
segment_length = 2 + rand * 6
camera_orbit = 0.08 + |delta| * 0.3
metalness = 0.7, roughness = 0.25`
		},
		crossing: {
			casual:
				'Each pedestrian on this intersection represents one neutron detected by the station right now. The raw count per second becomes the crowd size — a Forbush decrease thins the streets, a GLE floods them. Seed drives walk speed and outfit colors, delta makes the crowd drift erratically.',
			math: `pedestrian_count = round(raw_counts)  // capped at 300
walk_speed = base_speed * (0.5 + seed * 1.5)
drift = sin(t * 2 + phase) * |delta| * 1.2
building_height = base_h * (0.6 + seed * 0.8)
sky = mix(overcast, clear_blue, seed)`
		},
		runner: {
			casual:
				'You are the neutron monitor. Hazards scale with how hard the station was being hit: normalized rate vs that site’s history, raw count rate, and recent upward jumps in the feed (positive delta). High influx means faster, larger neutrons, more spawns, and occasional double bursts. Dodge with A/D and SPACE to dash.',
			math: `pressure = clamp(0.55*seed + 0.45*log10_scale(counts))
spawn_rate = min(11, 0.9 + pressure*7.5 + max(0,delta)*6 + |delta|*2)
P(double_spawn_tick) = min(0.42, pressure*0.32 + max(0,delta)*1.4)
speed = 10 + pressure*26 + |delta|*22 + max(0,delta)*16 + rand*(8+pressure*8)
radius grows slightly with pressure
neutron_color = mix(#44ccff, #ff3322, seed)
score = survival_time (seconds)`
		},
		voxel: {
			casual:
				'A full Minecraft clone (MIT-licensed minecraft-threejs by Yulei Zhu) runs in its own container. The cosmic seed and station code are passed via URL so each station generates a unique world. Click to lock the mouse, WASD to move, Space to jump, Q to toggle fly, left/right click to break/place blocks.',
			math: `seed_url = f(normalized_seed, station_code_hash)
ImprovedNoise uses seed, stoneSeed, treeSeed, coalSeed, leafSeed
terrain worker builds instanced meshes per chunk
world is deterministic per (seed, station) pair`
		}
	};

	$: desc = descriptions[$renderMode] || descriptions.noise;
</script>

<div class="info-wrapper">
	<button
		class="info-btn"
		on:mouseenter={() => (showPanel = true)}
		on:click={() => (showPanel = !showPanel)}
		aria-label="How this visualization works"
	>
		i
	</button>

	{#if showPanel}
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div class="info-panel" on:mouseleave={() => (showPanel = false)}>
			<p class="casual">{desc.casual}</p>

			{#if $currentReading}
				<div class="current-vals">
					<span>Station: <strong>{$currentReading.station}</strong></span>
					<span>Raw: <strong>{$currentReading.counts.toFixed(1)} c/s</strong></span>
					<span>Seed: <strong>{$currentReading.normalized.toFixed(4)}</strong></span>
					<span>Delta: <strong>{$currentReading.fluxDelta > 0 ? '+' : ''}{$currentReading.fluxDelta.toFixed(4)}</strong></span>
				</div>
			{/if}

			<button class="math-toggle" on:click={() => (showMath = !showMath)}>
				{showMath ? 'Hide math' : 'Show math'}
			</button>

			{#if showMath}
				<pre class="math-block">{desc.math}</pre>
			{/if}
		</div>
	{/if}
</div>

<style>
	.info-wrapper {
		position: relative;
		z-index: 60;
	}

	.info-btn {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 1px solid rgba(232, 230, 225, 0.15);
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.7rem;
		color: rgba(232, 230, 225, 0.35);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.info-btn:hover {
		color: var(--color-text);
		border-color: rgba(232, 230, 225, 0.35);
	}

	.info-panel {
		position: absolute;
		bottom: calc(100% + 10px);
		left: 0;
		width: 340px;
		background: rgba(8, 8, 14, 0.94);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(232, 230, 225, 0.1);
		border-radius: 10px;
		padding: 16px;
		pointer-events: auto;
	}

	.casual {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		color: rgba(232, 230, 225, 0.6);
		line-height: 1.65;
		margin-bottom: 12px;
	}

	.current-vals {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 14px;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: rgba(232, 230, 225, 0.35);
		margin-bottom: 10px;
		padding-bottom: 10px;
		border-bottom: 1px solid rgba(232, 230, 225, 0.06);
	}

	.current-vals strong {
		color: rgba(232, 230, 225, 0.6);
	}

	.math-toggle {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--color-accent);
		opacity: 0.7;
		transition: opacity 0.2s ease;
	}

	.math-toggle:hover {
		opacity: 1;
	}

	.math-block {
		margin-top: 10px;
		font-family: var(--font-mono);
		font-size: 0.58rem;
		color: rgba(232, 230, 225, 0.4);
		line-height: 1.7;
		background: rgba(0, 0, 0, 0.3);
		padding: 10px;
		border-radius: 6px;
		white-space: pre-wrap;
		overflow-x: auto;
	}
</style>
