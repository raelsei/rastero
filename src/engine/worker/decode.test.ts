import { beforeAll, describe, expect, test } from 'bun:test'
import { cropImageData, detailRect } from './decode'
import { PATCH_SIZE } from './protocol'

interface Detail {
  x: number
  y: number
  size: number
  alpha?: number
}

/** Flat grey RGBA image with checkerboard squares (the "detail"). */
function image(width: number, height: number, ...details: Detail[]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4).fill(128)
  for (const d of details) {
    for (let y = d.y; y < d.y + d.size; y++) {
      for (let x = d.x; x < d.x + d.size; x++) {
        const i = (y * width + x) * 4
        data.fill(((x >> 3) + (y >> 3)) % 2 ? 255 : 0, i, i + 3)
        data[i + 3] = d.alpha ?? 255
      }
    }
  }
  return { width, height, data, colorSpace: 'srgb' } as ImageData
}

const centre = (r: { x: number; y: number; size: number }) => [r.x + r.size / 2, r.y + r.size / 2]

describe('detailRect', () => {
  test('lands on the textured region of a large image', () => {
    const rect = detailRect(image(3000, 2000, { x: 2200, y: 1300, size: 300 }))
    expect(rect.size).toBe(PATCH_SIZE)
    const [cx, cy] = centre(rect)
    expect(cx).toBeGreaterThanOrEqual(2200)
    expect(cx).toBeLessThanOrEqual(2500)
    expect(cy).toBeGreaterThanOrEqual(1300)
    expect(cy).toBeLessThanOrEqual(1600)
  })

  test('is deterministic for the same pixels', () => {
    const img = image(1200, 900, { x: 100, y: 600, size: 250 })
    expect(detailRect(img)).toEqual(detailRect(img))
  })

  test('fully transparent texture does not attract the patch', () => {
    const rect = detailRect(image(1200, 900, { x: 900, y: 50, size: 250, alpha: 0 }, { x: 100, y: 600, size: 250 }))
    const [cx, cy] = centre(rect)
    expect(cx).toBeLessThan(400)
    expect(cy).toBeGreaterThan(550)
  })

  test('clamps to the smaller dimension and stays inside the image', () => {
    const rect = detailRect(image(500, 120, { x: 450, y: 0, size: 50 }))
    expect(rect.size).toBe(120)
    expect(rect.y).toBe(0)
    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.size).toBeLessThanOrEqual(500)
    expect(detailRect(image(1, 1))).toEqual({ x: 0, y: 0, size: 1 })
  })
})

describe('cropImageData', () => {
  beforeAll(() => {
    // Bun has no DOM ImageData; a structural stand-in is enough for a pixel copy.
    globalThis.ImageData ??= class {
      width: number
      height: number
      data: Uint8ClampedArray
      constructor(width: number, height: number) {
        this.width = width
        this.height = height
        this.data = new Uint8ClampedArray(width * height * 4)
      }
    } as unknown as typeof ImageData
  })

  test('copies the exact square', () => {
    const src = image(4, 3)
    for (let i = 0; i < src.data.length; i++) src.data[i] = i % 251
    const out = cropImageData(src, { x: 1, y: 1, size: 2 })
    const px = (img: ImageData, x: number, y: number) =>
      [...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4)]
    expect(out.width).toBe(2)
    expect(px(out, 0, 0)).toEqual(px(src, 1, 1))
    expect(px(out, 1, 0)).toEqual(px(src, 2, 1))
    expect(px(out, 1, 1)).toEqual(px(src, 2, 2))
  })
})
