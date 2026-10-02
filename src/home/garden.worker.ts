// Image analysis and branching growth run entirely off the UI thread.
import { Terrain } from './terrain.ts'
import { Filaments } from './filaments.ts'

export type Message =
  | { type: 'init'; id: number; width: number; height: number; revision: number; pixels: ArrayBuffer }
  | { type: 'touch'; id: number; x: number; y: number }
  | { type: 'cut'; id: number; x: number; y: number; r: number }
  | { type: 'clear'; id: number }

export interface Frame {
  id: number
  revision: number
  width: number
  height: number
  pixels: ArrayBuffer
}

interface Photo { width: number; height: number; revision: number; growth: Filaments }
const photos = new Map<number, Photo>()
const STEP_MS = 32
let running = false

function frame(id: number, photo: Photo) {
  const pixels = new Uint8ClampedArray(photo.width * photo.height * 4)
  photo.growth.paint(pixels)
  self.postMessage({ id, revision: photo.revision, width: photo.width, height: photo.height, pixels: pixels.buffer } satisfies Frame,
    { transfer: [pixels.buffer] })
}

function loop() {
  const start = performance.now()
  let active = false
  for (const [id, photo] of photos) {
    if (!photo.growth.active) continue
    photo.growth.step()
    frame(id, photo)
    active ||= photo.growth.active
  }
  running = active
  if (active) setTimeout(loop, Math.max(0, STEP_MS - (performance.now() - start)))
}

const wake = () => { if (!running) { running = true; loop() } }

self.onmessage = (e: MessageEvent<Message>) => {
  const m = e.data
  if (m.type === 'init') {
    const terrain = new Terrain(m.width, m.height, new Uint8ClampedArray(m.pixels))
    photos.set(m.id, { width: m.width, height: m.height, revision: m.revision, growth: new Filaments(terrain) })
    return
  }
  const photo = photos.get(m.id)
  if (!photo) return
  if (m.type === 'touch') {
    if (photo.growth.plant(m.x, m.y)) wake()
  } else if (m.type === 'cut') {
    if (photo.growth.cut(m.x, m.y, m.r)) { frame(m.id, photo); wake() }
  } else {
    photo.growth.clear()
    frame(m.id, photo)
  }
}
