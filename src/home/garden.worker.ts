// Runs the tree automata off the main thread and sends each photo's frame back as pixels.
//
// Every tree lives in its own 48×48 grid, the size it was trained on: the automaton learned to
// use the grid's edges as the limits of its canopy, and on an open grid it never stops growing.
// Trees are composited onto the photo, so neighbors overlap without interfering.
import { Garden, type Weights } from './nca.ts'
import weights from './tree-weights.json'

export type Message =
  | { type: 'init'; id: number; width: number; height: number }
  | { type: 'touch'; id: number; x: number; y: number } // plant here unless that spot is taken
  | { type: 'cut'; id: number; x: number; y: number; r: number }
  | { type: 'clear'; id: number }

export interface Frame {
  id: number
  width: number
  height: number
  pixels: ArrayBuffer
}

const TREE = 48 // training grid size
const SEED = { x: 24, y: 45 } // where the seed sits in that grid; the tree grows up from it
// The part of the 48×48 window a grown tree covers; new trees may overlap old ones by at most
// MAX_OVERLAP of this area, so the forest stays a set of distinct trees.
const FOOTPRINT = { x0: 4, x1: 44, y0: 3, y1: 46 }
const MAX_OVERLAP = 0.2
const MAX_TREES = 10
const STEP_MS = 25

interface Tree {
  x: number // grid position of the tree's 48×48 window on the photo
  y: number
  flip: boolean // drawn mirrored, so neighboring trees don't look identical
  garden: Garden
  pixels: Uint8ClampedArray
}

interface Photo {
  width: number
  height: number
  trees: Tree[]
}

const photos = new Map<number, Photo>()
let running = false

function composite(photo: Photo) {
  const out = new Uint8ClampedArray(photo.width * photo.height * 4)
  for (const tree of photo.trees) {
    tree.garden.paint(tree.pixels)
    for (let ty = 0; ty < TREE; ty++) {
      const y = tree.y + ty
      if (y < 0 || y >= photo.height) continue
      for (let tx = 0; tx < TREE; tx++) {
        const x = tree.x + tx
        if (x < 0 || x >= photo.width) continue
        const s = (ty * TREE + (tree.flip ? TREE - 1 - tx : tx)) * 4
        const a = tree.pixels[s + 3] / 255
        if (a === 0) continue
        // Draw this tree over whatever is already there.
        const d = (y * photo.width + x) * 4
        const below = out[d + 3] / 255
        const total = a + below * (1 - a)
        for (let c = 0; c < 3; c++) out[d + c] = (tree.pixels[s + c] * a + out[d + c] * below * (1 - a)) / total
        out[d + 3] = total * 255
      }
    }
  }
  return out
}

function loop() {
  const started = performance.now()
  let active = false
  for (const [id, photo] of photos) {
    if (!photo.trees.length) continue
    active = true
    for (const tree of photo.trees) tree.garden.step()
    photo.trees = photo.trees.filter((tree) => !tree.garden.empty)
    const pixels = composite(photo)
    self.postMessage({ id, width: photo.width, height: photo.height, pixels: pixels.buffer } satisfies Frame, {
      transfer: [pixels.buffer],
    })
  }
  running = active
  if (active) setTimeout(loop, Math.max(0, STEP_MS - (performance.now() - started)))
}

const wake = () => {
  if (!running) {
    running = true
    loop()
  }
}

// Where a photo cell falls in a tree's own grid, accounting for mirroring.
const local = (t: Tree, x: number, y: number) => ({ x: t.flip ? TREE - 1 - (x - t.x) : x - t.x, y: y - t.y })

// Is there a living cell of any tree at this photo cell?
const taken = (photo: Photo, x: number, y: number) =>
  photo.trees.some((t) => {
    const p = local(t, x, y)
    return p.x >= 0 && p.y >= 0 && p.x < TREE && p.y < TREE && t.garden.alpha(p.x, p.y) > 0.1
  })

// Would a tree with its window at (x, y) overlap an existing tree too much?
function crowded(photo: Photo, x: number, y: number) {
  const area = (FOOTPRINT.x1 - FOOTPRINT.x0) * (FOOTPRINT.y1 - FOOTPRINT.y0)
  return photo.trees.some((t) => {
    const w = Math.min(x, t.x) + FOOTPRINT.x1 - (Math.max(x, t.x) + FOOTPRINT.x0)
    const h = Math.min(y, t.y) + FOOTPRINT.y1 - (Math.max(y, t.y) + FOOTPRINT.y0)
    return w > 0 && h > 0 && (w * h) / area > MAX_OVERLAP
  })
}

self.onmessage = (e: MessageEvent<Message>) => {
  const m = e.data
  if (m.type === 'init') {
    photos.set(m.id, { width: m.width, height: m.height, trees: [] })
    return
  }
  const photo = photos.get(m.id)
  if (!photo) return
  if (m.type === 'touch') {
    const x = m.x - SEED.x
    const y = m.y - SEED.y
    if (photo.trees.length >= MAX_TREES || crowded(photo, x, y) || taken(photo, m.x, m.y)) return
    const garden = new Garden(weights as Weights, TREE, TREE)
    garden.plant(SEED.x, SEED.y)
    photo.trees.push({ x, y, flip: Math.random() < 0.5, garden, pixels: new Uint8ClampedArray(TREE * TREE * 4) })
    wake()
  } else if (m.type === 'cut') {
    for (const t of photo.trees) {
      const p = local(t, m.x, m.y)
      t.garden.cut(p.x, p.y, m.r)
    }
    wake()
  } else if (m.type === 'clear') {
    photo.trees = []
    const pixels = new Uint8ClampedArray(photo.width * photo.height * 4)
    self.postMessage({ id: m.id, width: photo.width, height: photo.height, pixels: pixels.buffer } satisfies Frame, {
      transfer: [pixels.buffer],
    })
  }
}
