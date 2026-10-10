import { STRIDE, type CircuitDrawing } from './filaments.ts'
import { circuitPaths, type Segment } from './circuit-paths.ts'

// Two high-DPI layers, both clipped to conductive image space: scorch is painted onto the photo,
// light is added on top of it (screen-blended). Live current is re-jagged every frame and is
// either on or off; there is no easing and no CSS blur spilling across objects.
export class CircuitRenderer {
  private readonly scorch: CanvasRenderingContext2D
  private readonly light: CanvasRenderingContext2D
  private readonly mask = document.createElement('canvas')
  private readonly maskCtx = this.mask.getContext('2d')!
  private maskImage: ImageData | null = null
  private version = -1
  private segments: Segment[] = []

  constructor(scorch: HTMLCanvasElement, light: HTMLCanvasElement) {
    this.scorch = scorch.getContext('2d')!; this.light = light.getContext('2d')!
  }

  resize(width: number, height: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    for (const { canvas } of [this.scorch, this.light]) {
      canvas.width = Math.ceil(width * dpr); canvas.height = Math.ceil(height * dpr)
    }
    this.version = -1
  }

  draw(width: number, height: number, drawing: CircuitDrawing) {
    for (const ctx of [this.scorch, this.light]) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      ctx.setTransform(ctx.canvas.width / width, 0, 0, ctx.canvas.height / height, 0, 0)
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    }
    if (drawing.version !== this.version) {
      this.segments = circuitPaths(drawing.nodes, drawing.edges).segments
      this.version = drawing.version
    }
    const n = drawing.nodes, seed = Math.random() * 1e6
    // Shared chain midpoints get the same offset, so a jagged wire never breaks apart.
    const jag = (x: number, y: number, amount: number) => {
      const r = Math.sin(x * 127.1 + y * 311.7 + seed) * 43758.5453
      return (r - Math.floor(r) - 0.5) * amount
    }
    const bucket = (map: Map<string, Path2D>, key: string) => {
      let path = map.get(key)
      if (!path) { path = new Path2D(); map.set(key, path) }
      return path
    }
    const scars = new Map<string, Path2D>(), embers = new Map<string, Path2D>(), live = new Map<string, Path2D>()
    let flash = 0
    for (const s of this.segments) {
      const o = s.node * STRIDE, current = n[o + 2], leader = n[o + 3], burn = n[o + 5], heat = n[o + 6]
      // Nearer wires read thicker, as they would through a lens.
      const size = Math.min(3, Math.floor(n[o + 4] * (1.3 + n[o + 7] * 1.4)))
      if (burn > 0) {
        const path = bucket(scars, `${Math.min(3, Math.floor(burn * 4))}:${size}`)
        path.moveTo(s.ax, s.ay); path.quadraticCurveTo(s.cx, s.cy, s.bx, s.by)
      }
      if (heat > 0.04) {
        const path = bucket(embers, `${Math.min(4, Math.floor(heat * 5))}:${size}`)
        path.moveTo(s.ax, s.ay); path.quadraticCurveTo(s.cx, s.cy, s.bx, s.by)
      }
      const level = Math.max(current, leader)
      if (level < 0.02) continue
      flash = Math.max(flash, current)
      const flicker = level * (0.65 + Math.random() * 0.35)
      const path = bucket(live, `${Math.min(7, Math.floor(flicker * 8))}:${size}`)
      path.moveTo(s.ax + jag(s.ax, s.ay, 0.7), s.ay + jag(s.ay, s.ax, 0.7))
      path.lineTo(s.cx + jag(s.cx, s.cy, 1.4), s.cy + jag(s.cy, s.cx, 1.4))
      path.lineTo(s.bx + jag(s.bx, s.by, 0.7), s.by + jag(s.by, s.bx, 0.7))
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const stroke = (ctx: CanvasRenderingContext2D, path: Path2D, width: number, color: string, blur = 0, glow = '') => {
      ctx.lineWidth = width; ctx.strokeStyle = color
      ctx.shadowBlur = blur * dpr; ctx.shadowColor = glow || 'transparent'
      ctx.stroke(path)
    }
    const key = (k: string) => k.split(':').map(Number)

    const { scorch, light } = this
    for (const [k, path] of scars) {
      const [b, size] = key(k), burn = (b + 1) / 4, w = 0.32 + size * 0.3
      stroke(scorch, path, w * 2.2 + 0.8, `rgba(38,20,8,${0.12 + burn * 0.3})`)
      stroke(scorch, path, w * 0.9, `rgba(10,5,2,${0.3 + burn * 0.55})`)
    }

    light.globalCompositeOperation = 'lighter'
    for (const [k, path] of embers) {
      const [h, size] = key(k), heat = (h + 1) / 5, w = 0.32 + size * 0.3
      stroke(light, path, w * 1.1, `rgba(255,${60 + heat * 170},${15 + heat * 120},${0.2 + heat * 0.7})`, 3, `rgba(255,80,10,${heat * 0.8})`)
    }
    // A full return stroke lights the surface it is crawling over, not just the wire.
    if (flash > 0.5) {
      light.shadowBlur = 0; light.fillStyle = `rgba(150,160,255,${(flash - 0.5) * 0.5})`
      light.fillRect(0, 0, width, height)
    }
    for (const [k, path] of live) {
      const [l, size] = key(k), level = (l + 1) / 8, w = 0.32 + size * 0.3
      stroke(light, path, w + 2 + level * 3, `rgba(105,90,255,${0.1 + level * 0.25})`, 6 + level * 16, `rgba(125,105,255,${level})`)
      stroke(light, path, w + 0.6 + level, `rgba(170,185,255,${0.3 + level * 0.5})`)
      stroke(light, path, w * (0.45 + level * 0.8), `rgba(255,255,255,${Math.min(1, 0.35 + level)})`)
    }

    const probe = drawing.probe
    if (probe) {
      // Corona: the gathered charge crackles out along the contours it is about to follow.
      const arcs = probe.held ? 2 + Math.floor(probe.level * 7) : Math.random() < 0.4 ? 1 : 0
      const reach = probe.held ? 1.5 + probe.level * 7 : 1.2, path = new Path2D()
      for (let a = 0; a < arcs; a++) {
        const g = probe.guides.length ? Math.floor(Math.random() * probe.guides.length / 4) * 4 : -1
        let angle = g >= 0 ? Math.atan2(probe.guides[g + 3], probe.guides[g + 2]) + (Math.random() < 0.5 ? Math.PI : 0) : Math.random() * Math.PI * 2
        let x = probe.x, y = probe.y
        path.moveTo(x, y)
        for (let k = 0, steps = 3 + Math.floor(Math.random() * 3); k < steps; k++) {
          angle += (Math.random() - 0.5) * 1.6
          const length = reach / steps * (0.5 + Math.random())
          x += Math.cos(angle) * length; y += Math.sin(angle) * length; path.lineTo(x, y)
        }
      }
      const level = probe.held ? 0.4 + probe.level * 0.6 : 0.25
      stroke(light, path, 1.2 + level * 1.5, `rgba(115,100,255,${level * 0.4})`, 4 + level * 8, `rgba(130,110,255,${level})`)
      stroke(light, path, 0.25 + level * 0.3, `rgba(255,255,255,${level})`)
      if (probe.held) {
        light.shadowBlur = 0; light.fillStyle = `rgba(255,255,255,${0.6 + probe.level * 0.4})`
        light.beginPath(); light.arc(probe.x, probe.y, 0.35 + probe.level * 0.6 * Math.random(), 0, Math.PI * 2); light.fill()
      }
    }
    light.shadowBlur = 0; light.globalCompositeOperation = 'source-over'

    if (this.mask.width !== width || this.mask.height !== height) {
      this.mask.width = width; this.mask.height = height
      this.maskImage = this.maskCtx.createImageData(width, height); this.maskImage.data.fill(255)
    }
    for (let i = 0; i < drawing.mask.length; i++) this.maskImage!.data[i * 4 + 3] = drawing.mask[i]
    this.maskCtx.putImageData(this.maskImage!, 0, 0)
    for (const ctx of [scorch, light]) {
      ctx.globalCompositeOperation = 'destination-in'; ctx.imageSmoothingEnabled = false
      ctx.drawImage(this.mask, 0, 0, width, height)
      ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = true
    }
  }
}
