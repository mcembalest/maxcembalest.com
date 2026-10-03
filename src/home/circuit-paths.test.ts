import assert from 'node:assert/strict'
import { test } from 'node:test'
import { circuitPaths } from './circuit-paths.ts'

function nodes(points: number[][]) {
  return Float32Array.from(points.flatMap(([x, y]) => [x, y, 1, 0, 0.5, 0, 0]))
}

test('rounded chains cover every wire once, including junctions and closed circuits', () => {
  for (const edges of [[0, 1, 1, 2, 1, 3], [0, 1, 1, 2, 2, 3, 3, 0]]) {
    const result = circuitPaths(nodes([[0, 0], [1, 0], [1, 1], [0, 1]]), Uint32Array.from(edges))
    const traversed = result.chains.flatMap(chain => chain.slice(1).map((b, i) => [chain[i], b].sort().join(':')))
    assert.equal(traversed.length, edges.length / 2)
    assert.equal(new Set(traversed).size, traversed.length)
    assert.ok(result.segments.every(s => [s.ax, s.ay, s.cx, s.cy, s.bx, s.by].every(Number.isFinite)))
  }
})

test('empty and isolated graphs produce no invented wires', () => {
  assert.deepEqual(circuitPaths(new Float32Array(), new Uint32Array()), { chains: [], segments: [] })
  assert.equal(circuitPaths(nodes([[1, 1]]), new Uint32Array()).segments.length, 0)
})
