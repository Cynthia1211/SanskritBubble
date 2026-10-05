import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { calculateShot } from './game/shot'
import { getPlacementCandidates as findPlacementCandidates } from './game/placement'
import { clearBubbleGroup, findConnectedGroup } from './game/matching'
import { liftLooseBubbles } from './game/gravity'
import { createBoard } from './game/board'
import { useKeyboardAim } from './hooks/useKeyboardAim'
import { fetchLevels } from './services/levelService'
import { fitBubbleFont } from './utils/bubbleText'

const COLS = 14
const ROWS = 10
const AIM_STEP = 2
const COLORS = ['coral', 'mint', 'lilac', 'gold', 'blue']

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
  const pool = useMemo(() => level?.bubble_pool ?? [], [level])
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
    fetchLevels().then((data) => {
      setLevels(data)
      setLevelId(Object.keys(data)[0])
    }).catch(() => setMessage('Could not load public/levels.json'))
  }, [])

  const resetGame = useCallback(() => {
    if (!level) return
    const freshBoard = liftLooseBubbles(createBoard(level, { rows: ROWS, cols: COLS }), { rows: ROWS, cols: COLS })
    setBoard(freshBoard)
    setInitialBubbleCount(freshBoard.flat().filter(Boolean).length)
    setShots(0)
    setBubbleIndex(0)
    setGameOver(false)
    setMessage('Aim with ← → and press SPACE to pop!')
  }, [level])

  useEffect(() => {
    if (!level) return
    // This effect resets all game state whenever the selected lesson changes.
    /* eslint-disable react-hooks/set-state-in-effect */
    resetGame()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [level, resetGame])

  const remainingBubbleCount = board.flat().filter(Boolean).length
  const progress = useMemo(() => initialBubbleCount ? Math.min(100, Math.max(0, (1 - remainingBubbleCount / initialBubbleCount) * 100)) : 0, [initialBubbleCount, remainingBubbleCount])

  const pronounce = useCallback((text) => {
    if (!text || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'hi-IN'
    utterance.rate = 0.78
    window.speechSynthesis.speak(utterance)
  }, [])

  const speak = useCallback((bubble) => {
    if (bubble?.audio) {
      const audio = new Audio(bubble.audio)
      audio.play().catch(() => pronounce(bubble.iast))
    } else pronounce(bubble?.iast)
  }, [pronounce])

  const traceShot = useCallback((angle) => calculateShot({ field: playfieldRef.current, angle }), [])
  const getPlacementCandidates = useCallback((shot) => findPlacementCandidates({ field: playfieldRef.current, board, shot, cols: COLS, rows: ROWS }), [board])

  // Trace the shot, place the current bubble, then resolve matching and gravity.
  const shoot = useCallback(() => {
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
      const found = findConnectedGroup(nextBoard, targetRow, targetCol, current.iast)
      const cleared = found.size >= 3 ? found : new Set()
      const settledBoard = cleared.size ? clearBubbleGroup(nextBoard, cleared) : nextBoard
      if (cleared.size) {
        setMessage(`${current.devanagari} · ${current.iast} — Great match!`)
        speak(current)
      } else setMessage('Find two more matching sounds to pop a group!')
      const liftedBoard = liftLooseBubbles(settledBoard, { rows: ROWS, cols: COLS })
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
  }, [aimAngle, board, busy, current, gameOver, getPlacementCandidates, speak, traceShot])

  useKeyboardAim({ onShoot: shoot, setAimAngle, step: AIM_STEP })

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
            {trajectory.points.length > 1 && <circle className="trajectory-end" cx={trajectory.points[trajectory.points.length - 1].x} cy={trajectory.points[trajectory.points.length - 1].y} r="5" />}
            {trajectory.candidates.slice(0, 1).map((candidate) => <circle key={`candidate-${candidate.row}-${candidate.col}`} className="landing-candidate preferred" cx={candidate.x} cy={candidate.y} r={Math.max(8, candidate.radius - 2)} />)}
          </svg>
          <div className="danger-line" />
          <div className="game-feedback"><span className="feedback-icon">✦</span>{message}</div>
          <div className="shooter-area"><div className="next-bubble"><small>NEXT</small><div className={`bubble mini ${COLORS[pool.findIndex((item) => item.iast === next?.iast) % COLORS.length]}`}><span className="translit" style={{ fontSize: fitBubbleFont(next?.iast, 12, 7) }}>{next?.iast}</span></div></div><div className="shooter"><div className={`bubble loaded ${COLORS[pool.findIndex((item) => item.iast === current?.iast) % COLORS.length]}`}><span className="translit" style={{ fontSize: fitBubbleFont(current?.iast, 17, 9) }}>{current?.iast}</span></div></div><div className="shoot-hint"><span className="keycap">←</span> <span className="keycap">→</span> AIM &nbsp; <span className="keycap space-key">SPACE</span> FIRE</div></div>
          <div className="field-floor" />
        </div>
        {gameOver && <div className="game-over"><strong>OH NO!</strong><span>The bubble pile crossed the danger line.</span><button onClick={resetGame}>Play again</button></div>}
        <div className="under-field"><span>✧&nbsp; Match 3 connected sounds to pop them!</span><button onClick={resetGame}>Restart <span>↻</span></button></div>
      </div>
      <div className="side-column"><label className="side-level-select"><select value={levelId} onChange={(event) => setLevelId(event.target.value)}>{Object.entries(levels).map(([id, item]) => <option key={id} value={id}>{item.level_title}</option>)}</select></label><aside className="lesson-card"><div className="card-head"><div className="eyebrow">TODAY'S SOUNDS</div></div><p className="card-description">Listen, learn, and match the Sanskrit sounds.</p><div className="sound-list">{pool.map((item, i) => <button className="sound-item" key={`${levelId}-${i}-${item.iast}`} onClick={() => speak(item)}><span className={`sound-glyph ${COLORS[i % COLORS.length]}`} style={{ width: soundGlyphWidth, fontSize: fitBubbleFont(item.devanagari, 22, 12) }}>{item.devanagari}</span><span className="sound-word"><strong>{item.iast}</strong><small>{item.description ?? item.meaning ?? ''}</small></span><span className="play-icon">▶</span></button>)}</div><div className="tip-box"><span>✧</span><p><strong>Sound tip</strong><br />Tap a sound to hear it. Try saying it out loud!</p></div></aside></div>
    </section>
    <footer className="app-footer"><span>Start with a sound. Discover an ancient script.</span><span>शुभम्&nbsp; ✦ &nbsp;Happy learning</span></footer>
  </main>
}

export default App
