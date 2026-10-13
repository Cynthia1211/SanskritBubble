// Build a board and ensure every sound in the selected lesson is present.
import { BOARD_FILL_CHANCE, BOARD_INITIAL_ROWS, COLS, ROWS } from './settings'

export function createBoard(level, {
  rows = ROWS,
  cols = COLS,
  initialRows = BOARD_INITIAL_ROWS,
  fillChance = BOARD_FILL_CHANCE,
} = {}) {
  const pool = level?.bubble_pool ?? []
  if (!pool.length) return []

  const board = Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, () =>
    row < initialRows && Math.random() < fillChance ? pool[Math.floor(Math.random() * pool.length)] : null))

  pool.forEach((item, index) => {
    if (board.flat().includes(item)) return
    const row = Math.floor(index / cols)
    const col = index % cols
    if (row < rows) board[row][col] = item
  })

  return board
}
