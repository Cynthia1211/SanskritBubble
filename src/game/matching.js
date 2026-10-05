export function findConnectedGroup(board, row, col, iast) {
  // Flood-fill only bubbles with the same transliteration as the fired bubble.
  const found = new Set()
  const stack = [[row, col]]
  while (stack.length) {
    const [currentRow, currentCol] = stack.pop()
    const key = `${currentRow},${currentCol}`
    if (found.has(key) || !board[currentRow]?.[currentCol] || board[currentRow][currentCol].iast !== iast) continue
    found.add(key)
    stack.push([currentRow, currentCol - 1], [currentRow, currentCol + 1])
    const adjacentCols = currentRow % 2 === 0 ? [currentCol - 1, currentCol] : [currentCol, currentCol + 1]
    adjacentCols.forEach((adjacentCol) => stack.push([currentRow - 1, adjacentCol], [currentRow + 1, adjacentCol]))
  }
  return found
}

export function clearBubbleGroup(board, group) {
  // Copy rows first so React state remains immutable.
  const clearedBoard = board.map((row) => [...row])
  group.forEach((key) => {
    const [row, col] = key.split(',').map(Number)
    clearedBoard[row][col] = null
  })
  return clearedBoard
}
