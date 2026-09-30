export type SourceType = 'jpeg' | 'png' | 'gif' | 'webp' | 'avif' | 'heic' | 'jxl' | 'bmp'

/** Bytes read by sniffFile; enough for an ftyp box with a handful of compatible brands. */
export const SNIFF_BYTES = 64

const AVIF_BRANDS = ['avif', 'avis']
const HEIC_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs']
const BMP_DIB_HEADER_SIZES = [12, 40, 52, 56, 64, 108, 124]
const JXL_CONTAINER = [0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a]
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function bytesAt(head: Uint8Array, offset: number, expected: readonly number[]): boolean {
  if (head.length < offset + expected.length) return false
  for (let i = 0; i < expected.length; i++) if (head[offset + i] !== expected[i]) return false
  return true
}

function ascii(head: Uint8Array, offset: number, length: number): string {
  if (head.length < offset + length) return ''
  return String.fromCharCode(...head.subarray(offset, offset + length))
}

function sniffFtyp(head: Uint8Array): SourceType | null {
  if (ascii(head, 4, 4) !== 'ftyp') return null
  const major = ascii(head, 8, 4)
  if (AVIF_BRANDS.includes(major)) return 'avif'
  if (HEIC_BRANDS.includes(major)) return 'heic'
  // Compatible brands start at 16 and run to the end of the ftyp box (bounded by what we have).
  const boxSize = ((head[0] << 24) | (head[1] << 16) | (head[2] << 8) | head[3]) >>> 0
  const boxEnd = Math.min(boxSize, head.length)
  const compat: string[] = []
  for (let off = 16; off + 4 <= boxEnd; off += 4) compat.push(ascii(head, off, 4))
  if (compat.some((b) => AVIF_BRANDS.includes(b))) return 'avif'
  if (compat.some((b) => HEIC_BRANDS.includes(b))) return 'heic'
  return null
}

/** Identify an image by magic bytes only. */
export function sniff(head: Uint8Array): SourceType | null {
  if (bytesAt(head, 0, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (bytesAt(head, 0, PNG_SIGNATURE)) return 'png'
  const sig6 = ascii(head, 0, 6)
  if (sig6 === 'GIF87a' || sig6 === 'GIF89a') return 'gif'
  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 4) === 'WEBP') return 'webp'
  if (bytesAt(head, 0, [0xff, 0x0a]) || bytesAt(head, 0, JXL_CONTAINER)) return 'jxl'
  if (ascii(head, 0, 2) === 'BM' && head.length >= 18) {
    const dibSize = head[14] | (head[15] << 8) | (head[16] << 16) | (head[17] << 24)
    if (BMP_DIB_HEADER_SIZES.includes(dibSize)) return 'bmp'
  }
  return sniffFtyp(head)
}

export async function sniffFile(file: Blob): Promise<SourceType | null> {
  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer())
  return sniff(head)
}
