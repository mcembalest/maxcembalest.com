import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Terrain, DIRECTIONS } from './terrain.ts'
import { Filaments } from './filaments.ts'

function scene(width: number, height: number, color: (x: number, y: number) => number[]) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) pixels.set(color(x, y), (y * width + x) * 4)
  return new Terrain(width, height, pixels)
}
function random(seed = 7) { return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32) }
function evolve(growth: Filaments, steps = 300) { for (let k = 0; k < steps && growth.active; k++) growth.step() }
function occupied(growth: Filaments, width: number) {
  return Array.from(growth.snapshot().owner).flatMap((id, i) => id < 0 ? [] : [{ cell: i, x: i % width, y: Math.floor(i / width) }])
}

test('growth is deterministic, branching, connected and finite without a target silhouette', () => {
  const terrain = scene(160, 160, () => [90, 105, 75, 255])
  const a = new Filaments(terrain, random()), b = new Filaments(terrain, random())
  assert.ok(a.plant(80, 80)); assert.ok(b.plant(80, 80))
  evolve(a); evolve(b)
  assert.deepEqual(a.snapshot(), b.snapshot())
  assert.ok(a.size > 40)
  assert.equal(a.active, false, 'mature patterns must sleep')
  const { owner, parent, roots } = a.snapshot()
  const children = new Uint8Array(owner.length)
  for (let cell = 0; cell < owner.length; cell++) if (owner[cell] >= 0 && parent[cell] >= 0) {
    assert.equal(owner[parent[cell]], owner[cell])
    assert.ok(terrain.connection(parent[cell], cell, roots[owner[cell]]) >= 0.32)
    children[parent[cell]]++
  }
  assert.ok(children.some(n => n > 1), 'the local rule should bifurcate')
})

test('every growth step respects silhouettes, not merely final rendered opacity', () => {
  const terrain = scene(160, 160, x => x < 80 ? [20, 30, 40, 255] : [235, 225, 215, 255])
  const growth = new Filaments(terrain, random())
  growth.plant(76, 90)
  for (let k = 0; k < 200; k++) {
    growth.step()
    assert.ok(occupied(growth, 160).every(p => p.x < 80))
  }
  assert.ok(growth.size > 20)
})

test('thin surfaces produce runners along their own geometry instead of tree-shaped overlays', () => {
  const terrain = scene(160, 160, (_, y) => y >= 70 && y <= 75 ? [210, 160, 90, 255] : [10, 20, 30, 255])
  const growth = new Filaments(terrain, random())
  growth.plant(95, 72); evolve(growth)
  const points = occupied(growth, 160)
  assert.ok(Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)) > 35)
  assert.ok(points.every(p => p.y >= 69 && p.y <= 76))
})

test('curved objects guide branches along their manifold', () => {
  const center = (x: number) => 90 + 15 * Math.sin(x / 25)
  const terrain = scene(160, 160, (x, y) => Math.abs(y - center(x)) < 4 ? [200, 150, 80, 255] : [10, 20, 30, 255])
  const growth = new Filaments(terrain, random())
  growth.plant(90, Math.round(center(90))); evolve(growth)
  const points = occupied(growth, 160)
  assert.ok(points.length > 25)
  assert.ok(points.every(p => Math.abs(p.y - center(p.x)) < 5))
})

test('pruning clears cells immediately and wakes material-aware healing', () => {
  const terrain = scene(160, 160, () => [90, 105, 75, 255])
  const growth = new Filaments(terrain, random())
  growth.plant(80, 80); evolve(growth)
  const point = occupied(growth, 160).find(p => Math.hypot(p.x - 80, p.y - 80) > 10)!
  assert.ok(point)
  assert.ok(growth.cut(point.x, point.y, 4))
  const pruned = growth.size
  assert.ok(occupied(growth, 160).every(p => Math.hypot(p.x - point.x, p.y - point.y) > 4))
  assert.ok(growth.active)
  evolve(growth)
  assert.ok(growth.size > pruned)
  growth.clear()
  assert.equal(growth.size, 0); assert.equal(growth.active, false)
  const pixels = new Uint8ClampedArray(160 * 160 * 4).fill(255)
  growth.paint(pixels)
  assert.ok(pixels.every(v => v === 0))
})

test('invalid seeds and overcrowding are rejected, but an existing wire can be recharged', () => {
  const empty = new Filaments(scene(16, 16, () => [0, 0, 0, 0]), random())
  assert.equal(empty.plant(8, 8), false)
  assert.equal(empty.plant(-1, 8), false)
  const growth = new Filaments(scene(160, 160, () => [90, 105, 75, 255]), random())
  assert.ok(growth.plant(80, 80))
  assert.equal(growth.plant(81, 81), false)
  const size = growth.size
  assert.ok(growth.plant(80, 80))
  assert.equal(growth.size, size, 'recharging does not duplicate vertices')
})

