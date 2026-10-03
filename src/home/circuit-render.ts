import type { CircuitDrawing } from './filaments.ts'
import { circuitPaths, type Segment } from './circuit-paths.ts'

// High-DPI vector rendering; every pass, including illumination, is clipped to conductive
// image space. No CSS blur spilling across objects, no low-resolution pixel worms.
export class CircuitRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly mask = document.createElement('canvas')
  private readonly maskCtx = this.mask.getContext('2d')!
  private maskImage: ImageData | null = null
  private version = -1
  private segments: Segment[] = []

  constructor(canvas: HTMLCanvasElement) { this.canvas = canvas; this.ctx = canvas.getContext('2d')! }

  resize(width: number, height: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.canvas.width = Math.ceil(width * dpr); this.canvas.height = Math.ceil(height * dpr)
    this.version = -1
  }

  draw(width: number, height: number, drawing: CircuitDrawing) {
    const { ctx, canvas } = this
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    if (drawing.version !== this.version) {
      this.segments = circuitPaths(drawing.nodes, drawing.edges).segments
      this.version = drawing.version
    }
    const buckets = new Map<string, { path: Path2D; heat: number; width: number; warm: boolean; power: number }>()
    for (const segment of this.segments) {
      const offset = segment.node * 7, voltage = drawing.nodes[offset + 2]
      const heat = Math.max(drawing.nodes[offset + 3], drawing.nodes[offset + 6]) * voltage
      const level = Math.min(5, Math.floor(heat * 5.99)), size = Math.min(2, Math.floor(drawing.nodes[offset + 4] * 2))
      const warm = level > 2 && drawing.nodes[offset + 5] > 0.25, power = Math.min(5, Math.ceil(voltage * 5)) / 5
      const key = `${level}:${size}:${warm}:${power}`
      let bucket = buckets.get(key)
      if (!bucket) { bucket = { path: new Path2D(), heat: level / 5, width: 0.32 + size * 0.3, warm, power }; buckets.set(key, bucket) }
      bucket.path.moveTo(segment.ax, segment.ay)
      bucket.path.quadraticCurveTo(segment.cx, segment.cy, segment.bx, segment.by)
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    // Each branch loses its own voltage. Never fade the canvas as one flat layer.
    for (const { path, width: stroke, heat, power } of buckets.values()) {
      if (!power) continue
      ctx.lineWidth = stroke + 0.3; ctx.strokeStyle = `rgba(16,39,59,${power * 0.2})`; ctx.stroke(path)
      if (heat > 0.1) {
        ctx.lineWidth = stroke + 0.65; ctx.strokeStyle = `rgba(79,175,255,${heat * power * 0.22})`
        ctx.shadowBlur = 5 * dpr; ctx.shadowColor = `rgba(78,171,255,${heat * power * 0.65})`; ctx.stroke(path)
        ctx.shadowBlur = 0
      }
    }
    for (const { path, width: stroke, heat, warm, power } of buckets.values()) {
      if (!power) continue
      ctx.lineWidth = stroke * (0.5 + heat * 0.25)
      ctx.strokeStyle = warm ? `rgba(255,223,157,${(0.25 + heat * 0.7) * power})` : `rgba(222,244,255,${(0.12 + heat * 0.82) * power})`
      ctx.stroke(path)
    }
    const probe = drawing.probe
    if (probe) {
      const radius = probe.held ? 3 + probe.level * 6 : 2
      const glow = ctx.createRadialGradient(probe.x, probe.y, 0, probe.x, probe.y, radius)
      glow.addColorStop(0, `rgba(167,221,255,${probe.held ? 0.25 + probe.level * 0.25 : 0.12})`)
      glow.addColorStop(1, 'rgba(64,155,255,0)')
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(probe.x, probe.y, radius, 0, Math.PI * 2); ctx.fill()
      const time = performance.now() / 1000
      for (let i = 0; i < probe.guides.length; i += 4) {
        const [x, y, dx, dy] = probe.guides.slice(i, i + 4)
        const glimmer = 0.12 + probe.level * (0.12 + Math.sin(time * 3 + i) ** 2 * 0.22)
        ctx.strokeStyle = `rgba(166,221,255,${glimmer})`; ctx.lineWidth = 0.2
        ctx.beginPath(); ctx.moveTo(x - dx * 1.4, y - dy * 1.4); ctx.lineTo(x + dx * 1.4, y + dy * 1.4); ctx.stroke()
      }
      if (probe.held) {
        ctx.fillStyle = `rgba(242,250,255,${0.5 + probe.level * 0.4})`
        ctx.beginPath(); ctx.arc(probe.x, probe.y, 0.3 + probe.level * 0.5, 0, Math.PI * 2); ctx.fill()
      }
    }
    if (this.mask.width !== width || this.mask.height !== height) {
      this.mask.width = width; this.mask.height = height
      this.maskImage = this.maskCtx.createImageData(width, height); this.maskImage.data.fill(255)
    }
    for (let i = 0; i < drawing.mask.length; i++) this.maskImage!.data[i * 4 + 3] = drawing.mask[i]
    this.maskCtx.putImageData(this.maskImage!, 0, 0)
    ctx.globalCompositeOperation = 'destination-in'; ctx.imageSmoothingEnabled = false
    ctx.drawImage(this.mask, 0, 0, width, height)
    ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = true
  }
}
