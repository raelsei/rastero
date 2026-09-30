import { describe, expect, test } from 'bun:test'
import { formatBytes, savings } from './format-bytes'

describe('formatBytes', () => {
  test('bytes below 1 KiB are whole bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(812)).toBe('812 B')
    expect(formatBytes(1023)).toBe('1023 B')
  })

  test('KB with one decimal, MB and up with two', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(67 * 1024)).toBe('67.0 KB')
    expect(formatBytes(1.12 * 1024 * 1024)).toBe('1.12 MB')
    expect(formatBytes(3 * 1024 ** 3)).toBe('3.00 GB')
  })

  test('rounding up to 1024 of a unit rolls over to the next unit', () => {
    expect(formatBytes(1024 * 1024 - 1)).toBe('1.00 MB')
    expect(formatBytes(1024 ** 3 - 1)).toBe('1.00 GB')
  })

  test('negative sizes keep the sign (size deltas)', () => {
    expect(formatBytes(-2048)).toBe('-2.0 KB')
  })
})

describe('savings', () => {
  test('fraction smaller, negative when bigger', () => {
    expect(savings(1000, 70)).toBeCloseTo(0.93)
    expect(savings(1000, 1000)).toBe(0)
    expect(savings(1000, 1500)).toBeCloseTo(-0.5)
  })

  test('empty original yields 0 instead of NaN/Infinity', () => {
    expect(savings(0, 10)).toBe(0)
  })
})
