export function calculateShot({ field, angle }) {
  const grid = field?.querySelector('.bubble-grid')
  const projectile = field?.querySelector('.loaded')
  const referenceBubble = field?.querySelector('.bubble-cell')
  if (!field || !grid || !projectile || !referenceBubble) return { width: 0, height: 0, points: [], collision: null, impact: null }

  const fieldRect = field.getBoundingClientRect()
  const gridRect = grid.getBoundingClientRect()
  const projectileRect = projectile.getBoundingClientRect()
  // The launcher looks larger, but all projectile geometry uses a board bubble's radius.
  const radius = referenceBubble.getBoundingClientRect().width / 2
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

  // Follow the projectile until it hits a bubble, the ceiling, or a side wall.
  // The bounce limit prevents an extreme angle from creating an endless path.
  for (let bounce = 0; bounce < 8; bounce += 1) {
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
      const lineDistance = Math.abs(dx * direction.y - dy * direction.x)
      if (projection <= 0 || projection > segmentLimit || lineDistance >= radius * 1.8) return
      const distanceFromLaunch = Math.hypot(dx, dy)
      if (!nearest || distanceFromLaunch < nearest.distance) nearest = { ...bubble, distance: distanceFromLaunch, projection, lineDistance }
    })

    if (nearest) {
      const perpendicular = nearest.x - origin.x - direction.x * nearest.projection
      const perpendicularY = nearest.y - origin.y - direction.y * nearest.projection
      const contactDistance = Math.max(0, nearest.projection - Math.sqrt(Math.max(0, (nearest.radius + radius) ** 2 - perpendicular * perpendicular - perpendicularY * perpendicularY)))
      impact = { x: origin.x + direction.x * contactDistance, y: origin.y + direction.y * contactDistance }
      collision = {
        ...nearest,
        incoming: { ...direction },
        firingOrigin: { ...origin },
        firingRadius: radius,
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
}
