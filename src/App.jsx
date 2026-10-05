import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const COLS = 14
const ROWS = 10
const INITIAL_ROWS = 5
const AIM_STEP = 2
const COLORS = ['coral', 'mint', 'lilac', 'gold', 'blue']

function fitBubbleFont(text, maxSize, minSize = 8) {
  const length = Array.from(String(text ?? '')).length
  if (length <= 1) return `${maxSize}px`
  return `${Math.max(minSize, Math.round(maxSize * Math.min(1, 1.8 / length)))}px`
}

// eslint-disable-next-line no-unused-vars -- hexNeighbors is referenced by the commented-out liftLooseBubbles above
function hexNeighbors(row, col) {
  const diagonalCols = row % 2 === 0 ? [col - 1, col] : [col, col + 1]
  return [[row, col - 1], [row, col + 1], ...diagonalCols.flatMap((adjacentCol) => [[row - 1, adjacentCol], [row + 1, adjacentCol]])]
}

function liftLooseBubbles(board) {
  const lifted = board.map((row) => [...row])
  const key = (row, col) => `${row},${col}`
  const components = []
  const visited = new Set()
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
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
  components.filter((component) => !component.some(([row]) => row === 0)).forEach((component) => {
    const componentKeys = new Set(component.map(([row, col]) => key(row, col)))
    let canMove = true
    while (canMove) {
      const shifted = component.map(([row, col]) => [row - 1, col])
      if (shifted.some(([row, col]) => row < 0 || col < 0 || col >= COLS)) break
      const occupiedByOutside = shifted.some(([row, col]) => lifted[row]?.[col] && !componentKeys.has(key(row, col)))
      if (occupiedByOutside) break
      const componentBubbles = component.map(([row, col]) => lifted[row][col])
      component.forEach(([row, col]) => { lifted[row][col] = null })
      shifted.forEach(([row, col], index) => { lifted[row][col] = componentBubbles[index] })
      component.splice(0, component.length, ...shifted)
      componentKeys.clear()
      component.forEach(([row, col]) => componentKeys.add(key(row, col)))
      const nowAttached = component.some(([row, col]) => hexNeighbors(row, col).some(([neighborRow, neighborCol]) => {
        return lifted[neighborRow]?.[neighborCol] && !componentKeys.has(key(neighborRow, neighborCol))
      }))
      if (nowAttached) canMove = false
    }
  })
  return lifted
}


function makeBoard(level, rows = ROWS) {
  const pool = level?.bubble_pool ?? []
  if (!pool.length) return []
  const board = Array.from({ length: rows }, (_, row) => Array.from({ length: COLS }, () =>
    row < INITIAL_ROWS && Math.random() < 0.68 ? pool[Math.floor(Math.random() * pool.length)] : null))
  // Guarantee that every lesson item appears in the starting board.
  pool.forEach((item, index) => {
    if (board.flat().includes(item)) return
    const row = Math.floor(index / COLS)
    const col = index % COLS
    board[row][col] = item
  })
  return board
}

