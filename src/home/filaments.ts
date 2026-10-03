// Photo-constrained electrical growth. Geometry is a graph, not a sprite: branches can join,
// pulses traverse real wires, and severed components lose their connection to a power source.
import { Terrain, DIRECTIONS } from './terrain.ts'

interface Tip { cell: number; dx: number; dy: number; energy: number }
interface Colony { root: number; radius: number; capacity: number; count: number; speed: number; tips: Tip[] }
interface Candidate { cell: number; dx: number; dy: number; cost: number; score: number }
interface Front { cell: number; energy: number; delay: number }
interface Pulse { seen: Set<number>; front: Front[] }
export interface CircuitDrawing {
  version: number
  // Each vertex: x, y, voltage, signal, width, resistance, spark.
  nodes: Float32Array
  edges: Uint32Array
  mask: Uint8Array
  probe: { x: number; y: number; level: number; held: boolean; guides: number[] } | null
}
const MAX_COLONIES = 8
const MAX_TIPS = 10
const SIGNAL_CUTOFF = 0.035
const STRIDE = 7

export class Filaments {
  private readonly terrain: Terrain
  private readonly random: () => number
  private readonly owner: Int16Array
  private readonly parent: Int32Array
  private readonly born: Uint32Array
  private readonly load: Uint16Array
  private readonly links: Uint8Array
  private readonly powered: Uint8Array
  private readonly voltage: Float32Array
  private readonly charge: Float32Array
  private readonly mask: Uint8Array
  private readonly footprints = new Map<number, number[]>()
  private readonly cells = new Set<number>()
  private readonly sources = new Set<number>()
  private colonies: (Colony | undefined)[] = []
  private pulses: Pulse[] = []
  private tick = 0
  private version = 0
  private fading = false
  private probe: { cell: number; held: boolean; since: number } | null = null
  private closures = 0
  private shutdown: { since: number; delay: Float32Array } | null = null

  constructor(terrain: Terrain, random = Math.random) {
    this.terrain = terrain; this.random = random
    const size = terrain.width * terrain.height
    this.owner = new Int16Array(size).fill(-1)
    this.parent = new Int32Array(size).fill(-1)
    this.born = new Uint32Array(size)
    this.load = new Uint16Array(size)
    this.links = new Uint8Array(size)
    this.powered = new Uint8Array(size)
    this.voltage = new Float32Array(size)
    this.charge = new Float32Array(size)
    this.mask = new Uint8Array(size)
  }

  get size() { return this.cells.size }
  get active() {
    return Boolean(this.probe?.held) || Boolean(this.shutdown) || this.fading || this.pulses.length > 0
      || this.colonies.some(c => c && c.tips.length > 0)
      || [...this.cells].some(cell => this.charge[cell] > 0 || this.tick - this.born[cell] < 10)
  }

  private neighbors(cell: number) {
    const x = cell % this.terrain.width, y = Math.floor(cell / this.terrain.width)
    return DIRECTIONS.map(([dx, dy]) => this.terrain.cell(x + dx, y + dy))
  }

  private linked(cell: number) { return this.neighbors(cell).filter((_, i) => this.links[cell] & (1 << i)) }

  private connect(a: number, b: number) {
    const direction = this.neighbors(a).indexOf(b)
    if (direction < 0 || this.links[a] & (1 << direction)) return false
    this.links[a] |= 1 << direction
    this.links[b] |= 1 << ((direction + 4) % 8)
    this.version++
    return true
  }

  private connected(a: number, b: number, maxDepth = Infinity) {
    const seen = new Set([a]), queue = [{ cell: a, depth: 0 }]
    for (let i = 0; i < queue.length; i++) {
      const { cell, depth } = queue[i]
      if (cell === b) return true
      if (depth >= maxDepth) continue
      for (const next of this.linked(cell)) if (!seen.has(next)) {
        seen.add(next); queue.push({ cell: next, depth: depth + 1 })
      }
    }
    return false
  }

  private repower() {
    this.powered.fill(0)
    const queue = [...this.sources].filter(cell => this.owner[cell] >= 0)
    for (const cell of queue) this.powered[cell] = 1
    for (let i = 0; i < queue.length; i++) for (const next of this.linked(queue[i])) if (!this.powered[next]) {
      this.powered[next] = 1; queue.push(next)
    }
    this.fading = true
  }

