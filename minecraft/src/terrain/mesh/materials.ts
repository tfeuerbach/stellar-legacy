import * as THREE from 'three'
import stone from '../../static/textures/block/stone.png'
import coal_ore from '../../static/textures/block/coal_ore.png'
import iron_ore from '../../static/textures/block/iron_ore.png'
import grass_side from '../../static/textures/block/grass_block_side.png'
import grass_top_green from '../../static/textures/block/grass_top_green.png'
import dirt from '../../static/textures/block/dirt.png'
import oak_log from '../../static/textures/block/oak_log.png'
import oak_log_top from '../../static/textures/block/oak_log_top.png'
import oak_leaves from '../../static/textures/block/oak_leaves.png'
import sand from '../../static/textures/block/sand.png'
import oak_wood from '../../static/textures/block/oak_planks.png'
import diamond from '../../static/textures/block/diamond_block.png'
import quartz from '../../static/textures/block/quartz_block_side.png'
import glass from '../../static/textures/block/glass.png'
import bedrock from '../../static/textures/block/bedrock.png'

export enum MaterialType {
  grass = 'grass',
  dirt = 'dirt',
  tree = 'tree',
  leaf = 'leaf',
  sand = 'sand',
  stone = 'stone',
  coal = 'coal',
  wood = 'wood',
  diamond = 'diamond',
  quartz = 'quartz',
  glass = 'glass',
  bedrock = 'bedrock'
}
let loader = new THREE.TextureLoader()

const grassTopMaterial = loader.load(grass_top_green)
const grassMaterial = loader.load(grass_side)
const treeMaterial = loader.load(oak_log)
const treeTopMaterial = loader.load(oak_log_top)
const dirtMaterial = loader.load(dirt)
const stoneMaterial = loader.load(stone)
const coalMaterial = loader.load(coal_ore)
const ironMaterial = loader.load(iron_ore)
const leafMaterial = loader.load(oak_leaves)
const sandMaterial = loader.load(sand)
const woodMaterial = loader.load(oak_wood)
const diamondMaterial = loader.load(diamond)
const quartzMaterial = loader.load(quartz)
const glassMaterial = loader.load(glass)
const bedrockMaterial = loader.load(bedrock)

grassTopMaterial.magFilter = THREE.NearestFilter
grassMaterial.magFilter = THREE.NearestFilter
treeMaterial.magFilter = THREE.NearestFilter
treeTopMaterial.magFilter = THREE.NearestFilter
dirtMaterial.magFilter = THREE.NearestFilter
stoneMaterial.magFilter = THREE.NearestFilter
coalMaterial.magFilter = THREE.NearestFilter
ironMaterial.magFilter = THREE.NearestFilter
leafMaterial.magFilter = THREE.NearestFilter
sandMaterial.magFilter = THREE.NearestFilter
woodMaterial.magFilter = THREE.NearestFilter
diamondMaterial.magFilter = THREE.NearestFilter
quartzMaterial.magFilter = THREE.NearestFilter
glassMaterial.magFilter = THREE.NearestFilter
bedrockMaterial.magFilter = THREE.NearestFilter

export default class Materials {
  materials = {
    grass: [
      new THREE.MeshLambertMaterial({ map: grassMaterial }),
      new THREE.MeshLambertMaterial({ map: grassMaterial }),
      new THREE.MeshLambertMaterial({ map: grassTopMaterial }),
      new THREE.MeshLambertMaterial({ map: dirtMaterial }),
      new THREE.MeshLambertMaterial({ map: grassMaterial }),
      new THREE.MeshLambertMaterial({ map: grassMaterial })
    ],
    dirt: new THREE.MeshLambertMaterial({ map: dirtMaterial }),
    sand: new THREE.MeshLambertMaterial({ map: sandMaterial }),
    tree: [
      new THREE.MeshLambertMaterial({ map: treeMaterial }),
      new THREE.MeshLambertMaterial({ map: treeMaterial }),
      new THREE.MeshLambertMaterial({ map: treeTopMaterial }),
      new THREE.MeshLambertMaterial({ map: treeTopMaterial }),
      new THREE.MeshLambertMaterial({ map: treeMaterial }),
      new THREE.MeshLambertMaterial({ map: treeMaterial })
    ],
    leaf: new THREE.MeshLambertMaterial({
      map: leafMaterial,
      color: new THREE.Color(0, 1, 0),
      transparent: true
    }),
    stone: new THREE.MeshLambertMaterial({ map: stoneMaterial }),
    coal: new THREE.MeshLambertMaterial({ map: coalMaterial }),
    wood: new THREE.MeshLambertMaterial({ map: woodMaterial }),
    diamond: new THREE.MeshLambertMaterial({ map: diamondMaterial }),
    quartz: new THREE.MeshLambertMaterial({ map: quartzMaterial }),
    glass: new THREE.MeshLambertMaterial({
      map: glassMaterial,
      transparent: true
    }),
    bedrock: new THREE.MeshLambertMaterial({ map: bedrockMaterial })
  }

  get = (
    type: MaterialType
  ): THREE.MeshLambertMaterial | THREE.MeshLambertMaterial[] => {
    return this.materials[type]
  }
}
