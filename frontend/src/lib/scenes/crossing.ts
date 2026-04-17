import * as THREE from 'three';

function seededRandom(seed: number): () => number {
	let s = Math.floor(seed * 2147483647) || 1;
	return () => {
		s = (s * 16807) % 2147483647;
		return (s - 1) / 2147483646;
	};
}

const ROAD_WIDTH = 6;
const GROUND_SIZE = 40;
const CROSSWALK_STRIPE_W = 0.6;
const CROSSWALK_STRIPE_GAP = 0.4;
const MAX_PEDESTRIANS = 300;
const CURB_HEIGHT = 0.12;
const CURB_WIDTH = 0.25;

const BUILDING_COLORS = [
	0x2dd4bf, 0xf97316, 0xfbbf24, 0xa78bfa,
	0xf472b6, 0x38bdf8, 0x34d399, 0xfb7185,
	0x6366f1, 0xec4899, 0x14b8a6, 0xeab308
];

const CAR_COLORS = [
	0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71,
	0x9b59b6, 0xe67e22, 0x1abc9c, 0xecf0f1
];

const OUTFIT_COLORS = [
	0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12,
	0x9b59b6, 0x1abc9c, 0xe67e22, 0xecf0f1,
	0xff6b6b, 0x48dbfb, 0x00d2d3, 0xfeca57,
	0xff9ff3, 0x54a0ff, 0x5f27cd, 0xc8d6e5
];

const SKIN_TONES = [0xf5cba7, 0xd4a574, 0xc68642, 0x8d5524, 0xffe0bd, 0xffcd94];

let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let pedestrians: Pedestrian[] = [];
let buildings: THREE.Mesh[] = [];
let buildingBaseHeights: number[] = [];
let buildingBounds: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
let rng: () => number;
let targetCount = 50;
let spawnIndex = 0;

interface Pedestrian {
	group: THREE.Group;
	startX: number;
	startZ: number;
	targetX: number;
	targetZ: number;
	speed: number;
	progress: number;
	walkPhase: number;
	direction: number;
	leftLeg: THREE.Mesh;
	rightLeg: THREE.Mesh;
	fading: boolean;
	opacity: number;
	launched: boolean;
	launchVelX: number;
	launchVelY: number;
	launchVelZ: number;
}

interface Car {
	group: THREE.Group;
	x: number;
	z: number;
	speed: number;
	horizontal: boolean;
	direction: number;
	halfW: number;
	halfD: number;
}

let cars: Car[] = [];
let raycaster: THREE.Raycaster;
let roadPlane: THREE.Mesh;

const legGeo = new THREE.BoxGeometry(0.12, 0.25, 0.12);
const bodyGeo = new THREE.BoxGeometry(0.25, 0.3, 0.2);
const headGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);

