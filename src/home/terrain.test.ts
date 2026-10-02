import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Terrain } from './terrain.ts'

function scene(width: number, height: number, color: (x: number, y: number) => number[]) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) pixels.set(color(x, y), (y * width + x) * 4)
  return new Terrain(width, height, pixels)
}

test('flat surfaces conduct freely without inventing a contour', () => {
  const terrain = scene(100, 100, () => [90, 110, 70, 255])
  const a = terrain.cell(50, 50), b = terrain.cell(51, 50)
  assert.equal(terrain.connection(a, b, a), 1)
  assert.equal(terrain.guidance[a], 0)
  assert.equal(terrain.settle(50, 50), a)
})

test('the structure tensor points along edges, not through them', () => {
  const vertical = scene(100, 100, x => x < 50 ? [20, 30, 40, 255] : [230, 220, 210, 255])
  const horizontal = scene(100, 100, (_, y) => y < 50 ? [20, 30, 40, 255] : [230, 220, 210, 255])
  const i = vertical.cell(49, 49)
  assert.ok(Math.abs(vertical.tangentY[i]) > 0.99)
  assert.ok(Math.abs(horizontal.tangentX[i]) > 0.99)
  assert.ok(vertical.guidance[i] > 0.5)
  assert.ok(horizontal.guidance[i] > 0.5)
})

test('local conductivity and root drift stop a flood from walking through a blurred silhouette', () => {
  const terrain = scene(100, 100, x => x < 50 ? [20, 30, 40, 255] : [230, 220, 210, 255])
  const root = terrain.cell(40, 50)
  assert.equal(terrain.connection(terrain.cell(49, 50), terrain.cell(50, 50), root), 0)
  assert.equal(terrain.conductivity(terrain.cell(60, 50), terrain.cell(61, 50), root), 0)
  assert.ok(terrain.settle(47, 50) % terrain.width < 50)
})

test('diagonal growth cannot cut corners through transparent or disconnected cells', () => {
  const terrain = scene(8, 8, (x, y) => x === y ? [100, 100, 100, 255] : [100, 100, 100, 0])
  assert.equal(terrain.connection(terrain.cell(3, 3), terrain.cell(4, 4), terrain.cell(3, 3)), 0)
  assert.equal(terrain.settle(3, 4), -1)
})

test('sampling borders and one-pixel images stay finite', () => {
  const terrain = scene(1, 1, () => [100, 100, 100, 255])
  assert.equal(terrain.settle(-100, 200), 0)
  assert.ok(terrain.guidance.every(Number.isFinite))
  assert.equal(terrain.cell(-1, 0), -1)
  assert.throws(() => new Terrain(2, 2, new Uint8ClampedArray(4)), /substrate/)
})
