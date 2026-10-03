import assert from 'node:assert/strict'
import { test } from 'node:test'
import { imagePlacement } from './photo-sampling.ts'

test('photo sampling matches cover cropping and object-position', () => {
  assert.deepEqual(imagePlacement(1000, 500, 200, 200, 'cover'), { x: -100, y: 0, width: 400, height: 200 })
  assert.deepEqual(imagePlacement(1000, 500, 200, 200, 'cover', '100% 50%'), { x: -200, y: 0, width: 400, height: 200 })
})

test('photo sampling matches contain, fill and scale-down', () => {
  assert.deepEqual(imagePlacement(1000, 500, 200, 200, 'contain'), { x: 0, y: 50, width: 200, height: 100 })
  assert.deepEqual(imagePlacement(1000, 500, 200, 200, 'fill'), { x: 0, y: 0, width: 200, height: 200 })
  assert.deepEqual(imagePlacement(100, 50, 200, 200, 'scale-down'), { x: 50, y: 75, width: 100, height: 50 })
})
