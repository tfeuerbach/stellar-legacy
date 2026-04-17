import * as THREE from 'three'
import Terrain from '..'

export default class BlockHighlight {
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    terrain: Terrain
  ) {
    this.camera = camera
    this.scene = scene
    this.terrain = terrain
    this.raycaster = new THREE.Raycaster()
    this.raycaster.far = 8

    this.instanceMesh.instanceMatrix = new THREE.InstancedBufferAttribute(
      this.simBuffer,
      16
    )
  }

  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  terrain: Terrain
  raycaster: THREE.Raycaster
  block: THREE.Intersection | null = null

  geometry = new THREE.BoxGeometry(1.01, 1.01, 1.01)
  material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.25,
    color: 0xffffff,
    depthWrite: false
  })
  mesh = new THREE.Mesh(new THREE.BoxGeometry(), this.material)
  meshAdded = false

  simCapacity = 1000
  simBuffer = new Float32Array(this.simCapacity * 16)
  index = 0
  instanceMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial(),
    this.simCapacity
  )

  private lastPos = new THREE.Vector3()
  private frameSkip = 0

  update() {
    this.frameSkip++
    const cam = this.camera.position
    const moved = cam.distanceToSquared(this.lastPos) > 0.01

    if (this.frameSkip < 3 && !moved) return
    this.frameSkip = 0
    this.lastPos.copy(cam)

    if (this.meshAdded) {
      this.scene.remove(this.mesh)
      this.meshAdded = false
    }

    this.index = 0
    this.simBuffer.fill(0)

    const position = this.camera.position
    const matrix = new THREE.Matrix4()
    const idMap = new Map<string, number>()
    const noise = this.terrain.noise

    let xPos = Math.round(position.x)
    let zPos = Math.round(position.z)

    for (let i = -8; i < 8; i++) {
      for (let j = -8; j < 8; j++) {
        let x = xPos + i
        let z = zPos + j
        let y =
          Math.floor(
            noise.get(x / noise.gap, z / noise.gap, noise.seed) * noise.amp
          ) + 30

        idMap.set(`${x}_${y}_${z}`, this.index)
        matrix.setPosition(x, y, z)
        this.instanceMesh.setMatrixAt(this.index++, matrix)

        let stoneOffset =
          noise.get(x / noise.stoneGap, z / noise.stoneGap, noise.stoneSeed) *
          noise.stoneAmp

        let treeOffset =
          noise.get(x / noise.treeGap, z / noise.treeGap, noise.treeSeed) *
          noise.treeAmp

        if (
          treeOffset > noise.treeThreshold &&
          y - 30 >= -3 &&
          stoneOffset < noise.stoneThreshold
        ) {
          for (let t = 1; t <= noise.treeHeight; t++) {
            idMap.set(`${x}_${y + t}_${z}`, this.index)
            matrix.setPosition(x, y + t, z)
            this.instanceMesh.setMatrixAt(this.index++, matrix)
          }
        }
      }
    }

    for (const block of this.terrain.customBlocks) {
      if (block.placed) {
        matrix.setPosition(block.x, block.y, block.z)
        this.instanceMesh.setMatrixAt(this.index++, matrix)
      } else {
        if (idMap.has(`${block.x}_${block.y}_${block.z}`)) {
          let id = idMap.get(`${block.x}_${block.y}_${block.z}`)
          this.instanceMesh.setMatrixAt(
            id!,
            new THREE.Matrix4().set(
              0, 0, 0, 0,
              0, 0, 0, 0,
              0, 0, 0, 0,
              0, 0, 0, 0
            )
          )
        }
      }
    }

    this.instanceMesh.instanceMatrix.needsUpdate = true

    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera)
    this.block = this.raycaster.intersectObject(this.instanceMesh)[0]
    if (
      this.block &&
      this.block.object instanceof THREE.InstancedMesh &&
      typeof this.block.instanceId === 'number'
    ) {
      this.mesh = new THREE.Mesh(this.geometry, this.material)
      let m = new THREE.Matrix4()
      this.block.object.getMatrixAt(this.block.instanceId, m)
      const pos = new THREE.Vector3().setFromMatrixPosition(m)
      this.mesh.position.set(pos.x, pos.y, pos.z)
      this.scene.add(this.mesh)
      this.meshAdded = true
    }
  }
}