test('repeated pruning and recolonization cannot form parent cycles or leak cell ownership', () => {
  const terrain = scene(160, 160, () => [90, 105, 75, 255])
  const growth = new Filaments(terrain, random())
  growth.plant(80, 80); evolve(growth)
  for (let n = 0; n < 12; n++) {
    const points = occupied(growth, 160)
    const point = points[Math.floor(points.length * 0.6)]
    growth.cut(point.x, point.y, 5)
    evolve(growth)
    const { owner, parent } = growth.snapshot()
    assert.equal(owner.filter(id => id >= 0).length, growth.size)
    for (const { cell } of occupied(growth, 160)) {
      const seen = new Set<number>()
      for (let a = cell; a >= 0; a = parent[a]) {
        assert.ok(!seen.has(a), `parent cycle at cell ${a}`)
        assert.equal(owner[a], owner[cell])
        seen.add(a)
      }
    }
  }
})

test('small images and exhausted fragments settle safely, and can be planted again after clearing', () => {
  for (const [width, height] of [[1, 1], [8, 12]]) {
    const growth = new Filaments(scene(width, height, () => [80, 100, 70, 255]), random())
    assert.ok(growth.plant(0, 0)); evolve(growth)
    assert.ok(growth.size <= width * height)
    assert.equal(growth.active, false)
    growth.cut(0, 0, Math.max(width, height))
    assert.equal(growth.size, 0)
    growth.clear()
    assert.ok(growth.plant(0, 0))
  }
})

test('pulses follow real graph distances, split at junctions, and finish without altering geometry', () => {
  const growth = new Filaments(scene(160, 160, () => [90, 105, 75, 255]), random())
  growth.plant(80, 80); evolve(growth)
  const topology = growth.snapshot(), root = topology.roots[0]
  const distance = new Int32Array(topology.owner.length).fill(-1), queue = [root]
  distance[root] = 0
  for (let i = 0; i < queue.length; i++) for (let d = 0; d < 8; d++) if (topology.links[queue[i]] & (1 << d)) {
    const [dx, dy] = DIRECTIONS[d], next = queue[i] + dx + dy * 160
    if (distance[next] < 0) { distance[next] = distance[queue[i]] + 1; queue.push(next) }
  }
  assert.ok(growth.plant(80, 80, 0.25))
  for (let n = 1; n <= 12; n++) {
    growth.step()
    const after = growth.snapshot()
    assert.deepEqual(after.owner, topology.owner); assert.deepEqual(after.links, topology.links)
    after.charge.forEach((q, cell) => { if (q > 0) assert.ok(distance[cell] >= 0 && distance[cell] < n) })
  }
  const signal = growth.snapshot()
  let peak = root
  signal.charge.forEach((q, cell) => { if (q > signal.charge[peak]) peak = cell })
  assert.equal(distance[peak], 11, 'a pulse advances one graph edge per tick on a uniform conductor')
  evolve(growth)
  assert.equal(growth.active, false)
  assert.ok(growth.snapshot().charge.every(q => q === 0))
})

test('sparkling renders are deterministic, brighter at growing tips, and never affect growth randomness', () => {
  const terrain = scene(160, 160, () => [90, 105, 75, 255])
  const a = new Filaments(terrain, random()), b = new Filaments(terrain, random())
  a.plant(80, 80); b.plant(80, 80)
  for (let i = 0; i < 20; i++) {
    a.step(); b.step()
    assert.deepEqual(a.drawing(), a.drawing())
  }
  assert.deepEqual(a.snapshot(), b.snapshot())
  assert.ok(a.drawing().nodes.some((v, i) => i % 7 === 6 && v > 0.75), 'tips should carry a bright deterministic spark')
})

test('cutting and clearing remove signals as well as living cells', () => {
  const growth = new Filaments(scene(160, 160, () => [90, 105, 75, 255]), random())
  growth.plant(80, 80)
  for (let i = 0; i < 15; i++) growth.step()
  growth.cut(80, 80, 6)
  const { owner, charge } = growth.snapshot()
  for (let i = 0; i < owner.length; i++) if (owner[i] < 0) assert.equal(charge[i], 0)
  evolve(growth)
  growth.clear()
  assert.ok(growth.snapshot().charge.every(q => q === 0))
  assert.equal(growth.active, false)
})

test('charging gathers potential without growing geometry, and cancelling leaves no activity', () => {
  const growth = new Filaments(scene(160, 160, () => [90, 105, 75, 255]), random())
  growth.aim(80, 80, true)
  const start = growth.drawing().probe!.level
  for (let i = 0; i < 25; i++) growth.step()
  assert.equal(growth.size, 0)
  assert.ok(growth.drawing().probe!.level > start + 0.5)
  growth.unprime()
  assert.equal(growth.active, false)
  assert.equal(growth.drawing().probe, null)
})

