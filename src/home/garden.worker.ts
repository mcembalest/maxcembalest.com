// Image analysis, graph growth and electrical propagation stay off the UI thread.
import { Terrain } from './terrain.ts'
import { Filaments, type CircuitDrawing } from './filaments.ts'

export type Message =
  | { type: 'init'; id: number; width: number; height: number; revision: number; pixels: ArrayBuffer }
  | { type: 'aim'; id: number; x: number; y: number; held: boolean }
  | { type: 'fire'; id: number; x: number; y: number; strength: number }
  | { type: 'cancel'; id: number }
  | { type: 'retire'; id: number }
  | { type: 'resume'; id: number }
  | { type: 'cut'; id: number; x: number; y: number; r: number }
  | { type: 'clear'; id: number }

export interface Frame {
  id: number
  revision: number
  width: number
  height: number
  version: number
  nodes: ArrayBuffer
  edges: ArrayBuffer
  mask: ArrayBuffer
  probe: CircuitDrawing['probe']
}

interface Photo { width: number; height: number; revision: number; growth: Filaments }
const photos = new Map<number, Photo>()
const STEP_MS = 32
let running = false

function frame(id: number, photo: Photo) {
  const { version, nodes, edges, mask, probe } = photo.growth.drawing()
  self.postMessage({ id, revision: photo.revision, width: photo.width, height: photo.height, version,
    nodes: nodes.buffer as ArrayBuffer, edges: edges.buffer as ArrayBuffer, mask: mask.buffer as ArrayBuffer, probe } satisfies Frame,
    { transfer: [nodes.buffer, edges.buffer, mask.buffer] })
}

function loop() {
  const start = performance.now()
  let active = false
  for (const [id, photo] of photos) {
    if (!photo.growth.active) continue
    photo.growth.step(); frame(id, photo)
    active ||= photo.growth.active
  }
  running = active
  if (active) setTimeout(loop, Math.max(0, STEP_MS - (performance.now() - start)))
}

const wake = () => { if (!running) { running = true; loop() } }

self.onmessage = (e: MessageEvent<Message>) => {
  const m = e.data
  if (m.type === 'init') {
    photos.set(m.id, { width: m.width, height: m.height, revision: m.revision,
      growth: new Filaments(new Terrain(m.width, m.height, new Uint8ClampedArray(m.pixels))) })
    return
  }
  const photo = photos.get(m.id)
  if (!photo) return
  if (m.type === 'aim') photo.growth.aim(m.x, m.y, m.held)
  else if (m.type === 'fire') { photo.growth.unprime(); photo.growth.plant(m.x, m.y, m.strength) }
  else if (m.type === 'cancel') photo.growth.unprime()
  else if (m.type === 'retire') photo.growth.retire()
  else if (m.type === 'resume') photo.growth.resume()
  else if (m.type === 'cut') photo.growth.cut(m.x, m.y, m.r)
  else photo.growth.clear()
  frame(m.id, photo)
  if (photo.growth.active) wake()
}
