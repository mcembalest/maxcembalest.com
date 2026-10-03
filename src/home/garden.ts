// Hold to gather charge; release to strike. Fast uncaptured swipes sever real connections.
import type { Frame, Message } from './garden.worker.ts'
import { imagePlacement } from './photo-sampling.ts'
import { CircuitRenderer } from './circuit-render.ts'

const CELL = 2 // substrate resolution; rendering is independently smooth/high-DPI
const SWIPE = 1.2
const CUT_RADIUS = 7
const SHUTDOWN_DELAY_MS = 1800

export function plantGardens(photos: HTMLElement[]) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const worker = new Worker(new URL('./garden.worker.ts', import.meta.url), { type: 'module' })
  const send = (m: Message) => worker.postMessage(m, m.type === 'init' ? [m.pixels] : [])
  const renderers = new Map<number, CircuitRenderer>()
  const revisions = new Map<number, number>()
  worker.onmessage = (e: MessageEvent<Frame>) => {
    const { id, revision, width, height, version, nodes, edges, mask, probe } = e.data
    if (revisions.get(id) === revision) renderers.get(id)?.draw(width, height, {
      version, nodes: new Float32Array(nodes), edges: new Uint32Array(edges), mask: new Uint8Array(mask), probe,
    })
  }

  photos.forEach((photo, id) => {
    const img = photo.querySelector('img')
    if (!img) return
    img.draggable = false
    const canvas = document.createElement('canvas')
    canvas.className = 'garden'; canvas.setAttribute('aria-hidden', 'true'); photo.append(canvas)
    const renderer = new CircuitRenderer(canvas)
    renderers.set(id, renderer)
    const sample = document.createElement('canvas'), sampleCtx = sample.getContext('2d', { willReadFrequently: true })!
    let width = 0, height = 0, source = '', ready = false, revision = 0
    let last: { x: number; y: number; t: number } | null = null
    let holding: { pointer: number; since: number } | null = null
    let lastAim = -Infinity, shutdownTimer = 0, outside = false

    const size = () => {
      if (!img.complete || !img.naturalWidth || !photo.clientWidth || !photo.clientHeight) return
      const w = Math.ceil(photo.clientWidth / CELL), h = Math.ceil(photo.clientHeight / CELL)
      const rect = photo.getBoundingClientRect(), imageRect = img.getBoundingClientRect(), style = getComputedStyle(img)
      const signature = [img.currentSrc, rect.width, rect.height, imageRect.width, imageRect.height,
        imageRect.left - rect.left, imageRect.top - rect.top, style.objectFit, style.objectPosition, devicePixelRatio].join('|')
      if (w === width && h === height && source === signature) return
      ready = false; last = null; holding = null
      width = sample.width = w; height = sample.height = h; source = signature
      renderer.resize(rect.width, rect.height)
      revisions.set(id, ++revision)
      const placement = imagePlacement(img.naturalWidth, img.naturalHeight, imageRect.width, imageRect.height, style.objectFit, style.objectPosition)
      sampleCtx.save(); sampleCtx.scale(width / rect.width, height / rect.height)
      sampleCtx.beginPath(); sampleCtx.rect(imageRect.left - rect.left, imageRect.top - rect.top, imageRect.width, imageRect.height); sampleCtx.clip()
      sampleCtx.drawImage(img, imageRect.left - rect.left + placement.x, imageRect.top - rect.top + placement.y, placement.width, placement.height)
      sampleCtx.restore()
      try {
        const pixels = sampleCtx.getImageData(0, 0, width, height).data
        send({ type: 'init', id, width, height, revision, pixels: pixels.buffer as ArrayBuffer }); ready = true
      } catch { send({ type: 'clear', id }) } // never substitute a blind animation for an unreadable photo
    }
    img.addEventListener('load', size); size()
    const observer = new ResizeObserver(size); observer.observe(photo); observer.observe(img)

    const cellAt = (x: number, y: number) => ({ x: x * width / photo.clientWidth, y: y * height / photo.clientHeight })
    const point = (e: PointerEvent) => {
      const rect = photo.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: e.timeStamp }
    }
    const enter = () => {
      clearTimeout(shutdownTimer)
      if (outside) { send({ type: 'resume', id }); outside = false }
    }
    const cancel = () => {
      if (!holding) return
      const pointer = holding.pointer; holding = null
      send({ type: 'cancel', id })
      if (photo.hasPointerCapture(pointer)) photo.releasePointerCapture(pointer)
    }
    photo.addEventListener('pointermove', e => {
      if (!ready) return
      enter()
      const now = point(e)
      if (last && !holding && e.pointerType !== 'touch') {
        const distance = Math.hypot(now.x - last.x, now.y - last.y)
        if (distance / Math.max(1, now.t - last.t) > SWIPE) {
          const n = Math.max(1, Math.ceil(distance / (CELL * 3)))
          for (let k = 0; k <= n; k++) send({ type: 'cut', id, r: CUT_RADIUS,
            ...cellAt(last.x + (now.x - last.x) * k / n, last.y + (now.y - last.y) * k / n) })
        }
      }
      if (now.t - lastAim > 45) {
        send({ type: 'aim', id, ...cellAt(now.x, now.y), held: Boolean(holding) }); lastAim = now.t
      }
      last = now
    })
    photo.addEventListener('pointerdown', e => {
      if (!ready || e.button !== 0) return
      enter(); holding = { pointer: e.pointerId, since: e.timeStamp }; last = point(e)
      photo.setPointerCapture(e.pointerId)
      send({ type: 'aim', id, ...cellAt(last.x, last.y), held: true })
    })
    photo.addEventListener('pointerup', e => {
      if (!holding || holding.pointer !== e.pointerId) return
      const strength = Math.min(1, 0.25 + (e.timeStamp - holding.since) / 950)
      holding = null; const p = point(e)
      send({ type: 'fire', id, ...cellAt(p.x, p.y), strength })
      if (photo.hasPointerCapture(e.pointerId)) photo.releasePointerCapture(e.pointerId)
      last = p
    })
    photo.addEventListener('pointercancel', cancel)
    photo.addEventListener('lostpointercapture', cancel)
    photo.addEventListener('contextmenu', e => { if (holding) e.preventDefault() })
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cancel() })
    photo.addEventListener('pointerleave', () => {
      if (holding) return
      last = null; outside = true; send({ type: 'cancel', id })
      shutdownTimer = window.setTimeout(() => send({ type: 'retire', id }), SHUTDOWN_DELAY_MS)
    })
  })
}
