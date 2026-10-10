// Photo-constrained electrical growth. Geometry is a graph, not a sprite: branches can join,
// strikes light real wires, and severed components lose their connection to a power source.
import { Terrain, DIRECTIONS, CONDUCTOR } from './terrain.ts'

interface Tip { cell: number; root: number; dx: number; dy: number; energy: number }
interface Colony { root: number; radius: number; capacity: number; count: number; speed: number; arcs: number; tips: Tip[] }
interface Candidate { cell: number; dx: number; dy: number; cost: number; score: number }
// A strike is a strobe: each frame is fully on or off for its cells. Nothing eases.
interface Strike { cells: Set<number>; schedule: number[]; frame: number; at: number; local: boolean; final: boolean }
export interface CircuitDrawing {
  version: number
  // Each vertex: x, y, current, leader, width, burn, heat, nearness.
  nodes: Float32Array
  edges: Uint32Array
  mask: Uint8Array
  probe: { x: number; y: number; level: number; held: boolean; guides: number[] } | null
}
const MAX_COLONIES = 8
const MAX_TIPS = 10
const SIGNAL_CUTOFF = 0.035
export const STRIDE = 8
const MAX_ARCS = 4
const LEADER_TICKS = 5
const EMBER_COOLING = 0.86
const SCORCH = 0.12

function hash(n: number) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b)
  return ((n ^ (n >>> 16)) >>> 0) / 2 ** 32
}

export class Filaments {
  private readonly terrain: Terrain
  private readonly random: () => number
  private readonly owner: Int16Array
  private readonly parent: Int32Array
  private readonly born: Uint32Array
  private readonly load: Uint16Array
  private readonly links: Uint8Array
  private readonly powered: Uint8Array
  private readonly charge: Float32Array
  private readonly burn: Float32Array
  private readonly heat: Float32Array
  private readonly mask: Uint8Array
  private readonly air: Uint8Array
  private readonly footprints = new Map<number, number[]>()
  private readonly cells = new Set<number>()
  private readonly sources = new Set<number>()
  private colonies: (Colony | undefined)[] = []
  private strikes: Strike[] = []
  private tick = 0
  private version = 0
  private probe: { cell: number; held: boolean; since: number } | null = null
  private closures = 0
  private shutdown = false

  constructor(terrain: Terrain, random = Math.random) {
    this.terrain = terrain; this.random = random
    const size = terrain.width * terrain.height
    this.owner = new Int16Array(size).fill(-1)
    this.parent = new Int32Array(size).fill(-1)
    this.born = new Uint32Array(size)
    this.load = new Uint16Array(size)
    this.links = new Uint8Array(size)
    this.powered = new Uint8Array(size)
    this.charge = new Float32Array(size)
    this.burn = new Float32Array(size)
    this.heat = new Float32Array(size)
    this.mask = new Uint8Array(size)
    this.air = new Uint8Array(size)
  }

  get size() { return this.cells.size }
  get active() {
    return Boolean(this.probe?.held) || this.shutdown || this.strikes.length > 0
      || this.colonies.some(c => c && c.tips.length > 0)
      || [...this.cells].some(cell => this.heat[cell] > 0 || this.tick - this.born[cell] < LEADER_TICKS)
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
  }

  // Return strokes light the whole powered channel in the same frame, then re-strike after
  // dark gaps. Brightness follows how much network each wire feeds: trunks blaze, twigs flicker.
  private strike(cell: number, final = false) {
    if (!this.powered[cell] || this.strikes.some(s => s.cells.has(cell) && this.tick - s.at < 3)) return
    const cells = new Set([cell]), queue = [cell]
    for (let i = 0; i < queue.length; i++) for (const next of this.linked(queue[i])) if (!cells.has(next) && this.powered[next]) {
      cells.add(next); queue.push(next)
    }
    this.flash(cells, this.schedule(cell * 31 + this.tick, 2 + Math.floor(hash(cell ^ this.tick * 977) * 3)), false, final)
  }

  private flash(cells: Set<number>, schedule: number[], local: boolean, final: boolean) {
    this.strikes.push({ cells, schedule, frame: 0, at: this.tick, local, final })
    if (this.strikes.length > 4) this.strikes.splice(this.strikes.findIndex(s => !s.final), 1)
  }

  private schedule(seed: number, strokes: number) {
    const out: number[] = []
    for (let s = 0; s < strokes; s++) {
      out.push(s ? 0.5 + hash(seed + s) * 0.5 : 1, 0.3)
      if (s < strokes - 1) for (let gap = 1 + Math.floor(hash(seed - s) * 4); gap > 0; gap--) out.push(0)
    }
    return out
  }

