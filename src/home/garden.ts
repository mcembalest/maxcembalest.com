// Slow movements seed branching filaments; fast swipes prune them. The photograph itself
// governs each growth step. Sampling happens on load/resize, all growth stays in the worker.
import type { Frame, Message } from './garden.worker.ts'
import { imagePlacement } from './photo-sampling.ts'

const CELL = 2 // fine image-space filaments, not large tree-shaped pixels
const SWIPE = 1.2 // pointer speed (CSS px per ms) above which a move cuts instead of plants
const CUT_RADIUS = 10 // cells (20 CSS px)
const FADE_DELAY_MS = 1200
const FADE_MS = 1500
const PLANT_INTERVAL_MS = 90 // don't queue a terrain search for every high-frequency pointer event

export function plantGardens(photos: HTMLElement[]) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const worker = new Worker(new URL('./garden.worker.ts', import.meta.url), { type: 'module' })
  const send = (m: Message) => worker.postMessage(m, m.type === 'init' ? [m.pixels] : [])
  const canvases = new Map<number, CanvasRenderingContext2D>()
  const revisions = new Map<number, number>()

  worker.onmessage = (e: MessageEvent<Frame>) => {
    const { id, revision, width, height, pixels } = e.data
    const ctx = canvases.get(id)
    if (ctx && revisions.get(id) === revision) ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0)
  }

  photos.forEach((photo, id) => {
    const canvas = document.createElement('canvas')
    canvas.className = 'garden'
    canvas.setAttribute('aria-hidden', 'true')
    photo.append(canvas)
    const ctx = canvas.getContext('2d')!
    canvases.set(id, ctx)

    const img = photo.querySelector('img')
    if (!img) return
    const sample = document.createElement('canvas')
    const sampleCtx = sample.getContext('2d', { willReadFrequently: true })!
    let width = 0
    let height = 0
    let source = ''
    let ready = false
    let revision = 0
    let last: { x: number; y: number; t: number } | null = null
    const size = () => {
      if (!img.complete || !img.naturalWidth || !photo.clientWidth || !photo.clientHeight) return
      const w = Math.ceil(photo.clientWidth / CELL)
      const h = Math.ceil(photo.clientHeight / CELL)
      const rect = photo.getBoundingClientRect()
      const imageRect = img.getBoundingClientRect()
      const style = getComputedStyle(img)
      const signature = [img.currentSrc, rect.width, rect.height, imageRect.width, imageRect.height,
        imageRect.left - rect.left, imageRect.top - rect.top, style.objectFit, style.objectPosition].join('|')
      if (w === width && h === height && source === signature) return
      ready = false
      last = null
      width = canvas.width = sample.width = w
      height = canvas.height = sample.height = h
      source = signature
      revision++
      revisions.set(id, revision)
      const placement = imagePlacement(img.naturalWidth, img.naturalHeight, imageRect.width, imageRect.height,
        style.objectFit, style.objectPosition)
      sampleCtx.save()
      sampleCtx.scale(width / rect.width, height / rect.height)
      sampleCtx.beginPath()
      sampleCtx.rect(imageRect.left - rect.left, imageRect.top - rect.top, imageRect.width, imageRect.height)
      sampleCtx.clip()
      sampleCtx.drawImage(img, imageRect.left - rect.left + placement.x, imageRect.top - rect.top + placement.y,
        placement.width, placement.height)
      sampleCtx.restore()
      try {
        const pixels = sampleCtx.getImageData(0, 0, width, height).data
        send({ type: 'init', id, width, height, revision, pixels: pixels.buffer as ArrayBuffer })
        ready = true
      } catch {
        // A cross-origin image without CORS must not fall back to content-blind growth.
        send({ type: 'clear', id })
      }
    }
    img.addEventListener('load', size)
    size()
    const observer = new ResizeObserver(size)
    observer.observe(photo)
    observer.observe(img)

    let lastPlant = -Infinity
    let fadeTimer = 0
    let clearTimer = 0
    const cellAt = (x: number, y: number) => ({
      x: Math.floor(x * width / photo.clientWidth), y: Math.floor(y * height / photo.clientHeight),
    })

    const enter = () => {
      clearTimeout(fadeTimer)
      clearTimeout(clearTimer)
      canvas.style.opacity = '1'
    }

    photo.addEventListener('pointermove', (e) => {
      if (!ready) return
      enter()
      const rect = photo.getBoundingClientRect()
      const now = { x: e.clientX - rect.left, y: e.clientY - rect.top, t: e.timeStamp }
      if (last) {
        const distance = Math.hypot(now.x - last.x, now.y - last.y)
        const speed = distance / Math.max(1, now.t - last.t)
        if (speed > SWIPE) {
          // Cut along the whole segment so fast swipes leave a continuous gap.
          const n = Math.max(1, Math.ceil(distance / (CELL * 2)))
          for (let k = 0; k <= n; k++) {
            const p = cellAt(last.x + ((now.x - last.x) * k) / n, last.y + ((now.y - last.y) * k) / n)
            send({ type: 'cut', id, x: p.x, y: p.y, r: CUT_RADIUS })
          }
        } else if (now.t - lastPlant >= PLANT_INTERVAL_MS) {
          send({ type: 'touch', id, ...cellAt(now.x, now.y) })
          lastPlant = now.t
        }
      }
      last = now
    })

    photo.addEventListener('pointerdown', (e) => {
      if (!ready) return
      enter()
      const rect = photo.getBoundingClientRect()
      send({ type: 'touch', id, ...cellAt(e.clientX - rect.left, e.clientY - rect.top) })
      lastPlant = e.timeStamp
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
