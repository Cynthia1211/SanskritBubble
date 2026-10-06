// Track how many of a level's sounds were played; the target adapts to the level's word count.
export function reviewProgress(pool, reviewedSounds) {
  const sounds = pool ?? []
  const reviewedCount = sounds.filter((item) => reviewedSounds.has(item.id ?? item.iast)).length
  return {
    reviewedCount,
    total: sounds.length,
    complete: sounds.length > 0 && reviewedCount === sounds.length,
  }
}
