import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alphaBetaMove, greedyMove } from './ai.ts'
import {
  BLOCKED,
  BLUE,
  CELLS,
  EMPTY,
  N,
  NEIGHBORS,
  RED,
  TOTAL_TILES,
  index,
  isOver,
  islandSizes,
  legalMoves,
  newGame,
  play,
  scores,
  unplay,
  type State,
} from './engine.ts'

// The neighbor formula from the original game (github.com/mcembalest/tessellate, game-pvp.js).
function originalNeighbors(r: number, c: number): number[] {
  const a = r % 2 === 0 ? 1 : -1
  const b = c % 2 === 0 ? 1 : -1
  const a1 = (r + 1) % 2 === 0 ? 1 : -1
  const b1 = (c + 1) % 2 === 0 ? 1 : -1
  const rc = (r + c + 1) % 2 === 0 ? 1 : -1
  return [
    [r + a, c + b],
    [r - 1, c - rc],
    [r + 1, c + rc],
    [r + a1, c],
    [r, c + b1],
  ]
    .filter(([x, y]) => x >= 0 && x < N && y >= 0 && y < N)
    .map(([x, y]) => index(x, y))
}

const sorted = (xs: readonly number[]) => [...xs].sort((a, b) => a - b)

// Deterministic pseudo-random numbers so game-playing tests are repeatable.
function seeded(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}

function playOut(s: State, pick: (s: State) => number) {
  while (!isOver(s)) play(s, pick(s))
}

test('neighbors match the original game', () => {
  for (let i = 0; i < CELLS; i++) {
    assert.deepEqual(sorted(NEIGHBORS[i]), sorted(originalNeighbors(Math.floor(i / N), i % N)), `corner ${i}`)
  }
})

test('neighbors are symmetric', () => {
  for (let i = 0; i < CELLS; i++) for (const n of NEIGHBORS[i]) assert.ok(NEIGHBORS[n].includes(i))
})

test('a tile blocks the two corners beside it and leaves the opposite corner open', () => {
  const s = newGame()
  play(s, index(2, 2)) // upper-left corner of square B1
  assert.equal(s.cells[index(2, 3)], BLOCKED)
  assert.equal(s.cells[index(3, 2)], BLOCKED)
  assert.equal(s.cells[index(3, 3)], EMPTY)
  assert.equal(s.turn, BLUE)
})

test('unplay restores the exact previous state', () => {
  const s = newGame()
  const random = seeded(1)
  for (let k = 0; k < 20; k++) {
    const moves = legalMoves(s)
    const before = s.cells.slice()
    const turn = s.turn
    const undo = play(s, moves[Math.floor(random() * moves.length)])
    unplay(s, undo)
    assert.deepEqual(s.cells, before)
    assert.equal(s.turn, turn)
    play(s, moves[0])
  }
})

test('every full game places 50 tiles, 25 per player', () => {
  const random = seeded(2)
  for (let g = 0; g < 50; g++) {
    const s = newGame()
    playOut(s, (st) => {
      const moves = legalMoves(st)
      return moves[Math.floor(random() * moves.length)]
    })
    assert.equal(s.placed, TOTAL_TILES)
    assert.equal(legalMoves(s).length, 0)
    const counts = { [RED]: 0, [BLUE]: 0 }
    for (const v of s.cells) if (v === RED || v === BLUE) counts[v]++
    assert.deepEqual(counts, { [RED]: 25, [BLUE]: 25 })
  }
})

test('the opening from a hand-played game scores as it did in the original', () => {
  // Red B1 upper-left, Blue B1 lower-right, Red A1 lower-left, Blue C2 upper-left, Red B0 upper-right.
  const s = newGame()
  for (const [r, c] of [[2, 2], [3, 3], [1, 2], [4, 4], [2, 1]]) play(s, index(r, c))
  assert.deepEqual(islandSizes(s.cells), { [RED]: [3], [BLUE]: [1, 1] })
  assert.deepEqual(scores(s.cells), { [RED]: 3, [BLUE]: 1 })
})

test('opponents only return legal moves', () => {
  const random = seeded(3)
  const s = newGame()
  playOut(s, (st) => {
    const move = st.turn === RED ? greedyMove(st, random) : alphaBetaMove(st, 30, random)
    assert.ok(legalMoves(st).includes(move))
    return move
  })
})

test('greedy beats random play more often than not', () => {
  const random = seeded(5)
  let wins = 0
  const games = 40
  for (let g = 0; g < games; g++) {
    const s = newGame()
    const greedy = g % 2 === 0 ? RED : BLUE
    playOut(s, (st) => {
      if (st.turn === greedy) return greedyMove(st, random)
      const moves = legalMoves(st)
      return moves[Math.floor(random() * moves.length)]
    })
    const final = scores(s.cells)
    if (final[greedy] > final[greedy === RED ? BLUE : RED]) wins++
  }
  assert.ok(wins > games * 0.75, `greedy won ${wins} of ${games}`)
})

test('alpha-beta beats greedy more often than not', () => {
  const random = seeded(4)
  let wins = 0
  const games = 6
  for (let g = 0; g < games; g++) {
    const s = newGame()
    const searcher = g % 2 === 0 ? RED : BLUE
    playOut(s, (st) => (st.turn === searcher ? alphaBetaMove(st, 120, random) : greedyMove(st, random)))
    const final = scores(s.cells)
    if (final[searcher] > final[searcher === RED ? BLUE : RED]) wins++
  }
  assert.ok(wins > games / 2, `alpha-beta won ${wins} of ${games}`)
})
