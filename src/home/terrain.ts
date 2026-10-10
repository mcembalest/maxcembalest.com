// The photograph is the substrate, not a backdrop. Color discontinuities govern exchange
// between cells; a local structure tensor supplies contour tangents. An optional offline scene
// map (tools/garden/materials.py) adds what pixels alone cannot: material conductance, depth
// and ground. Without one, every cell is the same middling material at the same depth.
export interface Point { x: number; y: number }
export const DIRECTIONS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]] as const
export const CONDUCTOR = 0.7
export const ARC_REACH = 18
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export class Terrain {
  readonly width: number
  readonly height: number
  readonly tangentX: Float32Array
  readonly tangentY: Float32Array
  readonly guidance: Float32Array
  readonly light: Float32Array
  readonly conduct: Float32Array
  readonly near: Float32Array
  readonly ground: Float32Array
  // Nearest strong conductor within ARC_REACH, for leaders searching over insulators.
  readonly lure: Int32Array
  readonly scene: boolean
  private readonly color: Float32Array
  private readonly present: Uint8Array

  constructor(width: number, height: number, pixels: Uint8ClampedArray, scene?: Uint8ClampedArray) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
      || pixels.length !== width * height * 4 || (scene && scene.length !== pixels.length)) throw new Error('Invalid photo substrate')
    this.width = width
    this.height = height
    const count = width * height
    this.color = new Float32Array(count * 3)
    this.present = new Uint8Array(count)
    this.tangentX = new Float32Array(count)
    this.tangentY = new Float32Array(count)
    this.guidance = new Float32Array(count)
    this.light = new Float32Array(count)
    this.scene = Boolean(scene)
    this.conduct = new Float32Array(count).fill(0.5)
    this.near = new Float32Array(count).fill(0.5)
    this.ground = new Float32Array(count)
    this.lure = new Int32Array(count).fill(-1)
    if (scene) for (let i = 0; i < count; i++) {
      this.conduct[i] = scene[i * 4] / 255; this.near[i] = scene[i * 4 + 1] / 255; this.ground[i] = scene[i * 4 + 2] / 255
    }
    // Small blur removes compression noise; RGB gradients retain boundaries that luminance
    // alone misses (e.g. equally bright blue fabric and warm brick).
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x
      this.present[i] = pixels[i * 4 + 3] > 0 ? 1 : 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const j = (clamp(y + dy, 0, height - 1) * width + clamp(x + dx, 0, width - 1)) * 4
        const weight = (dx === 0 ? 2 : 1) * (dy === 0 ? 2 : 1) / 16
        for (let c = 0; c < 3; c++) this.color[i * 3 + c] += pixels[j + c] / 255 * weight
      }
      this.light[i] = this.color[i * 3] * 0.2126 + this.color[i * 3 + 1] * 0.7152 + this.color[i * 3 + 2] * 0.0722
    }
    const tensor = new Float32Array(count * 3)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x
      for (let c = 0; c < 3; c++) {
        const gx = (this.color[(y * width + Math.min(width - 1, x + 1)) * 3 + c]
          - this.color[(y * width + Math.max(0, x - 1)) * 3 + c]) / 2
        const gy = (this.color[(Math.min(height - 1, y + 1) * width + x) * 3 + c]
          - this.color[(Math.max(0, y - 1) * width + x) * 3 + c]) / 2
        tensor[i * 3] += gx * gx / 3
        tensor[i * 3 + 1] += gx * gy / 3
        tensor[i * 3 + 2] += gy * gy / 3
      }
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let a = 0, b = 0, c = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const j = (clamp(y + dy, 0, height - 1) * width + clamp(x + dx, 0, width - 1)) * 3
        a += tensor[j] / 9; b += tensor[j + 1] / 9; c += tensor[j + 2] / 9
      }
      const i = y * width + x
      const anisotropy = Math.hypot(a - c, 2 * b)
      const angle = 0.5 * Math.atan2(2 * b, a - c)
      this.tangentX[i] = -Math.sin(angle)
      this.tangentY[i] = Math.cos(angle)
      this.guidance[i] = anisotropy / (a + c + 1e-6) * Math.min(1, Math.sqrt(a + c) * 10)
    }
    if (scene) {
      // Multi-source BFS from every strong conductor: each cell learns its nearest one.
      const distance = new Int32Array(count).fill(-1), queue: number[] = []
      for (let i = 0; i < count; i++) if (this.present[i] && this.conduct[i] >= CONDUCTOR) { distance[i] = 0; this.lure[i] = i; queue.push(i) }
      for (let k = 0; k < queue.length; k++) {
        const a = queue[k], x = a % width, y = Math.floor(a / width)
        if (distance[a] >= ARC_REACH) continue
        for (const [dx, dy] of DIRECTIONS) {
          const b = this.cell(x + dx, y + dy)
          if (b < 0 || distance[b] >= 0 || !this.present[b]) continue
          distance[b] = distance[a] + 1; this.lure[b] = this.lure[a]; queue.push(b)
        }
      }
    }
  }

  // Extra travel cost through a material: 1 for the default, cheap through metal, dear through cloth.
  resistance(cell: number) { return this.scene ? 0.575 / (0.15 + 0.85 * this.conduct[cell]) : 1 }

  cell(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height ? y * this.width + x : -1
  }

  private difference(a: number, b: number) {
    let sum = 0
    for (let c = 0; c < 3; c++) sum += (this.color[a * 3 + c] - this.color[b * 3 + c]) ** 2
    return Math.sqrt(sum / 3)
  }

  // Positive conductivity along a surface; zero across a strong boundary or transparency.
  // Both local contrast and cumulative drift matter: a blurred edge is not a free bridge.
  conductivity(a: number, b: number, root: number) {
    if (a < 0 || b < 0 || root < 0 || !this.present[a] || !this.present[b] || !this.present[root]) return 0
    const contrast = this.difference(a, b), drift = this.difference(root, b)
    if (contrast > 0.16 || drift > 0.3) return 0
    let value = Math.exp(-65 * contrast ** 2 - 9 * Math.max(0, drift - 0.08) ** 2)
    if (this.scene) {
      // A same-colored object in front of another is still a different object, and current
      // flows readily into a better conductor but will not crawl out of one onto cloth.
      const depth = Math.abs(this.near[a] - this.near[b])
      if (depth > 0.05 || this.conduct[b] < this.conduct[a] - 0.3) return 0
      value *= Math.exp(-400 * depth ** 2)
    }
    return value
  }

  // Validate diagonal steps on both sides of the corner, not only their endpoints.
  connection(a: number, b: number, root: number) {
    let value = this.conductivity(a, b, root)
    if (!value) return 0
    const ax = a % this.width, ay = Math.floor(a / this.width)
    const bx = b % this.width, by = Math.floor(b / this.width)
    if (Math.abs(ax - bx) > 1 || Math.abs(ay - by) > 1) return 0
    if (ax !== bx && ay !== by) {
      const across = this.cell(bx, ay), down = this.cell(ax, by)
      value = Math.min(value, this.conductivity(a, across, root), this.conductivity(across, b, root),
        this.conductivity(a, down, root), this.conductivity(down, b, root))
    }
    return value
  }

  settle(x: number, y: number): number {
    x = clamp(Math.round(x), 0, this.width - 1)
    y = clamp(Math.round(y), 0, this.height - 1)
    const root = this.cell(x, y)
    if (!this.present[root]) return -1
    // A tiny connected search attracts seeds to stable pixels beside contours. Never snap
    // through the boundary to the other object, or use photo-specific support coordinates.
    const queue = [root], seen = new Set(queue)
    let best = root, score = this.guidance[root]
    for (let k = 0; k < queue.length; k++) {
      const a = queue[k], ax = a % this.width, ay = Math.floor(a / this.width)
      const distance = Math.hypot(ax - x, ay - y)
      const value = this.guidance[a] - distance * 0.12 - this.difference(root, a) * 2
      if (value > score) { score = value; best = a }
      for (const [dx, dy] of DIRECTIONS) {
        const b = this.cell(ax + dx, ay + dy)
        if (b < 0 || seen.has(b) || Math.hypot(ax + dx - x, ay + dy - y) > 4 || this.connection(a, b, root) < 0.65) continue
        seen.add(b); queue.push(b)
      }
    }
    return best
  }
}
