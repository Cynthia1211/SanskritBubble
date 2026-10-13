import { useCallback, useRef } from 'react'

const MIN_ANGLE = -85
const MAX_ANGLE = 85

export function usePointerAim({ aimAngle, disabled, onAimChange, onShoot, playfieldRef, setAimAngle }) {
  const activePointerId = useRef(null)

  const getAngle = useCallback((event) => {
    const launcher = playfieldRef.current?.querySelector('.loaded')
    if (!launcher) return aimAngle

    const bounds = launcher.getBoundingClientRect()
    const dx = event.clientX - (bounds.left + bounds.width / 2)
    const dy = bounds.top + bounds.height / 2 - event.clientY
    if (dy <= 0) return aimAngle
    const angle = Math.atan2(dx, dy) * 180 / Math.PI
    return Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, angle))
  }, [aimAngle, playfieldRef])

  const updateAngle = useCallback((event) => {
    const nextAngle = getAngle(event)
    setAimAngle(nextAngle)
    return nextAngle
  }, [getAngle, setAimAngle])

  const onPointerDown = useCallback((event) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
    if (event.target.closest('button, select, .game-tip, .control-hint, .level-complete-overlay')) return

    event.preventDefault()
    activePointerId.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)

    const nextAngle = updateAngle(event)
    if (nextAngle !== aimAngle) onAimChange?.()
  }, [aimAngle, disabled, onAimChange, updateAngle])

  const onPointerMove = useCallback((event) => {
    if (event.pointerId !== activePointerId.current || disabled) return
    event.preventDefault()
    updateAngle(event)
  }, [disabled, updateAngle])

  const onPointerUp = useCallback((event) => {
    if (event.pointerId !== activePointerId.current) return
    event.preventDefault()
    const nextAngle = updateAngle(event)
    activePointerId.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    onShoot(nextAngle)
  }, [onShoot, updateAngle])

  const onPointerCancel = useCallback((event) => {
    if (event.pointerId === activePointerId.current) activePointerId.current = null
  }, [])

  const onLostPointerCapture = useCallback((event) => {
    if (event.pointerId === activePointerId.current) activePointerId.current = null
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture }
}
