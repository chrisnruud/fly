import { DEFAULT_ASSIGNMENTS } from './data'

// Airbus A320-251N (A20N) single-aisle economy: two banks of three (A B C | D E F).
export const LEFT_COLUMNS = ['A', 'B', 'C'] as const
export const RIGHT_COLUMNS = ['D', 'E', 'F'] as const
export const COLUMNS = [...LEFT_COLUMNS, ...RIGHT_COLUMNS]

function seatRow(seat: string): number {
  return parseInt(seat.slice(0, 2), 10)
}

// Derive the row range from the bundled data so the rendered cabin always
// covers every assigned seat, with a little padding to feel like a real cabin.
function deriveRows(): number[] {
  const rows = new Set<number>()
  for (const flight of Object.values(DEFAULT_ASSIGNMENTS)) {
    for (const seat of Object.keys(flight)) rows.add(seatRow(seat))
  }
  const all = [...rows]
  const min = all.length ? Math.min(...all) : 1
  const max = all.length ? Math.max(...all) : 32
  const result: number[] = []
  for (let r = min; r <= max; r++) result.push(r)
  return result
}

export const ROWS = deriveRows()

export function seatId(row: number, col: string): string {
  return `${String(row).padStart(2, '0')}${col}`
}

// Rows that sit over the wing on an A320 (roughly the central / emergency-exit
// band). Used to draw the wings and tint the overwing rows.
export const OVERWING_ROWS: number[] = ROWS.filter((r) => r >= 10 && r <= 17)
export const OVERWING_SET = new Set(OVERWING_ROWS)
export const OVERWING_START = OVERWING_ROWS[0] ?? null
