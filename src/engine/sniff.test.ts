import { describe, expect, test } from 'bun:test'
import { sniff, sniffFile } from './sniff'

const bytes = (...parts: Array<string | number[]>) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)))

/** ISOBMFF ftyp box: size, 'ftyp', major brand, minor version, compatible brands. */
const ftyp = (major: string, ...compat: string[]) => {
  const size = 16 + compat.length * 4
  return bytes([0, 0, 0, size], 'ftyp', major, [0, 0, 0, 0], ...compat, [0, 0, 0, 0x20], 'meta')
}

describe('sniff', () => {
  test('recognises common signatures', () => {
    expect(sniff(bytes([0xff, 0xd8, 0xff, 0xe1]))).toBe('jpeg')
    expect(sniff(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png')
    expect(sniff(bytes('GIF89a'))).toBe('gif')
    expect(sniff(bytes('GIF87a'))).toBe('gif')
    expect(sniff(bytes('RIFF', [1, 2, 3, 4], 'WEBPVP8 '))).toBe('webp')
  })

  test('RIFF without WEBP is not webp', () => {
    expect(sniff(bytes('RIFF', [1, 2, 3, 4], 'WAVEfmt '))).toBeNull()
  })

  test('jxl codestream and container', () => {
    expect(sniff(bytes([0xff, 0x0a, 0xfa]))).toBe('jxl')
    expect(sniff(bytes([0, 0, 0, 0x0c], 'JXL ', [0x0d, 0x0a, 0x87, 0x0a], [0, 0, 0, 0x14], 'ftypjxl '))).toBe('jxl')
  })

  test('bmp requires a known DIB header size', () => {
    const header = (dib: number) => bytes('BM', [0, 0, 0, 0, 0, 0, 0, 0, 0x36, 0, 0, 0, dib, 0, 0, 0])
    expect(sniff(header(40))).toBe('bmp')
    expect(sniff(header(124))).toBe('bmp')
    expect(sniff(header(7))).toBeNull()
    expect(sniff(bytes('BM hello, this is text'))).toBeNull()
  })

  test('avif vs heic by major brand', () => {
    expect(sniff(ftyp('avif', 'mif1', 'miaf'))).toBe('avif')
    expect(sniff(ftyp('avis', 'msf1'))).toBe('avif')
    expect(sniff(ftyp('heic', 'mif1', 'heic'))).toBe('heic')
    expect(sniff(ftyp('heix', 'mif1'))).toBe('heic')
    expect(sniff(ftyp('hevc', 'msf1'))).toBe('heic')
  })

  test('mif1 major decides by compatible brands', () => {
    expect(sniff(ftyp('mif1', 'mif1', 'heic'))).toBe('heic')
    expect(sniff(ftyp('mif1', 'miaf', 'avif'))).toBe('avif')
    expect(sniff(ftyp('mif1', 'mif1', 'miaf'))).toBeNull()
  })

  test('compatible brands past the ftyp box are ignored', () => {
    // 'avif' appears only in the following box, not in the ftyp compat list.
    expect(sniff(bytes([0, 0, 0, 16], 'ftyp', 'mif1', [0, 0, 0, 0], 'avif'))).toBeNull()
  })

  test('mp4 video and garbage are not images', () => {
    expect(sniff(ftyp('isom', 'isom', 'mp41'))).toBeNull()
    expect(sniff(bytes('hello world'))).toBeNull()
    expect(sniff(new Uint8Array(0))).toBeNull()
  })

  test('sniffFile reads the head of a blob', async () => {
    expect(await sniffFile(new Blob([ftyp('heic', 'mif1', 'heic'), new Uint8Array(1000)]))).toBe('heic')
    expect(await sniffFile(new Blob(['not an image']))).toBeNull()
  })
})