  private emit(cell: number, energy = 1) {
    if (!this.powered[cell]) return
    this.charge[cell] = Math.max(this.charge[cell], energy)
    this.pulses.push({ seen: new Set([cell]), front: [{ cell, energy, delay: 0 }] })
    if (this.pulses.length > 8) this.pulses.shift()
  }

  aim(x: number, y: number, held = false) {
    const cell = this.terrain.cell(Math.floor(x), Math.floor(y)) < 0 ? -1 : this.terrain.settle(x, y)
    if (cell < 0) { this.probe = null; return }
    const since = held && this.probe?.held ? this.probe.since : this.tick
    this.probe = { cell, held, since }
  }

  unprime() { this.probe = null }

  retire() {
    this.probe = null
    const distance = new Int32Array(this.owner.length).fill(-1)
    const queue = [...this.sources].filter(cell => this.owner[cell] >= 0)
    for (const cell of queue) distance[cell] = 0
    for (let i = 0; i < queue.length; i++) for (const next of this.linked(queue[i])) if (distance[next] < 0) {
      distance[next] = distance[queue[i]] + 1; queue.push(next)
    }
    const delay = new Float32Array(this.owner.length)
    for (const cell of this.cells) delay[cell] = Math.max(0, distance[cell]) * 0.55
      + Math.max(0, this.owner[cell]) * 3 + ((Math.imul(cell, 2654435761) >>> 0) % 7)
    this.shutdown = { since: this.tick, delay }
  }

  resume() { if (this.shutdown) { this.shutdown = null; this.fading = true } }

  plant(x: number, y: number, strength = 0.25) {
    const t = this.terrain
    if (t.cell(Math.floor(x), Math.floor(y)) < 0) return false
    const root = t.settle(x, y)
    if (root < 0) return false
    strength = Math.max(0, Math.min(1, strength))
    this.resume(); this.probe = null
    if (this.owner[root] >= 0) {
      const colony = this.colonies[this.owner[root]]!
      this.sources.add(root); this.repower(); this.emit(root)
      if (strength > 0.45) {
        colony.capacity = Math.min(1000, colony.capacity + 100)
        colony.tips.push(...this.runners(root, colony.radius, 3, strength))
        colony.tips = colony.tips.slice(0, MAX_TIPS)
      }
      return true
    }
    const radius = Math.max(12, Math.min(90, Math.min(t.width, t.height) * (0.16 + strength * 0.12)))
    if (this.colonies.some(c => c && Math.hypot(c.root % t.width - root % t.width,
      Math.floor(c.root / t.width) - Math.floor(root / t.width)) < radius * 0.4)) return false
    let id = this.colonies.findIndex(c => !c)
    if (id < 0) id = this.colonies.length
    if (id >= MAX_COLONIES) return false
    this.colonies[id] = { root, radius, count: 0, capacity: Math.max(50, Math.round(radius ** 2 * 0.24)),
      speed: 1 + Math.floor(strength * 2.5), tips: this.runners(root, radius, 3, strength) }
    this.occupy(root, -1, id)
    this.sources.add(root); this.repower(); this.emit(root)
    return true
  }

  private runners(cell: number, radius: number, count: number, strength: number): Tip[] {
    const t = this.terrain
    const guided = t.guidance[cell] > 0.12
    const angle = guided ? Math.atan2(t.tangentY[cell], t.tangentX[cell]) : this.random() * Math.PI * 2
    const n = guided ? 2 : count
    return Array.from({ length: n }, (_, i) => ({ cell, dx: Math.cos(angle + i * Math.PI * 2 / n),
      dy: Math.sin(angle + i * Math.PI * 2 / n), energy: radius * (1.4 + strength * 0.6) }))
  }

  private occupy(cell: number, parent: number, id: number) {
    this.owner[cell] = id; this.parent[cell] = parent; this.born[cell] = this.tick; this.load[cell] = 1
    this.cells.add(cell); this.colonies[id]!.count++; this.version++
    this.footprints.set(cell, this.surfaceMask(cell, this.colonies[id]!.root, this.mask, 3))
    this.powered[cell] = 1; this.voltage[cell] = 1
    if (parent >= 0) this.connect(parent, cell)
    for (let a = parent, n = 0; a >= 0 && this.owner[a] === id && n < 120; a = this.parent[a], n++) this.load[a]++
  }

