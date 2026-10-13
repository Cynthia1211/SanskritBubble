import { useEffect } from 'react'
import { fitBubbleFont } from '../utils/bubbleText'

const LAUNCHER_DIAMETER = 68

function getFlightPath(points, target) {
  const route = [...points, { x: target.x, y: target.y }]
  const path = route.map(({ x, y }, index) => `${index ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  const length = route.slice(1).reduce((sum, point, index) => {
    const previous = route[index]
    return sum + Math.hypot(point.x - previous.x, point.y - previous.y)
  }, 0)

  return { path, length }
}

export function BubbleFlight({ flight, onComplete }) {
  const { bubble, color, points, target } = flight
  const { path, length } = getFlightPath(points, target)
  const duration = Math.max(260, Math.min(620, length / 1.5))
  const scale = (target.radius * 2) / LAUNCHER_DIAMETER

  useEffect(() => {
    if (!globalThis.CSS?.supports?.('offset-path', 'path("M 0 0 L 1 1")')) onComplete()
  }, [onComplete])

  return <div
    className={`bubble loaded ${color} bubble-flight`}
    style={{
      offsetPath: `path("${path}")`,
      offsetAnchor: 'center',
      offsetRotate: '0deg',
      animationDuration: `${duration}ms`,
      '--flight-scale': scale,
    }}
    onAnimationEnd={(event) => {
      if (event.target === event.currentTarget) onComplete()
    }}
    aria-hidden="true"
  >
    <span className="translit" style={{ fontSize: fitBubbleFont(bubble.iast, 22, 18) }}>{bubble.iast}</span>
  </div>
}
