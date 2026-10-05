export function getPlacementCandidates({ field, board, shot, cols, rows }) {
  if (!field || !shot.impact) return []

  // With no collision, the shot reaches the ceiling; choose an empty top-row cell.
  if (!shot.collision) {
    return Array.from({ length: cols }, (_, col) => ({ row: 0, col }))
      .filter(({ col }) => !board[0]?.[col])
      .map(({ row, col }) => {
        const element = field.querySelector(`[data-row="${row}"][data-col="${col}"]`)
        if (!element) return null
        const rect = element.getBoundingClientRect()
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2
        return { row, col, x: x - field.getBoundingClientRect().left, y: y - field.getBoundingClientRect().top, radius: rect.width / 2, distance: Math.hypot(x - shot.impact.x, y - shot.impact.y) }
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
  }

  const { row, col } = shot.collision
  // Staggered rows use different diagonal neighbors, so row parity matters here.
  const diagonalCols = row % 2 === 0 ? [col - 1, col] : [col, col + 1]
  const neighbors = [[row, col - 1], [row, col + 1], ...diagonalCols.flatMap((adjacentCol) => [[row - 1, adjacentCol], [row + 1, adjacentCol]])]
  const fieldRect = field.getBoundingClientRect()
  return neighbors
    .filter(([r, c]) => r >= 0 && r < rows && c >= 0 && c < cols && !board[r]?.[c])
    .map(([r, c]) => {
      const element = field.querySelector(`[data-row="${r}"][data-col="${c}"]`)
      if (!element) return null
      const rect = element.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      const distanceFromEndpoint = Math.hypot(x - shot.impact.x, y - shot.impact.y)
      return { row: r, col: c, x: x - fieldRect.left, y: y - fieldRect.top, radius: rect.width / 2, distance: distanceFromEndpoint }
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)
}
