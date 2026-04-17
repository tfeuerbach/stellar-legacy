<script lang="ts">
	import { currentReading, isConnected } from '$lib/stores/cosmic';

	let audioCtx: AudioContext | null = null;
	let audioSource: AudioBufferSourceNode | null = null;
	let audioBuffer: AudioBuffer | null = null;
	let isPlaying = false;
	let audioLoading = false;

	function formatTimestamp(ts: string): string {
		const d = new Date(ts);
		return d.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
			timeZone: 'UTC'
		}) + ' UTC';
	}

	function base64ToArrayBuffer(base64: string): ArrayBuffer {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes.buffer;
	}

	async function toggleAudio() {
		if (isPlaying) {
			audioSource?.stop();
			audioSource = null;
			isPlaying = false;
			return;
		}

		if (!audioCtx) {
			audioCtx = new AudioContext();
		}

		if (!audioBuffer) {
			audioLoading = true;
			try {
				const res = await fetch('/media/blops.txt');
				const b64 = (await res.text()).trim();
				const raw = base64ToArrayBuffer(b64);
				audioBuffer = await audioCtx.decodeAudioData(raw);
			} catch (e) {
				console.error('Failed to load audio:', e);
				audioLoading = false;
				return;
			}
			audioLoading = false;
		}

		if (audioCtx.state === 'suspended') {
			await audioCtx.resume();
		}

		audioSource = audioCtx.createBufferSource();
		audioSource.buffer = audioBuffer;
		audioSource.loop = true;
		audioSource.connect(audioCtx.destination);
		audioSource.start();
		isPlaying = true;

		audioSource.onended = () => {
			isPlaying = false;
			audioSource = null;
		};
	}
</script>

<div class="data-overlay">
	<div class="connection-dot" class:connected={$isConnected}></div>

	{#if $currentReading}
		<div class="data-row">
			<span class="label has-tip">
				FLUX
				<span class="tip">Normalized cosmic ray intensity (0–1), derived from the station's raw neutron count relative to its historical range. This is the seed that drives the visualization.</span>
			</span>
			<span class="value">{$currentReading.normalized.toFixed(4)}</span>
		</div>
		<div class="data-row">
			<span class="label has-tip">
				DELTA
				<span class="tip">Change in flux since the last reading. Positive means cosmic ray intensity increased; negative means it dropped. Large swings drive faster, more turbulent animation.</span>
			</span>
			<span class="value" class:positive={$currentReading.fluxDelta > 0} class:negative={$currentReading.fluxDelta < 0}>
				{$currentReading.fluxDelta > 0 ? '+' : ''}{$currentReading.fluxDelta.toFixed(4)}
			</span>
		</div>
		<div class="data-row">
			<span class="label has-tip">
				RAW
				<span class="tip">Neutron counts per second from the station's detector. This is the actual measurement — secondary neutrons produced when cosmic rays hit the atmosphere.</span>
			</span>
			<span class="value">{$currentReading.counts.toFixed(1)} c/s</span>
		</div>
		<button class="data-row timestamp" class:playing={isPlaying} on:click={toggleAudio}>
			<span>{audioLoading ? '...' : isPlaying ? '♪ ' : ''}{formatTimestamp($currentReading.timestamp)}</span>
		</button>
	{/if}
</div>

<style>
	.data-overlay {
		position: fixed;
		bottom: 20px;
		left: 20px;
		z-index: 50;
		font-family: var(--font-mono);
		font-size: 0.65rem;
		color: rgba(232, 230, 225, 0.4);
		pointer-events: auto;
		user-select: none;
	}

	.connection-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: rgba(255, 80, 80, 0.7);
		margin-bottom: 10px;
		transition: background 0.5s ease;
	}

	.connection-dot.connected {
		background: rgba(80, 255, 120, 0.7);
	}

	.data-row {
		display: flex;
		gap: 10px;
		margin-bottom: 3px;
	}

	.label {
		color: rgba(232, 230, 225, 0.25);
		min-width: 40px;
		letter-spacing: 0.1em;
	}

	.has-tip {
		position: relative;
		cursor: help;
		border-bottom: 1px dotted rgba(232, 230, 225, 0.12);
	}

	.tip {
		display: none;
		position: absolute;
		bottom: calc(100% + 8px);
		left: 0;
		width: 260px;
		padding: 10px 12px;
		background: rgba(8, 8, 14, 0.95);
		backdrop-filter: blur(14px);
		border: 1px solid rgba(232, 230, 225, 0.1);
		border-radius: 8px;
		font-size: 0.6rem;
		line-height: 1.65;
		color: rgba(232, 230, 225, 0.55);
		letter-spacing: 0.02em;
		pointer-events: none;
		z-index: 90;
	}

	.has-tip:hover .tip {
		display: block;
	}

	.value {
		color: rgba(232, 230, 225, 0.5);
	}

	.value.positive {
		color: rgba(120, 222, 150, 0.6);
	}

	.value.negative {
		color: rgba(222, 120, 120, 0.6);
	}

	.timestamp {
		margin-top: 6px;
		color: rgba(232, 230, 225, 0.2);
		font-size: 0.55rem;
		cursor: pointer;
		border: none;
		background: none;
		padding: 2px 0;
		font-family: var(--font-mono);
		transition: color 0.2s ease;
	}

	.timestamp:hover {
		color: rgba(232, 230, 225, 0.45);
	}

	.timestamp.playing {
		color: rgba(123, 140, 222, 0.5);
	}
</style>
