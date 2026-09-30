import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { CopyCheck } from 'lucide-react'
import { getFormat, type FormatId } from '../engine/formats'
import { applyToAll, resetTune, tune, useSession } from '../state/session'
import { ORIGINAL, type ImageEntry } from '../state/types'
import './QualityBar.css'

const COMMIT_DELAY = 280

/**
 * Fine-tunes the picked result's quality; a value off its tier re-encodes as a tuned result.
 * Callers key it by image and pick, so a new pick starts from a clean draft.
 */
export function QualityBar({ image, pickKey }: { image: ImageEntry; pickKey: string | null }) {
  const variant = pickKey && pickKey !== ORIGINAL ? (image.variants[pickKey] ?? null) : null
  const format = variant ? getFormat(variant.spec.format) : null
  const range = format?.quality ?? null
  const committed = variant?.spec.quality ?? null
  const [draft, setDraft] = useState<number | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const count = useSession((s) => s.order.length)

  if (pickKey === ORIGINAL) {
    return <div className="quality quality-note">The original file is already smaller than every result, so it is kept as is.</div>
  }
  if (variant?.spec.format === 'png') {
    return (
      <div className="quality quality-note">
        <span>Lossless PNG has no quality setting.</span>
        {count > 1 && <ApplyAll format="png" quality={null} />}
      </div>
    )
  }
  if (!variant || !format || !range || committed === null) {
    return <div className="quality quality-note">Quality becomes adjustable once a result is picked.</div>
  }

  const value = draft ?? committed
  const fill = ((value - range.min) / (range.max - range.min)) * 100
  const tuned = variant.tier === 'tuned'

  const schedule = (next: number) => {
    setDraft(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      tune(image.id, variant.spec.format, next)
      setDraft(null)
    }, COMMIT_DELAY)
  }

  return (
    <div className="quality">
      <label className="quality-label" htmlFor="quality-slider">
        Quality <output className="num">{value}</output>
      </label>
      <input
        id="quality-slider"
        className="slider"
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        style={{ '--fill': `${fill}%` } as CSSProperties}
        aria-valuetext={`${format.label} quality ${value}`}
        onChange={(e) => schedule(Number(e.currentTarget.value))}
      />
      <button
        type="button"
        className="link-btn quality-reset"
        disabled={!tuned}
        title={tuned ? `Back to the ${format.label} tier default` : 'Nothing to reset: this is a tier default'}
        onClick={() => resetTune(image.id, variant.spec.format)}
      >
        Reset
      </button>
      {count > 1 && <ApplyAll format={variant.spec.format} quality={value} />}
    </div>
  )
}

/** Batch: the same format and quality for every image in the session. */
function ApplyAll({ format, quality }: { format: FormatId; quality: number | null }) {
  return (
    <button
      type="button"
      className="btn btn-sm btn-solid quality-apply"
      title="Pick this format and quality for every image"
      onClick={() => applyToAll(format, quality)}
    >
      <CopyCheck aria-hidden="true" /> Apply to all images
    </button>
  )
}
