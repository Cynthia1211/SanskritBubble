import { useEffect } from 'react'

// Keep global game-key handling out of the component's rendering markup.
export function useKeyboardAim({ onShoot, setAimAngle, step = 2, minAngle = -85, maxAngle = 85 }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        const delta = event.key === 'ArrowLeft' ? -step : step
        setAimAngle((angle) => Math.max(minAngle, Math.min(maxAngle, angle + delta)))
      } else if (event.code === 'Space') {
        event.preventDefault()
        onShoot()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [maxAngle, minAngle, onShoot, setAimAngle, step])
}
