// Codec adapters. Every codec is a dynamic import on purpose: the wasm for a format loads only
// the first time that format is encoded, so unused codecs never download.
import { getFormat, type FormatId, type VariantSpec } from '../formats'
import { cropImageData, toPngBlob } from './decode'
import type { PatchRect } from './protocol'

const AVIF_SPEED = 6
const JXL_EFFORT = 7
const OXIPNG_LEVEL = 2

/** Copy composited onto white: JPEG has no alpha, so transparent areas must not turn into their hidden RGB. */
function flattenOnWhite(image: ImageData): ImageData {
  const src = image.data
  const out = new Uint8ClampedArray(src.length)
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3]
    const white = 255 * (255 - a)
    // Uint8ClampedArray rounds on store.
    out[i] = (src[i] * a + white) / 255
    out[i + 1] = (src[i + 1] * a + white) / 255
    out[i + 2] = (src[i + 2] * a + white) / 255
    out[i + 3] = 255
  }
  return new ImageData(out, image.width, image.height)
}

let liqReady: Promise<unknown> | undefined

async function quantizeToPng(image: ImageData, maxQuality: number): Promise<ArrayBuffer> {
  const liq = await import('libimagequant-wasm/wasm/libimagequant_wasm.js')
  liqReady ??= liq.default()
  await liqReady
  const quantizer = new liq.ImageQuantizer()
  try {
    quantizer.setQuality(0, maxQuality)
    quantizer.setMaxColors(256)
    const result = quantizer.quantizeImage(image.data, image.width, image.height)
    try {
      const indices = result.getPaletteIndices(image.data, image.width, image.height)
      const png = liq.encode_palette_to_png(indices, result.getPalette(), image.width, image.height)
      // wasm-bindgen hands back a JS-owned array; reuse its buffer unless it is a view into a larger one.
      const whole = png.byteOffset === 0 && png.byteLength === png.buffer.byteLength
      return (whole ? png.buffer : png.slice().buffer) as ArrayBuffer
    } finally {
      result.free()
    }
  } finally {
    quantizer.free()
  }
}

async function optimisePng(png: ArrayBuffer | ImageData): Promise<ArrayBuffer> {
  const { default: optimise } = await import('@jsquash/oxipng/optimise.js')
  return optimise(png, { level: OXIPNG_LEVEL, interlace: false })
}

/** Encode decoded pixels into one variant. */
export async function encodeVariant(image: ImageData, spec: VariantSpec, hasAlpha: boolean): Promise<Blob> {
  const quality = spec.quality ?? 100
  let bytes: ArrayBuffer
  switch (spec.format) {
    case 'jpeg': {
      const { default: encode } = await import('@jsquash/jpeg/encode.js')
      bytes = await encode(hasAlpha ? flattenOnWhite(image) : image, { quality })
      break
    }
    case 'webp': {
      const { default: encode } = await import('@jsquash/webp/encode.js')
      bytes = await encode(image, { quality })
      break
    }
    case 'avif': {
      const { default: encode } = await import('@jsquash/avif/encode.js')
      bytes = await encode(image, { quality, speed: AVIF_SPEED })
      break
    }
    case 'jxl': {
      const { default: encode } = await import('@jsquash/jxl/encode.js')
      bytes = await encode(image, { quality, effort: JXL_EFFORT })
      break
    }
    case 'png':
      // optimise(ImageData) runs oxipng's raw path: encode + optimise in one pass, still lossless.
      bytes = await optimisePng(image)
      break
    case 'png-lossy': {
      bytes = await optimisePng(await quantizeToPng(image, quality))
      break
    }
  }
  return new Blob([bytes], { type: getFormat(spec.format).mime })
}

/** Native decodability of outputs, learned per worker from the first real output of each format. */
const nativeDecodable: Partial<Record<FormatId, boolean>> = {}

async function decodeOutputWasm(format: 'jxl' | 'avif', blob: Blob): Promise<ImageData | null> {
  const buffer = await blob.arrayBuffer()
  if (format === 'jxl') return (await import('@jsquash/jxl/decode.js')).default(buffer)
  return (await import('@jsquash/avif/decode.js')).default(buffer)
}

/**
 * What the UI shows for an output, from the DECODED output bytes:
 * - patchBlob: `rect` cropped 1:1, lossless PNG (always).
 * - previewBlob: full-size PNG only when the browser cannot decode the format natively (jxl on most browsers).
 */
export async function outputViews(
  format: FormatId,
  blob: Blob,
  rect: PatchRect,
): Promise<{ previewBlob: Blob | null; patchBlob: Blob }> {
  if (nativeDecodable[format] !== false) {
    let bitmap: ImageBitmap | null = null
    try {
      bitmap = await createImageBitmap(blob, rect.x, rect.y, rect.size, rect.size, { premultiplyAlpha: 'none' })
    } catch (err) {
      if (format !== 'jxl' && format !== 'avif') throw err
    }
    nativeDecodable[format] = bitmap !== null
    if (bitmap) {
      try {
        const canvas = new OffscreenCanvas(rect.size, rect.size)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable')
        ctx.drawImage(bitmap, 0, 0)
        return { previewBlob: null, patchBlob: await canvas.convertToBlob({ type: 'image/png' }) }
      } finally {
        bitmap.close()
      }
    }
  }
  // Only jxl/avif reach here: other formats rethrow native decode failures above.
  const decoded = await decodeOutputWasm(format as 'jxl' | 'avif', blob)
  if (!decoded) throw new Error(`${format}: encoded output could not be decoded`)
  const [previewBlob, patchBlob] = await Promise.all([toPngBlob(decoded), toPngBlob(cropImageData(decoded, rect))])
  return { previewBlob, patchBlob }
}
