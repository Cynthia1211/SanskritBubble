// Return a font size that keeps a Sanskrit glyph or transliteration inside its bubble.
export function fitBubbleFont(text, maxSize, minSize = 8) {
  const length = Array.from(String(text ?? '')).length
  if (length <= 1) return `${maxSize}px`
  return `${Math.max(minSize, Math.round(maxSize * Math.min(1, 1.8 / length)))}px`
}
