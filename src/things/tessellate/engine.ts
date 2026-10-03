// Tessellate rules, independent of any UI.
//
// The board is SIZE × SIZE squares. Each square has four corners, and a tile is the right
// triangle whose right angle sits in one of them, so the game is played on a grid of
// (2·SIZE)² corners. Corner (r, c) lives in square (r >> 1, c >> 1); its low bits say which
// corner of the square it is: (0,0) upper-left, (0,1) upper-right, (1,0) lower-left, (1,1)
// lower-right.

export const SIZE = 5
export const N = SIZE * 2
export const CELLS = N * N
export const TOTAL_TILES = SIZE * SIZE * 2

export const EMPTY = 0
export const RED = 1
export const BLUE = 2
export const BLOCKED = 3

export type Player = typeof RED | typeof BLUE
export type Cell = typeof EMPTY | Player | typeof BLOCKED

export const other = (p: Player): Player => (p === RED ? BLUE : RED)
export const index = (r: number, c: number) => r * N + c
export const rowOf = (i: number) => Math.floor(i / N)
export const colOf = (i: number) => i % N

const inBounds = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N

// A tile shares a full edge with at most five others: its hypotenuse partner in the same
// square, and two candidates across each of its legs (only one of which can ever be filled).
export const NEIGHBORS: readonly (readonly number[])[] = Array.from({ length: CELLS }, (_, i) => {
  const r = rowOf(i)
  const c = colOf(i)
  const [sr, sc, cr, cc] = [r >> 1, c >> 1, r & 1, c & 1]
  const acrossRow = cr ? r + 1 : r - 1
  const acrossCol = cc ? c + 1 : c - 1
  const candidates = [
    [2 * sr + 1 - cr, 2 * sc + 1 - cc],
    [acrossRow, 2 * sc],
    [acrossRow, 2 * sc + 1],
    [2 * sr, acrossCol],
    [2 * sr + 1, acrossCol],
  ]
  return candidates.filter(([rr, cc2]) => inBounds(rr, cc2)).map(([rr, cc2]) => index(rr, cc2))
})

// Filling a corner rules out the two corners that share a leg with it inside its square.
const BLOCKS: readonly [number, number][] = Array.from({ length: CELLS }, (_, i) => {
  const r = rowOf(i)
  const c = colOf(i)
  return [index(r, c ^ 1), index(r ^ 1, c)]
})

export interface State {
  cells: Uint8Array
  turn: Player
  placed: number
}

export const newGame = (): State => ({ cells: new Uint8Array(CELLS), turn: RED, placed: 0 })

export const clone = (s: State): State => ({ cells: s.cells.slice(), turn: s.turn, placed: s.placed })

export const isOver = (s: State) => s.placed >= TOTAL_TILES

export const legalMoves = (s: State): number[] => {
  const moves: number[] = []
  for (let i = 0; i < CELLS; i++) if (s.cells[i] === EMPTY) moves.push(i)
  return moves
}

// Mutating move with an undo record, so search can play and take back moves cheaply.
export interface Undo {
  move: number
  blocked: number[]
}

export function play(s: State, move: number): Undo {
  if (s.cells[move] !== EMPTY) throw new Error(`illegal move ${move}`)
  s.cells[move] = s.turn
  const blocked: number[] = []
  for (const b of BLOCKS[move]) {
    if (s.cells[b] === EMPTY) {
      s.cells[b] = BLOCKED
      blocked.push(b)
    }
  }
  s.placed++
  s.turn = other(s.turn)
  return { move, blocked }
}

export function unplay(s: State, u: Undo) {
  s.cells[u.move] = EMPTY
  for (const b of u.blocked) s.cells[b] = EMPTY
  s.placed--
  s.turn = other(s.turn)
}

export interface Island {
  id: number
  player: Player
  tiles: number[]
}

// Islands, plus a map from each corner to its island id (-1 when it holds no tile).
export function islands(cells: Uint8Array): { list: Island[]; idOf: Int16Array } {
  const idOf = new Int16Array(CELLS).fill(-1)
  const list: Island[] = []
  const stack: number[] = []
  for (let start = 0; start < CELLS; start++) {
    const player = cells[start]
    if ((player !== RED && player !== BLUE) || idOf[start] !== -1) continue
    const island: Island = { id: list.length, player, tiles: [] }
    idOf[start] = island.id
    stack.push(start)
    while (stack.length) {
      const i = stack.pop()!
      island.tiles.push(i)
      for (const n of NEIGHBORS[i]) {
        if (cells[n] === player && idOf[n] === -1) {
          idOf[n] = island.id
          stack.push(n)
        }
      }
    }
    list.push(island)
  }
  return { list, idOf }
}

// Island sizes per player, largest first.
export function islandSizes(cells: Uint8Array): Record<Player, number[]> {
  const sizes: Record<Player, number[]> = { [RED]: [], [BLUE]: [] }
  for (const island of islands(cells).list) sizes[island.player].push(island.tiles.length)
  sizes[RED].sort((a, b) => b - a)
  sizes[BLUE].sort((a, b) => b - a)
  return sizes
}

// A player's score is the product of their island sizes (1 with no islands).
export const product = (sizes: number[]) => sizes.reduce((p, x) => p * x, 1)

export function scores(cells: Uint8Array): Record<Player, number> {
  const sizes = islandSizes(cells)
  return { [RED]: product(sizes[RED]), [BLUE]: product(sizes[BLUE]) }
}

// Visual coordinate like "B1 upper-left", matching the row letters and column numbers on the board.
const CORNER_NAMES = ['upper-left', 'upper-right', 'lower-left', 'lower-right']
export function describe(i: number) {
  const r = rowOf(i)
  const c = colOf(i)
  return `${'ABCDEFGHIJ'[r >> 1]}${c >> 1} ${CORNER_NAMES[(r & 1) * 2 + (c & 1)]}`
}
