const BASE_PERM = [
  151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
  8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
  35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
  134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
  55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
  18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
  250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
  189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
  172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
  228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
  107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
]

function buildPermutation(seed: number): number[] {
  const p = BASE_PERM.slice()
  let s = (seed | 0) >>> 0
  for (let i = 255; i > 0; i--) {
    s = ((s * 1664525 + 1013904223) & 0xffffffff) >>> 0
    const j = s % (i + 1)
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp
  }
  const out = new Array(512)
  for (let i = 0; i < 256; i++) {
    out[i] = p[i]
    out[256 + i] = p[i]
  }
  return out
}

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10) }
function nlerp(t: number, a: number, b: number) { return a + t * (b - a) }
function grad(hash: number, x: number, y: number, z: number) {
  const h = hash & 15
  const u = h < 8 ? x : y
  const v = h < 4 ? y : (h === 12 || h === 14) ? x : z
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
}

class SeededNoise {
  private p: number[]
  constructor(seed: number) {
    this.p = buildPermutation(seed)
  }
  noise(x: number, y: number, z: number): number {
    const p = this.p
    const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z)
    const X = fx & 255, Y = fy & 255, Z = fz & 255
    x -= fx; y -= fy; z -= fz
    const u = fade(x), v = fade(y), w = fade(z)
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z
    const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z
    return nlerp(w,
      nlerp(v,
        nlerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
        nlerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))
      ),
      nlerp(v,
        nlerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
        nlerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))
      )
    )
  }
}

function getUrlSeed(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const s = params.get('seed')
    if (s === null) return null
    const v = parseFloat(s)
    return isNaN(v) ? null : v
  } catch {
    return null
  }
}

function stationHash(code: string): number {
  let h = 0
  for (let i = 0; i < code.length; i++) {
    h = ((h << 5) - h + code.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function cosmicSeeds(normalized: number, stationCode: string) {
  const h = stationHash(stationCode || 'default')
  const base = (h % 10000) + normalized * 50
  const permSeed = ((h * 31337) ^ (Math.floor(normalized * 1000))) >>> 0

  const hf = (h % 1000) / 1000
  return {
    seed: base,
    stoneSeed: ((h * 7) % 10000) + normalized * 30,
    coalSeed: ((h * 13) % 10000) + normalized * 20,
    treeSeed: ((h * 19) % 10000) + normalized * 40,
    leafSeed: ((h * 29) % 10000) + normalized * 25,
    permSeed,
    gap: 16 + hf * 16,
    amp: 5 + hf * 10,
    treeHeight: 6 + Math.floor(hf * 10),
    treeThreshold: 3.0 + (hf * 2.5),
    stoneThreshold: 2.5 + ((h % 500) / 500) * 2.5,
    coalThreshold: 2.0 + ((h % 300) / 300) * 2.0,
    seaLevel: -2 - Math.floor(hf * 4),
  }
}

const urlSeed = getUrlSeed()
const urlStation = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('station') || ''
  : ''

const computed = urlSeed !== null
  ? cosmicSeeds(urlSeed, urlStation)
  : null

export default class Noise {
  private _noiseImpl: SeededNoise
  permSeed = computed ? computed.permSeed : Math.floor(Math.random() * 100000)
  seed = computed ? computed.seed : Math.random()
  gap = computed ? computed.gap : 22
  amp = computed ? computed.amp : 8

  stoneSeed = computed ? computed.stoneSeed : this.seed * 0.4
  stoneGap = 12
  stoneAmp = 8
  stoneThreshold = computed ? computed.stoneThreshold : 3.5

  coalSeed = computed ? computed.coalSeed : this.seed * 0.5
  coalGap = 3
  coalAmp = 8
  coalThreshold = computed ? computed.coalThreshold : 3

  treeSeed = computed ? computed.treeSeed : this.seed * 0.7
  treeGap = 2
  treeAmp = 6
  treeHeight = computed ? computed.treeHeight : 10
  treeThreshold = computed ? computed.treeThreshold : 4

  leafSeed = computed ? computed.leafSeed : this.seed * 0.8
  leafGap = 2
  leafAmp = 5
  leafThreshold = -0.03

  seaLevel = computed ? computed.seaLevel : -3

  constructor() {
    this._noiseImpl = new SeededNoise(computed ? computed.permSeed : Math.floor(Math.random() * 100000))
  }

  setPermutation(permSeed: number) {
    this._noiseImpl = new SeededNoise(permSeed)
  }

  get = (x: number, y: number, z: number) => {
    return this._noiseImpl.noise(x, y, z)
  }
}
