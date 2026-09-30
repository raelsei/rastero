export type FormatId = 'jpeg' | 'webp' | 'avif' | 'png' | 'png-lossy' | 'jxl'
export type TierId = 'high' | 'balanced' | 'small'

export interface FormatDef {
  id: FormatId
  label: string
  mime: string
  ext: string
  defaultEnabled: boolean
  /** Quality per tier; lossless png has none. */
  tiers: Partial<Record<TierId, number>>
  /** Slider range; null = not tunable (png). */
  quality: { min: number; max: number; step: number } | null
  supportsAlpha: boolean
}

export interface VariantSpec {
  format: FormatId
  /** null only for lossless png. */
  quality: number | null
}

export const TIERS: readonly TierId[] = ['high', 'balanced', 'small']

const QUALITY_RANGE = { min: 1, max: 100, step: 1 } as const

/** Single source of truth for tier qualities. png-lossy values are libimagequant max quality. */
export const FORMATS: readonly FormatDef[] = [
  {
    id: 'avif',
    label: 'AVIF',
    mime: 'image/avif',
    ext: 'avif',
    defaultEnabled: true,
    tiers: { high: 70, balanced: 55, small: 40 },
    quality: QUALITY_RANGE,
    supportsAlpha: true,
  },
  {
    id: 'webp',
    label: 'WebP',
    mime: 'image/webp',
    ext: 'webp',
    defaultEnabled: true,
    tiers: { high: 85, balanced: 75, small: 60 },
    quality: QUALITY_RANGE,
    supportsAlpha: true,
  },
  {
    id: 'jpeg',
    label: 'JPEG',
    mime: 'image/jpeg',
    ext: 'jpg',
    defaultEnabled: true,
    tiers: { high: 85, balanced: 75, small: 60 },
    quality: QUALITY_RANGE,
    supportsAlpha: false,
  },
  {
    id: 'png-lossy',
    label: 'PNG (lossy)',
    mime: 'image/png',
    ext: 'png',
    defaultEnabled: true,
    // One tier: quantization is slow and the tiers barely differ (256 colours is the real limit on photos).
    tiers: { balanced: 75 },
    quality: QUALITY_RANGE,
    supportsAlpha: true,
  },
  {
    id: 'png',
    label: 'PNG',
    mime: 'image/png',
    ext: 'png',
    defaultEnabled: true,
    tiers: {},
    quality: null,
    supportsAlpha: true,
  },
  {
    id: 'jxl',
    label: 'JPEG XL',
    mime: 'image/jxl',
    ext: 'jxl',
    defaultEnabled: false,
    tiers: { high: 85, balanced: 75, small: 60 },
    quality: QUALITY_RANGE,
    supportsAlpha: true,
  },
]

const BY_ID = Object.fromEntries(FORMATS.map((f) => [f.id, f])) as Record<FormatId, FormatDef>

export function getFormat(id: FormatId): FormatDef {
  const def = BY_ID[id]
  if (!def) throw new Error(`Unknown format: ${id}`)
  return def
}

/** Stable identifier of a variant, e.g. 'avif@55', 'png'. */
export function variantKey(spec: VariantSpec): string {
  return spec.quality === null ? spec.format : `${spec.format}@${spec.quality}`
}

/** Tier variants for the enabled formats, in FORMATS order then tier order. */
export function tierSpecs(enabled: readonly FormatId[]): Array<VariantSpec & { tier: TierId | null }> {
  const on = new Set(enabled)
  const specs: Array<VariantSpec & { tier: TierId | null }> = []
  for (const def of FORMATS) {
    if (!on.has(def.id)) continue
    if (def.quality === null) {
      specs.push({ format: def.id, quality: null, tier: null })
      continue
    }
    for (const tier of TIERS) {
      const quality = def.tiers[tier]
      if (quality !== undefined) specs.push({ format: def.id, quality, tier })
    }
  }
  return specs
}

/**
 * Output path for a variant, preserving the source folder tree.
 * 'shots/a/photo.JPG' + avif@55 -> 'shots/a/photo.avif' (withQuality: 'shots/a/photo.q55.avif').
 */
export function outputPath(
  sourceRelativePath: string,
  spec: VariantSpec,
  opts?: { withQuality?: boolean },
): string {
  const slash = sourceRelativePath.lastIndexOf('/')
  const dir = sourceRelativePath.slice(0, slash + 1)
  const name = sourceRelativePath.slice(slash + 1)
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const q = opts?.withQuality && spec.quality !== null ? `.q${spec.quality}` : ''
  return `${dir}${stem}${q}.${getFormat(spec.format).ext}`
}