  private weight(cell: number) { return 0.35 + 0.65 * Math.min(1, Math.log2(this.load[cell] + 1) / 6) }

  aim(x: number, y: number, held = false) {
    const cell = this.terrain.cell(Math.floor(x), Math.floor(y)) < 0 ? -1 : this.terrain.settle(x, y)
    if (cell < 0) { this.probe = null; return }
    const since = held && this.probe?.held ? this.probe.since : this.tick
    this.probe = { cell, held, since }
  }

  unprime() { this.probe = null }

  // Leaving dumps everything that is still powered in one last discharge, then it is gone.
  retire() {
    this.probe = null
    if (![...this.cells].some(cell => this.powered[cell])) { this.clear(); return }
    this.shutdown = true; this.strikes = []
    this.flash(new Set(this.cells), this.schedule(this.tick * 13 + this.cells.size, 4 + Math.floor(hash(this.tick) * 3)), false, true)
  }

  resume() {
    if (!this.shutdown) return
    this.shutdown = false
    for (const strike of this.strikes) strike.final = false
  }

  plant(x: number, y: number, strength = 0.25) {
    const t = this.terrain
    if (t.cell(Math.floor(x), Math.floor(y)) < 0) return false
    const root = t.settle(x, y)
    if (root < 0) return false
    strength = Math.max(0, Math.min(1, strength))
    this.resume(); this.probe = null
    if (this.owner[root] >= 0) {
      const colony = this.colonies[this.owner[root]]!
      this.sources.add(root); this.repower()
      if (strength <= 0.45) this.strike(root)
      else {
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
    this.colonies[id] = { root, radius, count: 0, arcs: 0, capacity: Math.max(50, Math.round(radius ** 2 * 0.24)),
      speed: 4 + Math.floor(strength * 8), tips: this.runners(root, radius, 3, strength) }
    this.occupy(root, -1, id)
    this.sources.add(root); this.repower()
    return true
  }

  private runners(cell: number, radius: number, count: number, strength: number): Tip[] {
    const t = this.terrain
    const guided = t.guidance[cell] > 0.12
    const angle = guided ? Math.atan2(t.tangentY[cell], t.tangentX[cell]) : this.random() * Math.PI * 2
    const n = guided ? 2 : count
    return Array.from({ length: n }, (_, i) => ({ cell, root: cell, dx: Math.cos(angle + i * Math.PI * 2 / n),
      dy: Math.sin(angle + i * Math.PI * 2 / n), energy: radius * (1.4 + strength * 0.6) }))
  }

  private occupy(cell: number, parent: number, id: number, air = false) {
    this.owner[cell] = id; this.parent[cell] = parent; this.born[cell] = this.tick; this.load[cell] = 1; this.air[cell] = air ? 1 : 0
    this.cells.add(cell); this.colonies[id]!.count++; this.version++
    this.footprints.set(cell, air ? this.disc(cell, 2) : this.surfaceMask(cell, this.colonies[id]!.root, this.mask, 3))
    this.powered[cell] = 1
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
    const target = this.target(tip, tip.root), tx = target % t.width - x, ty = Math.floor(target / t.width) - y
    const lure = t.lure[tip.cell], lx = lure % t.width - x, ly = Math.floor(lure / t.width) - y, pull = 1 - t.conduct[tip.cell]
    const result: Candidate[] = []
    for (const [dx, dy] of DIRECTIONS) {
      const cell = t.cell(x + dx, y + dy)
      // Conductors carry current as far as they go; elsewhere the colony stays within reach.
      if (cell < 0 || (t.conduct[cell] < CONDUCTOR && Math.hypot(x + dx - rx, y + dy - ry) > colony.radius)) continue
      const occupied = this.owner[cell] >= 0
      if (occupied && (this.connected(tip.cell, cell, 9) || !this.powered[cell])) continue
      const length = Math.hypot(dx, dy), nx = dx / length, ny = dy / length
      const forward = tip.dx * nx + tip.dy * ny
      if (forward < -0.25) continue
      let conductivity = t.connection(tip.cell, cell, tip.root)
      if (occupied) conductivity = Math.min(conductivity, t.connection(cell, tip.cell, this.colonies[this.owner[cell]]!.root))
      if (conductivity < 0.32) continue
      const cost = length / conductivity * t.resistance(cell)
      if (cost > tip.energy) continue
      const contour = Math.abs(nx * t.tangentX[cell] + ny * t.tangentY[cell]) * t.guidance[cell]
      const toward = target >= 0 ? (nx * tx + ny * ty) / Math.hypot(tx, ty) : 0
      const outward = ((x - rx) * nx + (y - ry) * ny) / Math.max(1, Math.hypot(x - rx, y - ry))
      const score = forward * 1.25 + contour * 3 + toward * 1.2 + outward * 0.25
        + Math.log(conductivity) * 2.4 + (occupied ? 2.2 : 0) + (this.random() - 0.5) * 0.95
        + (t.conduct[cell] - t.conduct[tip.cell]) * 6 + t.ground[cell] * 1.5
        + (lure >= 0 && lure !== tip.cell ? (nx * lx + ny * ly) / Math.hypot(lx, ly) * pull * 1.6 : 0)
      result.push({ cell, dx: nx, dy: ny, cost, score })
    }
    return result.sort((a, b) => b.score - a.score)
  }

  // A jagged channel through the air to the nearest conductor, one 8-connected cell at a time.
  private arc(tip: Tip, colony: Colony, id: number): Tip[] | null {
    const t = this.terrain, target = t.lure[tip.cell]
    if (colony.arcs >= MAX_ARCS || Math.abs(t.near[target] - t.near[tip.cell]) > 0.2) return null
    const x0 = tip.cell % t.width, y0 = Math.floor(tip.cell / t.width), x1 = target % t.width, y1 = Math.floor(target / t.width)
    const length = Math.hypot(x1 - x0, y1 - y0)
    if (length < 2) return null
    colony.arcs++
    const nx = (y0 - y1) / length, ny = (x1 - x0) / length, steps = Math.ceil(length / 2)
    let x = x0, y = y0, previous = tip.cell, wander = 0
    for (let k = 1; k <= steps; k++) {
      wander = wander * 0.5 + (this.random() - 0.5) * 2.4
      const bend = wander * Math.sin(Math.PI * k / steps)
      const px = Math.round(x0 + (x1 - x0) * k / steps + nx * bend), py = Math.round(y0 + (y1 - y0) * k / steps + ny * bend)
      while (x !== px || y !== py) {
        x += Math.sign(px - x); y += Math.sign(py - y)
        const cell = t.cell(x, y)
        if (cell < 0) return null
        if (this.owner[cell] >= 0) {
          if (this.powered[cell] && this.connect(previous, cell)) { this.repower(); this.strike(cell) }
          return []
        }
        this.occupy(cell, previous, id, cell !== target); previous = cell
      }
    }
    this.strike(target)
    const angle = Math.atan2(t.tangentY[target], t.tangentX[target])
    return [0, Math.PI].map(turn => ({ cell: target, root: target, dx: Math.cos(angle + turn), dy: Math.sin(angle + turn),
      energy: colony.radius * 1.5 }))
  }

  private disc(cell: number, radius: number) {
    const t = this.terrain, x = cell % t.width, y = Math.floor(cell / t.width), out: number[] = []
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const next = t.cell(x + dx, y + dy)
      if (next >= 0 && dx * dx + dy * dy <= radius * radius) { this.mask[next] = 255; out.push(next) }
    }
    return out
  }

  private grow(colony: Colony, id: number) {
    const t = this.terrain, next: Tip[] = []
    for (const tip of colony.tips) {
      if (this.owner[tip.cell] !== id || !this.powered[tip.cell] || colony.count >= colony.capacity) continue
      const choices = this.candidates(tip, colony), head = choices[0]
      // Over an insulator with metal in reach, the field breaks down the air instead.
      if (t.lure[tip.cell] >= 0 && t.conduct[tip.cell] < 0.5 && (!head || this.random() < 0.06)) {
        const landed = this.arc(tip, colony, id)
        if (landed) { next.push(...landed); continue }
      }
      if (!head) continue
      if (this.owner[head.cell] >= 0) {
        const loop = this.connected(tip.cell, head.cell)
        if (this.connect(tip.cell, head.cell)) {
          if (loop) this.closures++
          this.repower(); this.strike(tip.cell)
        }
        continue
      }
      this.occupy(head.cell, tip.cell, id)
      // Touching metal or ground completes the path: the return stroke fires immediately.
      if (t.ground[head.cell] > 0.6 && t.ground[tip.cell] <= 0.6) { this.strike(head.cell); continue }
      if (t.conduct[head.cell] >= CONDUCTOR && t.conduct[tip.cell] < CONDUCTOR) this.strike(head.cell)
      const energy = tip.energy - head.cost
      next.push({ cell: head.cell, root: tip.root, dx: head.dx, dy: head.dy, energy })
      if (next.length + colony.tips.length < MAX_TIPS && energy > 12 && this.random() < 0.085) {
        const branch = choices.find(c => this.owner[c.cell] < 0 && c.dx * head.dx + c.dy * head.dy < 0.5)
        if (branch) {
          this.occupy(branch.cell, tip.cell, id)
          next[next.length - 1].energy *= 0.8
          next.push({ cell: branch.cell, root: tip.root, dx: branch.dx, dy: branch.dy, energy: (tip.energy - branch.cost) * 0.8 })
        }
      }
    }
    colony.tips = next.slice(0, MAX_TIPS)
  }

  step() {
    this.tick++
    for (const cell of this.cells) {
      this.charge[cell] = 0
      this.heat[cell] *= EMBER_COOLING
      if (this.heat[cell] < SIGNAL_CUTOFF) this.heat[cell] = 0
    }
    this.colonies.forEach((colony, id) => {
      if (!colony || this.shutdown) return
      const wasGrowing = colony.tips.length > 0
      for (let k = 0; k < colony.speed && colony.tips.length; k++) this.grow(colony, id)
      // The leader has finished searching: the return stroke follows its channel back.
      if (wasGrowing && !colony.tips.length) this.strike(colony.root)
    })
    let finished = false
    this.strikes = this.strikes.filter(strike => {
      const level = strike.schedule[strike.frame++]
      if (level > 0) for (const cell of strike.cells) if (this.owner[cell] >= 0 && this.powered[cell]) {
        // Metal carries the most current and glows hot; cloth carries less but chars. Air never scars.
        const c = this.air[cell] ? 0.9 : this.terrain.conduct[cell]
        const current = strike.local ? level : Math.min(1, level * this.weight(cell) * (0.55 + 0.9 * c))
        this.charge[cell] = Math.max(this.charge[cell], current)
        if (this.air[cell]) continue
        this.heat[cell] = Math.max(this.heat[cell], current * (0.6 + 0.8 * c))
        this.burn[cell] = Math.min(1, this.burn[cell] + current * SCORCH * (1.6 - 1.2 * c))
      }
      if (strike.frame < strike.schedule.length) return true
      finished ||= strike.final
      return false
    })
    if (finished) this.clear()
  }

  cut(x: number, y: number, radius: number) {
    const t = this.terrain, wounds = new Set<number>(), sparks = new Set<number>()
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
        this.owner[cell] = -1; this.parent[cell] = -1; this.links[cell] = 0; this.air[cell] = 0
        this.charge[cell] = 0; this.burn[cell] = 0; this.heat[cell] = 0
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
      colony.tips.push({ cell, root: cell, dx: dx / length, dy: dy / length, energy: colony.radius * 0.6 })
    }
    // Severed live ends arc where they were torn apart.
    for (const cell of wounds) if (this.owner[cell] >= 0 && this.powered[cell]) sparks.add(cell)
    if (sparks.size) this.flash(sparks, [1, 0, 0.8, 0.4, 0, 0.6], true, false)
    return true
  }

