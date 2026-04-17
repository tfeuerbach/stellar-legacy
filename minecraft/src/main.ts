import Core from './core'
import Control from './control'
import Player from './player'
import Terrain from './terrain'
import UI from './ui'
import Audio from './audio'
import { Mode } from './player'

import './style.css'

const embedded = new URLSearchParams(window.location.search).has('seed')

const core = new Core()
const camera = core.camera
const scene = core.scene
const renderer = core.renderer

const player = new Player()
const audio = new Audio(camera)

const terrain = new Terrain(scene, camera)
const control = new Control(scene, camera, player, terrain, audio)

let ui: UI | null = null

if (embedded) {
  terrain.customBlocks = []
  terrain.initBlocks()
  terrain.generate()
  camera.position.y = 40
  control.player.setMode(Mode.walking)

  document.addEventListener('click', () => {
    control.control.lock()
  })
} else {
  ui = new UI(terrain, control)
}

;(function animate() {
  requestAnimationFrame(animate)
  control.update()
  terrain.update()
  ui?.update()
  renderer.render(scene, camera)
})()
