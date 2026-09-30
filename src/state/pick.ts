import { FORMATS, getFormat, type FormatId } from '../engine/formats'
import { ORIGINAL, type ImageEntry, type Variant } from './types'

const FORMAT_ORDER = Object.fromEntries(FORMATS.map((f, i) => [f.id, i])) as Record<FormatId, number>
const TIER_ORDER = { high: 0, balanced: 1, small: 2, tuned: 3 } as const

/** Display groups for the result strip and grid: PNG gathers its lossy and lossless variants. */
export const GROUPS: ReadonlyArray<{ label: string; formats: readonly FormatId[] }> = [
  { label: 'AVIF', formats: ['avif'] },
  { label: 'WebP', formats: ['webp'] },
  { label: 'JPEG', formats: ['jpeg'] },
  { label: 'PNG', formats: ['png-lossy', 'png'] },
  { label: 'JPEG XL', formats: ['jxl'] },
]

/** Variants of the given formats in strip order: format order, then high → balanced → small → tuned. */
export function orderedVariants(image: ImageEntry, formats: readonly FormatId[]): Variant[] {
  return Object.values(image.variants)
    .filter((v) => formats.includes(v.spec.format))
    .sort(
      (a, b) =>
        FORMAT_ORDER[a.spec.format] - FORMAT_ORDER[b.spec.format] ||
        (a.tier === null ? 0 : TIER_ORDER[a.tier]) - (b.tier === null ? 0 : TIER_ORDER[b.tier]),
    )
}

/**
 * Automatic pick: the smallest finished balanced result among enabled formats that can keep the image's
 * transparency. Falls back to the original when no finished candidate is smaller than the source.
 * Returns null while no balanced result has finished yet.
 */
export function autoPick(image: ImageEntry, enabled: readonly FormatId[]): string | null {
  let best: Variant | null = null
  for (const v of Object.values(image.variants)) {
    if (v.status !== 'done' || v.bytes === null || !enabled.includes(v.spec.format)) continue
    if (image.hasAlpha && !getFormat(v.spec.format).supportsAlpha) continue
    if (v.tier !== 'balanced' && !(v.tier === null && v.spec.format === 'png')) continue
    if (
      best === null ||
      v.bytes < best.bytes! ||
      (v.bytes === best.bytes && FORMAT_ORDER[v.spec.format] < FORMAT_ORDER[best.spec.format])
    ) {
      best = v
    }
  }
  if (best === null) return null
  return best.bytes! < image.bytes ? best.key : ORIGINAL
}

/** The result this image exports: the user's sign-off when it still exists, otherwise the automatic pick. */
export function currentPick(image: ImageEntry, enabled: readonly FormatId[]): string | null {
  if (image.pinned === ORIGINAL) return ORIGINAL
  if (image.pinned !== null) {
    const v = image.variants[image.pinned]
    if (v && enabled.includes(v.spec.format)) return image.pinned
  }
  return autoPick(image, enabled)
}

/** The variant a format column or format export uses: its tuned result, else its balanced tier (lossless PNG has no tier). */
export function formatVariant(image: ImageEntry, format: FormatId): Variant | null {
  let tuned: Variant | null = null
  let base: Variant | null = null
  for (const v of Object.values(image.variants)) {
    if (v.spec.format !== format) continue
    if (v.tier === 'tuned') tuned = v
    else if (v.tier === 'balanced' || v.tier === null) base = v
  }
  return tuned ?? base
}

/** Output bytes for a pick key ('original' → the source size); null while unresolved. */
export function pickBytes(image: ImageEntry, key: string | null): number | null {
  if (key === null) return null
  if (key === ORIGINAL) return image.bytes
  const v = image.variants[key]
  return v?.status === 'done' ? v.bytes : null
}