function App() {
  const [levels, setLevels] = useState(null)
  const [levelId, setLevelId] = useState('level_1')
  const [board, setBoard] = useState([])
  const [initialBubbleCount, setInitialBubbleCount] = useState(0)
  const [shots, setShots] = useState(0)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [aimAngle, setAimAngle] = useState(0)
  const [trajectory, setTrajectory] = useState({ width: 0, height: 0, points: [], candidates: [] })
  const playfieldRef = useRef(null)
  const level = levels?.[levelId]
  const pool = level?.bubble_pool ?? []
  const [bubbleIndex, setBubbleIndex] = useState(0)
  const activePool = useMemo(() => {
    const presentSounds = new Set(board.flat().filter(Boolean).map((bubble) => bubble.iast))
    const available = pool.filter((item) => presentSounds.has(item.iast))
    return available.length ? available : pool
  }, [board, pool])
  const current = activePool.length ? activePool[bubbleIndex % activePool.length] : null
  const next = activePool.length ? activePool[(bubbleIndex + 1) % activePool.length] : null
  const soundGlyphWidth = useMemo(() => {
    const longest = Math.max(1, ...pool.map((item) => Array.from(item.devanagari).length))
    return `${Math.max(39, longest * 22 + 8)}px`
  }, [pool])

  useEffect(() => {
    fetch('/levels.json').then((response) => {
      if (!response.ok) throw new Error('Could not load levels')
      return response.json()
    }).then((data) => {
      setLevels(data)
      setLevelId(Object.keys(data)[0])
    }).catch(() => setMessage('Could not load public/levels.json'))
  }, [])

  useEffect(() => {
    if (!level) return
    // Apply the same support/gravity rule at the start of a level so a
    // randomly generated clump cannot remain suspended in the middle.
    const startingBoard = liftLooseBubbles(makeBoard(level))
    //const startingBoard = makeBoard(level)
    setBoard(startingBoard)
    setInitialBubbleCount(startingBoard.flat().filter(Boolean).length)
    setShots(0)
    setBubbleIndex(0)
    setGameOver(false)
    setMessage('Aim with ← → and press SPACE to pop!')
  }, [levelId, levels])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        setAimAngle((angle) => Math.max(-85, Math.min(85, angle + (event.key === 'ArrowLeft' ? -AIM_STEP : AIM_STEP))))
      } else if (event.code === 'Space') {
        event.preventDefault()
        shoot()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [aimAngle, board, busy, current, gameOver])

  const remainingBubbleCount = board.flat().filter(Boolean).length
  const progress = useMemo(() => initialBubbleCount ? Math.min(100, Math.max(0, (1 - remainingBubbleCount / initialBubbleCount) * 100)) : 0, [initialBubbleCount, remainingBubbleCount])

  function speak(bubble) {
    if (bubble?.audio) {
      const audio = new Audio(bubble.audio)
      audio.play().catch(() => pronounce(bubble.iast))
    } else pronounce(bubble?.iast)
  }

  function pronounce(text) {
    if (!text || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'hi-IN'
    utterance.rate = 0.78
    window.speechSynthesis.speak(utterance)
  }

  const traceShot = useCallback((angle) => {
    const field = playfieldRef.current
    const grid = field?.querySelector('.bubble-grid')
    const projectile = field?.querySelector('.loaded')
    if (!field || !grid || !projectile) return { width: 0, height: 0, points: [], collision: null, impact: null }
    const fieldRect = field.getBoundingClientRect()
    const gridRect = grid.getBoundingClientRect()
    const projectileRect = projectile.getBoundingClientRect()
    const radius = projectileRect.width * 0.43
    const start = { x: projectileRect.left + projectileRect.width / 2, y: projectileRect.top + projectileRect.height / 2 }
    let direction = { x: Math.sin(angle * Math.PI / 180), y: -Math.cos(angle * Math.PI / 180) }
    let origin = start
    const points = [{ x: start.x - fieldRect.left, y: start.y - fieldRect.top }]
    const bubbles = [...field.querySelectorAll('.bubble-cell.bubble')].map((element) => {
      const rect = element.getBoundingClientRect()
      return { row: Number(element.dataset.row), col: Number(element.dataset.col), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, radius: rect.width / 2 }
    })
    let collision = null
    let impact = null
    for (let bounce = 0; bounce < 8; bounce++) {
      const wallDistance = direction.x > 0
        ? (fieldRect.right - radius - origin.x) / direction.x
        : direction.x < 0 ? (fieldRect.left + radius - origin.x) / direction.x : Infinity
      const ceilingDistance = (gridRect.top - origin.y) / direction.y
      const segmentLimit = Math.min(wallDistance > 0 ? wallDistance : Infinity, ceilingDistance > 0 ? ceilingDistance : Infinity)
      let nearest = null
      bubbles.forEach((bubble) => {
        const dx = bubble.x - origin.x
        const dy = bubble.y - origin.y
        const projection = dx * direction.x + dy * direction.y
        // A bubble is an obstacle as soon as its centre is close enough to
        // the firing line. The 1.9R threshold is intentional: use the
        // projectile radius so it remains stable with the responsive layout.
        const lineDistance = Math.abs(dx * direction.y - dy * direction.x)
        if (projection <= 0 || projection > segmentLimit || lineDistance >= radius * 1.8) return
        const distanceFromLaunch = Math.hypot(dx, dy)
        if (!nearest || distanceFromLaunch < nearest.distance) nearest = { ...bubble, distance: distanceFromLaunch, projection, lineDistance }
      })
      if (nearest) {
        // Keep the visual endpoint on the near side of the blocking bubble,
        // while retaining the original firing point/line for placement.
        const perpendicular = nearest.x - origin.x - direction.x * nearest.projection
        const perpendicularY = nearest.y - origin.y - direction.y * nearest.projection
        const contactDistance = Math.max(0, nearest.projection - Math.sqrt(Math.max(0, (nearest.radius + radius) ** 2 - perpendicular * perpendicular - perpendicularY * perpendicularY)))
        impact = { x: origin.x + direction.x * contactDistance, y: origin.y + direction.y * contactDistance }
        collision = {
          ...nearest,
          incoming: { ...direction },
          firingOrigin: { ...origin },
          firingRadius: radius,
          visual: { x: nearest.x - fieldRect.left, y: nearest.y - fieldRect.top, radius: nearest.radius },
        }
        points.push({ x: impact.x - fieldRect.left, y: impact.y - fieldRect.top })
        break
      }
      const rawEndpoint = { x: origin.x + direction.x * segmentLimit, y: origin.y + direction.y * segmentLimit }
      const reachesCeiling = ceilingDistance <= wallDistance || !Number.isFinite(wallDistance)
      const endpoint = reachesCeiling
        ? { x: Math.max(gridRect.left + radius, Math.min(gridRect.right - radius, rawEndpoint.x)), y: gridRect.top + radius }
        : rawEndpoint
      points.push({ x: endpoint.x - fieldRect.left, y: endpoint.y - fieldRect.top })
      if (reachesCeiling) {
        impact = endpoint
        break
      }
      origin = endpoint
      direction = { ...direction, x: -direction.x }
    }
    return { width: fieldRect.width, height: fieldRect.height, points, collision, impact }
  }, [])

  const getPlacementCandidates = useCallback((shot) => {
    const field = playfieldRef.current
    if (!field || !shot.impact) return []
    if (!shot.collision) {
      return Array.from({ length: COLS }, (_, col) => ({ row: 0, col }))
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
    const diagonalCols = row % 2 === 0 ? [col - 1, col] : [col, col + 1]
    const neighbors = [[row, col - 1], [row, col + 1], ...diagonalCols.flatMap((adjacentCol) => [[row - 1, adjacentCol], [row + 1, adjacentCol]])]
    const fieldRect = field.getBoundingClientRect()
    return neighbors
      .filter(([r, c]) => r >= 0 && r < ROWS && c >= 0 && c < COLS && !board[r]?.[c])
      .map(([r, c]) => {
        const element = field.querySelector(`[data-row="${r}"][data-col="${c}"]`)
        if (!element) return null
        const rect = element.getBoundingClientRect()
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2
        const distanceFromEndpoint = Math.hypot(x - shot.impact.x, y - shot.impact.y)
        return { row: r, col: c, x: x - fieldRect.left, y: y - fieldRect.top, radius: rect.width / 2, distance: distanceFromEndpoint }
      })
      // Choose the empty neighbour whose centre is closest to the red endpoint.
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
  }, [board])

  function shoot() {
    if (!current || busy || gameOver || !board.length) return
    setBusy(true)
    const nextBoard = board.map((row) => [...row])
    const field = playfieldRef.current
    if (!field) { setBusy(false); return }
    const shot = traceShot(aimAngle)
    const target = getPlacementCandidates(shot)[0]
    if (!target) {
      setBusy(false)
      setMessage('')
      return
    }
    const { row: targetRow, col: targetCol } = target
    nextBoard[targetRow][targetCol] = current
    setBoard(nextBoard)
    setShots((value) => value + 1)
    setBubbleIndex((value) => value + 1)
    setMessage('')
    setTimeout(() => {
      const settledBoard = nextBoard.map((row) => [...row])
      const found = new Set()
      const stack = [[targetRow, targetCol]]
      while (stack.length) {
        const [r, c] = stack.pop()
        const key = `${r},${c}`
        if (found.has(key) || !settledBoard[r]?.[c] || settledBoard[r][c].iast !== current.iast) continue
        found.add(key)
        stack.push([r, c - 1], [r, c + 1])
        const adjacentCols = r % 2 === 0 ? [c - 1, c] : [c, c + 1]
        adjacentCols.forEach((adjacentCol) => stack.push([r - 1, adjacentCol], [r + 1, adjacentCol]))
      }
      const cleared = found.size >= 3 ? found : new Set()
      if (cleared.size) {
        cleared.forEach((key) => {
          const [r, c] = key.split(',').map(Number)
          settledBoard[r][c] = null
        })
        setMessage(`${current.devanagari} · ${current.iast} — Great match!`)
        speak(current)
      } else setMessage('Find two more matching sounds to pop a group!')
      const liftedBoard = liftLooseBubbles(settledBoard)
      // const liftedBoard = settledBoard
      const fieldRect = field.getBoundingClientRect()
      const dangerY = fieldRect.bottom - fieldRect.height * 0.2
      const reachesDangerLine = liftedBoard.some((row, r) => row.some((bubble, c) => {
        if (!bubble) return false
        const element = field.querySelector(`[data-row="${r}"][data-col="${c}"]`)
        if (!element) return false
        return element.getBoundingClientRect().bottom >= dangerY
      }))
      if (reachesDangerLine) {
        setGameOver(true)
        setMessage('Bubble pile reached the danger line!')
      }
      setBoard(liftedBoard)
      setBusy(false)
    }, 500)
  }

  useEffect(() => {
    const updateTrajectory = () => {
      const shot = traceShot(aimAngle)
      const candidates = getPlacementCandidates(shot)
      const points = [...shot.points]
      if (!shot.collision && candidates[0] && points.length) {
        points[points.length - 1] = { x: candidates[0].x, y: candidates[0].y }
      }
      setTrajectory({ ...shot, points, candidates })
    }
    updateTrajectory()
    window.addEventListener('resize', updateTrajectory)
    return () => window.removeEventListener('resize', updateTrajectory)
  }, [aimAngle, board, bubbleIndex, levels, traceShot, getPlacementCandidates])

  if (!levels) return <main className="loading"><span className="brand-mark">अ</span><p>{message || 'Getting your Sanskrit bubbles ready…'}</p></main>

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="https://zatam2.vercel.app" aria-label="Home"><span className="brand-mark">🏠</span><span>zat.am</span></a><div className="top-note brand-script"><img src="/SanskritBubble_Logo.png" alt="Sanskrit Bubble" /></div><button className="icon-button" aria-label="Sound effects">♫</button></header>
    <section className="game-layout">
      <div className="game-column">
        <div className="lesson-row"><div><div className="eyebrow">{levelId.replace('_', ' ').toUpperCase()}</div><h1>{level?.level_title?.replace(/^Lesson \d+: /, '') || 'Sanskrit vowels'}</h1></div><div className="title-progress"><div className="progress-head"><span>LEVEL PROGRESS</span><span>{Math.round(progress)}%</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div><div className="title-stats"><div><span className="stat-label">SCORE</span><strong>0000</strong></div><div><span className="stat-label">SHOTS</span><strong>{String(shots).padStart(2, '0')}</strong></div></div></div>
        <div className="playfield" ref={playfieldRef}>
          <div className="field-glow" />
          <div className="field-top"><span><i /> CLEAR ALL THE BUBBLES</span><span>LEVEL {Object.keys(levels).indexOf(levelId) + 1} / {Object.keys(levels).length}</span></div>
          <div className="bubble-grid" style={{ '--cols': COLS }}>
            {board.map((row, r) => <div className={`bubble-grid-row ${r % 2 ? 'offset-row' : ''}`} key={`row-${r}`}>{row.map((bubble, c) => <div key={`${r}-${c}`} data-row={r} data-col={c} className={`bubble-cell ${bubble ? `bubble ${COLORS[pool.findIndex((item) => item.iast === bubble.iast) % COLORS.length]}` : 'empty'}`} aria-label={bubble?.devanagari}>
              {bubble && <span className="devanagari" style={{ fontSize: fitBubbleFont(bubble.devanagari, 25, 12) }}>{bubble.devanagari}</span>}
            </div>)}</div>)}
          </div>
          <svg className="aim-trajectory" viewBox={`0 0 ${Math.max(1, trajectory.width)} ${Math.max(1, trajectory.height)}`} aria-hidden="true">
            {trajectory.points.length > 1 && <polyline points={trajectory.points.map(({ x, y }) => `${x},${y}`).join(' ')} />}
            {trajectory.points.slice(1, -1).map((point, index) => <circle key={`bounce-${index}`} cx={point.x} cy={point.y} r="4" />)}
            {trajectory.collision?.visual && <circle className="obstacle-highlight" cx={trajectory.collision.visual.x} cy={trajectory.collision.visual.y} r={trajectory.collision.visual.radius + 4} />}
            {trajectory.points.length > 1 && <circle className="trajectory-end" cx={trajectory.points[trajectory.points.length - 1].x} cy={trajectory.points[trajectory.points.length - 1].y} r="5" />}
            {trajectory.candidates.slice(0, 1).map((candidate) => <circle key={`candidate-${candidate.row}-${candidate.col}`} className="landing-candidate preferred" cx={candidate.x} cy={candidate.y} r={Math.max(8, candidate.radius - 2)} />)}
          </svg>
          <div className="danger-line" />
          <div className="game-feedback"><span className="feedback-icon">✦</span>{message}</div>
          <div className="shooter-area"><div className="next-bubble"><small>NEXT</small><div className={`bubble mini ${COLORS[pool.findIndex((item) => item.iast === next?.iast) % COLORS.length]}`}><span className="translit" style={{ fontSize: fitBubbleFont(next?.iast, 12, 7) }}>{next?.iast}</span></div></div><div className="shooter"><div className={`bubble loaded ${COLORS[pool.findIndex((item) => item.iast === current?.iast) % COLORS.length]}`}><span className="translit" style={{ fontSize: fitBubbleFont(current?.iast, 17, 9) }}>{current?.iast}</span></div></div><div className="shoot-hint"><span className="keycap">←</span> <span className="keycap">→</span> AIM &nbsp; <span className="keycap space-key">SPACE</span> FIRE</div></div>
          <div className="field-floor" />
        </div>
        {gameOver && <div className="game-over"><strong>OH NO!</strong><span>The bubble pile crossed the danger line.</span><button onClick={() => { const freshBoard = makeBoard(level); setBoard(freshBoard); setInitialBubbleCount(freshBoard.flat().filter(Boolean).length); setShots(0); setBubbleIndex(0); setGameOver(false); setMessage('Aim with ← → and press SPACE to pop!') }}>Play again</button></div>}
        <div className="under-field"><span>✧&nbsp; Match 3 connected sounds to pop them!</span><button onClick={() => { const freshBoard = makeBoard(level); setBoard(freshBoard); setInitialBubbleCount(freshBoard.flat().filter(Boolean).length); setShots(0); setBubbleIndex(0); setGameOver(false); setMessage('Aim with ← → and press SPACE to pop!') }}>Restart <span>↻</span></button></div>
      </div>
      <div className="side-column"><label className="side-level-select"><select value={levelId} onChange={(event) => setLevelId(event.target.value)}>{Object.entries(levels).map(([id, item]) => <option key={id} value={id}>{item.level_title}</option>)}</select></label><aside className="lesson-card"><div className="card-head"><div className="eyebrow">TODAY'S SOUNDS</div></div><p className="card-description">Listen, learn, and match the Sanskrit sounds.</p><div className="sound-list">{pool.map((item, i) => <button className="sound-item" key={`${levelId}-${i}-${item.iast}`} onClick={() => speak(item)}><span className={`sound-glyph ${COLORS[i % COLORS.length]}`} style={{ width: soundGlyphWidth, fontSize: fitBubbleFont(item.devanagari, 22, 12) }}>{item.devanagari}</span><span className="sound-word"><strong>{item.iast}</strong><small>{item.description ?? item.meaning ?? ''}</small></span><span className="play-icon">▶</span></button>)}</div><div className="tip-box"><span>✧</span><p><strong>Sound tip</strong><br />Tap a sound to hear it. Try saying it out loud!</p></div></aside></div>
    </section>
    <footer className="app-footer"><span>Start with a sound. Discover an ancient script.</span><span>शुभम्&nbsp; ✦ &nbsp;Happy learning</span></footer>
  </main>
}

export default App
