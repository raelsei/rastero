import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { formatBytes, savings } from '../engine/format-bytes'
import { GROUPS, orderedVariants } from '../state/pick'
import { pin } from '../state/session'
import { useSettings } from '../state/settings'
import { ORIGINAL, type ImageEntry, type Variant } from '../state/types'
import { formatSaving, qualityCaption, variantName } from './format'
import './Strip.css'

/**
 * Every result of the image along the proof's edge, grouped by format. Each patch is the same 1:1 detail
 * crop, so artifacts compare directly; the original's crop leads as the reference.
 */
export function Strip({ image, pickKey }: { image: ImageEntry; pickKey: string | null }) {
  const enabled = useSettings((s) => s.enabled)
  const groups = GROUPS.map((group) => ({
    label: group.label,
    variants: orderedVariants(
      image,
      group.formats.filter((f) => enabled.includes(f)),
    ),
  })).filter((g) => g.variants.length > 0)
  const dpr = window.devicePixelRatio || 1
  const patchEdge = image.patch ? image.patch.size / dpr : undefined
  const scroller = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState(false)

  // When the results outgrow the stage the strip scrolls; the fade says there is more to the right.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const measure = () => setOverflow(el.scrollWidth - el.clientWidth > 2 && el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
    // Watch the box and every group: groups grow when results land or formats are switched on.
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    for (const group of el.children) observer.observe(group)
    el.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener('scroll', measure)
    }
  }, [groups.length])

  return (
    <section className="strip" aria-label="Results">
      <div className="strip-groups" ref={scroller} data-overflow={overflow}>
        <Group label="Original" count={null} n={1}>
          <PatchButton
            picked={pickKey === ORIGINAL}
            disabled={false}
            status="done"
            title={`Keep the original file · ${formatBytes(image.bytes)}`}
            onClick={() => pin(image.id, ORIGINAL)}
            image={image.patch ? <img src={image.patch.url} alt="" style={{ width: patchEdge, height: patchEdge }} /> : null}
            caption="source"
            size={formatBytes(image.bytes)}
            alpha={image.hasAlpha}
          />
        </Group>
        {groups.map((group) => (
          <Group key={group.label} label={group.label} count={group.variants.length} n={group.variants.length}>
            {group.variants.map((v) => (
              <Patch key={v.key} image={image} variant={v} picked={v.key === pickKey} patchEdge={patchEdge} />
            ))}
          </Group>
        ))}
      </div>
    </section>
  )
}

function Group({ label, count, n, children }: { label: string; count: number | null; n: number; children: ReactNode }) {
  return (
    <div className="strip-group" role="group" aria-label={label} style={{ '--n': n } as CSSProperties}>
      <div className="strip-label">
        <span>{label}</span>
        {count !== null && (
          <span className="strip-count num">
            {count} {count === 1 ? 'result' : 'results'}
          </span>
        )}
      </div>
      <div className="strip-patches">{children}</div>
    </div>
  )
}

function Patch({
  image,
  variant,
  picked,
  patchEdge,
}: {
  image: ImageEntry
  variant: Variant
  picked: boolean
  patchEdge: number | undefined
}) {
  const done = variant.status === 'done' && variant.bytes !== null
  const title = done
    ? `${variantName(variant)} · ${formatBytes(variant.bytes!)} · ${formatSaving(savings(image.bytes, variant.bytes!))} · ${(variant.ms! / 1000).toFixed(1)} s`
    : `${variantName(variant)} · ${variant.status === 'error' ? `failed: ${variant.error}` : variant.status}`

  return (
    <PatchButton
      picked={picked}
      disabled={!done}
      status={variant.status}
      title={title}
      onClick={() => pin(image.id, variant.key)}
      image={done && variant.patchUrl ? <img src={variant.patchUrl} alt="" style={{ width: patchEdge, height: patchEdge }} /> : null}
      caption={
        <>
          {qualityCaption(variant)}
          {variant.tier === 'tuned' && <span className="patch-tuned"> · tuned</span>}
        </>
      }
      size={done ? formatBytes(variant.bytes!) : '—'}
      alpha={image.hasAlpha}
    />
  )
}

function PatchButton({
  picked,
  disabled,
  status,
  title,
  onClick,
  image,
  caption,
  size,
  alpha,
}: {
  picked: boolean
  disabled: boolean
  status: Variant['status']
  title: string
  onClick: () => void
  image: ReactNode
  caption: ReactNode
  size: string
  alpha: boolean
}) {
  return (
    <button type="button" className="patch" aria-pressed={picked} data-status={status} disabled={disabled} title={title} onClick={onClick}>
      <span className="patch-frame" data-alpha={alpha}>
        {image ?? (
          <span className="patch-wait">
            <span>{status === 'error' ? 'Failed' : status === 'encoding' ? 'Encoding' : 'Queued'}</span>
            {status === 'encoding' && <span className="progress-line" />}
          </span>
        )}
        {picked && (
          <span className="patch-check" aria-hidden="true">
            <Check />
          </span>
        )}
      </span>
      <span className="patch-q">{caption}</span>
      <span className="patch-size num">{size}</span>
    </button>
  )
}
