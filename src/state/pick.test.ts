import { describe, expect, test } from 'bun:test'
import { variantKey, type FormatId, type VariantSpec } from '../engine/formats'
import { autoPick, currentPick, formatVariant } from './pick'
import { ORIGINAL, type ImageEntry, type Variant, type VariantTier } from './types'

const ALL: FormatId[] = ['avif', 'webp', 'jpeg', 'png-lossy', 'png']

function variant(spec: VariantSpec, tier: VariantTier, bytes: number | null, status: Variant['status'] = 'done'): Variant {
  return { key: variantKey(spec), spec, tier, status, bytes, ms: 1, blob: null, viewUrl: null, patchUrl: null, error: null }
}

function image(variants: Variant[], opts: Partial<ImageEntry> = {}): ImageEntry {
  return {
    id: 'img1',
    name: 'photo.jpg',
    relativePath: 'photo.jpg',
    folder: '',
    file: new File([], 'photo.jpg'),
    bytes: 100_000,
    sourceType: 'jpeg',
    status: 'ready',
    width: 10,
    height: 10,
    hasAlpha: false,
    originalUrl: null,
    thumbUrl: null,
    patch: null,
    error: null,
    variants: Object.fromEntries(variants.map((v) => [v.key, v])),
    pinned: null,
    ...opts,
  }
}

describe('autoPick', () => {
  test('picks the smallest finished balanced result, ignoring smaller non-balanced tiers', () => {
    const img = image([
      variant({ format: 'avif', quality: 55 }, 'balanced', 20_000),
      variant({ format: 'avif', quality: 40 }, 'small', 9_000),
      variant({ format: 'webp', quality: 75 }, 'balanced', 30_000),
    ])
    expect(autoPick(img, ALL)).toBe('avif@55')
  })

  test('waits (null) while no balanced result has finished', () => {
    const img = image([
      variant({ format: 'avif', quality: 55 }, 'balanced', null, 'encoding'),
      variant({ format: 'avif', quality: 40 }, 'small', 9_000),
    ])
    expect(autoPick(img, ALL)).toBeNull()
  })

  test('never picks JPEG for an image with transparency', () => {
    const img = image(
      [
        variant({ format: 'jpeg', quality: 75 }, 'balanced', 5_000),
        variant({ format: 'webp', quality: 75 }, 'balanced', 30_000),
      ],
      { hasAlpha: true },
    )
    expect(autoPick(img, ALL)).toBe('webp@75')
  })

  test('falls back to the original when no result is smaller than the source', () => {
    const img = image([variant({ format: 'png', quality: null }, null, 150_000), variant({ format: 'webp', quality: 75 }, 'balanced', 100_000)])
    expect(autoPick(img, ALL)).toBe(ORIGINAL)
  })

  test('ignores results of formats that are switched off', () => {
    const img = image([
      variant({ format: 'avif', quality: 55 }, 'balanced', 20_000),
      variant({ format: 'webp', quality: 75 }, 'balanced', 30_000),
    ])
    expect(autoPick(img, ['webp'])).toBe('webp@75')
  })
})

describe('currentPick', () => {
  test("the user's sign-off wins over the automatic pick", () => {
    const img = image(
      [variant({ format: 'avif', quality: 55 }, 'balanced', 20_000), variant({ format: 'jpeg', quality: 85 }, 'high', 60_000)],
      { pinned: 'jpeg@85' },
    )
    expect(currentPick(img, ALL)).toBe('jpeg@85')
  })

  test('a sign-off on a format that was switched off falls back to the automatic pick', () => {
    const img = image(
      [variant({ format: 'avif', quality: 55 }, 'balanced', 20_000), variant({ format: 'jpeg', quality: 85 }, 'high', 60_000)],
      { pinned: 'jpeg@85' },
    )
    expect(currentPick(img, ['avif'])).toBe('avif@55')
  })
})

describe('formatVariant', () => {
  test('prefers a tuned result over the balanced tier', () => {
    const img = image([
      variant({ format: 'avif', quality: 55 }, 'balanced', 20_000),
      variant({ format: 'avif', quality: 62 }, 'tuned', 24_000),
    ])
    expect(formatVariant(img, 'avif')?.key).toBe('avif@62')
  })

  test('uses the single lossless PNG result', () => {
    const img = image([variant({ format: 'png', quality: null }, null, 90_000)])
    expect(formatVariant(img, 'png')?.key).toBe('png')
  })
})
