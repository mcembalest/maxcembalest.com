// Hovering a photo grows trees: moving slowly plants a seed at the pointer, which grows upward
// into a tree; swiping fast cuts through them, and they heal. The forest fades when you leave.
import type { Frame, Message } from './garden.worker.ts'

const CELL = 4 // CSS pixels per automaton cell
const SWIPE = 1.2 // pointer speed (CSS px per ms) above which a move cuts instead of plants
const CUT_RADIUS = 5 // cells
const FADE_DELAY_MS = 1200
const FADE_MS = 1500

export function plantGardens(photos: HTMLElement[]) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const worker = new Worker(new URL('./garden.worker.ts', import.meta.url), { type: 'module' })
  const send = (m: Message) => worker.postMessage(m)
  const canvases = new Map<number, CanvasRenderingContext2D>()

  worker.onmessage = (e: MessageEvent<Frame>) => {
    const { id, width, height, pixels } = e.data
    const ctx = canvases.get(id)
    if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0)
  }

  photos.forEach((photo, id) => {
    const canvas = document.createElement('canvas')
    canvas.className = 'garden'
    canvas.setAttribute('aria-hidden', 'true')
    photo.append(canvas)
    const ctx = canvas.getContext('2d')!
    canvases.set(id, ctx)

    let width = 0
    let height = 0
    const size = () => {
      const w = Math.ceil(photo.clientWidth / CELL)
      const h = Math.ceil(photo.clientHeight / CELL)
      if (w === width && h === height) return
      width = canvas.width = w
      height = canvas.height = h
      send({ type: 'init', id, width, height })
    }
    size()
    new ResizeObserver(size).observe(photo)

    let last: { x: number; y: number; t: number } | null = null
    let fadeTimer = 0
    let clearTimer = 0
    const cellAt = (x: number, y: number) => ({ x: Math.floor(x / CELL), y: Math.floor(y / CELL) })

    const enter = () => {
      clearTimeout(fadeTimer)
      clearTimeout(clearTimer)
      canvas.style.opacity = '1'
    }

    photo.addEventListener('pointermove', (e) => {
      enter()
      const rect = photo.getBoundingClientRect()
      const now = { x: e.clientX - rect.left, y: e.clientY - rect.top, t: e.timeStamp }
      if (last) {
        const distance = Math.hypot(now.x - last.x, now.y - last.y)
        const speed = distance / Math.max(1, now.t - last.t)
        if (speed > SWIPE) {
          // Cut along the whole segment so fast swipes leave a continuous gap.
          const n = Math.ceil(distance / (CELL * 2))
          for (let k = 0; k <= n; k++) {
            const p = cellAt(last.x + ((now.x - last.x) * k) / n, last.y + ((now.y - last.y) * k) / n)
            send({ type: 'cut', id, x: p.x, y: p.y, r: CUT_RADIUS })
          }
        } else {
          send({ type: 'touch', id, ...cellAt(now.x, now.y) })
        }
      }
      last = now
    })

    photo.addEventListener('pointerdown', (e) => {
      enter()
      const rect = photo.getBoundingClientRect()
      send({ type: 'touch', id, ...cellAt(e.clientX - rect.left, e.clientY - rect.top) })
    })

    photo.addEventListener('pointerleave', () => {
      last = null
      fadeTimer = window.setTimeout(() => {
        canvas.style.opacity = '0'
        clearTimer = window.setTimeout(() => send({ type: 'clear', id }), FADE_MS)
      }, FADE_DELAY_MS)
    })
  })
}
