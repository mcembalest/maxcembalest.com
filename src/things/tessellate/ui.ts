// Board rendering and input for Tessellate, ported from the original canvas UI
// (github.com/mcembalest/tessellate): the pointer's quadrant of a square picks the corner, a
// lighter preview with a glow follows the pointer over playable corners only, blocked corners
// of empty squares are dimmed, and islands are tinted and labeled with their size.

import type { Level } from './ai.ts'
import {
  BLOCKED,
  BLUE,
  CELLS,
  EMPTY,
  N,
  RED,
  SIZE,
  colOf,
  index,
  isOver,
  islands,
  newGame,
  play,
  product,
  rowOf,
  scores,
  unplay,
  type Island,
  type Player,
  type State,
  type Undo,
} from './engine.ts'

const COLORS = {
  [RED]: { normal: '#e94560', preview: '#ff99ad', glow: '#ffb3c1', stroke: 'rgba(120,30,45,0.85)', label: '#ffd3da' },
  [BLUE]: { normal: '#3f72af', preview: '#9dc1ff', glow: '#c7dbff', stroke: 'rgba(45,72,120,0.85)', label: '#d8e6ff' },
  background: '#2b3a48',
  gridLines: '#c9d2dc',
  blocked: '#22303a',
}
const NAMES = { [RED]: 'Red', [BLUE]: 'Blue' }
const COMPUTER_MIN_DELAY_MS = 400

type Opponent = 'friend' | Level
type Point = { x: number; y: number }

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

