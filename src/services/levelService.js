import { collection, getDocs } from 'firebase/firestore'
import { getBytes, ref } from 'firebase/storage'
import { levelsDb, levelsStorage } from '../config/firebase.js'

const LEVEL_AUDIO_CACHE_PREFIX = 'sanskrit-bubble-level-audio:'
const LEVELS_SESSION_CACHE_KEY = 'sanskrit-bubble-levels'
const pendingAudioDownloads = new Map()

function getLevelId(value, fallback) {
  const id = String(value ?? fallback)
  return /^\d+$/.test(id) ? `level_${id}` : id
}

function resolveAudioPath(audio) {
  if (!audio || /^(https?:|data:|blob:|gs:)/i.test(audio)) return audio
  return `${import.meta.env.BASE_URL}${String(audio).replace(/^\/+/, '')}`
}

function readLevelAudioCache(levelId) {
  try {
    return JSON.parse(window.sessionStorage.getItem(`${LEVEL_AUDIO_CACHE_PREFIX}${levelId}`) || '{}')
  } catch {
    return {}
  }
}

function readCachedLevels() {
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(LEVELS_SESSION_CACHE_KEY) || 'null')
    return cached && typeof cached === 'object' && Object.keys(cached).length ? cached : null
  } catch {
    return null
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function fetchAudioDataUrl(audio) {
  let blob

  if (/^gs:\/\//i.test(audio)) {
    const bytes = await getBytes(ref(levelsStorage, audio))
    const extension = audio.split(/[?#]/)[0].split('.').pop()?.toLowerCase()
    const mimeType = ({ mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4' })[extension]
    blob = new Blob([bytes], mimeType ? { type: mimeType } : undefined)
  } else {
    const response = await fetch(audio)
    if (!response.ok) throw new Error(`Could not load audio (${response.status})`)
    blob = await response.blob()
  }

  return blobToDataUrl(blob)
}

function getAudioDataUrl(audio) {
  if (!pendingAudioDownloads.has(audio)) {
    const request = fetchAudioDataUrl(audio).finally(() => pendingAudioDownloads.delete(audio))
    pendingAudioDownloads.set(audio, request)
  }

  return pendingAudioDownloads.get(audio)
}

// Cache the selected lesson's audio bytes in this tab's session so playback
// does not request the same Firebase Storage objects again.
export async function cacheLevelAudio(levelId, level) {
  if (!level) return level
  if (!level.bubble_pool?.length) return { ...level, audioCached: true }

  const cache = readLevelAudioCache(levelId)
  const entries = await Promise.all(level.bubble_pool.map(async (item) => {
    if (!item.audio) return [item.id, item]

    const cached = cache[item.id]
    if (cached?.source === item.audio && cached.data) {
      return [item.id, { ...item, audio: cached.data }]
    }

    try {
      const data = await getAudioDataUrl(item.audio)
      cache[item.id] = { source: item.audio, data }
      return [item.id, { ...item, audio: data }]
    } catch {
      // Keep playback available through the original URL if caching fails.
      return [item.id, item]
    }
  }))

  try {
    window.sessionStorage.setItem(`${LEVEL_AUDIO_CACHE_PREFIX}${levelId}`, JSON.stringify(cache))
  } catch {
    // The audio can still play in memory when session storage is full.
  }

  const audioById = new Map(entries)
  return {
    ...level,
    bubble_pool: level.bubble_pool.map((item) => audioById.get(item.id) ?? item),
    audioCached: true,
  }
}

// Load lesson data from the Firestore `levels` collection.
export async function fetchLevels() {
  const cachedLevels = readCachedLevels()
  if (cachedLevels) return cachedLevels

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
  const levelsById = Object.fromEntries(levels)

  try {
    window.sessionStorage.setItem(LEVELS_SESSION_CACHE_KEY, JSON.stringify(levelsById))
  } catch {
    // Keep the loaded levels usable even if session storage is unavailable/full.
  }

  return levelsById
}
