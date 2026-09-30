const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

/** Human size with 1024 base: '812 B', '67.0 KB', '1.12 MB'. */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const sign = n < 0 ? '-' : ''
  let value = Math.abs(n)
  if (value < 1024) return `${sign}${Math.round(value)} B`
  let unit = 0
  let text = ''
  for (;;) {
    value /= 1024
    unit++
    text = value.toFixed(unit === 1 ? 1 : 2)
    // Rounding can land exactly on 1024 of the current unit (e.g. 1023.99 KB -> '1024.0'): bump.
    if (Number(text) < 1024 || unit === UNITS.length - 1) break
  }
  return `${sign}${text} ${UNITS[unit]}`
}

/** Fraction saved: 0.93 = 93% smaller; negative when the output is bigger. 0 for an empty original. */
export function savings(original: number, output: number): number {
  if (!(original > 0)) return 0
  return 1 - output / original
}