function createGround(): THREE.Group {
	const group = new THREE.Group();

	const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 });
	const roadMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.95 });
	const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.7 });
	const curbMat = new THREE.MeshStandardMaterial({ color: 0xb0b8c4, roughness: 0.85 });

	const sidewalk = new THREE.Mesh(
		new THREE.BoxGeometry(GROUND_SIZE, 0.3, GROUND_SIZE), sidewalkMat
	);
	sidewalk.position.y = -0.15;
	sidewalk.receiveShadow = true;
	group.add(sidewalk);

	const roadH = new THREE.Mesh(
		new THREE.BoxGeometry(GROUND_SIZE, 0.02, ROAD_WIDTH), roadMat
	);
	roadH.position.y = 0.01;
	roadH.receiveShadow = true;
	group.add(roadH);

	const roadV = new THREE.Mesh(
		new THREE.BoxGeometry(ROAD_WIDTH, 0.02, GROUND_SIZE), roadMat
	);
	roadV.position.y = 0.01;
	roadV.receiveShadow = true;
	group.add(roadV);

	const halfRoad = ROAD_WIDTH / 2;
	const segments = [
		{ from: -GROUND_SIZE / 2, to: -halfRoad },
		{ from: halfRoad, to: GROUND_SIZE / 2 }
	];

	for (const seg of segments) {
		const len = seg.to - seg.from;
		const cx = (seg.from + seg.to) / 2;

		for (const zSign of [-1, 1]) {
			const curb = new THREE.Mesh(
				new THREE.BoxGeometry(len, CURB_HEIGHT, CURB_WIDTH), curbMat
			);
			curb.position.set(cx, CURB_HEIGHT / 2, zSign * halfRoad);
			curb.receiveShadow = true;
			curb.castShadow = true;
			group.add(curb);
		}

		for (const xSign of [-1, 1]) {
			const curb = new THREE.Mesh(
				new THREE.BoxGeometry(CURB_WIDTH, CURB_HEIGHT, len), curbMat
			);
			curb.position.set(xSign * halfRoad, CURB_HEIGHT / 2, cx);
			curb.receiveShadow = true;
			curb.castShadow = true;
			group.add(curb);
		}
	}

	const stripePositions = [
		{ x: 0, z: halfRoad + 0.3, rotY: 0 },
		{ x: 0, z: -halfRoad - 0.3, rotY: 0 },
		{ x: halfRoad + 0.3, z: 0, rotY: Math.PI / 2 },
		{ x: -halfRoad - 0.3, z: 0, rotY: Math.PI / 2 }
	];
	for (const sp of stripePositions) {
		for (let i = -3; i <= 3; i++) {
			const stripe = new THREE.Mesh(
				new THREE.BoxGeometry(CROSSWALK_STRIPE_W, 0.03, 2), stripeMat
			);
			const offset = i * (CROSSWALK_STRIPE_W + CROSSWALK_STRIPE_GAP);
			stripe.position.set(
				sp.x + (sp.rotY === 0 ? offset : 0),
				0.03,
				sp.z + (sp.rotY !== 0 ? offset : 0)
			);
			stripe.rotation.y = sp.rotY;
			stripe.receiveShadow = true;
			group.add(stripe);
		}
	}

	// invisible plane for raycasting car spawns
	const planeMat = new THREE.MeshBasicMaterial({ visible: false });
	roadPlane = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE), planeMat);
	roadPlane.rotation.x = -Math.PI / 2;
	roadPlane.position.y = 0.02;
	group.add(roadPlane);

	return group;
}

function createBuildings(rand: () => number): void {
	const innerCorners = [
		{ cx: 8, cz: 8 }, { cx: -8, cz: 8 },
		{ cx: 8, cz: -8 }, { cx: -8, cz: -8 }
	];
	const outerCorners = [
		{ cx: 14, cz: 8 }, { cx: -14, cz: 8 },
		{ cx: 14, cz: -8 }, { cx: -14, cz: -8 },
		{ cx: 8, cz: 14 }, { cx: -8, cz: 14 },
		{ cx: 8, cz: -14 }, { cx: -8, cz: -14 },
		{ cx: 14, cz: 14 }, { cx: -14, cz: 14 },
		{ cx: 14, cz: -14 }, { cx: -14, cz: -14 }
	];

	buildings = [];
	buildingBaseHeights = [];
	buildingBounds = [];

	const halfRoad = ROAD_WIDTH / 2;

	function addBuilding(cx: number, cz: number, count: number) {
		for (let b = 0; b < count; b++) {
			const w = 1.5 + rand() * 3;
			const d = 1.5 + rand() * 3;
			const baseH = 2 + rand() * 6;
			const color = BUILDING_COLORS[Math.floor(rand() * BUILDING_COLORS.length)];

			const x = cx + (rand() - 0.5) * 4;
			const z = cz + (rand() - 0.5) * 4;

			// don't place buildings on the road
			if (Math.abs(x) < halfRoad + w / 2 + 0.5 || Math.abs(z) < halfRoad + d / 2 + 0.5) {
				if (Math.abs(x) < halfRoad + w / 2 + 0.5 && Math.abs(z) < halfRoad + d / 2 + 0.5) continue;
			}

			const geom = new THREE.BoxGeometry(w, baseH, d);
			const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
			const mesh = new THREE.Mesh(geom, mat);
			mesh.position.set(x, baseH / 2 + 0.15, z);
			mesh.castShadow = true;
			mesh.receiveShadow = true;

			scene.add(mesh);
			buildings.push(mesh);
			buildingBaseHeights.push(baseH);
			buildingBounds.push({
				minX: x - w / 2 - 0.3,
				maxX: x + w / 2 + 0.3,
				minZ: z - d / 2 - 0.3,
				maxZ: z + d / 2 + 0.3
			});
		}
	}

	for (const corner of innerCorners) {
		addBuilding(corner.cx, corner.cz, 5 + Math.floor(rand() * 3));
	}
	for (const corner of outerCorners) {
		addBuilding(corner.cx, corner.cz, 2 + Math.floor(rand() * 3));
	}
}

