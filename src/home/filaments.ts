// A branching cellular growth rule in PHOTO space. No target silhouette, neural weights,
// local tree grids, or warped sprites: every new cell must conduct through the image itself.
import { Terrain, DIRECTIONS } from './terrain.ts'

interface Tip { cell: number; dx: number; dy: number; energy: number }
interface Colony { root: number; radius: number; count: number; tips: Tip[] }
interface Candidate { cell: number; dx: number; dy: number; cost: number; score: number }
const MAX_COLONIES = 8
const MAX_TIPS = 12
const FLASH_STEPS = 12
const DARK_INK = [35, 87, 62], LIGHT_INK = [142, 187, 128]
const DARK_SPARK = [125, 75, 24], LIGHT_SPARK = [255, 249, 207]
const PULSE_DECAY = 0.993 // preserve a wave along long branches
const PULSE_TAIL = 0.58 // a short, smooth trail behind the wavefront
const PULSE_CUTOFF = 0.025

export class Filaments {
  private readonly terrain: Terrain
  private readonly random: () => number
  private readonly owner: Int16Array
  private readonly parent: Int32Array
  private readonly born: Uint32Array
  private readonly load: Uint16Array
  private charge: Float32Array
  private nextCharge: Float32Array
  private pulseActive = false
  private readonly cells = new Set<number>()
  private colonies: (Colony | undefined)[] = []
  private tick = 0
  private lastGrowth = -FLASH_STEPS

  constructor(terrain: Terrain, random = Math.random) {
    this.terrain = terrain
    this.random = random
    const size = terrain.width * terrain.height
    this.owner = new Int16Array(size).fill(-1)
    this.parent = new Int32Array(size).fill(-1)
    this.born = new Uint32Array(size)
    this.load = new Uint16Array(size)
    this.charge = new Float32Array(size)
    this.nextCharge = new Float32Array(size)
  }

  get size() { return this.cells.size }
  get active() {
    return this.pulseActive || this.colonies.some(c => c && c.tips.length > 0)
      || (this.size > 0 && this.tick - this.lastGrowth < FLASH_STEPS)
  }

  plant(x: number, y: number) {
    const { terrain: t } = this
    if (t.cell(Math.floor(x), Math.floor(y)) < 0) return false
    const root = t.settle(x, y)
    if (root < 0 || this.owner[root] >= 0) return false
    const radius = Math.max(12, Math.min(70, Math.min(t.width, t.height) * 0.18))
    if (this.colonies.some(c => c && Math.hypot(c.root % t.width - root % t.width,
      Math.floor(c.root / t.width) - Math.floor(root / t.width)) < radius * 0.55)) return false
    let id = this.colonies.findIndex(c => !c)
    if (id < 0) id = this.colonies.length
    if (id >= MAX_COLONIES) return false
    // An image contour seeds two opposite runners. In open space, three initial directions
    // fan out without privileging 'up', so the same rule can look like roots, veins or lightning.
    const angle = t.guidance[root] > 0.12 ? Math.atan2(t.tangentY[root], t.tangentX[root]) : this.random() * Math.PI * 2
    const n = t.guidance[root] > 0.12 ? 2 : 3
    const tips = Array.from({ length: n }, (_, i) => ({ cell: root,
      dx: Math.cos(angle + i * Math.PI * 2 / n), dy: Math.sin(angle + i * Math.PI * 2 / n), energy: radius * 1.7 }))
    this.colonies[id] = { root, radius, count: 0, tips }
    this.occupy(root, -1, id)
    this.energize(root)
    return true
  }

  private occupy(cell: number, parent: number, id: number) {
    this.owner[cell] = id
    this.parent[cell] = parent
    this.born[cell] = this.tick
    this.load[cell] = 1
    this.cells.add(cell)
    this.colonies[id]!.count++
    this.lastGrowth = this.tick
    // Conductance brightens shared stems organically; it does not prescribe their geometry.
    for (let a = parent, n = 0; a >= 0 && this.owner[a] === id && n < 100; a = this.parent[a], n++) this.load[a]++
  }

