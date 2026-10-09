import { collection, getDocs } from 'firebase/firestore'
import { levelsDb } from '../../levels-config.js'

function getLevelId(value, fallback) {
  const id = String(value ?? fallback)
  return /^\d+$/.test(id) ? `level_${id}` : id
}

function resolveAudioPath(audio) {
  if (!audio || /^(https?:|data:|blob:)/i.test(audio)) return audio
  return `${import.meta.env.BASE_URL}${String(audio).replace(/^\/+/, '')}`
}

// Load lesson data from the Firestore `levels` collection.
export async function fetchLevels() {
  const snapshot = await getDocs(collection(levelsDb, 'levels'))
  const levels = snapshot.docs.map((levelDocument) => {
    const level = levelDocument.data()
    const levelId = getLevelId(level.id, levelDocument.id)

    return [levelId, {
      ...level,
      id: level.id ?? levelId,
      bubble_pool: (Array.isArray(level.bubble_pool) ? level.bubble_pool : []).map((item, index) => ({
        ...item,
        audio: resolveAudioPath(item.audio),
        id: item.id ?? `${levelId}-sound-${index}`,
      })),
    }]
  })

  levels.sort(([firstId], [secondId]) => {
    const firstNumber = Number(firstId.match(/\d+/)?.[0] ?? 0)
    const secondNumber = Number(secondId.match(/\d+/)?.[0] ?? 0)
    return firstNumber - secondNumber
  })

  if (!levels.length) throw new Error('No levels found in Firestore')
  return Object.fromEntries(levels)
}
