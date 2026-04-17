import * as THREE from 'three';

function seededRandom(seed: number): () => number {
	let s = Math.floor(seed * 2147483647) || 1;
	return () => {
		s = (s * 16807) % 2147483647;
		return (s - 1) / 2147483646;
	};
}

const LANE_COUNT = 5;
const LANE_WIDTH = 2.4;
const TOTAL_WIDTH = LANE_COUNT * LANE_WIDTH;
const CORRIDOR_LENGTH = 120;
const PLAYER_Z = 8;
const SPAWN_Z = -CORRIDOR_LENGTH;
const CULL_Z = PLAYER_Z + 5;
const DASH_COOLDOWN = 0.4;
const DASH_DURATION = 0.12;
const PLAYER_HALF = 0.4;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;

let playerMesh: THREE.Mesh;
let playerGlow: THREE.PointLight;
let playerLane = 2;
let playerX = 0;
let playerTargetX = 0;

let survivalTime = 0;
let highScore = 0;
let active = true;
let dead = false;
let deadTimer = 0;

let dashTimer = 0;
let dashCooldown = 0;

let lastSeed = 0.5;
let spawnAccum = 0;
let neutronIndex = 0;

let haloTexture: THREE.Texture | null = null;

interface Neutron {
	mesh: THREE.Mesh;
	sprite: THREE.Sprite;
	x: number;
	z: number;
	speed: number;
	lane: number;
	radius: number;
	phase: number;
}

let neutrons: Neutron[] = [];
let neutronGroup: THREE.Group;

let floorLines: THREE.Line[] = [];
let wallGroup: THREE.Group;

const keys: Record<string, boolean> = {};
let justPressed: Record<string, boolean> = {};

function onKeyDown(e: KeyboardEvent): void {
	const k = e.key.toLowerCase();
	if (!keys[k]) justPressed[k] = true;
	keys[k] = true;
	if (e.key === ' ') {
		e.preventDefault();
		if (!keys['space']) justPressed['space'] = true;
		keys['space'] = true;
	}
}

function onKeyUp(e: KeyboardEvent): void {
	keys[e.key.toLowerCase()] = false;
	if (e.key === ' ') keys['space'] = false;
}

export function attachRunnerInput(): void {
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
}

export function detachRunnerInput(): void {
	window.removeEventListener('keydown', onKeyDown);
	window.removeEventListener('keyup', onKeyUp);
	for (const k of Object.keys(keys)) keys[k] = false;
	justPressed = {};
}

function laneToX(lane: number): number {
	return (lane - (LANE_COUNT - 1) / 2) * LANE_WIDTH;
}

/** Map raw count rate (station-dependent) to ~0..1 for blending with normalized seed. */
function countIntensity(counts: number): number {
	const c = Math.max(1, counts);
	const log = Math.log10(c);
	// NMDB rates often sit roughly between ~10² and ~10⁴ depending on station/units.
	const t = (log - 1.85) / 2.05;
	return Math.max(0, Math.min(1, t));
}

/** How “inundated” the monitor is: position in its own history plus absolute rate. */
function sensorPressure(normalized: number, counts: number): number {
	const n = Math.max(0, Math.min(1, normalized));
	const blend = 0.55 * n + 0.45 * countIntensity(counts);
	return Math.max(0, Math.min(1, blend));
}

function makeHaloTexture(): THREE.Texture {
	if (haloTexture) return haloTexture;
	const size = 64;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;
	const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	grad.addColorStop(0, 'rgba(255,255,255,1)');
	grad.addColorStop(0.15, 'rgba(255,255,255,0.8)');
	grad.addColorStop(0.4, 'rgba(255,200,200,0.3)');
	grad.addColorStop(1, 'rgba(255,100,100,0)');
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, size, size);
	haloTexture = new THREE.CanvasTexture(canvas);
	return haloTexture;
}

