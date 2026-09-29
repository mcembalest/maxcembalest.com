// Runs the computer opponent off the main thread so the board stays responsive while it searches.
import { chooseMove, type Level } from './ai.ts'
import type { Player } from './engine.ts'

interface Request {
  cells: Uint8Array
  turn: Player
  placed: number
  level: Level
}

self.onmessage = (e: MessageEvent<Request>) => {
  const { cells, turn, placed, level } = e.data
  self.postMessage(chooseMove({ cells, turn, placed }, level))
}
