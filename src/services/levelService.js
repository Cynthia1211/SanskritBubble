// Load lesson data from Vite's public directory.
export async function fetchLevels() {
  const response = await fetch('/levels.json')
  if (!response.ok) throw new Error('Could not load levels')
  return response.json()
}
