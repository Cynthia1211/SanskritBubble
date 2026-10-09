import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { calculateShot } from './game/shot'
import { getPlacementCandidates as findPlacementCandidates } from './game/placement'
import { clearBubbleGroup, findConnectedGroup } from './game/matching'
import { liftLooseBubbles } from './game/gravity'
import { createBoard } from './game/board'
import { useKeyboardAim } from './hooks/useKeyboardAim'
import { cacheLevelAudio, fetchLevels } from './services/levelService'
import { fitBubbleFont } from './utils/bubbleText'
import { LevelReviewCard } from './components/LevelReviewCard'
import { reviewProgress } from './utils/reviewProgress'
import { startBGM as startBackgroundMusic, stopBGM as stopBackgroundMusic } from './assets/Tone'
import { playGearRotate, playPopSound } from './assets/SoundEffects'

const COLS = 14
const ROWS = 10
const AIM_STEP = 2
const COLORS = ['coral', 'mint', 'gold', 'blue', 'lilac', 'teal', 'rose', 'orange', 'lime', 'violet']
const SCORE_STORAGE_KEY = 'sanskrit-bubble-score'
const LEVEL_COMPLETE_BONUS = 50
const REVIEW_BONUS = 50
// Keep the running score between levels and page reloads in this browser tab.
function readStoredScore() {
  const stored = Number(window.sessionStorage.getItem(SCORE_STORAGE_KEY))
  return Number.isFinite(stored) && stored > 0 ? stored : 0
}

function getLevelColors(levelId, colorCount) {
  const levelNumber = Number(levelId.match(/\d+/)?.[0]) || 1
  const start = (levelNumber - 1) % COLORS.length
  return Array.from({ length: colorCount }, (_, index) => COLORS[(start + index) % COLORS.length])
}

function shuffleItems(items) {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }
  return shuffled
}

