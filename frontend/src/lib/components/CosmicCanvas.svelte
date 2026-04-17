<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import * as THREE from 'three';
	import { currentReading, currentStation, stations, renderMode, type RenderMode } from '$lib/stores/cosmic';
	import { env } from '$env/dynamic/public';

	import cosmicVert from '$lib/shaders/cosmic.vert?raw';
	import cosmicFrag from '$lib/shaders/cosmic.frag?raw';

	import { buildCrossingScene, updateCrossingScene, disposeCrossingScene } from '$lib/scenes/crossing';
	import { buildRunnerScene, updateRunnerScene, disposeRunnerScene, attachRunnerInput, detachRunnerInput } from '$lib/scenes/runner';
	import { buildPipesScene, updatePipesScene, disposePipesScene, resetPipes } from '$lib/scenes/pipes';
	import { canvasRenderer, type ScreenshotContext } from '$lib/stores/screenshot';

	const MC_URL = env.PUBLIC_MC_URL || 'http://localhost:8080';

	let container: HTMLDivElement;
	let renderer: THREE.WebGLRenderer;
	let animationId: number;
	let clock: THREE.Clock;

	let targetSeed = 0.5;
	let targetDelta = 0.0;
	let targetCounts = 100;
	let seedSmooth = 0.5;
	let deltaSmooth = 0.0;
	let countsSmooth = 100;

	const targetOffsetVec = new THREE.Vector2(0, 0);
	const offsetSmooth = new THREE.Vector2(0, 0);
	let targetHue = 0;
	let hueSmooth = 0;
	let lastStationCode = '';

	let activeMode: RenderMode = 'noise';
	let scene: THREE.Scene;
	let camera: THREE.Camera;
	let shaderMaterial: THREE.ShaderMaterial | null = null;

	let voxelIframeSrc = '';
	let showVoxelIframe = false;
	let voxelStation = '';

	function buildVoxelUrl(seed: number, station: string): string {
		return `${MC_URL}/?seed=${seed.toFixed(4)}&station=${encodeURIComponent(station)}`;
	}

	const unsubReading = currentReading.subscribe((r) => {
		if (r) {
			targetSeed = r.normalized;
			targetDelta = r.fluxDelta;
			targetCounts = r.counts;
		}
	});

	const unsubStation = currentStation.subscribe((code) => {
		if (!code) return;
		if (activeMode === 'voxel' && code !== voxelStation) {
			voxelStation = code;
			voxelIframeSrc = buildVoxelUrl(seedSmooth, code);
		} else if (activeMode === 'pipes') {
			resetPipes(code);
		}
	});

	function detachActiveMode() {
		if (activeMode === 'runner') detachRunnerInput();
	}

	function attachActiveMode(m: RenderMode) {
		if (m === 'runner') attachRunnerInput();
	}

	const unsubMode = renderMode.subscribe((m) => {
		if (renderer && m !== activeMode) {
			detachActiveMode();
			activeMode = m;
			rebuildScene();
			attachActiveMode(m);
		} else {
			activeMode = m;
		}
	});

	function lerp(a: number, b: number, t: number): number {
		return a + (b - a) * t;
	}

	function stationFieldOffset(code: string): THREE.Vector2 {
		let h = 5381;
		for (let i = 0; i < code.length; i++) {
			h = (h * 33) ^ code.charCodeAt(i);
		}
		const x = Math.sin(h * 0.00012) * 24;
		const y = Math.cos(h * 0.00019) * 24;
		return new THREE.Vector2(x, y);
	}

	function stationHue(code: string): number {
		let h = 5381;
		for (let i = 0; i < code.length; i++) {
			h = ((h * 33) ^ code.charCodeAt(i)) >>> 0;
		}
		return (h % 1000) / 1000;
	}

	function makeShaderUniforms() {
		return {
			u_time: { value: 0 },
			u_cosmic_seed: { value: 0.5 },
			u_flux_delta: { value: 0.0 },
			u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
			u_offset: { value: new THREE.Vector2(0, 0) },
			u_station_hue: { value: 0.0 }
		};
	}

	function syncStationTargets() {
		const code = get(currentStation);
		if (code && code !== lastStationCode) {
			lastStationCode = code;
			targetOffsetVec.copy(stationFieldOffset(code));
			targetHue = stationHue(code);
		}
	}

	function buildNoiseScene() {
		syncStationTargets();
		offsetSmooth.copy(targetOffsetVec);
		hueSmooth = targetHue;
		scene = new THREE.Scene();
		camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
		camera.position.set(0, 0, 1);
		camera.lookAt(0, 0, 0);

		shaderMaterial = new THREE.ShaderMaterial({
			vertexShader: cosmicVert,
			fragmentShader: cosmicFrag,
			uniforms: makeShaderUniforms()
		});
		scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shaderMaterial));
	}

	function rebuildScene() {
		if (shaderMaterial) {
			shaderMaterial.dispose();
			shaderMaterial = null;
		}
		disposeCrossingScene();
		disposeRunnerScene();
		disposePipesScene();

		if (activeMode === 'voxel') {
			showVoxelIframe = true;
			voxelStation = get(currentStation) || '';
			voxelIframeSrc = buildVoxelUrl(seedSmooth, voxelStation);
			return;
		}

		showVoxelIframe = false;
		voxelIframeSrc = '';

		if (activeMode === 'noise') buildNoiseScene();
		else if (activeMode === 'pipes') {
			const result = buildPipesScene(get(currentStation) || undefined);
			scene = result.scene;
			camera = result.camera;
		} else if (activeMode === 'crossing') {
			const result = buildCrossingScene();
			scene = result.scene;
			camera = result.camera;
		} else if (activeMode === 'runner') {
			const result = buildRunnerScene();
			scene = result.scene;
			camera = result.camera;
		}
	}

	function updateUniforms(elapsed: number) {
		syncStationTargets();

		seedSmooth = lerp(seedSmooth, targetSeed, 0.02);
		deltaSmooth = lerp(deltaSmooth, targetDelta, 0.05);
		countsSmooth = lerp(countsSmooth, targetCounts, 0.03);

		offsetSmooth.lerp(targetOffsetVec, 0.06);
		hueSmooth = lerp(hueSmooth, targetHue, 0.06);

		if (shaderMaterial) {
			shaderMaterial.uniforms.u_time.value = elapsed;
			shaderMaterial.uniforms.u_cosmic_seed.value = seedSmooth;
			shaderMaterial.uniforms.u_flux_delta.value = deltaSmooth;
			shaderMaterial.uniforms.u_offset.value.copy(offsetSmooth);
			shaderMaterial.uniforms.u_station_hue.value = hueSmooth;
		}
	}

	onMount(() => {
		clock = new THREE.Clock();

		renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: false,
			preserveDrawingBuffer: true,
			powerPreference: 'high-performance'
		});
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(window.innerWidth, window.innerHeight);
		container.appendChild(renderer.domElement);

		function renderForStation(stationCode: string, seed: number, delta: number): void {
			if (activeMode !== 'noise' || !shaderMaterial) return;

			const prevSeed = shaderMaterial.uniforms.u_cosmic_seed.value;
			const prevDelta = shaderMaterial.uniforms.u_flux_delta.value;
			const prevOffset = shaderMaterial.uniforms.u_offset.value.clone();
			const prevHue = shaderMaterial.uniforms.u_station_hue.value;

			shaderMaterial.uniforms.u_cosmic_seed.value = seed;
			shaderMaterial.uniforms.u_flux_delta.value = delta;
			shaderMaterial.uniforms.u_offset.value.copy(stationFieldOffset(stationCode));
			shaderMaterial.uniforms.u_station_hue.value = stationHue(stationCode);
			renderer.render(scene, camera);

			shaderMaterial.uniforms.u_cosmic_seed.value = prevSeed;
			shaderMaterial.uniforms.u_flux_delta.value = prevDelta;
			shaderMaterial.uniforms.u_offset.value.copy(prevOffset);
			shaderMaterial.uniforms.u_station_hue.value = prevHue;
		}

		const ctx: ScreenshotContext = {
			domElement: renderer.domElement,
			renderForStation
		};
		canvasRenderer.set(ctx);

		rebuildScene();

		const onResize = () => {
			const w = window.innerWidth;
			const h = window.innerHeight;
			renderer.setSize(w, h);
			if (shaderMaterial) {
				shaderMaterial.uniforms.u_resolution.value.set(w, h);
			}
			if (camera instanceof THREE.PerspectiveCamera) {
				camera.aspect = w / h;
				camera.updateProjectionMatrix();
			}
			if (activeMode === 'crossing' && camera instanceof THREE.OrthographicCamera) {
				const aspect = w / h;
				const frustum = 14;
				camera.left = -frustum * aspect;
				camera.right = frustum * aspect;
				camera.top = frustum;
				camera.bottom = -frustum;
				camera.updateProjectionMatrix();
			}
		};
		window.addEventListener('resize', onResize);

		let lastTime = 0;

		function animate() {
			animationId = requestAnimationFrame(animate);
			const elapsed = clock.getElapsedTime();
			const dt = elapsed - lastTime;
			lastTime = elapsed;

			updateUniforms(elapsed);

			if (activeMode === 'voxel') return;

			if (activeMode === 'pipes') {
				updatePipesScene(dt, seedSmooth, deltaSmooth);
			} else if (activeMode === 'crossing') {
				updateCrossingScene(elapsed, seedSmooth, deltaSmooth, countsSmooth);
			} else if (activeMode === 'runner') {
				updateRunnerScene(elapsed, seedSmooth, deltaSmooth, countsSmooth);
			}

			renderer.render(scene, camera);
		}

		animate();
		return () => window.removeEventListener('resize', onResize);
	});

	onDestroy(() => {
		unsubReading();
		unsubMode();
		unsubStation();
		canvasRenderer.set(null);
		if (animationId) cancelAnimationFrame(animationId);
		detachActiveMode();
		disposeCrossingScene();
		disposeRunnerScene();
		disposePipesScene();
		renderer?.dispose();
		shaderMaterial?.dispose();
	});
</script>

{#if showVoxelIframe}
	{#key voxelIframeSrc}
		<iframe
			class="voxel-iframe"
			src={voxelIframeSrc}
			title="Voxel World"
			allow="pointer-lock; fullscreen"
		></iframe>
	{/key}
{/if}

<div class="cosmic-canvas" class:hidden={showVoxelIframe} bind:this={container}></div>

<style>
	.cosmic-canvas {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 0;
	}

	.cosmic-canvas.hidden {
		display: none;
	}

	.cosmic-canvas :global(canvas) {
		display: block;
	}

	.voxel-iframe {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 0;
		border: none;
	}
</style>