function routeHitsBuilding(startX: number, startZ: number, targetX: number, targetZ: number): boolean {
	const steps = 10;
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const px = startX + (targetX - startX) * t;
		const pz = startZ + (targetZ - startZ) * t;
		for (const bb of buildingBounds) {
			if (px > bb.minX && px < bb.maxX && pz > bb.minZ && pz < bb.maxZ) return true;
		}
	}
	return false;
}

function assignRoute(rand: () => number) {
	const sidewalkEdge = ROAD_WIDTH / 2 + 0.8;
	const farEdge = GROUND_SIZE / 2 - 1;

	for (let attempt = 0; attempt < 8; attempt++) {
		const direction = Math.floor(rand() * 4);
		let startX = 0, startZ = 0, targetX = 0, targetZ = 0;

		if (direction === 0) {
			startX = (rand() - 0.5) * (farEdge - sidewalkEdge) + (rand() < 0.5 ? sidewalkEdge : -sidewalkEdge);
			startZ = -farEdge + rand() * (farEdge - sidewalkEdge);
			targetX = startX + (rand() - 0.5) * 2;
			targetZ = farEdge;
		} else if (direction === 1) {
			startX = -farEdge + rand() * (farEdge - sidewalkEdge);
			startZ = (rand() - 0.5) * (farEdge - sidewalkEdge) + (rand() < 0.5 ? sidewalkEdge : -sidewalkEdge);
			targetX = farEdge;
			targetZ = startZ + (rand() - 0.5) * 2;
		} else if (direction === 2) {
			startX = (rand() - 0.5) * (farEdge - sidewalkEdge) + (rand() < 0.5 ? sidewalkEdge : -sidewalkEdge);
			startZ = farEdge - rand() * (farEdge - sidewalkEdge);
			targetX = startX + (rand() - 0.5) * 2;
			targetZ = -farEdge;
		} else {
			startX = farEdge - rand() * (farEdge - sidewalkEdge);
			startZ = (rand() - 0.5) * (farEdge - sidewalkEdge) + (rand() < 0.5 ? sidewalkEdge : -sidewalkEdge);
			targetX = -farEdge;
			targetZ = startZ + (rand() - 0.5) * 2;
		}

		if (!routeHitsBuilding(startX, startZ, targetX, targetZ)) {
			return { startX, startZ, targetX, targetZ, direction };
		}
	}

	// fallback: walk along the road where no buildings exist
	const direction = Math.floor(rand() * 2);
	const halfRoad = ROAD_WIDTH / 2;
	if (direction === 0) {
		const z = (rand() - 0.5) * (halfRoad * 0.8);
		return { startX: -farEdge, startZ: z, targetX: farEdge, targetZ: z, direction: 1 };
	}
	const x = (rand() - 0.5) * (halfRoad * 0.8);
	return { startX: x, startZ: -farEdge, targetX: x, targetZ: farEdge, direction: 0 };
}

function spawnPedestrian(rand: () => number): Pedestrian {
	const group = new THREE.Group();

	const bodyColor = OUTFIT_COLORS[Math.floor(rand() * OUTFIT_COLORS.length)];
	const skinColor = SKIN_TONES[Math.floor(rand() * SKIN_TONES.length)];
	const legColor = rand() < 0.5 ? 0x1f2937 : 0x374151;

	const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7, transparent: true });
	const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8, transparent: true });
	const legMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.8, transparent: true });

	const leftLeg = new THREE.Mesh(legGeo, legMat);
	leftLeg.position.set(-0.07, 0.125, 0);
	leftLeg.castShadow = true;
	group.add(leftLeg);

	const rightLeg = new THREE.Mesh(legGeo, legMat);
	rightLeg.position.set(0.07, 0.125, 0);
	rightLeg.castShadow = true;
	group.add(rightLeg);

	const body = new THREE.Mesh(bodyGeo, bodyMat);
	body.position.y = 0.4;
	body.castShadow = true;
	group.add(body);

	const head = new THREE.Mesh(headGeo, skinMat);
	head.position.y = 0.64;
	head.castShadow = true;
	group.add(head);

	const route = assignRoute(rand);
	group.position.set(route.startX, 0.15, route.startZ);
	const angle = Math.atan2(route.targetX - route.startX, route.targetZ - route.startZ);
	group.rotation.y = angle;

	scene.add(group);
	spawnIndex++;

	return {
		group, ...route,
		speed: 0.3 + rand() * 0.7,
		progress: rand() * 0.3,
		walkPhase: rand() * Math.PI * 2,
		leftLeg, rightLeg,
		fading: false, opacity: 1,
		launched: false, launchVelX: 0, launchVelY: 0, launchVelZ: 0,
	};
}