function buildCorridor(): void {
	const floorGeo = new THREE.PlaneGeometry(TOTAL_WIDTH + 4, CORRIDOR_LENGTH + 20);
	const floorMat = new THREE.MeshStandardMaterial({
		color: 0x0c0c1a, roughness: 0.95, metalness: 0.0
	});
	const floor = new THREE.Mesh(floorGeo, floorMat);
	floor.rotation.x = -Math.PI / 2;
	floor.position.set(0, -1, -CORRIDOR_LENGTH / 2 + PLAYER_Z);
	floor.receiveShadow = true;
	scene.add(floor);

	const lineMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.4 });
	for (let i = 0; i <= LANE_COUNT; i++) {
		const x = (i - LANE_COUNT / 2) * LANE_WIDTH;
		const pts = [
			new THREE.Vector3(x, -0.99, PLAYER_Z + 10),
			new THREE.Vector3(x, -0.99, SPAWN_Z)
		];
		const geo = new THREE.BufferGeometry().setFromPoints(pts);
		const line = new THREE.Line(geo, lineMat);
		floorLines.push(line);
		scene.add(line);
	}

	wallGroup = new THREE.Group();
	const wallMat = new THREE.MeshStandardMaterial({
		color: 0x1a1a2e, roughness: 0.8, transparent: true, opacity: 0.3
	});
	const wallHeight = 6;
	const wallGeo = new THREE.PlaneGeometry(CORRIDOR_LENGTH + 20, wallHeight);

	const leftWall = new THREE.Mesh(wallGeo, wallMat);
	leftWall.rotation.y = Math.PI / 2;
	leftWall.position.set(-TOTAL_WIDTH / 2 - 2, wallHeight / 2 - 1, -CORRIDOR_LENGTH / 2 + PLAYER_Z);
	wallGroup.add(leftWall);

	const rightWall = new THREE.Mesh(wallGeo, wallMat.clone());
	rightWall.rotation.y = -Math.PI / 2;
	rightWall.position.set(TOTAL_WIDTH / 2 + 2, wallHeight / 2 - 1, -CORRIDOR_LENGTH / 2 + PLAYER_Z);
	wallGroup.add(rightWall);

	scene.add(wallGroup);
}

function neutronColor(seed: number): THREE.Color {
	const cold = new THREE.Color(0x44ccff);
	const hot = new THREE.Color(0xff3322);
	return new THREE.Color().lerpColors(cold, hot, seed);
}