  private target(tip: Tip, root: number) {
    const t = this.terrain, x = tip.cell % t.width, y = Math.floor(tip.cell / t.width)
    let best = -1, score = Infinity
    for (let yy = Math.max(0, y - 9); yy <= Math.min(t.height - 1, y + 9); yy++)
      for (let xx = Math.max(0, x - 9); xx <= Math.min(t.width - 1, x + 9); xx++) {
        const cell = yy * t.width + xx, distance = Math.hypot(xx - x, yy - y)
        if (distance < 3 || distance >= score || this.owner[cell] < 0 || !this.powered[cell]
          || this.owner[cell] === this.owner[tip.cell] || t.conductivity(tip.cell, cell, root) < 0.6) continue
        best = cell; score = distance
      }
    return best
  }

  private candidates(tip: Tip, colony: Colony) {
    const t = this.terrain, x = tip.cell % t.width, y = Math.floor(tip.cell / t.width)
    const rx = colony.root % t.width, ry = Math.floor(colony.root / t.width)
    const target = this.target(tip, colony.root), tx = target % t.width - x, ty = Math.floor(target / t.width) - y
    const result: Candidate[] = []
    for (const [dx, dy] of DIRECTIONS) {
      const cell = t.cell(x + dx, y + dy)
      if (cell < 0 || Math.hypot(x + dx - rx, y + dy - ry) > colony.radius) continue
      const occupied = this.owner[cell] >= 0
      if (occupied && (this.connected(tip.cell, cell, 9) || !this.powered[cell])) continue
      const length = Math.hypot(dx, dy), nx = dx / length, ny = dy / length
      const forward = tip.dx * nx + tip.dy * ny
      if (forward < -0.25) continue
      let conductivity = t.connection(tip.cell, cell, colony.root)
      if (occupied) conductivity = Math.min(conductivity, t.connection(cell, tip.cell, this.colonies[this.owner[cell]]!.root))
      if (conductivity < 0.32) continue
      const cost = length / conductivity
      if (cost > tip.energy) continue
      const contour = Math.abs(nx * t.tangentX[cell] + ny * t.tangentY[cell]) * t.guidance[cell]
      const toward = target >= 0 ? (nx * tx + ny * ty) / Math.hypot(tx, ty) : 0
      const outward = ((x - rx) * nx + (y - ry) * ny) / Math.max(1, Math.hypot(x - rx, y - ry))
      const score = forward * 1.25 + contour * 3 + toward * 1.2 + outward * 0.25
        + Math.log(conductivity) * 2.4 + (occupied ? 2.2 : 0) + (this.random() - 0.5) * 0.95
      result.push({ cell, dx: nx, dy: ny, cost, score })
    }
    return result.sort((a, b) => b.score - a.score)
  }

  private grow(colony: Colony, id: number) {
    const next: Tip[] = []
    for (const tip of colony.tips) {
      if (this.owner[tip.cell] !== id || !this.powered[tip.cell] || colony.count >= colony.capacity) continue
      const choices = this.candidates(tip, colony), head = choices[0]
      if (!head) { this.charge[tip.cell] = 0.8; continue }
      if (this.owner[head.cell] >= 0) {
        const loop = this.connected(tip.cell, head.cell)
        if (this.connect(tip.cell, head.cell)) {
          if (loop) this.closures++
          this.repower(); this.emit(head.cell); this.emit(tip.cell, 0.85)
        }
        continue
      }
      this.occupy(head.cell, tip.cell, id)
      const energy = tip.energy - head.cost
      next.push({ cell: head.cell, dx: head.dx, dy: head.dy, energy })
      if (next.length + colony.tips.length < MAX_TIPS && energy > 12 && this.random() < 0.085) {
        const branch = choices.find(c => this.owner[c.cell] < 0 && c.dx * head.dx + c.dy * head.dy < 0.5)
        if (branch) {
          this.occupy(branch.cell, tip.cell, id)
          next[next.length - 1].energy *= 0.8
          next.push({ cell: branch.cell, dx: branch.dx, dy: branch.dy, energy: (tip.energy - branch.cost) * 0.8 })
        }
      }
    }
    colony.tips = next.slice(0, MAX_TIPS)
  }

