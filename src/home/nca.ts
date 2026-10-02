// A neural cellular automaton (Mordvintsev et al., "Growing Neural Cellular Automata", 2020)
// trained to grow a small fractal tree from a single seed cell, and to regrow parts that are cut
// away. Each cell holds CH numbers: premultiplied RGBA plus hidden channels. Every step, each cell
// that fires (half of them, at random) perceives its 3×3 neighborhood through fixed identity and
// Sobel filters and adds the output of a small learned network to its state. Cells with no living
// neighbor (alpha ≤ 0.1 in their 3×3 neighborhood) are empty.
//
// The math here mirrors the training code in tools/tree-nca/train.py exactly; nca.test.ts checks
// it against states recorded from the PyTorch model.

export interface Weights {
  ch: number
  hid: number
  w1: number[] // hid × (3·ch), row-major; inputs ordered [identity, sobel x, sobel y] per channel
  b1: number[] // hid
  w2: number[] // ch × hid, row-major
}

const FIRE_RATE = 0.5
const ALIVE = 0.1

export class Garden {
  readonly width: number
  readonly height: number
  private readonly ch: number
  private readonly hid: number
  private readonly w1: Float32Array
  private readonly b1: Float32Array
  private readonly w2: Float32Array
  private state: Float32Array
  private next: Float32Array
  private readonly preAlive: Uint8Array
  private readonly percept: Float32Array
  private readonly hidden: Float32Array
  private readonly neighbors = new Int32Array(8)
  private readonly random: () => number
  // Bounding box of cells that might be alive, so steps skip the empty rest of the grid.
  private box = { x0: 0, y0: 0, x1: -1, y1: -1 }

  constructor(weights: Weights, width: number, height: number, random = Math.random) {
    this.width = width
    this.height = height
    this.ch = weights.ch
    this.hid = weights.hid
    this.w1 = Float32Array.from(weights.w1)
    this.b1 = Float32Array.from(weights.b1)
    this.w2 = Float32Array.from(weights.w2)
    this.state = new Float32Array(width * height * this.ch)
    this.next = new Float32Array(width * height * this.ch)
    this.preAlive = new Uint8Array(width * height)
    this.percept = new Float32Array(3 * this.ch)
    this.hidden = new Float32Array(this.hid)
    this.random = random
  }

  get empty() {
    return this.box.x1 < this.box.x0
  }

  clear() {
    this.state.fill(0)
    this.box = { x0: 0, y0: 0, x1: -1, y1: -1 }
  }

  private grow(x: number, y: number, margin: number) {
    const b = this.box
    if (this.empty) Object.assign(b, { x0: x, y0: y, x1: x, y1: y })
    b.x0 = Math.max(0, Math.min(b.x0, x - margin))
    b.y0 = Math.max(0, Math.min(b.y0, y - margin))
    b.x1 = Math.min(this.width - 1, Math.max(b.x1, x + margin))
    b.y1 = Math.min(this.height - 1, Math.max(b.y1, y + margin))
  }

  // A seed is one cell with alpha and every hidden channel set to 1; it grows into a tree above it.
  plant(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const o = (y * this.width + x) * this.ch
    for (let c = 3; c < this.ch; c++) this.state[o + c] = 1
    this.grow(x, y, 1)
  }

  alpha(x: number, y: number) {
    return this.state[(y * this.width + x) * this.ch + 3]
  }

  // Erase a disc of cells; the automaton regrows what it can.
  cut(x: number, y: number, r: number) {
    for (let yy = Math.max(0, Math.floor(y - r)); yy <= Math.min(this.height - 1, Math.ceil(y + r)); yy++)
      for (let xx = Math.max(0, Math.floor(x - r)); xx <= Math.min(this.width - 1, Math.ceil(x + r)); xx++)
        if ((xx - x) ** 2 + (yy - y) ** 2 <= r * r) this.state.fill(0, (yy * this.width + xx) * this.ch, (yy * this.width + xx + 1) * this.ch)
  }

