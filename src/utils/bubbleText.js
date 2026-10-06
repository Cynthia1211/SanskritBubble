// Return a font size that keeps a Sanskrit glyph or transliteration inside its bubble.
export function fitBubbleFont(text, maxSize, minSize = 8) {
  const value = String(text ?? '')
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('hi', { granularity: 'grapheme' })
    : null
  const length = segmenter ? Array.from(segmenter.segment(value)).length : Array.from(value).length
  if (length <= 1) return `${maxSize}px`
  return `${Math.max(minSize, Math.round(maxSize * Math.min(1, 1.8 / length)))}px`
}
