// Load lesson data from Vite's public directory.
export async function fetchLevels() {
  const baseUrl = import.meta.env.BASE_URL
  const response = await fetch(`${baseUrl}levels.json`)
  if (!response.ok) throw new Error('Could not load levels')
  const levels = await response.json()
  return Object.fromEntries(Object.entries(levels).map(([levelId, level]) => [levelId, {
    ...level,
    bubble_pool: (level.bubble_pool ?? []).map((item, index) => ({
      ...item,
      audio: item.audio ? `${baseUrl}${item.audio.replace(/^\/+/, '')}` : item.audio,
      id: item.id ?? `${levelId}-sound-${index}`,
    })),
  }]))
}