function shade(hex: string, factor: number) {
  const n = parseInt(hex.slice(1), 16)
  const channel = (shift: number) => Math.min(255, Math.round(((n >> shift) & 255) * factor))
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`
}

// The triangle for corner i inside a board whose squares are `cell` pixels wide.
function triangle(i: number, cell: number): [Point, Point, Point] {
  const r = rowOf(i)
  const c = colOf(i)
  const x0 = (c >> 1) * cell
  const y0 = (r >> 1) * cell
  const [tl, tr, bl, br] = [
    { x: x0, y: y0 },
    { x: x0 + cell, y: y0 },
    { x: x0, y: y0 + cell },
    { x: x0 + cell, y: y0 + cell },
  ]
  if (!(r & 1) && !(c & 1)) return [tl, tr, bl]
  if (!(r & 1)) return [tr, br, tl]
  if (!(c & 1)) return [bl, tl, br]
  return [br, bl, tr]
}

function centroid(i: number, cell: number): Point {
  const [a, b, c] = triangle(i, cell)
  return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 }
}

// Where an island's size label goes: tucked into the right angle of its most central tile.
function labelPosition(island: Island, cell: number): Point {
  const points = island.tiles.map((i) => centroid(i, cell))
  const mean = {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  }
  let best = 0
  let bestDistance = Infinity
  points.forEach((p, k) => {
    const d = (p.x - mean.x) ** 2 + (p.y - mean.y) ** 2
    if (d < bestDistance) [best, bestDistance] = [k, d]
  })
  const [rightAngle] = triangle(island.tiles[best], cell)
  const tile = island.tiles[best]
  const inset = Math.max(cell * 0.225, 4)
  return {
    x: rightAngle.x + (colOf(tile) & 1 ? -inset : inset),
    y: rightAngle.y + (rowOf(tile) & 1 ? -inset : inset),
  }
}

function tracePath(ctx: CanvasRenderingContext2D | Path2D, points: Point[]) {
  ctx.moveTo(points[0].x, points[0].y)
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y)
  ctx.closePath()
}

export function mount(root: HTMLElement) {
  const $ = <T extends Element>(selector: string) => root.querySelector<T>(selector)!
  const canvas = $<HTMLCanvasElement>('canvas')
  const ctx = canvas.getContext('2d')!
  const scoreEl = $<HTMLElement>('[data-score]')
  const statusEl = $<HTMLElement>('[data-status]')
  const breakdownEl = $<HTMLElement>('[data-breakdown]')
  const undoButton = $<HTMLButtonElement>('[data-action="undo"]')
  const opponentSelect = $<HTMLSelectElement>('[data-opponent]')
  const sideSelect = $<HTMLSelectElement>('[data-computer-side]')
  const islandsToggle = $<HTMLInputElement>('[data-islands]')
  const rulesDialog = $<HTMLDialogElement>('dialog')

  let game: State = newGame()
  let history: Undo[] = []
  let islandData = islands(game.cells)
  let hover: number | null = null
  let hoveredIsland: number | null = null
  let showIslands = islandsToggle.checked
  let opponent = opponentSelect.value as Opponent
  let computerSide: Player = sideSelect.value === 'red' ? RED : BLUE
  let thinking = false
  let request = 0 // ignores computer moves that arrive after the game changed under them
  let cell = 0 // pixel width of one square

  const worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' })

  const computerToMove = () => opponent !== 'friend' && game.turn === computerSide && !isOver(game)
  const humanCanMove = () => !isOver(game) && !thinking && !computerToMove()

  function resize() {
    const size = canvas.parentElement!.clientWidth
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    canvas.style.height = `${size}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    cell = size / SIZE
    draw()
  }

  function fillTriangle(i: number, fill: string) {
    ctx.beginPath()
    tracePath(ctx, triangle(i, cell))
    ctx.fillStyle = fill
    ctx.fill()
  }

  function drawTile(i: number, player: Player, preview: boolean) {
    fillTriangle(i, preview ? COLORS[player].preview : COLORS[player].normal)
    ctx.save()
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(1.2, cell * 0.05)
    ctx.shadowColor = COLORS[player].stroke
    ctx.shadowBlur = Math.max(0.5, cell * 0.12)
    ctx.strokeStyle = COLORS[player].stroke
    ctx.stroke()
    ctx.restore()
  }

  function squareHasTile(i: number) {
    const r = rowOf(i) & ~1
    const c = colOf(i) & ~1
    return [index(r, c), index(r, c + 1), index(r + 1, c), index(r + 1, c + 1)].some(
      (k) => game.cells[k] === RED || game.cells[k] === BLUE,
    )
  }

  function drawIslands() {
    for (const island of islandData.list) {
      const base = COLORS[island.player].normal
      const dark = shade(base, 0.6)
      const highlighted = island.id === hoveredIsland
      const alpha = highlighted ? 0.5 : island.player === game.turn ? 0.22 : 0.1
      const path = new Path2D()
      for (const i of island.tiles) tracePath(path, triangle(i, cell))
      ctx.fillStyle = hexToRgba(base, alpha)
      ctx.fill(path)
      ctx.save()
      ctx.shadowColor = dark
      ctx.shadowBlur = Math.max(6, cell * 0.18)
      ctx.fillStyle = 'rgba(0,0,0,0)'
      ctx.fill(path)
      ctx.restore()
      ctx.save()
      ctx.lineJoin = 'round'
      ctx.lineWidth = Math.max(1.2, cell * 0.035)
      ctx.strokeStyle = dark
      ctx.stroke(path)
      if (highlighted) {
        ctx.lineWidth = Math.max(2, cell * 0.08)
        ctx.strokeStyle = hexToRgba(base, 0.95)
        ctx.shadowColor = hexToRgba(base, 0.95)
        ctx.shadowBlur = Math.max(8, cell * 0.35)
        ctx.stroke(path)
      }
      ctx.restore()
      const at = labelPosition(island, cell)
      ctx.font = `${Math.round(cell * 0.32)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(0,0,0,0.75)'
      ctx.strokeText(String(island.tiles.length), at.x, at.y)
      ctx.fillStyle = COLORS[island.player].label
      ctx.fillText(String(island.tiles.length), at.x, at.y)
    }
  }

  function drawHoverGlow(i: number, player: Player) {
    ctx.save()
    ctx.beginPath()
    tracePath(ctx, triangle(i, cell))
    ctx.shadowColor = COLORS[player].glow
    ctx.shadowBlur = Math.max(12, cell * 0.35)
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.lineWidth = Math.max(2, cell * 0.06)
    ctx.strokeStyle = COLORS[player].glow
    ctx.stroke()
    ctx.restore()
  }

  function draw() {
    const size = cell * SIZE
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < CELLS; i++) {
      const v = game.cells[i]
      if (v === RED || v === BLUE) drawTile(i, v, false)
      else if (v === BLOCKED && !squareHasTile(i)) fillTriangle(i, COLORS.blocked)
    }
    ctx.strokeStyle = COLORS.gridLines
    ctx.lineWidth = 1.5
    for (let k = 0; k <= SIZE; k++) {
      ctx.beginPath()
      ctx.moveTo(k * cell, 0)
      ctx.lineTo(k * cell, size)
      ctx.moveTo(0, k * cell)
      ctx.lineTo(size, k * cell)
      ctx.stroke()
    }
    if (showIslands) drawIslands()
    if (hover !== null && humanCanMove() && game.cells[hover] === EMPTY) {
      drawTile(hover, game.turn, true)
      drawHoverGlow(hover, game.turn)
    }
  }

  function miniIsland(island: Island) {
    const mini = document.createElement('canvas')
    const px = 30
    const dpr = window.devicePixelRatio || 1
    mini.width = mini.height = px * dpr
    mini.style.width = mini.style.height = `${px}px`
    const m = mini.getContext('2d')!
    m.scale(dpr, dpr)
    // Fit the island's squares into the thumbnail, keeping its shape.
    const rows = island.tiles.map((i) => rowOf(i) >> 1)
    const cols = island.tiles.map((i) => colOf(i) >> 1)
    const [r0, c0] = [Math.min(...rows), Math.min(...cols)]
    const span = Math.max(Math.max(...rows) - r0, Math.max(...cols) - c0) + 1
    const unit = px / span
    m.translate(-c0 * unit, -r0 * unit)
    m.fillStyle = COLORS[island.player].normal
    m.beginPath()
    for (const i of island.tiles) tracePath(m, triangle(i, unit))
    m.fill()
    return mini
  }

  function renderBreakdown() {
    breakdownEl.hidden = !showIslands
    breakdownEl.replaceChildren()
    if (!showIslands) return
    for (const player of [RED, BLUE] as Player[]) {
      const row = document.createElement('div')
      row.className = 'formula'
      const name = document.createElement('span')
      name.className = `name ${player === RED ? 'red' : 'blue'}`
      name.textContent = NAMES[player]
      row.append(name)
      const own = islandData.list
        .filter((island) => island.player === player)
        .sort((a, b) => b.tiles.length - a.tiles.length)
      own.forEach((island, k) => {
        if (k > 0) row.append(Object.assign(document.createElement('span'), { className: 'op', textContent: '×' }))
        const factor = document.createElement('span')
        factor.className = 'factor'
        factor.append(miniIsland(island), String(island.tiles.length))
        factor.addEventListener('pointerenter', () => setHoveredIsland(island.id))
        factor.addEventListener('pointerleave', () => setHoveredIsland(null))
        row.append(factor)
      })
      const total = product(own.map((island) => island.tiles.length))
      row.append(Object.assign(document.createElement('span'), { className: 'op', textContent: `= ${total.toLocaleString()}` }))
      breakdownEl.append(row)
    }
  }

  function renderStatus() {
    const final = scores(game.cells)
    scoreEl.innerHTML = `<span class="red">Red ${final[RED].toLocaleString()}</span> · <span class="blue">Blue ${final[BLUE].toLocaleString()}</span>`
    if (isOver(game)) {
      const winner = final[RED] === final[BLUE] ? null : final[RED] > final[BLUE] ? RED : BLUE
      statusEl.innerHTML = winner
        ? `<span class="${winner === RED ? 'red' : 'blue'}">${NAMES[winner]} wins</span>`
        : "It's a tie"
    } else {
      const who = `<span class="${game.turn === RED ? 'red' : 'blue'}">${NAMES[game.turn]}</span>`
      statusEl.innerHTML = computerToMove() ? `${who} (computer) is thinking…` : `${who} to move`
    }
    undoButton.disabled = history.length === 0 || thinking
  }

  function refresh() {
    islandData = islands(game.cells)
    if (hoveredIsland !== null && hoveredIsland >= islandData.list.length) hoveredIsland = null
    renderStatus()
    renderBreakdown()
    draw()
  }

  function setHoveredIsland(id: number | null) {
    if (id === hoveredIsland) return
    hoveredIsland = id
    draw()
  }

  function place(i: number) {
    history.push(play(game, i))
    hover = null
    refresh()
    maybeComputerMove()
  }

  function maybeComputerMove() {
    if (!computerToMove()) return
    thinking = true
    renderStatus()
    const ticket = ++request
    const started = performance.now()
    worker.onmessage = (e: MessageEvent<number>) => {
      const wait = Math.max(0, COMPUTER_MIN_DELAY_MS - (performance.now() - started))
      setTimeout(() => {
        if (ticket !== request) return
        thinking = false
        place(e.data)
      }, wait)
    }
    const level = opponent as Level
    worker.postMessage({ cells: game.cells, turn: game.turn, placed: game.placed, level })
  }

  function cancelComputer() {
    request++
    thinking = false
  }

  function newGameClicked() {
    cancelComputer()
    game = newGame()
    history = []
    refresh()
    maybeComputerMove()
  }

  function undoClicked() {
    cancelComputer()
    // Against the computer, take back its reply too so it's your turn again.
    do {
      const last = history.pop()
      if (last) unplay(game, last)
    } while (history.length && computerToMove())
    refresh()
    maybeComputerMove()
  }

  function cornerAt(e: PointerEvent): number | null {
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null
    const corner = rect.width / N
    return index(Math.floor(y / corner), Math.floor(x / corner))
  }

  function track(e: PointerEvent) {
    const i = cornerAt(e)
    const nextIsland = i !== null && showIslands ? islandData.idOf[i] : -1
    hoveredIsland = nextIsland >= 0 ? nextIsland : null
    hover = i !== null && game.cells[i] === EMPTY && humanCanMove() ? i : null
    canvas.style.cursor = hover !== null ? 'pointer' : 'default'
    draw()
  }

  canvas.addEventListener('pointermove', track)
  // On touch the preview appears on press and follows the finger; lifting places the tile.
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') canvas.setPointerCapture(e.pointerId)
    track(e)
  })
  canvas.addEventListener('pointerup', (e) => {
    const i = cornerAt(e)
    if (i !== null && game.cells[i] === EMPTY && humanCanMove()) place(i)
  })
  canvas.addEventListener('pointerleave', () => {
    hover = null
    hoveredIsland = null
    draw()
  })

  $('[data-action="new"]').addEventListener('click', newGameClicked)
  undoButton.addEventListener('click', undoClicked)
  $('[data-action="rules"]').addEventListener('click', () => rulesDialog.showModal())
  rulesDialog.addEventListener('click', (e) => {
    if (e.target === rulesDialog || (e.target as Element).closest('[data-action="close"]')) rulesDialog.close()
  })
  opponentSelect.addEventListener('change', () => {
    opponent = opponentSelect.value as Opponent
    sideSelect.disabled = opponent === 'friend'
    cancelComputer()
    refresh()
    maybeComputerMove()
  })
  sideSelect.addEventListener('change', () => {
    computerSide = sideSelect.value === 'red' ? RED : BLUE
    cancelComputer()
    refresh()
    maybeComputerMove()
  })
  const setIslands = (on: boolean) => {
    showIslands = islandsToggle.checked = on
    if (!on) hoveredIsland = null
    renderBreakdown()
    draw()
  }
  islandsToggle.addEventListener('change', () => setIslands(islandsToggle.checked))
  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement
    if (e.metaKey || e.ctrlKey || e.altKey || target.closest('input:not([type="checkbox"]), select, textarea, [contenteditable]')) return
    if (e.key.toLowerCase() === 'i') setIslands(!showIslands)
  })

  new ResizeObserver(resize).observe(canvas.parentElement!)
  sideSelect.disabled = opponent === 'friend'
  refresh()
}
