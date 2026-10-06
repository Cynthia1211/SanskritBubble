import { reviewProgress } from '../utils/reviewProgress'

const COLORS = ['coral', 'mint', 'gold', 'blue', 'lilac', 'teal', 'rose', 'violet', 'orange', 'lime']

export function LevelReviewCard({ pool, levelId, reviewedSounds, reviewSound, reviewBonus }) {
  const { reviewedCount, total: reviewTarget, complete: allSoundsReviewed } = reviewProgress(pool, reviewedSounds)

  return <>
    <p className={`completion-review-hint${allSoundsReviewed ? ' completed' : ''}`} role="status">
      {allSoundsReviewed
        ? <>✦ All {reviewTarget} sounds reviewed — <strong>+{reviewBonus}</strong> points earned!</>
        : <>✧ Review all {reviewTarget} sound{reviewTarget === 1 ? '' : 's'} of this level to earn <strong>+{reviewBonus}</strong> points!</>}
    </p>
    <div className="completion-review-progress" aria-hidden="true">{Array.from({ length: reviewTarget }, (_, index) => <span key={`pip-${levelId}-${index}`} className={`review-pip${index < reviewedCount ? ' filled' : ''}`} />)}</div>
    <p className="completion-review-count"><strong>{reviewedCount}</strong> / <strong>{reviewTarget}</strong> played</p>
    <div className="completion-word-list">{pool.map((item, index) => <div className="completion-word" key={`${levelId}-${item.id ?? item.iast}`}>
      <span className={`sound-glyph ${COLORS[index % COLORS.length]}`}>{item.devanagari}</span>
      <span className="completion-word-text"><strong>{item.iast}</strong><small>{item.description ?? item.meaning ?? ''}</small></span>
      <button className={`completion-play${reviewedSounds.has(item.id ?? item.iast) ? ' played' : ''}`} aria-label={`Play ${item.iast}`} aria-pressed={reviewedSounds.has(item.id ?? item.iast)} onClick={() => reviewSound(item)}>{reviewedSounds.has(item.id ?? item.iast) ? '✓' : '▶'}</button>
    </div>)}</div>
  </>
}