  // One update of every cell. `fire` overrides the random firing mask (used by tests).
  step(fire?: (x: number, y: number) => boolean) {
    if (this.empty) return
    const { width: W, height: H, ch: C, hid: D, state: s, next: n, w1, b1, w2, percept: p, hidden: h, preAlive } = this
    const { x0, y0, x1, y1 } = this.box
    // Every cell with alpha > ALIVE is inside the box, so only cells within 1 of it can be
    // "alive" before the step, and only cells within 2 can affect whether those survive.
    const r1 = { x0: Math.max(0, x0 - 1), y0: Math.max(0, y0 - 1), x1: Math.min(W - 1, x1 + 1), y1: Math.min(H - 1, y1 + 1) }
    const r2 = { x0: Math.max(0, x0 - 2), y0: Math.max(0, y0 - 2), x1: Math.min(W - 1, x1 + 2), y1: Math.min(H - 1, y1 + 2) }
    const aliveAround = (g: Float32Array, x: number, y: number) => {
      for (let yy = Math.max(0, y - 1); yy <= Math.min(H - 1, y + 1); yy++)
        for (let xx = Math.max(0, x - 1); xx <= Math.min(W - 1, x + 1); xx++)
          if (g[(yy * W + xx) * C + 3] > ALIVE) return true
      return false
    }

    preAlive.fill(0)
    for (let y = r1.y0; y <= r1.y1; y++) for (let x = r1.x0; x <= r1.x1; x++) preAlive[y * W + x] = aliveAround(s, x, y) ? 1 : 0

    // Update every cell that could matter, exactly as training does before masking: the
    // pre-alive cells and their neighbors (whose new alpha decides whether pre-alive cells survive).
    n.fill(0)
    const nb = this.neighbors
    for (let y = r2.y0; y <= r2.y1; y++)
      for (let x = r2.x0; x <= r2.x1; x++) {
        let needed = false
        for (let yy = Math.max(r1.y0, y - 1); yy <= Math.min(r1.y1, y + 1) && !needed; yy++)
          for (let xx = Math.max(r1.x0, x - 1); xx <= Math.min(r1.x1, x + 1); xx++)
            if (preAlive[yy * W + xx]) { needed = true; break }
        if (!needed) continue
        const o = (y * W + x) * C
        const fires = fire ? fire(x, y) : this.random() < FIRE_RATE
        if (!fires) {
          for (let c = 0; c < C; c++) n[o + c] = s[o + c]
          continue
        }
        // Offsets of the 8 neighbors (−1 outside the grid, which reads as zero).
        let k = 0
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const yy = y + dy, xx = x + dx
            nb[k++] = yy >= 0 && yy < H && xx >= 0 && xx < W ? (yy * W + xx) * C : -1
          }
        const v = (i: number, c: number) => (nb[i] < 0 ? 0 : s[nb[i] + c])
        for (let c = 0; c < C; c++) {
          const tl = v(0, c), t = v(1, c), tr = v(2, c), l = v(3, c), r = v(4, c), bl = v(5, c), b = v(6, c), br = v(7, c)
          p[3 * c] = s[o + c]
          p[3 * c + 1] = (tr + 2 * r + br - tl - 2 * l - bl) / 8
          p[3 * c + 2] = (bl + 2 * b + br - tl - 2 * t - tr) / 8
        }
        for (let k = 0; k < D; k++) {
          let v = b1[k]
          const row = k * 3 * C
          for (let i = 0; i < 3 * C; i++) v += w1[row + i] * p[i]
          h[k] = v > 0 ? v : 0
        }
        for (let c = 0; c < C; c++) {
          let v = s[o + c]
          const row = c * D
          for (let k = 0; k < D; k++) v += w2[row + k] * h[k]
          n[o + c] = v
        }
      }

    // Keep cells alive before and after; the check after reads the unmasked update.
    let bx0 = W, by0 = H, bx1 = -1, by1 = -1
    const survivors: number[] = []
    for (let y = r1.y0; y <= r1.y1; y++)
      for (let x = r1.x0; x <= r1.x1; x++)
        if (preAlive[y * W + x] && aliveAround(n, x, y)) survivors.push(y * W + x)
    const kept = new Float32Array(survivors.length * C)
    survivors.forEach((cell, k) => kept.set(n.subarray(cell * C, cell * C + C), k * C))
    n.fill(0)
    survivors.forEach((cell, k) => {
      n.set(kept.subarray(k * C, k * C + C), cell * C)
      if (n[cell * C + 3] > ALIVE) {
        const x = cell % W, y = (cell - x) / W
        if (x < bx0) bx0 = x
        if (x > bx1) bx1 = x
        if (y < by0) by0 = y
        if (y > by1) by1 = y
      }
    })
    this.state = n
    this.next = s
    this.box = bx1 < 0 ? { x0: 0, y0: 0, x1: -1, y1: -1 } : { x0: bx0, y0: by0, x1: bx1, y1: by1 }
  }

  // Paint the grid's colors into RGBA pixels (one pixel per cell, straight alpha). Faint cells
  // are hidden: mid-growth the canopy passes through a low-alpha haze, and fading opacity in
  // between alpha 0.2 and 0.5 shows leaves appearing as specks instead of a green fog.
  paint(pixels: Uint8ClampedArray) {
    const { width: W, height: H, ch: C, state: s } = this
    for (let i = 0; i < W * H; i++) {
      const a = Math.min(1, Math.max(0, s[i * C + 3]))
      const k = i * 4
      const t = Math.min(1, Math.max(0, (a - 0.2) / 0.3))
      if (t === 0) {
        pixels[k + 3] = 0
        continue
      }
      pixels[k] = (s[i * C] / a) * 255
      pixels[k + 1] = (s[i * C + 1] / a) * 255
      pixels[k + 2] = (s[i * C + 2] / a) * 255
      pixels[k + 3] = t * t * (3 - 2 * t) * 255
    }
  }

  // The raw state, for tests.
  snapshot() {
    return this.state.slice()
  }

  load(values: ArrayLike<number>) {
    this.state.set(values)
    this.box = { x0: 0, y0: 0, x1: this.width - 1, y1: this.height - 1 }
  }
}