function App() {
  const [levels, setLevels] = useState(null)
  const [levelId, setLevelId] = useState('level_1')
  const [board, setBoard] = useState([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [levelComplete, setLevelComplete] = useState(false)
  const [score, setScore] = useState(readStoredScore)
  const [reviewedSounds, setReviewedSounds] = useState(() => new Set())
  const [reviewBonusAwarded, setReviewBonusAwarded] = useState(false)
  const [musicPlaying, setMusicPlaying] = useState(true)
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true)
  const [aimAngle, setAimAngle] = useState(0)
  const [trajectory, setTrajectory] = useState({ width: 0, height: 0, points: [], fullPoints: [], candidates: [] })
  const playfieldRef = useRef(null)
  const level = levels?.[levelId]
  const showAimGuide = levelId === 'level_1'
  const pool = useMemo(() => level?.bubble_pool ?? [], [level])
  const colorOrder = useMemo(() => getLevelColors(levelId, pool.length), [levelId, pool.length])
  const hasBubbles = board.some((row) => row.some(Boolean))
  const [shooterQueue, setShooterQueue] = useState([])
  // Keep the preview in an explicit queue. Deriving it from the changing board
  // makes NEXT jump when a bubble is cleared or gravity changes the board.
  const current = hasBubbles && shooterQueue.length ? shooterQueue[0] : null
  const next = hasBubbles && shooterQueue.length > 1 ? shooterQueue[1] : null
  const loadedBubble = busy ? next : current
  const soundGlyphWidth = useMemo(() => {
    const segmenter = typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter('hi', { granularity: 'grapheme' })
      : null
    const countVisualUnits = (text) => segmenter
      ? Array.from(segmenter.segment(text)).length
      : Array.from(text).length
    const longest = Math.max(1, ...pool.map((item) => countVisualUnits(item.devanagari)))
    return `${Math.min(90, Math.max(50, longest * 10 + 5))}px`
  }, [pool])

  useEffect(() => {
    let cancelled = false

    fetchLevels().then(async (data) => {
      const firstLevelId = Object.keys(data)[0]
      const firstLevel = await cacheLevelAudio(firstLevelId, data[firstLevelId])
      if (cancelled) return
      setLevels({ ...data, [firstLevelId]: firstLevel })
      setLevelId(firstLevelId)
    }).catch(() => {
      if (!cancelled) setMessage('Could not load levels from Firebase')
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const selectedLevel = levels?.[levelId]
    if (!selectedLevel || selectedLevel.audioCached) return undefined

    let cancelled = false
    cacheLevelAudio(levelId, selectedLevel).then((cachedLevel) => {
      if (cancelled) return
      setLevels((previous) => ({ ...previous, [levelId]: cachedLevel }))
    })

    return () => {
      cancelled = true
    }
  }, [levelId, levels])

  const resetGame = useCallback(() => {
    if (!level) return
    const freshBoard = liftLooseBubbles(createBoard(level, { rows: ROWS, cols: COLS }), { rows: ROWS, cols: COLS })
    const presentSounds = new Set(freshBoard.flat().filter(Boolean).map((bubble) => bubble.id))
    const initialQueue = shuffleItems(pool).filter((item) => presentSounds.has(item.id))
    setBoard(freshBoard)
    setShooterQueue(initialQueue.length ? initialQueue : shuffleItems(pool))
    setGameOver(false)
    setLevelComplete(false)
    setReviewedSounds(new Set())
    setReviewBonusAwarded(false)
    setMessage('Aim with ← → and press SPACE to pop!')
  }, [level, pool])

  useEffect(() => {
    if (!level) return
    // This effect resets all game state whenever the selected lesson changes.
    /* eslint-disable react-hooks/set-state-in-effect */
    resetGame()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [level, resetGame])

  const speak = useCallback((bubble, { force = false } = {}) => {
    if ((!soundEffectsEnabled && !force) || !bubble?.audio) return
    const audio = new Audio(bubble.audio)
    audio.volume = 1
    audio.play().catch(() => {})
  }, [soundEffectsEnabled])

  const addScore = useCallback((amount) => {
    if (!amount) return
    setScore((value) => value + amount)
  }, [])

  // Persist the score so it keeps growing across levels and page reloads.
  useEffect(() => {
    window.sessionStorage.setItem(SCORE_STORAGE_KEY, String(score))
  }, [score])

  useEffect(() => {
    let disposed = false
    const startAfterInteraction = async () => {
      try {
        await startBackgroundMusic()
        if (!disposed) setMusicPlaying(true)
        window.removeEventListener('pointerdown', startAfterInteraction)
      } catch {
        // Browsers may block autoplay until the user interacts with the page.
      }
    }

    startAfterInteraction()
    window.addEventListener('pointerdown', startAfterInteraction, { once: true })

    return () => {
      disposed = true
      window.removeEventListener('pointerdown', startAfterInteraction)
      stopBackgroundMusic()
    }
  }, [])

  const toggleMusic = useCallback(async () => {
    if (musicPlaying) {
      stopBackgroundMusic()
      setMusicPlaying(false)
      return
    }

    try {
      await startBackgroundMusic()
      setMusicPlaying(true)
    } catch {
      setMusicPlaying(false)
    }
  }, [musicPlaying])

  const toggleSoundEffects = useCallback(() => {
    setSoundEffectsEnabled((enabled) => !enabled)
  }, [])

  const playAimSound = useCallback(() => {
    if (soundEffectsEnabled) playGearRotate()
  }, [soundEffectsEnabled])

  const { complete: allSoundsReviewed } = reviewProgress(pool, reviewedSounds)

  // Play one sound of the completed level and remember that it was reviewed.
  const reviewSound = useCallback((item) => {
    speak(item, { force: true })
    setReviewedSounds((previous) => {
      const itemId = item.id ?? item.iast
      if (previous.has(itemId)) return previous
      const updated = new Set(previous)
      updated.add(itemId)
      return updated
    })
  }, [speak])

  // Award the listening bonus once, as soon as every sound of the level has been played.
  useEffect(() => {
    if (!levelComplete || reviewBonusAwarded || !allSoundsReviewed) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setReviewBonusAwarded(true)
    addScore(REVIEW_BONUS)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [addScore, allSoundsReviewed, levelComplete, reviewBonusAwarded])

  const levelIds = Object.keys(levels ?? {})
  const nextLevelId = levelIds[levelIds.indexOf(levelId) + 1]
  const continueAfterLevel = () => {
    setLevelComplete(false)
    setReviewedSounds(new Set())
    setReviewBonusAwarded(false)
    if (nextLevelId) setLevelId(nextLevelId)
    else setMessage('You completed all the lessons!')
  }

  const traceShot = useCallback((angle) => calculateShot({ field: playfieldRef.current, angle }), [])
  const getPlacementCandidates = useCallback((shot) => findPlacementCandidates({ field: playfieldRef.current, board, shot, cols: COLS, rows: ROWS }), [board])

  // Trace the shot, place the current bubble, then resolve matching and gravity.
  const shoot = useCallback(() => {
    if (!current || busy || gameOver || levelComplete || !board.length) return
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
    setMessage('')
    const found = findConnectedGroup(nextBoard, targetRow, targetCol, current.id)
    const cleared = found.size >= 3 ? found : new Set()
    if (cleared.size) {
      speak(current)
    } else {
      if (soundEffectsEnabled) playPopSound()
    }
    setTimeout(() => {
      const settledBoard = cleared.size ? clearBubbleGroup(nextBoard, cleared) : nextBoard
      if (cleared.size) {
        setMessage(`${current.devanagari} · ${current.iast} — Great match!`)
      } else {
        setMessage('Find two more matching sounds to pop a group!')
      }
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
      } else if (!liftedBoard.some((row) => row.some(Boolean))) {
        setLevelComplete(true)
        addScore(LEVEL_COMPLETE_BONUS)
        setMessage(`Level cleared! +${LEVEL_COMPLETE_BONUS} points!`)
      }
      setBoard(liftedBoard)
      // Advance only after matching and gravity settle. Any queued sound that
      // no longer exists on the board must be skipped before showing NEXT.
      const presentIds = new Set(liftedBoard.flat().filter(Boolean).map((bubble) => bubble.id))
      const available = pool.filter((item) => presentIds.has(item.id))
      setShooterQueue((previous) => {
        const remaining = previous.slice(1).filter((item) => presentIds.has(item.id))
        while (remaining.length < 2 && available.length) {
          remaining.push(available[Math.floor(Math.random() * available.length)])
        }
        return remaining
      })
      setBusy(false)
    }, 500)
  }, [addScore, aimAngle, board, busy, current, gameOver, getPlacementCandidates, levelComplete, pool, soundEffectsEnabled, speak, traceShot])

  useKeyboardAim({ aimAngle, onShoot: shoot, onAimChange: playAimSound, setAimAngle, step: AIM_STEP })

  useEffect(() => {
    const updateTrajectory = () => {
      const shot = traceShot(aimAngle)
      const candidates = getPlacementCandidates(shot)
      const fullPoints = [...shot.points]
      if (showAimGuide && !shot.collision && candidates[0] && fullPoints.length) {
        fullPoints[fullPoints.length - 1] = { x: candidates[0].x, y: candidates[0].y }
      }

      // Keep the direction cue at 2.5R using the regular board bubble as reference.
      const directionPoints = shot.points.slice(0, 1)
      if (directionPoints.length) {
        const referenceBubble = playfieldRef.current?.querySelector('.bubble-cell')
        const length = (referenceBubble?.getBoundingClientRect().width ?? 0) * 1.5
        const radians = aimAngle * Math.PI / 180
        directionPoints.push({
          x: directionPoints[0].x + Math.sin(radians) * length,
          y: directionPoints[0].y - Math.cos(radians) * length,
        })
      }

      setTrajectory({ ...shot, points: directionPoints, fullPoints, candidates })
    }
    updateTrajectory()
    window.addEventListener('resize', updateTrajectory)
    return () => window.removeEventListener('resize', updateTrajectory)
  }, [aimAngle, board, levels, showAimGuide, traceShot, getPlacementCandidates])

  if (!levels) return <main className="loading"><span className="brand-mark">अ</span><p>{message || 'Getting your Sanskrit bubbles ready…'}</p></main>

  return <main className="app-shell">
    <header className="topbar" aria-label="Navigation bar"><img className="navigation-logo" src="/SanskritBubble_Logo-2.png" alt="Sanskrit Bubble" /></header>
    <section className="game-layout">
      <div className="game-column">
        <div className="lesson-row"><div><div className="eyebrow">{levelId.replace('_', ' ').toUpperCase()}</div><h1>{level?.level_title?.replace(/^Lesson \d+: /, '') || 'Sanskrit vowels'}</h1></div><div className="lesson-audio-controls game-controls" aria-label="Game audio controls"><button className="icon-button" type="button" aria-label={musicPlaying ? 'Mute background music' : 'Play background music'} aria-pressed={musicPlaying} onClick={toggleMusic}>{musicPlaying ? '🔊' : '🔇'}</button><button className="icon-button" type="button" aria-label={soundEffectsEnabled ? 'Mute sound effects' : 'Play sound effects'} aria-pressed={soundEffectsEnabled} onClick={toggleSoundEffects}>{soundEffectsEnabled ? '🔔' : '🔕'}</button></div></div>
        <div className="playfield" ref={playfieldRef}>
          <div className="field-glow" />
          <div className="field-top"><span><i /> CLEAR ALL THE BUBBLES</span></div>
          <div className="field-score"><span>SCORE</span><strong key={score}>{String(score).padStart(4, '0')}</strong></div>
          <div className="top-right-actions"><button className="restart-button" onClick={resetGame}>Restart <span>↻</span></button></div>
          <div className="shoot-hint"><div className="control-hint"><span className="keycap">←</span> <span className="keycap">→</span> AIM &nbsp; <span className="keycap space-key">SPACE</span> FIRE</div><span className="game-tip">✧&nbsp; Match 3 connected sounds to pop them!</span></div>
          <div className="bubble-grid" style={{ '--cols': COLS }}>
            {board.map((row, r) => <div className={`bubble-grid-row ${r % 2 ? 'offset-row' : ''}`} key={`row-${r}`}>{row.map((bubble, c) => <div key={`${r}-${c}`} data-row={r} data-col={c} className={`bubble-cell ${bubble ? `bubble ${colorOrder[pool.findIndex((item) => item.id === bubble.id) % colorOrder.length]}` : 'empty'}`} aria-label={bubble?.devanagari}>
              {bubble && <span className="devanagari" style={{ fontSize: fitBubbleFont(bubble.devanagari, 25, 12) }}>{bubble.devanagari}</span>}
            </div>)}</div>)}
          </div>
          <svg className="aim-trajectory" viewBox={`0 0 ${Math.max(1, trajectory.width)} ${Math.max(1, trajectory.height)}`} aria-hidden="true">
            {showAimGuide && trajectory.fullPoints.length > 1 && <polyline className="aim-preview" points={trajectory.fullPoints.map(({ x, y }) => `${x},${y}`).join(' ')} />}
            {trajectory.points.length > 1 && <polyline className="aim-direction" points={trajectory.points.map(({ x, y }) => `${x},${y}`).join(' ')} />}
            {showAimGuide && trajectory.fullPoints.slice(1, -1).map((point, index) => <circle key={`bounce-${index}`} cx={point.x} cy={point.y} r="4" />)}
            {showAimGuide && trajectory.fullPoints.length > 1 && <circle className="trajectory-end" cx={trajectory.fullPoints[trajectory.fullPoints.length - 1].x} cy={trajectory.fullPoints[trajectory.fullPoints.length - 1].y} r="5" />}
            {showAimGuide && trajectory.candidates.slice(0, 1).map((candidate) => <circle key={`candidate-${candidate.row}-${candidate.col}`} className="landing-candidate preferred" cx={candidate.x} cy={candidate.y} r={Math.max(8, candidate.radius - 2)} />)}
          </svg>
          <div className="danger-line" />
          <div className="game-feedback"><span className="feedback-icon">✦</span>{message}</div>
          <div className="shooter-area"><div className="next-bubble"><small>NEXT</small>{!busy && next && <div className={`bubble mini ${colorOrder[pool.findIndex((item) => item.id === next.id) % colorOrder.length]}`}><span className="translit" style={{ fontSize: fitBubbleFont(next.iast, 16, 10) }}>{next.iast}</span></div>}</div><div className="shooter">{loadedBubble && <div className={`bubble loaded ${colorOrder[pool.findIndex((item) => item.id === loadedBubble.id) % colorOrder.length]}`}><span className="translit" style={{ fontSize: fitBubbleFont(loadedBubble.iast, 22, 18) }}>{loadedBubble.iast}</span></div>}</div></div>
          <div className="field-floor" />
        </div>
        {gameOver && <div className="level-complete-overlay"><section className="level-complete-modal game-over-modal" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
          <div className="completion-sparkle">✦</div>
          <p className="completion-eyebrow">KEEP GOING</p>
          <h2 id="game-over-title">You've got this!</h2>
          <p className="completion-description">That was close. Take a breath and try again—you can do it!</p>
          <div className="completion-word-list">{pool.map((item, index) => <div className="completion-word" key={`retry-${levelId}-${item.id ?? item.iast}`}>
            <span className={`sound-glyph ${colorOrder[index % colorOrder.length]}`}>{item.devanagari}</span>
            <span className="completion-word-text"><strong>{item.iast}</strong><small>{item.description ?? item.meaning ?? ''}</small></span>
            <button className="completion-play" aria-label={`Play ${item.iast}`} onClick={() => speak(item, { force: true })}>▶</button>
          </div>)}</div>
          <button className="completion-continue" onClick={resetGame}>PLAY AGAIN</button>
        </section></div>}
        {levelComplete && <div className="level-complete-overlay"><section className="level-complete-modal" role="dialog" aria-modal="true" aria-labelledby="completion-title">
          <div className="completion-sparkle">✦</div>
          <p className="completion-eyebrow">LEVEL COMPLETE</p>
          <h2 id="completion-title">Congratulations!</h2>
          <p className="completion-description">Level cleared! <strong className="bonus-score">+{LEVEL_COMPLETE_BONUS}</strong> points added to your score.</p>
          <LevelReviewCard pool={pool} levelId={levelId} reviewedSounds={reviewedSounds} reviewSound={reviewSound} reviewBonus={REVIEW_BONUS} colors={colorOrder} />
          <button className="completion-continue" onClick={continueAfterLevel}>{nextLevelId ? 'Continue' : 'Finish'}</button>
        </section></div>}
      </div>
      <div className="side-column"><label className="side-level-select"><select value={levelId} onChange={(event) => setLevelId(event.target.value)}>{Object.entries(levels).map(([id, item], index) => <option key={id} value={id}>{`LEVEL ${index + 1}: ${item.level_title}`}</option>)}</select></label><aside className="lesson-card"><div className="card-head"><div className="eyebrow">SOUNDS IN THIS LEVEL</div></div><p className="card-description">Listen, learn, and match the Sanskrit sounds.</p><div className="sound-list">{pool.map((item, i) => <button className="sound-item" key={`${levelId}-${i}-${item.iast}`} onClick={() => speak(item, { force: true })}><span className={`sound-glyph ${colorOrder[i % colorOrder.length]}`} style={{ width: soundGlyphWidth, fontSize: fitBubbleFont(item.devanagari, 22, 12) }}>{item.devanagari}</span><span className="sound-word"><strong>{item.iast}</strong><small>{item.description ?? item.meaning ?? ''}</small></span><span className="play-icon">▶</span></button>)}</div><div className="tip-box"><span>✧</span><p><strong>Sound tip</strong><br />Tap a sound to hear it. Try saying it out loud!</p></div></aside></div>
    </section>
    <footer className="app-footer"><span>Start with a sound. Discover an ancient script.</span><span>शुभम्&nbsp; ✦ &nbsp;Happy learning</span></footer>
  </main>
}

export default App
