/**
 * Rastero mark: an R drawn on a raster grid whose pixels shrink column by column, left to right,
 * the way an image does as it is compressed. public/favicon.svg is the same drawing with literal colours.
 */
const R_ROWS = ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X']
const PITCH = 3.35
const CELL = [3.1, 2.95, 2.75, 2.55, 2.3]
const ORIGIN_X = 16 - (PITCH * 5) / 2
const ORIGIN_Y = 16 - (PITCH * 7) / 2

const CELLS = R_ROWS.flatMap((row, y) =>
  [...row].flatMap((c, x) => {
    if (c !== 'X') return []
    const size = CELL[x]
    const inset = (PITCH - size) / 2
    return [{ x: ORIGIN_X + x * PITCH + inset, y: ORIGIN_Y + y * PITCH + inset, size }]
  }),
)

export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      {CELLS.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={c.size} height={c.size} rx="0.4" fill="var(--accent-ink)" />
      ))}
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <LogoMark />
      <span>Rastero</span>
    </span>
  )
}
