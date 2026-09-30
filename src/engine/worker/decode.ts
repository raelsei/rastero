// Wasm decoders are dynamic imports on purpose: each codec (and its multi-MB wasm) loads only
// when a source actually needs it, keeping the worker's initial chunk wasm-free.
import { sniffFile } from '../sniff'
import { PATCH_SIZE, type PatchRect } from './protocol'
import type { LibHeif } from 'libheif-js/libheif-wasm/libheif-bundle.mjs'

export interface Decoded {
  imageData: ImageData
  hasAlpha: boolean
  /** false when the browser could not decode the source and a wasm decoder was used. */
  native: boolean
  /** Deterministic 1:1 detail crop rect (see detailRect). */
  patch: PatchRect
}

export function hasAnyAlpha(image: ImageData): boolean {
  const data = image.data
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) return true
  return false
}

export function toPngBlob(image: ImageData): Promise<Blob> {
  const canvas = new OffscreenCanvas(image.width, image.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable')
  ctx.putImageData(image, 0, 0)
  return canvas.convertToBlob({ type: 'image/png' })
}

/** Lossless copy of a square region. */
export function cropImageData(image: ImageData, rect: PatchRect): ImageData {
  const out = new ImageData(rect.size, rect.size)
  const rowBytes = rect.size * 4
  for (let row = 0; row < rect.size; row++) {
    const start = ((rect.y + row) * image.width + rect.x) * 4
    out.data.set(image.data.subarray(start, start + rowBytes), row * rowBytes)
  }
  return out
}

const DETAIL_GRID = 256

/**
 * Where compression artifacts show most: the PATCH_SIZE window with the highest edge energy.
 * Pure JS over a block-averaged ≤256 px luma grid (alpha-weighted, so transparent areas never win),
 * so the same pixels always give the same rect.
 */
export function detailRect(image: ImageData): PatchRect {
  const { width, height, data } = image
  const size = Math.min(PATCH_SIZE, width, height)
  const step = Math.max(1, Math.ceil(Math.max(width, height) / DETAIL_GRID))
  const gw = Math.ceil(width / step)
  const gh = Math.ceil(height / step)

  const luma = new Float32Array(gw * gh)
  const count = new Uint32Array(gw * gh)
  for (let y = 0; y < height; y++) {
    const rowCell = ((y / step) | 0) * gw
    for (let x = 0, i = y * width * 4; x < width; x++, i += 4) {
      const cell = rowCell + ((x / step) | 0)
      luma[cell] += ((0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) * data[i + 3]) / 255
      count[cell]++
    }
  }
  for (let c = 0; c < luma.length; c++) luma[c] /= count[c]

  // Summed-area table of gradient energy, (gw+1) x (gh+1).
  const sat = new Float64Array((gw + 1) * (gh + 1))
  for (let gy = 0; gy < gh; gy++) {
    let rowSum = 0
    for (let gx = 0; gx < gw; gx++) {
      const c = gy * gw + gx
      const dx = gx + 1 < gw ? Math.abs(luma[c + 1] - luma[c]) : 0
      const dy = gy + 1 < gh ? Math.abs(luma[c + gw] - luma[c]) : 0
      rowSum += dx + dy
      sat[(gy + 1) * (gw + 1) + gx + 1] = sat[gy * (gw + 1) + gx + 1] + rowSum
    }
  }

  const winW = Math.min(gw, Math.max(1, Math.round(size / step)))
  const winH = Math.min(gh, Math.max(1, Math.round(size / step)))
  let best = -1
  let bestX = 0
  let bestY = 0
  for (let gy = 0; gy + winH <= gh; gy++) {
    for (let gx = 0; gx + winW <= gw; gx++) {
      const x2 = gx + winW
      const y2 = gy + winH
      const energy =
        sat[y2 * (gw + 1) + x2] - sat[gy * (gw + 1) + x2] - sat[y2 * (gw + 1) + gx] + sat[gy * (gw + 1) + gx]
      if (energy > best) {
        best = energy
        bestX = gx
        bestY = gy
      }
    }
  }
  const cx = (bestX + winW / 2) * step
  const cy = (bestY + winH / 2) * step
  return {
    x: Math.min(width - size, Math.max(0, Math.round(cx - size / 2))),
    y: Math.min(height - size, Math.max(0, Math.round(cy - size / 2))),
    size,
  }
}

const THUMB_EDGE = 256

/** Small list-row preview: longest edge ≤ 256 px, JPEG (PNG when the image has alpha). */
export async function toThumbBlob(image: ImageData, hasAlpha: boolean): Promise<Blob> {
  const scale = Math.min(1, THUMB_EDGE / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  // Resizing via createImageBitmap avoids allocating a full-size canvas for the source.
  const bitmap = await createImageBitmap(image, { resizeWidth: width, resizeHeight: height, resizeQuality: 'high' })
  try {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0)
    return await canvas.convertToBlob(hasAlpha ? { type: 'image/png' } : { type: 'image/jpeg', quality: 0.82 })
  } finally {
    bitmap.close()
  }
}

async function decodeNative(source: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image', premultiplyAlpha: 'none' })
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable')
    ctx.drawImage(bitmap, 0, 0)
    return ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  } finally {
    bitmap.close()
  }
}

let libheif: LibHeif | undefined

async function decodeHeic(source: Blob): Promise<ImageData> {
  if (!libheif) {
    const { default: factory } = await import('libheif-js/libheif-wasm/libheif-bundle.mjs')
    libheif = factory()
  }
  const decoder = new libheif.HeifDecoder()
  const images = decoder.decode(new Uint8Array(await source.arrayBuffer()))
  try {
    const primary = images.find((img) => img.is_primary()) ?? images[0]
    if (!primary) throw new Error('HEIC: no image found')
    const target = new ImageData(primary.get_width(), primary.get_height())
    const { promise, resolve, reject } = Promise.withResolvers<ImageData>()
    primary.display(target, (result) => (result ? resolve(result) : reject(new Error('HEIC: decode failed'))))
    return await promise
  } finally {
    for (const img of images) img.free()
    if (decoder.decoder) libheif.heif_context_free(decoder.decoder)
    decoder.decoder = null
  }
}

async function decodeWasm(source: Blob): Promise<ImageData | null> {
  switch (await sniffFile(source)) {
    case 'heic':
      return decodeHeic(source)
    case 'jxl':
      return (await import('@jsquash/jxl/decode.js')).default(await source.arrayBuffer())
    case 'avif':
      return (await import('@jsquash/avif/decode.js')).default(await source.arrayBuffer())
    case 'webp':
      return (await import('@jsquash/webp/decode.js')).default(await source.arrayBuffer())
    default:
      return null
  }
}

/** Native decode (EXIF orientation applied) with wasm fallback by sniffed type. */
export async function decodeSource(source: Blob): Promise<Decoded> {
  let imageData: ImageData
  let native = true
  try {
    imageData = await decodeNative(source)
  } catch (nativeError) {
    const fallback = await decodeWasm(source)
    if (!fallback) throw nativeError
    imageData = fallback
    native = false
  }
  return { imageData, hasAlpha: hasAnyAlpha(imageData), native, patch: detailRect(imageData) }
}
