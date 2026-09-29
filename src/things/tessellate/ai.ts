// Computer opponents: a one-move greedy player and an alpha-beta searcher.
//
// Positions are scored in logs, which turn the product of island sizes into a sum. An island of
// size n counts log(n + 1 − p), where p is the fraction of the board already filled: early on a
// lone tile is worth something because it can still grow, and by the end the value is exactly
// log(n), the island's true contribution. Scoring islands as plain log(n) instead makes a greedy
// player feed one giant island and lose to random play most of the time.

import {
  TOTAL_TILES,
  clone,
  isOver,
  islands,
  legalMoves,
  other,
  play,
  scores,
  unplay,
  type Player,
  type State,
} from './engine.ts'

export type Level = 'greedy' | 'alphabeta'

const WIN = 1e6

function evaluate(s: State, me: Player): number {
  if (isOver(s)) {
    const final = scores(s.cells)
    const margin = Math.log(final[me]) - Math.log(final[other(me)])
    return margin === 0 ? 0 : Math.sign(margin) * WIN + margin
  }
  const potential = 1 - s.placed / TOTAL_TILES
  let value = 0
  for (const island of islands(s.cells).list) {
    const v = Math.log(island.tiles.length + potential)
    value += island.player === me ? v : -v
  }
  return value
}

function shuffle<T>(xs: T[], random: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[xs[i], xs[j]] = [xs[j], xs[i]]
  }
  return xs
}

// Moves paired with their immediate evaluation for the player to move, best first.
function rankMoves(s: State, random: () => number): { move: number; value: number }[] {
  const me = s.turn
  const ranked = shuffle(legalMoves(s), random).map((move) => {
    const undo = play(s, move)
    const value = evaluate(s, me)
    unplay(s, undo)
    return { move, value }
  })
  return ranked.sort((a, b) => b.value - a.value)
}

export function greedyMove(state: State, random = Math.random): number {
  return rankMoves(clone(state), random)[0].move
}

class Timeout extends Error {}

export function alphaBetaMove(state: State, budgetMs = 600, random = Math.random): number {
  const s = clone(state)
  const deadline = Date.now() + budgetMs
  let nodes = 0

  function negamax(depth: number, alpha: number, beta: number): number {
    if ((++nodes & 1023) === 0 && Date.now() > deadline) throw new Timeout()
    if (depth === 0 || isOver(s)) return evaluate(s, s.turn)
    let best = -Infinity
    // Order children by their one-ply value so good moves are searched first and cutoffs come early.
    for (const { move } of rankMoves(s, random)) {
      const undo = play(s, move)
      const value = -negamax(depth - 1, -beta, -alpha)
      unplay(s, undo)
      if (value > best) best = value
      if (value > alpha) alpha = value
      if (alpha >= beta) break
    }
    return best
  }

  const root = rankMoves(s, random)
  let bestMove = root[0].move
  const remaining = root.length
  // Iterative deepening: keep the best move from the deepest search that finished in time.
  for (let depth = 1; depth <= remaining; depth++) {
    try {
      let alpha = -Infinity
      let depthBest = bestMove
      // Search last iteration's best move first.
      const order = [bestMove, ...root.map((m) => m.move).filter((m) => m !== bestMove)]
      for (const move of order) {
        const undo = play(s, move)
        const value = -negamax(depth - 1, -Infinity, -alpha)
        unplay(s, undo)
        if (value > alpha) {
          alpha = value
          depthBest = move
        }
      }
      bestMove = depthBest
      if (Math.abs(alpha) >= WIN / 2) break // the result is already decided
    } catch (e) {
      if (e instanceof Timeout) break
      throw e
    }
  }
  return bestMove
}

export function chooseMove(state: State, level: Level): number {
  return level === 'greedy' ? greedyMove(state) : alphaBetaMove(state)
}