  private candidates(tip: Tip, colony: Colony) {
    const { terrain: t } = this
    const x = tip.cell % t.width, y = Math.floor(tip.cell / t.width)
    const rx = colony.root % t.width, ry = Math.floor(colony.root / t.width)
    const outward = Math.max(1, Math.hypot(x - rx, y - ry))
    const result: Candidate[] = []
    for (const [dx, dy] of DIRECTIONS) {
      const cell = t.cell(x + dx, y + dy)
      if (cell < 0 || this.owner[cell] >= 0 || Math.hypot(x + dx - rx, y + dy - ry) > colony.radius) continue
      const length = Math.hypot(dx, dy), nx = dx / length, ny = dy / length
      const forward = tip.dx * nx + tip.dy * ny
      if (forward < -0.25) continue
      const conductivity = t.connection(tip.cell, cell, colony.root)
      if (conductivity < 0.32) continue
      const cost = length / conductivity
      if (cost > tip.energy) continue
      const alongContour = Math.abs(nx * t.tangentX[cell] + ny * t.tangentY[cell])
      const away = ((x - rx) * nx + (y - ry) * ny) / outward
      const score = forward * 1.4 + alongContour * t.guidance[cell] * 3 + away * 0.45
        + Math.log(conductivity) * 2.4 + (this.random() - 0.5) * 1.1
      result.push({ cell, dx: nx, dy: ny, cost, score })
    }
    return result.sort((a, b) => b.score - a.score)
  }

  private energize(cell: number) {
    this.charge[cell] = 1
    this.pulseActive = true
  }

  private advancePulse() {
    this.nextCharge.fill(0)
    this.pulseActive = false
    for (const cell of this.cells) {
      const parent = this.parent[cell]
      // Signal advances one real parent/child edge per tick, including every bifurcation.
      // Double buffering prevents visitation order from speeding up individual branches.
      const incoming = parent >= 0 && this.owner[parent] === this.owner[cell] ? this.charge[parent] * PULSE_DECAY : 0
      const value = Math.max(this.charge[cell] * PULSE_TAIL, incoming)
      if (value < PULSE_CUTOFF) continue
      this.nextCharge[cell] = value
      this.pulseActive = true
    }
    const previous = this.charge
    this.charge = this.nextCharge
    this.nextCharge = previous
  }

  step() {
    this.tick++
    this.advancePulse()
    this.colonies.forEach((colony, id) => {
      if (!colony) return
      const wasGrowing = colony.tips.length > 0
      const next: Tip[] = []
      const capacity = Math.max(50, Math.round(colony.radius ** 2 * 0.25))
      for (const tip of colony.tips) {
        if (this.owner[tip.cell] !== id || colony.count >= capacity) continue
        const choices = this.candidates(tip, colony)
        const head = choices[0]
        if (!head) continue
        this.occupy(head.cell, tip.cell, id)
        const energy = tip.energy - head.cost
        next.push({ cell: head.cell, dx: head.dx, dy: head.dy, energy })
        // A local bifurcation, not a predetermined tree skeleton. Competing fronts naturally
        // stop at each other, at material boundaries, or when their nutrient budget runs out.
        if (next.length + colony.tips.length < MAX_TIPS && energy > 12 && this.random() < 0.09) {
          const branch = choices.find(c => c.dx * head.dx + c.dy * head.dy < 0.5)
          if (branch) {
            this.occupy(branch.cell, tip.cell, id)
            next[next.length - 1].energy *= 0.78
            next.push({ cell: branch.cell, dx: branch.dx, dy: branch.dy, energy: (tip.energy - branch.cost) * 0.78 })
          }
        }
      }
      colony.tips = next.slice(0, MAX_TIPS)
      // One final discharge traces the completed network, then fades to let the worker sleep.
      if (wasGrowing && !colony.tips.length) for (const cell of this.cells)
        if (this.owner[cell] === id && this.parent[cell] < 0) this.energize(cell)
    })
  }