  clear() {
    this.owner.fill(-1); this.parent.fill(-1); this.links.fill(0); this.powered.fill(0)
    this.charge.fill(0); this.burn.fill(0); this.heat.fill(0); this.air.fill(0)
    this.cells.clear(); this.sources.clear(); this.footprints.clear(); this.mask.fill(0)
    this.colonies = []; this.strikes = []; this.probe = null
    this.tick = 0; this.version++; this.closures = 0; this.shutdown = false
  }

  drawing(): CircuitDrawing {
    const t = this.terrain, indices = new Map<number, number>(), nodes = new Float32Array(this.size * STRIDE), edges: number[] = []
    const mask = this.mask.slice()
    const tips = new Set(this.shutdown ? [] : this.colonies.flatMap(c => c?.tips.map(tip => tip.cell) ?? []))
    let index = 0
    for (const cell of this.cells) {
      indices.set(cell, index)
      const p = index++ * STRIDE
      // The stepped leader: hot flickering tips, a faint stuttering channel just behind them.
      const flicker = hash(cell * 131 + this.tick * 7919)
      const leader = !this.powered[cell] ? 0 : tips.has(cell) ? 0.7 + flicker * 0.3
        : !this.shutdown && this.tick - this.born[cell] < LEADER_TICKS && flicker > 0.4 ? 0.1 + flicker * 0.3 : 0
      nodes.set([cell % t.width + 0.5, Math.floor(cell / t.width) + 0.5, this.charge[cell], leader,
        0.32 + Math.min(1.1, Math.log2(this.load[cell] + 1) * 0.14), this.burn[cell], this.heat[cell], t.near[cell]], p)
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
      pixels[i + 3] = (0.1 + this.burn[cell] * 0.3 + signal * 0.6) * 255
    }
  }

  snapshot() {
    return { owner: this.owner.slice(), parent: this.parent.slice(), charge: this.charge.slice(), links: this.links.slice(),
      powered: this.powered.slice(), burn: this.burn.slice(), heat: this.heat.slice(), roots: this.colonies.map(c => c?.root ?? -1), closures: this.closures }
  }
}