function removePedestrian(ped: Pedestrian) {
	scene.remove(ped.group);
	ped.group.traverse((obj) => {
		if (obj instanceof THREE.Mesh) obj.material.dispose();
	});
}

function respawnRoute(ped: Pedestrian, rand: () => number) {
	const route = assignRoute(rand);
	ped.startX = route.startX;
	ped.startZ = route.startZ;
	ped.targetX = route.targetX;
	ped.targetZ = route.targetZ;
	ped.direction = route.direction;
	ped.progress = 0;
	ped.speed = 0.3 + rand() * 0.7;
	ped.group.position.set(route.startX, 0.15, route.startZ);
	ped.group.rotation.y = Math.atan2(route.targetX - route.startX, route.targetZ - route.startZ);
}

function setPedestrianOpacity(ped: Pedestrian, opacity: number) {
	ped.opacity = opacity;
	ped.group.traverse((obj) => {
		if (obj instanceof THREE.Mesh) {
			(obj.material as THREE.MeshStandardMaterial).opacity = opacity;
		}
	});
}

function createCar(x: number, z: number, horizontal: boolean, rand: () => number): Car {
	const group = new THREE.Group();
	const color = CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)];
	const carMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 });

	const carBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 3.2), carMat);
	carBody.position.y = 0.45;
	carBody.castShadow = true;
	group.add(carBody);

	const glassMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.6 });
	const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.6), glassMat);
	cabin.position.set(0, 0.95, -0.2);
	cabin.castShadow = true;
	group.add(cabin);

	const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
	const wheelGeo = new THREE.BoxGeometry(0.25, 0.3, 0.35);
	for (const wx of [-0.85, 0.85]) {
		for (const wz of [-1.0, 1.0]) {
			const wheel = new THREE.Mesh(wheelGeo, wheelMat);
			wheel.position.set(wx, 0.15, wz);
			group.add(wheel);
		}
	}

	const halfRoad = ROAD_WIDTH / 2;
	const farEdge = GROUND_SIZE / 2 + 5;
	let direction: number;

	if (horizontal) {
		direction = x > 0 ? -1 : 1;
		group.position.set(direction > 0 ? -farEdge : farEdge, 0.02, z);
		group.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
	} else {
		direction = z > 0 ? -1 : 1;
		group.position.set(x, 0.02, direction > 0 ? -farEdge : farEdge);
		group.rotation.y = direction > 0 ? 0 : Math.PI;
	}

	scene.add(group);

	return {
		group, x: group.position.x, z: group.position.z,
		speed: 12 + rand() * 8,
		horizontal, direction,
		halfW: 0.9, halfD: 1.6
	};
}

function handleClick(event: MouseEvent) {
	if (!scene || !camera || !roadPlane) return;

	const rect = (event.target as HTMLElement).getBoundingClientRect();
	const mouse = new THREE.Vector2(
		((event.clientX - rect.left) / rect.width) * 2 - 1,
		-((event.clientY - rect.top) / rect.height) * 2 + 1
	);

	raycaster.setFromCamera(mouse, camera);
	const hits = raycaster.intersectObject(roadPlane);
	if (hits.length === 0) return;

	const pt = hits[0].point;
	const halfRoad = ROAD_WIDTH / 2;

	// only spawn on road surface
	const onHRoad = Math.abs(pt.z) < halfRoad;
	const onVRoad = Math.abs(pt.x) < halfRoad;
	if (!onHRoad && !onVRoad) return;

	const carRng = seededRandom(pt.x * 100 + pt.z * 37 + performance.now());
	if (onHRoad && (!onVRoad || Math.abs(pt.z) < Math.abs(pt.x))) {
		cars.push(createCar(pt.x, pt.z, true, carRng));
	} else {
		cars.push(createCar(pt.x, pt.z, false, carRng));
	}
}