function spawnNeutron(seed: number, delta: number, pressure: number): void {
	const rand = seededRandom(seed * 10000 + neutronIndex * 3.71);
	neutronIndex++;

	const lane = Math.floor(rand() * LANE_COUNT);
	const x = laneToX(lane) + (rand() - 0.5) * LANE_WIDTH * 0.6;
	const radius = 0.18 + pressure * 0.14 + rand() * (0.22 + pressure * 0.1);
	const surge = Math.max(0, delta);
	const baseSpeed = 10 + pressure * 26 + Math.abs(delta) * 22 + surge * 16;
	const speed = baseSpeed + rand() * (8 + pressure * 8);

	const nColor = neutronColor(seed);

	const geo = new THREE.SphereGeometry(radius, 12, 12);
	const mat = new THREE.MeshStandardMaterial({
		color: nColor, emissive: nColor, emissiveIntensity: 0.8,
		roughness: 0.2, metalness: 0.6, transparent: true, opacity: 0.85
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, -0.5 + radius, SPAWN_Z);

	const spriteMat = new THREE.SpriteMaterial({
		map: makeHaloTexture(),
		color: nColor,
		transparent: true,
		opacity: 0.6,
		blending: THREE.AdditiveBlending,
		depthWrite: false
	});
	const sprite = new THREE.Sprite(spriteMat);
	sprite.scale.setScalar(radius * 5);
	mesh.add(sprite);

	neutronGroup.add(mesh);
	neutrons.push({ mesh, sprite, x, z: SPAWN_Z, speed, lane, radius, phase: rand() * Math.PI * 2 });
}

function resetRun(): void {
	if (survivalTime > highScore) highScore = survivalTime;
	dead = true;
	deadTimer = 0;
}

function respawn(): void {
	survivalTime = 0;
	playerLane = 2;
	playerTargetX = laneToX(playerLane);
	playerX = playerTargetX;
	dead = false;
	active = true;
	playerMesh.visible = true;

	for (const n of neutrons) {
		n.mesh.geometry.dispose();
		(n.mesh.material as THREE.Material).dispose();
		(n.sprite.material as THREE.Material).dispose();
		neutronGroup.remove(n.mesh);
	}
	neutrons = [];
	neutronIndex = 0;
	spawnAccum = 0;
}

export function buildRunnerScene(): { scene: THREE.Scene; camera: THREE.PerspectiveCamera } {
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x0a0a1a);
	scene.fog = new THREE.FogExp2(0x0a0a1a, 0.012);

	camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);
	camera.position.set(0, 3.5, PLAYER_Z + 6);
	camera.lookAt(0, 0, PLAYER_Z - 30);

	neutronGroup = new THREE.Group();
	scene.add(neutronGroup);

	buildCorridor();

	const playerGeo = new THREE.BoxGeometry(0.7, 0.9, 0.5);
	const playerMat = new THREE.MeshStandardMaterial({
		color: 0x38bdf8, emissive: 0x1e6091, emissiveIntensity: 0.5,
		roughness: 0.4, metalness: 0.3
	});
	playerMesh = new THREE.Mesh(playerGeo, playerMat);
	playerMesh.castShadow = true;
	scene.add(playerMesh);

	playerGlow = new THREE.PointLight(0x38bdf8, 3, 12);
	scene.add(playerGlow);

	const ambient = new THREE.AmbientLight(0x334155, 0.4);
	scene.add(ambient);

	const dirLight = new THREE.DirectionalLight(0x667788, 0.8);
	dirLight.position.set(5, 15, 10);
	dirLight.castShadow = true;
	dirLight.shadow.mapSize.width = 1024;
	dirLight.shadow.mapSize.height = 1024;
	scene.add(dirLight);

	const vpLight = new THREE.PointLight(0x6366f1, 2, 80);
	vpLight.position.set(0, 2, SPAWN_Z);
	scene.add(vpLight);

	survivalTime = 0;
	playerLane = 2;
	playerX = laneToX(playerLane);
	playerTargetX = playerX;
	active = true;
	dead = false;
	lastSeed = 0.5;
	neutronIndex = 0;
	spawnAccum = 0;
	dashTimer = 0;
	dashCooldown = 0;
	floorLines = [];

	return { scene, camera };
}

