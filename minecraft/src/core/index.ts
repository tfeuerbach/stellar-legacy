import * as THREE from 'three'

export default class Core {
  constructor() {
    this.camera = new THREE.PerspectiveCamera()
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance'
    })
    this.scene = new THREE.Scene()
    this.initScene()
    this.initRenderer()
    this.initCamera()
  }

  camera: THREE.PerspectiveCamera
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer

  initCamera = () => {
    this.camera.fov = 50
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.near = 0.1
    this.camera.far = 180
    this.camera.updateProjectionMatrix()
    this.camera.position.set(8, 50, 8)

    this.camera.lookAt(100, 30, 100)

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
    })
  }

  initScene = () => {
    this.scene = new THREE.Scene()
    const backgroundColor = 0x87ceeb

    this.scene.fog = new THREE.Fog(backgroundColor, 1, 160)
    this.scene.background = new THREE.Color(backgroundColor)

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.7)
    sunLight.position.set(1, 1.5, 0.5)
    this.scene.add(sunLight)

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.25)
    fillLight.position.set(-1, 1, -0.5)
    this.scene.add(fillLight)

    const reflectionLight = new THREE.AmbientLight(0x606060)
    this.scene.add(reflectionLight)
  }

  initRenderer = () => {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(this.renderer.domElement)

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }
}
