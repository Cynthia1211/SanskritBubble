import { useEffect } from 'react'

// Keep global game-key handling out of the component's rendering markup.
export function useKeyboardAim({ aimAngle, onShoot, onAimChange, setAimAngle, step = 2, minAngle = -85, maxAngle = 85 }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        const delta = event.key === 'ArrowLeft' ? -step : step
        const nextAngle = Math.max(minAngle, Math.min(maxAngle, aimAngle + delta))
        if (nextAngle !== aimAngle) onAimChange?.()
        setAimAngle(nextAngle)
      } else if (event.code === 'Space') {
        event.preventDefault()
        onShoot()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [aimAngle, maxAngle, minAngle, onAimChange, onShoot, setAimAngle, step])
}
