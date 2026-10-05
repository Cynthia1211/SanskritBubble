function hexNeighbors(row, col) {
  const diagonalCols = row % 2 === 0 ? [col - 1, col] : [col, col + 1]
  return [[row, col - 1], [row, col + 1], ...diagonalCols.flatMap((adjacentCol) => [[row - 1, adjacentCol], [row + 1, adjacentCol]])]
}

export function liftLooseBubbles(board, { rows, cols }) {
  // Find connected components, then move every component not attached to row 0 upward.
  const lifted = board.map((row) => [...row])
  const key = (row, col) => `${row},${col}`
  const components = []
  const visited = new Set()

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!lifted[row][col] || visited.has(key(row, col))) continue
      const component = []
      const stack = [[row, col]]
      visited.add(key(row, col))
      while (stack.length) {
        const [currentRow, currentCol] = stack.pop()
        component.push([currentRow, currentCol])
        hexNeighbors(currentRow, currentCol).forEach(([neighborRow, neighborCol]) => {
          if (lifted[neighborRow]?.[neighborCol] && !visited.has(key(neighborRow, neighborCol))) {
            visited.add(key(neighborRow, neighborCol))
            stack.push([neighborRow, neighborCol])
          }
        })
      }
      components.push(component)
    }
  }

  components
    .filter((component) => !component.some(([row]) => row === 0))
    .forEach((component) => {
      const componentKeys = new Set(component.map(([row, col]) => key(row, col)))

      // Keep moving the whole component until the next row is blocked. This
      // intentionally allows several consecutive upward moves in one turn.
      while (true) {
        const shifted = component.map(([row, col]) => [row - 1, col])
        if (shifted.some(([row, col]) => row < 0 || col < 0 || col >= cols)) break

        const occupiedByOutside = shifted.some(([row, col]) => lifted[row]?.[col] && !componentKeys.has(key(row, col)))
        if (occupiedByOutside) break

        const componentBubbles = component.map(([row, col]) => lifted[row][col])
        component.forEach(([row, col]) => { lifted[row][col] = null })
        shifted.forEach(([row, col], index) => { lifted[row][col] = componentBubbles[index] })
        component.splice(0, component.length, ...shifted)
        componentKeys.clear()
        component.forEach(([row, col]) => componentKeys.add(key(row, col)))
      }
    })

  return lifted
}
