import * as THREE from 'three';

interface Pipe {
	position: THREE.Vector3;
	direction: THREE.Vector3;
	color: THREE.Color;
	radius: number;
	segmentsLeft: number;
	segmentLength: number;
	speed: number;
	progress: number;
	currentMesh: THREE.Mesh | null;
	jointMesh: THREE.Mesh | null;
}

const DIRECTIONS: THREE.Vector3[] = [
	new THREE.Vector3(1, 0, 0),
	new THREE.Vector3(-1, 0, 0),
	new THREE.Vector3(0, 1, 0),
	new THREE.Vector3(0, -1, 0),
	new THREE.Vector3(0, 0, 1),
	new THREE.Vector3(0, 0, -1)
];

const BOUNDS = 30;
const MAX_MESHES = 4000;

const CYCLE_SECONDS = 60;

let pipesScene: THREE.Scene | null = null;
let pipesCamera: THREE.PerspectiveCamera | null = null;
let pipes: Pipe[] = [];
let meshCount = 0;
let cameraAngle = 0;
let allMeshes: THREE.Object3D[] = [];
let currentStationHash = 0;
let cycleTimer = 0;

const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
const sphereGeo = new THREE.SphereGeometry(1, 8, 6);

function hashStation(code: string): number {
	let h = 5381;
	for (let i = 0; i < code.length; i++) {
		h = ((h * 33) ^ code.charCodeAt(i)) >>> 0;
	}
	return h;
}

function cosmicColor(seed: number, variation: number): THREE.Color {
	const h = currentStationHash;
	const baseHue = (h % 360) / 360;
	const scheme = h % 8;

	let hue: number;
	switch (scheme) {
		case 0: {
			const spread = 0.12 + ((h >> 8) & 0xff) / 255 * 0.2;
			hue = baseHue + variation * spread;
			break;
		}
		case 1:
			hue = variation < 0.5
				? baseHue + variation * 0.15
				: baseHue + 0.5 + (variation - 0.5) * 0.15;
			break;
		case 2: {
			const third = variation < 0.33 ? 0 : variation < 0.66 ? 0.333 : 0.666;
			hue = baseHue + third + (Math.random() - 0.5) * 0.08;
			break;
		}
		case 3:
			hue = baseHue + variation * 0.9;
			break;
		case 4: {
			const split = variation < 0.5 ? 0.42 : -0.42;
			hue = baseHue + split + (Math.random() - 0.5) * 0.1;
			break;
		}
		case 5:
			hue = variation * 0.15 + (Math.floor(variation * 4) / 4) * 0.25 + baseHue;
			break;
		case 6:
			hue = baseHue + (Math.random() < 0.3 ? 0.5 : 0) + variation * 0.12;
			break;
		default:
			hue = Math.random();
			break;
	}

	hue = ((hue % 1) + 1) % 1;
	const sat = 0.5 + seed * 0.35 + ((h >> 16) & 0xff) / 255 * 0.15;
	const lit = 0.28 + variation * 0.3 + seed * 0.12;
	return new THREE.Color().setHSL(hue, Math.min(sat, 1), Math.min(lit, 0.72));
}

function driftColor(base: THREE.Color, amount: number): THREE.Color {
	const hsl = { h: 0, s: 0, l: 0 };
	base.getHSL(hsl);
	hsl.h = ((hsl.h + (Math.random() - 0.5) * amount) % 1 + 1) % 1;
	hsl.s = Math.min(1, Math.max(0.3, hsl.s + (Math.random() - 0.5) * 0.1));
	hsl.l = Math.min(0.72, Math.max(0.2, hsl.l + (Math.random() - 0.5) * 0.08));
	return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
}

function makePipeMaterial(color: THREE.Color): THREE.MeshStandardMaterial {
	const emissive = Math.random() < 0.15;
	return new THREE.MeshStandardMaterial({
		color,
		metalness: 0.65 + Math.random() * 0.2,
		roughness: 0.15 + Math.random() * 0.25,
		emissive: emissive ? color.clone().multiplyScalar(0.3) : undefined,
		emissiveIntensity: emissive ? 0.5 + Math.random() * 0.5 : 0
	});
}

function pickNewDirection(current: THREE.Vector3): THREE.Vector3 {
	const candidates = DIRECTIONS.filter(
		(d) => !d.equals(current) && !d.equals(current.clone().negate())
	);
	return candidates[Math.floor(Math.random() * candidates.length)].clone();
}

function spawnPipe(seed: number): Pipe {
	const position = new THREE.Vector3(
		(Math.random() - 0.5) * BOUNDS * 1.5,
		(Math.random() - 0.5) * BOUNDS * 1.5,
		(Math.random() - 0.5) * BOUNDS * 1.5
	);
	const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)].clone();
	const radius = 0.2 + Math.random() * 0.35;
	const segmentLength = 2 + Math.random() * 6;
	const speed = 4 + seed * 8 + Math.random() * 4;
	const variation = Math.random();

	return {
		position: position.clone(),
		direction,
		color: cosmicColor(seed, variation),
		radius,
		segmentsLeft: 8 + Math.floor(Math.random() * 20 + seed * 15),
		segmentLength,
		speed,
		progress: 0,
		currentMesh: null,
		jointMesh: null
	};
}

function createSegmentMesh(pipe: Pipe): THREE.Mesh {
	const mat = makePipeMaterial(pipe.color);
	const mesh = new THREE.Mesh(cylinderGeo, mat);
	mesh.scale.set(pipe.radius, 0.001, pipe.radius);

	const axis = new THREE.Vector3(0, 1, 0);
	const quat = new THREE.Quaternion().setFromUnitVectors(axis, pipe.direction);
	mesh.quaternion.copy(quat);
	mesh.position.copy(pipe.position);

	return mesh;
}