let clickHandler: ((e: MouseEvent) => void) | null = null;

export function buildCrossingScene(): { scene: THREE.Scene; camera: THREE.OrthographicCamera } {
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x87ceeb);
	scene.fog = new THREE.Fog(0x87ceeb, 30, 60);

	const aspect = window.innerWidth / window.innerHeight;
	const frustum = 14;
	camera = new THREE.OrthographicCamera(
		-frustum * aspect, frustum * aspect,
		frustum, -frustum, 0.1, 100
	);
	camera.position.set(20, 20, 20);
	camera.lookAt(0, 0, 0);

	raycaster = new THREE.Raycaster();
	rng = seededRandom(0.5);
	spawnIndex = 0;
	cars = [];

	scene.add(createGround());
	createBuildings(rng);

	pedestrians = [];
	targetCount = 50;

	const dirLight = new THREE.DirectionalLight(0xfff4e6, 1.2);
	dirLight.position.set(15, 25, 10);
	dirLight.castShadow = true;
	dirLight.shadow.mapSize.width = 2048;
	dirLight.shadow.mapSize.height = 2048;
	dirLight.shadow.camera.left = -25;
	dirLight.shadow.camera.right = 25;
	dirLight.shadow.camera.top = 25;
	dirLight.shadow.camera.bottom = -25;
	dirLight.shadow.camera.near = 0.5;
	dirLight.shadow.camera.far = 60;
	dirLight.shadow.bias = -0.001;
	scene.add(dirLight);

	scene.add(new THREE.AmbientLight(0xffeedd, 0.5));
	scene.add(new THREE.HemisphereLight(0x87ceeb, 0x555555, 0.3));

	clickHandler = handleClick;
	window.addEventListener('click', clickHandler);

	return { scene, camera };
}