test('neighboring colonies merge through conductive edges, close circuits and still sleep', () => {
  const terrain = scene(160, 160, () => [90, 105, 75, 255]), growth = new Filaments(terrain, random(7))
  growth.plant(60, 80, 0.75); growth.plant(100, 80, 0.75); evolve(growth, 600)
  const { owner, links, roots, closures } = growth.snapshot()
  let cross = 0
  for (let cell = 0; cell < owner.length; cell++) if (owner[cell] >= 0) for (let d = 0; d < 8; d++) if (links[cell] & (1 << d)) {
    const [dx, dy] = DIRECTIONS[d], next = cell + dx + dy * 160
    assert.ok(links[next] & (1 << ((d + 4) % 8)), 'every wire is reciprocal')
    assert.ok(terrain.connection(cell, next, roots[owner[cell]]) >= 0.32)
    assert.ok(terrain.connection(next, cell, roots[owner[next]]) >= 0.32)
    if (owner[next] !== owner[cell]) cross++
  }
  assert.ok(cross > 0, 'separate charges should discover a shared circuit')
  assert.ok(closures > 0, 'some long branches should close rings')
  assert.equal(growth.active, false, 'waves cannot endlessly circulate around closed rings')
})

test('removing a source de-energizes its component and cancels disconnected growth', () => {
  const growth = new Filaments(scene(160, 160, () => [90, 105, 75, 255]), random())
  growth.plant(80, 80); evolve(growth)
  const root = growth.snapshot().roots[0]
  growth.cut(root % 160, Math.floor(root / 160), 2)
  assert.ok(growth.snapshot().powered.every(v => v === 0))
  const size = growth.size
  evolve(growth, 600)
  assert.equal(growth.size, size, 'an isolated fragment must not heal from invisible power')
  assert.ok(growth.snapshot().voltage.every(v => v === 0))
  assert.ok(growth.snapshot().charge.every(v => v === 0))
  assert.equal(growth.active, false)
})

test('shutdown travels through branches instead of fading every line at once', () => {
  const growth = new Filaments(scene(160, 160, () => [90, 105, 75, 255]), random())
  growth.plant(80, 80, 0.75); evolve(growth, 600)
  growth.retire()
  for (let i = 0; i < 12; i++) growth.step()
  const { owner, voltage } = growth.snapshot()
  const levels = voltage.filter((_, i) => owner[i] >= 0)
  assert.ok(levels.some(v => v < 0.5), 'the power source should already be draining')
  assert.ok(levels.some(v => v > 0.95), 'distant branches should still be lit')
  evolve(growth, 600)
  assert.equal(growth.size, 0)
  assert.equal(growth.active, false)
  assert.equal(growth.drawing().nodes.length, 0)
})

test('returning during shutdown preserves topology and restores the surviving network', () => {
  const growth = new Filaments(scene(160, 160, () => [90, 105, 75, 255]), random())
  growth.plant(80, 80); evolve(growth)
  const topology = growth.snapshot()
  growth.retire()
  for (let i = 0; i < 12; i++) growth.step()
  growth.resume(); evolve(growth, 600)
  assert.deepEqual(growth.snapshot().owner, topology.owner)
  assert.deepEqual(growth.snapshot().links, topology.links)
  assert.ok(growth.snapshot().voltage.every((v, i) => topology.owner[i] < 0 || v === 1))
  assert.equal(growth.active, false)
})

test('surface-clipped drawings never illuminate the other side of a silhouette', () => {
  const terrain = scene(160, 160, x => x < 80 ? [20, 30, 40, 255] : [235, 225, 215, 255])
  const growth = new Filaments(terrain, random())
  growth.plant(76, 90, 0.75); evolve(growth)
  const { nodes, edges, mask } = growth.drawing()
  assert.ok(nodes.length > 0)
  assert.ok(mask.every((v, i) => i % 160 < 80 || v === 0), 'even halo clipping stays on the originating surface')
  assert.ok(edges.every(i => i < nodes.length / 7))
})

test('painting is an exact view of living image cells, with no template or hidden fog', () => {
  const growth = new Filaments(scene(160, 160, () => [90, 105, 75, 255]), random())
  growth.plant(80, 80); evolve(growth)
  const pixels = new Uint8ClampedArray(160 * 160 * 4)
  growth.paint(pixels)
  const { owner } = growth.snapshot()
  for (let i = 0; i < owner.length; i++) assert.equal(pixels[i * 4 + 3] > 0, owner[i] >= 0)
})