function createJointMesh(pipe: Pipe): THREE.Mesh {
	const mat = makePipeMaterial(pipe.color);
	const mesh = new THREE.Mesh(sphereGeo, mat);
	mesh.scale.setScalar(pipe.radius * 1.3);
	mesh.position.copy(pipe.position);
	return mesh;
}

function clearScene() {
	if (!pipesScene) return;
	for (const m of allMeshes) {
		pipesScene.remove(m);
		if (m instanceof THREE.Mesh) {
			(m.material as THREE.Material).dispose();
		}
	}
	allMeshes = [];
	meshCount = 0;
	pipes = [];
	cycleTimer = 0;
}

export function resetPipes(stationCode?: string): void {
	if (stationCode) currentStationHash = hashStation(stationCode);
	clearScene();
}

export function buildPipesScene(stationCode?: string): { scene: THREE.Scene; camera: THREE.PerspectiveCamera } {
	if (stationCode) currentStationHash = hashStation(stationCode);
	pipesScene = new THREE.Scene();
	pipesScene.background = new THREE.Color(0x050508);
	pipesScene.fog = new THREE.Fog(0x050508, 30, 80);

	pipesCamera = new THREE.PerspectiveCamera(
		55, window.innerWidth / window.innerHeight, 0.1, 150
	);
	pipesCamera.position.set(0, 0, 45);
	pipesCamera.lookAt(0, 0, 0);

	const ambient = new THREE.AmbientLight(0x404060, 0.6);
	pipesScene.add(ambient);

	const key = new THREE.DirectionalLight(0xffffff, 1.2);
	key.position.set(30, 40, 20);
	pipesScene.add(key);

	const fill = new THREE.DirectionalLight(0x6688cc, 0.4);
	fill.position.set(-20, -10, 30);
	pipesScene.add(fill);

	const rim = new THREE.PointLight(0xcc8866, 0.6, 80);
	rim.position.set(0, 30, -30);
	pipesScene.add(rim);

	pipes = [];
	allMeshes = [];
	meshCount = 0;
	cameraAngle = 0;

	return { scene: pipesScene, camera: pipesCamera };
}

export function updatePipesScene(
	dt: number,
	seed: number,
	delta: number
): void {
	if (!pipesScene || !pipesCamera) return;

	cycleTimer += dt;
	if (cycleTimer >= CYCLE_SECONDS) {
		clearScene();
		cycleTimer = 0;
	}

	const targetPipeCount = Math.floor(3 + seed * 6 + Math.abs(delta) * 4);
	while (pipes.length < targetPipeCount && meshCount < MAX_MESHES) {
		pipes.push(spawnPipe(seed));
	}

	for (let i = pipes.length - 1; i >= 0; i--) {
		const pipe = pipes[i];

		if (pipe.segmentsLeft <= 0) {
			pipes.splice(i, 1);
			continue;
		}

		if (!pipe.currentMesh) {
			if (meshCount >= MAX_MESHES) {
				const oldest = allMeshes.shift();
				if (oldest) {
					pipesScene.remove(oldest);
					if (oldest instanceof THREE.Mesh) {
						(oldest.material as THREE.Material).dispose();
					}
					meshCount--;
				}
			}

			const joint = createJointMesh(pipe);
			pipesScene.add(joint);
			allMeshes.push(joint);
			pipe.jointMesh = joint;
			meshCount++;

			const seg = createSegmentMesh(pipe);
			pipesScene.add(seg);
			allMeshes.push(seg);
			pipe.currentMesh = seg;
			meshCount++;
			pipe.progress = 0;
		}

		pipe.progress += pipe.speed * dt;
		const segLen = pipe.segmentLength;

		if (pipe.progress >= segLen) {
			if (pipe.currentMesh) {
				pipe.currentMesh.scale.y = segLen;
				const offset = pipe.direction.clone().multiplyScalar(segLen * 0.5);
				pipe.currentMesh.position.copy(pipe.position).add(offset);
			}

			pipe.position.add(pipe.direction.clone().multiplyScalar(segLen));

			if (
				Math.abs(pipe.position.x) > BOUNDS ||
				Math.abs(pipe.position.y) > BOUNDS ||
				Math.abs(pipe.position.z) > BOUNDS
			) {
				pipe.segmentsLeft = 0;
				pipe.currentMesh = null;
				continue;
			}

			pipe.direction = pickNewDirection(pipe.direction);
			pipe.segmentLength = 2 + Math.random() * 6;
			pipe.color = driftColor(pipe.color, 0.08);
			pipe.segmentsLeft--;
			pipe.currentMesh = null;
		} else {
			if (pipe.currentMesh) {
				const growLen = Math.max(0.01, pipe.progress);
				pipe.currentMesh.scale.y = growLen;
				const offset = pipe.direction.clone().multiplyScalar(growLen * 0.5);
				pipe.currentMesh.position.copy(pipe.position).add(offset);

				const axis = new THREE.Vector3(0, 1, 0);
				const quat = new THREE.Quaternion().setFromUnitVectors(axis, pipe.direction);
				pipe.currentMesh.quaternion.copy(quat);
			}
		}
	}

	cameraAngle += (0.08 + Math.abs(delta) * 0.3) * dt;
	const camR = 40 + (1 - seed) * 10;
	pipesCamera.position.x = Math.sin(cameraAngle) * camR;
	pipesCamera.position.z = Math.cos(cameraAngle) * camR;
	pipesCamera.position.y = Math.sin(cameraAngle * 0.4) * 12;
	pipesCamera.lookAt(0, 0, 0);
}

export function disposePipesScene(): void {
	if (!pipesScene) return;
	clearScene();
	pipesScene = null;
	pipesCamera = null;
}
