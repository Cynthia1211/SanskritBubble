import { useCallback, useEffect, useRef, useState } from 'react'
import { clearBubbleGroup, findConnectedGroup } from './matching'
import { liftLooseBubbles } from './gravity'
import { playPopSound } from '../assets/SoundEffects'
import { LEVEL_COMPLETE_BONUS, ROWS, COLS } from './settings'

export function useShotController({
  addScore,
  aimAngle,
  board,
  colorOrder,
  current,
  gameOver,
  getPlacementCandidates,
  levelComplete,
  levelId,
  playfieldRef,
  pool,
  setBoard,
  setGameOver,
  setLevelComplete,
  setMessage,
  setShooterQueue,
  soundEffectsEnabled,
  speak,
  traceShot,
}) {
  const [busy, setBusy] = useState(false)
  const [flight, setFlight] = useState(null)
  const resolutionTimerRef = useRef(null)

  const cancelShot = useCallback(() => {
    window.clearTimeout(resolutionTimerRef.current)
    resolutionTimerRef.current = null
    setFlight(null)
    setBusy(false)
  }, [])

  useEffect(() => () => window.clearTimeout(resolutionTimerRef.current), [])

  const shoot = useCallback(() => {
    if (!current || busy || gameOver || levelComplete || !board.length) return

    const field = playfieldRef.current
    if (!field) return

    const shot = traceShot(aimAngle)
    const target = getPlacementCandidates(shot)[0]
    if (!target) {
      setMessage('')
      return
    }

    const nextBoard = board.map((row) => [...row])
    nextBoard[target.row][target.col] = current
    const group = findConnectedGroup(nextBoard, target.row, target.col, current.id)
    const cleared = group.size >= 3 ? group : new Set()
    const colorIndex = pool.findIndex((item) => item.id === current.id)

    setBusy(true)
    setMessage('')
    setFlight({
      bubble: current,
      board: nextBoard,
      cleared,
      color: colorOrder[colorIndex % colorOrder.length],
      levelId,
      points: shot.points,
      target,
    })
  }, [aimAngle, board, busy, colorOrder, current, gameOver, getPlacementCandidates, levelComplete, levelId, playfieldRef, pool, setMessage, traceShot])

  const completeFlight = useCallback(() => {
    if (!flight || flight.levelId !== levelId) return

    const { board: placedBoard, bubble, cleared } = flight
    const field = playfieldRef.current
    setFlight(null)
    setBoard(placedBoard)

    if (cleared.size) speak(bubble)
    else if (soundEffectsEnabled) playPopSound()

    resolutionTimerRef.current = window.setTimeout(() => {
      resolutionTimerRef.current = null
      const settledBoard = cleared.size ? clearBubbleGroup(placedBoard, cleared) : placedBoard
      setMessage(cleared.size
        ? `${bubble.devanagari} · ${bubble.iast} — Great match!`
        : 'Find two more matching sounds to pop a group!')

      const liftedBoard = liftLooseBubbles(settledBoard, { rows: ROWS, cols: COLS })
      const fieldRect = field?.getBoundingClientRect()
      const dangerY = fieldRect ? fieldRect.bottom - fieldRect.height * 0.2 : Infinity
      const reachesDangerLine = liftedBoard.some((row, r) => row.some((item, c) => {
        if (!item) return false
        const element = field?.querySelector(`[data-row="${r}"][data-col="${c}"]`)
        return element && element.getBoundingClientRect().bottom >= dangerY
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
      const presentIds = new Set(liftedBoard.flat().filter(Boolean).map((item) => item.id))
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
  }, [addScore, flight, levelId, playfieldRef, pool, setBoard, setGameOver, setLevelComplete, setMessage, setShooterQueue, soundEffectsEnabled, speak])

  return { busy, cancelShot, completeFlight, flight, shoot }
}
