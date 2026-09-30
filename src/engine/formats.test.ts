import { describe, expect, test } from 'bun:test'
import { FORMATS, outputPath, tierSpecs, variantKey } from './formats'

describe('variantKey', () => {
  test('quality-bearing and lossless keys', () => {
    expect(variantKey({ format: 'avif', quality: 55 })).toBe('avif@55')
    expect(variantKey({ format: 'png-lossy', quality: 75 })).toBe('png-lossy@75')
    expect(variantKey({ format: 'png', quality: null })).toBe('png')
  })
})

describe('tierSpecs', () => {
  test('default formats: three tiers for avif/webp/jpeg, one png-lossy tier, one lossless png, in FORMATS order', () => {
    const enabled = FORMATS.filter((f) => f.defaultEnabled).map((f) => f.id)
    expect(enabled).not.toContain('jxl')
    const specs = tierSpecs(enabled)
    expect(specs.map(variantKey)).toEqual([
      'avif@70', 'avif@55', 'avif@40',
      'webp@85', 'webp@75', 'webp@60',
      'jpeg@85', 'jpeg@75', 'jpeg@60',
      'png-lossy@75',
      'png',
    ])
    expect(specs.at(-1)).toEqual({ format: 'png', quality: null, tier: null })
    expect(specs.find((s) => s.format === 'png-lossy')).toEqual({ format: 'png-lossy', quality: 75, tier: 'balanced' })
    expect(specs[1]).toEqual({ format: 'avif', quality: 55, tier: 'balanced' })
  })

  test('order follows FORMATS regardless of the order enabled ids are given', () => {
    expect(tierSpecs(['jxl', 'jpeg']).map((s) => s.format)).toEqual(['jpeg', 'jpeg', 'jpeg', 'jxl', 'jxl', 'jxl'])
  })

  test('nothing enabled, nothing to encode', () => {
    expect(tierSpecs([])).toEqual([])
  })
})

describe('outputPath', () => {
  test('replaces the extension and keeps the folder tree', () => {
    expect(outputPath('shots/a/photo.JPG', { format: 'avif', quality: 55 })).toBe('shots/a/photo.avif')
    expect(outputPath('shots/a/photo.JPG', { format: 'avif', quality: 55 }, { withQuality: true })).toBe(
      'shots/a/photo.q55.avif',
    )
  })

  test('png-lossy writes .png; lossless png never gets a quality suffix', () => {
    expect(outputPath('photo.heic', { format: 'png-lossy', quality: 70 })).toBe('photo.png')
    expect(outputPath('photo.heic', { format: 'png-lossy', quality: 70 }, { withQuality: true })).toBe('photo.q70.png')
    expect(outputPath('photo.heic', { format: 'png', quality: null }, { withQuality: true })).toBe('photo.png')
  })

  test('jpeg uses .jpg', () => {
    expect(outputPath('x.png', { format: 'jpeg', quality: 75 })).toBe('x.jpg')
  })

  test('only the last extension is replaced; dots in folders are untouched', () => {
    expect(outputPath('v1.2/my.photo.final.png', { format: 'webp', quality: 75 })).toBe('v1.2/my.photo.final.webp')
    expect(outputPath('v1.2/noext', { format: 'webp', quality: 75 })).toBe('v1.2/noext.webp')
  })
})
