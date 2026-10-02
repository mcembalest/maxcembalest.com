import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Garden, type Weights } from './nca.ts'

const weights: Weights = JSON.parse(readFileSync(new URL('./tree-weights.json', import.meta.url), 'utf8'))
// States recorded from the PyTorch model with every cell firing, so the result is deterministic.
const parity = JSON.parse(readFileSync(new URL('./tree-parity.json', import.meta.url), 'utf8'))

test('the TypeScript automaton matches the trained PyTorch model step for step', () => {
  const garden = new Garden(weights, parity.size, parity.size)
  garden.plant(parity.seed[1], parity.seed[0])
  let steps = 0
  for (const check of parity.checks) {
    while (steps < check.steps) {
      garden.step(() => true)
      steps++
    }
    const state = garden.snapshot()
    const ch = weights.ch
    let absSum = 0
    for (const v of state) absSum += Math.abs(v)
    assert.ok(Math.abs(absSum - check.abs_sum) / check.abs_sum < 1e-3, `step ${steps}: total ${absSum} vs ${check.abs_sum}`)
    for (const { y, x, v } of check.cells) {
      const got = Array.from(state.slice((y * parity.size + x) * ch, (y * parity.size + x + 1) * ch))
      got.forEach((g, c) => assert.ok(Math.abs(g - v[c]) < 1e-3, `step ${steps} cell (${x},${y}) channel ${c}: ${g} vs ${v[c]}`))
    }
  }
})

test('on its training-sized grid, a seed grows into a tree and holds that shape', () => {
  let seed = 1
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  const garden = new Garden(weights, 48, 48, random)
  garden.plant(24, 45)
  const count = () => {
    let alive = 0
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (garden.alpha(x, y) > 0.2) alive++
    return alive
  }
  for (let t = 0; t < 300; t++) garden.step()
  const grown = count()
  for (let t = 0; t < 700; t++) garden.step()
  const later = count()
  let maxAbs = 0
  for (const v of garden.snapshot()) maxAbs = Math.max(maxAbs, Math.abs(v))
  assert.ok(grown > 250 && grown < 900, `alive cells after 300 steps: ${grown}`)
  assert.ok(Math.abs(later - grown) < grown * 0.25, `shape drifted from ${grown} to ${later} cells`)
  assert.ok(maxAbs < 10, `largest state value: ${maxAbs}`)
})