export function updateRunnerScene(elapsed: number, seed: number, delta: number, counts: number): void {
	if (!scene || !playerMesh) return;

	const dt = 1 / 60;

	if (dead) {
		deadTimer += dt;
		playerMesh.visible = Math.sin(deadTimer * 30) > 0;
		if (deadTimer > 1.2) respawn();
		return;
	}

	survivalTime += dt;

	if (justPressed['a'] || justPressed['arrowleft']) {
		if (playerLane > 0) playerLane--;
		playerTargetX = laneToX(playerLane);
	}
	if (justPressed['d'] || justPressed['arrowright']) {
		if (playerLane < LANE_COUNT - 1) playerLane++;
		playerTargetX = laneToX(playerLane);
	}

	if (dashCooldown > 0) dashCooldown -= dt;
	if ((justPressed['space'] || justPressed[' ']) && dashCooldown <= 0) {
		if (keys['a'] || keys['arrowleft']) {
			playerLane = Math.max(0, playerLane - 2);
		} else if (keys['d'] || keys['arrowright']) {
			playerLane = Math.min(LANE_COUNT - 1, playerLane + 2);
		}
		playerTargetX = laneToX(playerLane);
		dashTimer = DASH_DURATION;
		dashCooldown = DASH_COOLDOWN;
	}

	justPressed = {};

	if (dashTimer > 0) {
		dashTimer -= dt;
		playerX += (playerTargetX - playerX) * 0.4;
	} else {
		playerX += (playerTargetX - playerX) * 0.15;
	}

	playerMesh.position.set(playerX, -0.1, PLAYER_Z);
	playerGlow.position.set(playerX, 0.5, PLAYER_Z);
	playerGlow.intensity = dashTimer > 0 ? 6 : 3;

	camera.position.x += (playerX * 0.3 - camera.position.x) * 0.05;

	const pressure = sensorPressure(seed, counts);
	const surge = Math.max(0, delta);
	const spawnRate = Math.min(
		11,
		0.9 + pressure * 7.5 + surge * 6 + Math.abs(delta) * 2
	);
	spawnAccum += dt * spawnRate;
	const doubleChance = Math.min(0.42, pressure * 0.32 + surge * 1.4);
	while (spawnAccum >= 1) {
		const roll = seededRandom(seed * 777 + neutronIndex * 1.618)();
		spawnNeutron(seed, delta, pressure);
		if (roll < doubleChance) spawnNeutron(seed, delta, pressure);
		spawnAccum -= 1;
	}

	const nColor = neutronColor(seed);

	neutrons = neutrons.filter((n) => {
		n.z += n.speed * dt;
		n.mesh.position.z = n.z;

		const dist = PLAYER_Z - n.z;
		const scale = Math.max(0.3, 1 - dist / CORRIDOR_LENGTH);
		n.mesh.scale.setScalar(scale * 2 + 0.5);

		const pulse = 1 + Math.sin(elapsed * 8 + n.phase) * 0.15;
		n.sprite.scale.setScalar(n.radius * 5 * pulse);
		(n.sprite.material as THREE.SpriteMaterial).opacity = 0.4 + Math.sin(elapsed * 6 + n.phase) * 0.2;
		(n.sprite.material as THREE.SpriteMaterial).color.copy(nColor);
		(n.mesh.material as THREE.MeshStandardMaterial).emissive.copy(nColor);

		if (n.z > CULL_Z) {
			n.mesh.geometry.dispose();
			(n.mesh.material as THREE.Material).dispose();
			(n.sprite.material as THREE.Material).dispose();
			neutronGroup.remove(n.mesh);
			return false;
		}

		if (active && Math.abs(n.z - PLAYER_Z) < 1.0) {
			const dx = Math.abs(n.x - playerX);
			if (dx < PLAYER_HALF + n.radius * 0.6) {
				resetRun();
			}
		}

		return true;
	});

	const coldBg = new THREE.Color(0x0a0a2e);
	const warmBg = new THREE.Color(0x1a0a05);
	const bgColor = new THREE.Color().lerpColors(coldBg, warmBg, seed);
	scene.background = bgColor;
	if (scene.fog) (scene.fog as THREE.FogExp2).color.copy(bgColor);

	const coldPlayer = new THREE.Color(0x38bdf8);
	const warmPlayer = new THREE.Color(0xfb923c);
	const pColor = new THREE.Color().lerpColors(coldPlayer, warmPlayer, seed);
	(playerMesh.material as THREE.MeshStandardMaterial).color.copy(pColor);
	(playerMesh.material as THREE.MeshStandardMaterial).emissive.copy(pColor).multiplyScalar(0.3);
	playerGlow.color.copy(pColor);
}

export function disposeRunnerScene(): void {
	if (!scene) return;
	detachRunnerInput();
	scene.traverse((obj) => {
		if (obj instanceof THREE.Mesh) {
			obj.geometry.dispose();
			if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
			else obj.material.dispose();
		}
		if (obj instanceof THREE.Line) {
			obj.geometry.dispose();
			(obj.material as THREE.Material).dispose();
		}
		if (obj instanceof THREE.Sprite) {
			(obj.material as THREE.Material).dispose();
		}
	});
	neutrons = [];
	floorLines = [];
}

export function getRunnerScore(): { distance: number; highScore: number } {
	return { distance: Math.floor(survivalTime), highScore: Math.floor(highScore) };
}

export function isRunnerActive(): boolean {
	return active && !dead;
}