  cut(x: number, y: number, radius: number) {
    const { terrain: t } = this
    const wounds = new Set<number>()
    let hit = false
    for (let yy = Math.max(0, Math.ceil(y - radius)); yy <= Math.min(t.height - 1, Math.floor(y + radius)); yy++)
      for (let xx = Math.max(0, Math.ceil(x - radius)); xx <= Math.min(t.width - 1, Math.floor(x + radius)); xx++) {
        if ((xx - x) ** 2 + (yy - y) ** 2 > radius ** 2) continue
        const cell = yy * t.width + xx, id = this.owner[cell]
        if (id < 0) continue
        hit = true
        this.colonies[id]!.count--
        this.owner[cell] = -1; this.parent[cell] = -1; this.load[cell] = 0; this.born[cell] = 0
        this.charge[cell] = 0; this.nextCharge[cell] = 0
        this.cells.delete(cell)
        for (const [dx, dy] of DIRECTIONS) {
          const neighbor = t.cell(xx + dx, yy + dy)
          if (neighbor >= 0) wounds.add(neighbor)
        }
      }
    // Break dangling parent links before a wound is recolonized. Otherwise a regenerated
    // cell could become the parent of its own ancestor and create a conductance cycle.
    for (const cell of this.cells) if (this.parent[cell] >= 0 && this.owner[this.parent[cell]] !== this.owner[cell]) this.parent[cell] = -1
    this.colonies.forEach((c, id) => {
      if (!c) return
      if (!c.count) { this.colonies[id] = undefined; return }
      c.tips = c.tips.filter(tip => this.owner[tip.cell] === id)
    })
    for (const cell of wounds) {
      const id = this.owner[cell], colony = this.colonies[id]
      if (!colony || colony.tips.length >= MAX_TIPS || colony.tips.some(tip => tip.cell === cell)) continue
      const dx = x - cell % t.width, dy = y - Math.floor(cell / t.width)
      const length = Math.hypot(dx, dy) || 1
      colony.tips.push({ cell, dx: dx / length, dy: dy / length, energy: colony.radius * 0.75 })
      this.energize(cell)
    }
    return hit
  }

  clear() {
    this.owner.fill(-1); this.parent.fill(-1); this.born.fill(0); this.load.fill(0)
    this.charge.fill(0); this.nextCharge.fill(0); this.pulseActive = false
    this.cells.clear(); this.colonies = []; this.tick = 0; this.lastGrowth = -FLASH_STEPS
  }

  paint(pixels: Uint8ClampedArray) {
    pixels.fill(0)
    const tips = new Set(this.colonies.flatMap(c => c?.tips.map(t => t.cell) ?? []))
    for (const cell of this.cells) {
      const i = cell * 4
      const dark = this.terrain.light[cell] > 0.55
      const base = dark ? DARK_INK : LIGHT_INK
      const spark = dark ? DARK_SPARK : LIGHT_SPARK
      const flash = Math.max(0, 1 - (this.tick - this.born[cell]) / FLASH_STEPS)
      const power = Math.min(1, Math.log2(this.load[cell] + 1) / 6)
      // Deterministic shimmer does not consume the growth RNG or alter the underlying paths.
      const twinkle = tips.has(cell) ? 0.78 + 0.22 * Math.sin(this.tick * 1.9 + cell * 0.37) ** 2 : 0
      const light = Math.max(flash * 0.65, power * 0.35, this.charge[cell], twinkle)
      for (let c = 0; c < 3; c++) pixels[i + c] = base[c] + (spark[c] - base[c]) * light
      pixels[i + 3] = Math.min(1, 0.58 + power * 0.19 + light * 0.25) * 255
    }
  }

  // Topology and signal state for deterministic connectivity/animation checks.
  snapshot() {
    return { owner: this.owner.slice(), parent: this.parent.slice(), charge: this.charge.slice(), roots: this.colonies.map(c => c?.root ?? -1) }
  }
}