  step() {
    this.tick++; this.fading = false
    for (const cell of this.cells) {
      this.charge[cell] *= 0.68
      if (this.charge[cell] < SIGNAL_CUTOFF) this.charge[cell] = 0
      const drain = this.shutdown ? Math.min(1, Math.max(0, (this.tick - this.shutdown.since - this.shutdown.delay[cell]) / 7)) : 0
      const target = this.powered[cell] * (1 - drain)
      this.voltage[cell] += (target - this.voltage[cell]) * 0.28
      if (Math.abs(target - this.voltage[cell]) < 0.01) this.voltage[cell] = target
      else this.fading = true
    }
    this.colonies.forEach((colony, id) => {
      if (!colony || this.shutdown) return
      const wasGrowing = colony.tips.length > 0
      for (let k = 0; k < colony.speed && colony.tips.length; k++) this.grow(colony, id)
      if (wasGrowing && !colony.tips.length) this.emit(colony.root)
    })
    // Each wave visits a vertex once. Rings cannot feed back forever; pruning invalidates
    // pending arrivals immediately. Material resistance delays and attenuates propagation.
    this.pulses = this.pulses.filter(pulse => {
      const next: Front[] = []
      for (const front of pulse.front) {
        if (this.owner[front.cell] < 0 || !this.powered[front.cell]) continue
        if (front.delay > 0) { next.push({ ...front, delay: front.delay - 1 }); continue }
        this.charge[front.cell] = Math.max(this.charge[front.cell], front.energy)
        for (const cell of this.linked(front.cell)) if (!pulse.seen.has(cell) && this.powered[cell]) {
          pulse.seen.add(cell)
          const conduct = this.terrain.connection(front.cell, cell, this.colonies[this.owner[cell]]!.root)
          const energy = front.energy * (0.98 - (1 - conduct) * 0.03)
          if (energy > SIGNAL_CUTOFF) next.push({ cell, energy, delay: conduct < 0.65 ? 1 : 0 })
        }
      }
      pulse.front = next
      return next.length > 0
    })
    if (this.shutdown && [...this.cells].every(cell => this.voltage[cell] === 0)) this.clear()
  }

  cut(x: number, y: number, radius: number) {
    const t = this.terrain, wounds = new Set<number>()
    let hit = false
    for (let yy = Math.max(0, Math.ceil(y - radius)); yy <= Math.min(t.height - 1, Math.floor(y + radius)); yy++)
      for (let xx = Math.max(0, Math.ceil(x - radius)); xx <= Math.min(t.width - 1, Math.floor(x + radius)); xx++) {
        if ((xx - x) ** 2 + (yy - y) ** 2 > radius ** 2) continue
        const cell = yy * t.width + xx, id = this.owner[cell]
        if (id < 0) continue
        hit = true
        for (const neighbor of this.linked(cell)) {
          const direction = this.neighbors(neighbor).indexOf(cell)
          this.links[neighbor] &= ~(1 << direction); wounds.add(neighbor)
        }
        this.sources.delete(cell); this.colonies[id]!.count--
        this.owner[cell] = -1; this.parent[cell] = -1; this.links[cell] = 0; this.charge[cell] = 0; this.voltage[cell] = 0
        this.cells.delete(cell); this.footprints.delete(cell); this.version++
      }
    if (!hit) return false
    for (const cell of this.cells) if (this.parent[cell] >= 0 && this.owner[this.parent[cell]] !== this.owner[cell]) this.parent[cell] = -1
    this.repower()
    this.mask.fill(0)
    for (const footprint of this.footprints.values()) for (const cell of footprint) this.mask[cell] = 255
    this.colonies.forEach((c, id) => {
      if (!c) return
      if (!c.count) { this.colonies[id] = undefined; return }
      c.tips = c.tips.filter(tip => this.owner[tip.cell] === id && this.powered[tip.cell])
    })
    for (const cell of wounds) {
      const colony = this.colonies[this.owner[cell]]
      if (!colony || !this.powered[cell] || colony.tips.length >= MAX_TIPS || colony.tips.some(tip => tip.cell === cell)) continue
      const dx = x - cell % t.width, dy = y - Math.floor(cell / t.width), length = Math.hypot(dx, dy) || 1
      colony.tips.push({ cell, dx: dx / length, dy: dy / length, energy: colony.radius * 0.6 })
      this.emit(cell, 0.8)
    }
    return true
  }

