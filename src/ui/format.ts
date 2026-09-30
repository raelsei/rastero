import type { ImageEntry, Variant } from '../state/types'

/** Savings as the proof prints them: '−93%' smaller, '+12%' bigger, '0%'. */
export function formatSaving(fraction: number): string {
  const pct = Math.round(fraction * 100)
  if (pct === 0) return '0%'
  return pct > 0 ? `−${pct}%` : `+${-pct}%`
}

/** Short quality caption for a result: 'q55', 'lossy', 'lossless', 'q62'. */
export function qualityCaption(v: Variant): string {
  if (v.spec.format === 'png') return 'lossless'
  if (v.spec.format === 'png-lossy' && v.tier !== 'tuned') return 'lossy'
  return `q${v.spec.quality}`
}

/** 'AVIF q55', 'PNG lossless', 'PNG lossy q75'. */
export function variantName(v: Variant): string {
  switch (v.spec.format) {
    case 'png':
      return 'PNG lossless'
    case 'png-lossy':
      return `PNG lossy q${v.spec.quality}`
    case 'avif':
      return `AVIF q${v.spec.quality}`
    case 'webp':
      return `WebP q${v.spec.quality}`
    case 'jpeg':
      return `JPEG q${v.spec.quality}`
    case 'jxl':
      return `JPEG XL q${v.spec.quality}`
  }
}

export function dimensions(image: ImageEntry): string | null {
  return image.width === null || image.height === null ? null : `${image.width} × ${image.height}`
}