export function updateCrossingScene(elapsed: number, seed: number, delta: number, rawCounts: number): void {
	if (!scene) return;

	const desired = Math.min(Math.max(Math.round(rawCounts), 5), MAX_PEDESTRIANS);
	targetCount += (desired - targetCount) * 0.05;
	const wantCount = Math.round(targetCount);

	while (pedestrians.length < wantCount) {
		const pedRng = seededRandom(seed * 1000 + spawnIndex * 7.31);
		const ped = spawnPedestrian(pedRng);
		ped.opacity = 0;
		setPedestrianOpacity(ped, 0);
		pedestrians.push(ped);
	}

	if (pedestrians.length > wantCount) {
		const excess = pedestrians.length - wantCount;
		let marked = 0;
		for (const ped of pedestrians) {
			if (!ped.fading && !ped.launched && marked < excess) {
				ped.fading = true;
				marked++;
			}
		}
	}

	const speedMult = 0.5 + seed * 1.5;
	const driftStrength = Math.abs(delta) * 4;
	const gravity = -20;
	const toRemove: Pedestrian[] = [];

	for (const ped of pedestrians) {
		// launched pedestrians follow physics arc
		if (ped.launched) {
			ped.launchVelY += gravity * 0.016;
			ped.group.position.x += ped.launchVelX * 0.016;
			ped.group.position.y += ped.launchVelY * 0.016;
			ped.group.position.z += ped.launchVelZ * 0.016;
			ped.group.rotation.x += 5 * 0.016;
			ped.group.rotation.z += 3 * 0.016;

			if (ped.group.position.y < -5) {
				toRemove.push(ped);
			}
			continue;
		}

		if (ped.fading) {
			ped.opacity -= 0.02;
			if (ped.opacity <= 0) {
				toRemove.push(ped);
				continue;
			}
			setPedestrianOpacity(ped, ped.opacity);
		} else if (ped.opacity < 1) {
			ped.opacity = Math.min(1, ped.opacity + 0.03);
			setPedestrianOpacity(ped, ped.opacity);
		}

		ped.progress += ped.speed * speedMult * 0.003;
		ped.walkPhase += ped.speed * speedMult * 0.15;

		if (ped.progress >= 1) {
			respawnRoute(ped, rng);
			continue;
		}

		const baseX = ped.startX + (ped.targetX - ped.startX) * ped.progress;
		const baseZ = ped.startZ + (ped.targetZ - ped.startZ) * ped.progress;

		const drift = Math.sin(elapsed * 2 + ped.walkPhase) * driftStrength * 0.3;
		const perpX = ped.direction === 0 || ped.direction === 2 ? drift : 0;
		const perpZ = ped.direction === 1 || ped.direction === 3 ? drift : 0;

		ped.group.position.x = baseX + perpX;
		ped.group.position.z = baseZ + perpZ;

		ped.leftLeg.rotation.x = Math.sin(ped.walkPhase) * 0.35;
		ped.rightLeg.rotation.x = -Math.sin(ped.walkPhase) * 0.35;
	}

	const farEdge = GROUND_SIZE / 2 + 8;
	cars = cars.filter((car) => {
		if (car.horizontal) {
			car.x += car.speed * car.direction * 0.016;
			car.group.position.x = car.x;
		} else {
			car.z += car.speed * car.direction * 0.016;
			car.group.position.z = car.z;
		}

		for (const ped of pedestrians) {
			if (ped.launched || ped.fading) continue;
			const px = ped.group.position.x;
			const pz = ped.group.position.z;

			let carMinX: number, carMaxX: number, carMinZ: number, carMaxZ: number;
			if (car.horizontal) {
				carMinX = car.x - car.halfD;
				carMaxX = car.x + car.halfD;
				carMinZ = car.group.position.z - car.halfW;
				carMaxZ = car.group.position.z + car.halfW;
			} else {
				carMinX = car.group.position.x - car.halfW;
				carMaxX = car.group.position.x + car.halfW;
				carMinZ = car.z - car.halfD;
				carMaxZ = car.z + car.halfD;
			}

			if (px > carMinX && px < carMaxX && pz > carMinZ && pz < carMaxZ) {
				ped.launched = true;
				const knockDir = car.horizontal ? car.direction : 0;
				const knockDirZ = car.horizontal ? 0 : car.direction;
				ped.launchVelX = knockDir * (car.speed * 0.4) + (Math.random() - 0.5) * 5;
				ped.launchVelY = 8 + Math.random() * 6;
				ped.launchVelZ = knockDirZ * (car.speed * 0.4) + (Math.random() - 0.5) * 5;
			}
		}

		if (Math.abs(car.x) > farEdge || Math.abs(car.z) > farEdge) {
			scene.remove(car.group);
			car.group.traverse((obj) => {
				if (obj instanceof THREE.Mesh) {
					obj.geometry.dispose();
					(obj.material as THREE.Material).dispose();
				}
			});
			return false;
		}
		return true;
	});

	for (const ped of toRemove) {
		removePedestrian(ped);
		pedestrians.splice(pedestrians.indexOf(ped), 1);
	}

	// buildings breathe with seed
	for (let i = 0; i < buildings.length; i++) {
		const targetH = buildingBaseHeights[i] * (0.6 + seed * 0.8);
		const mesh = buildings[i];
		const currentH = mesh.scale.y;
		mesh.scale.y = currentH + (targetH / buildingBaseHeights[i] - currentH) * 0.02;
		mesh.position.y = (buildingBaseHeights[i] * mesh.scale.y) / 2 + 0.15;
	}

	const lights = scene.children.filter((c): c is THREE.AmbientLight => c instanceof THREE.AmbientLight);
	if (lights.length > 0) {
		lights[0].color.lerpColors(new THREE.Color(0xc8d6e5), new THREE.Color(0xffeedd), seed);
	}

	const skyColor = new THREE.Color().lerpColors(
		new THREE.Color(0x6b7b8d), new THREE.Color(0x87ceeb), seed
	);
	scene.background = skyColor;
	if (scene.fog) (scene.fog as THREE.Fog).color.copy(skyColor);
}

export function disposeCrossingScene(): void {
	if (!scene) return;
	if (clickHandler) {
		window.removeEventListener('click', clickHandler);
		clickHandler = null;
	}
	scene.traverse((obj) => {
		if (obj instanceof THREE.Mesh) {
			obj.geometry.dispose();
			if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
			else obj.material.dispose();
		}
	});
	pedestrians = [];
	buildings = [];
	buildingBaseHeights = [];
	buildingBounds = [];
	cars = [];
}