  clear() {
    this.owner.fill(-1); this.parent.fill(-1); this.links.fill(0); this.powered.fill(0); this.voltage.fill(0); this.charge.fill(0)
    this.cells.clear(); this.sources.clear(); this.footprints.clear(); this.mask.fill(0)
    this.colonies = []; this.pulses = []; this.probe = null
    this.tick = 0; this.version++; this.fading = false; this.closures = 0; this.shutdown = null
  }

  drawing(): CircuitDrawing {
    const t = this.terrain, indices = new Map<number, number>(), nodes = new Float32Array(this.size * STRIDE), edges: number[] = []
    const mask = this.mask.slice()
    const tips = new Set(this.colonies.flatMap(c => c?.tips.map(tip => tip.cell) ?? []))
    let index = 0
    for (const cell of this.cells) {
      indices.set(cell, index)
      const root = this.colonies[this.owner[cell]]!.root, p = index++ * STRIDE
      const resistance = this.parent[cell] >= 0 ? 1 - t.connection(this.parent[cell], cell, root) : 0
      const remaining = this.shutdown ? this.shutdown.delay[cell] + 7 - (this.tick - this.shutdown.since) : -1
      const terminal = this.links[cell] !== 0 && (this.links[cell] & (this.links[cell] - 1)) === 0
      const spark = this.shutdown ? terminal && remaining > 0 && remaining < 8 ? Math.sin(this.tick * 1.7 + cell) ** 2 : 0
        : tips.has(cell) && this.powered[cell] ? 0.75 + 0.25 * Math.sin(this.tick * 0.9 + cell * 0.37) ** 2 : 0
      nodes.set([cell % t.width + 0.5, Math.floor(cell / t.width) + 0.5, this.voltage[cell], this.charge[cell],
        0.32 + Math.min(1.1, Math.log2(this.load[cell] + 1) * 0.14), resistance,
        spark], p)
    }
    for (const cell of this.cells) for (const next of this.linked(cell)) if (cell < next) edges.push(indices.get(cell)!, indices.get(next)!)
    const guides: number[] = []
    if (this.probe) {
      const region = this.surfaceMask(this.probe.cell, this.probe.cell, mask, this.probe.held ? 12 : 5)
      for (const cell of region) if (t.guidance[cell] > 0.35 && cell % 3 === 0 && guides.length < 96)
        guides.push(cell % t.width + 0.5, Math.floor(cell / t.width) + 0.5, t.tangentX[cell], t.tangentY[cell])
    }
    return { version: this.version, nodes, edges: Uint32Array.from(edges), mask,
      probe: this.probe ? { x: this.probe.cell % t.width + 0.5, y: Math.floor(this.probe.cell / t.width) + 0.5,
        level: this.probe.held ? 1 - Math.exp(-(this.tick - this.probe.since) / 20) : 0, held: this.probe.held, guides } : null }
  }

  private surfaceMask(cell: number, root: number, mask: Uint8Array, radius: number) {
    const t = this.terrain, x = cell % t.width, y = Math.floor(cell / t.width)
    const seen = new Set([cell]), queue = [cell]
    mask[cell] = 255
    for (let i = 0; i < queue.length; i++) for (const next of this.neighbors(queue[i])) {
      if (next < 0 || seen.has(next) || Math.hypot(next % t.width - x, Math.floor(next / t.width) - y) > radius
        || t.connection(queue[i], next, root) < 0.5) continue
      seen.add(next); mask[next] = 255; queue.push(next)
    }
    return queue
  }

  // Raster view for topology tests/diagnostics; the browser uses smooth graph geometry.
  paint(pixels: Uint8ClampedArray) {
    pixels.fill(0)
    for (const cell of this.cells) {
      const i = cell * 4, signal = Math.max(this.charge[cell], this.tick - this.born[cell] < 3 ? 0.8 : 0)
      pixels[i] = 90 + signal * 160; pixels[i + 1] = 170 + signal * 80; pixels[i + 2] = 230 + signal * 25
      pixels[i + 3] = (0.1 + this.voltage[cell] * (0.3 + signal * 0.6)) * 255
    }
  }

  snapshot() {
    return { owner: this.owner.slice(), parent: this.parent.slice(), charge: this.charge.slice(), links: this.links.slice(),
      powered: this.powered.slice(), voltage: this.voltage.slice(), roots: this.colonies.map(c => c?.root ?? -1), closures: this.closures }
  }
}
