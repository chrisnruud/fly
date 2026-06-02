import rawAssignments from './seatassignments.txt?raw'

export type FlightId = 'outbound' | 'return'

export interface FlightMeta {
  id: FlightId
  label: string
}

export const FLIGHTS: FlightMeta[] = [
  { id: 'outbound', label: 'Utreise' },
  { id: 'return', label: 'Retur' },
]

// seat -> "LASTNAME/FIRSTNAME"
export type SeatAssignments = Record<string, string>

export interface ParsedAssignments {
  outbound: SeatAssignments
  return: SeatAssignments
}

// Matches lines like: "27B – AMIRI/YASNA" (en-dash or hyphen).
const LINE_RE = /^([0-9]{1,2})\s*([A-K])\s*[–-]\s*(.+)$/i

export function parseAssignments(raw: string): ParsedAssignments {
  const result: ParsedAssignments = { outbound: {}, return: {} }
  let current: FlightId | null = null

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const lower = trimmed.toLowerCase()
    if (lower === 'utreise') {
      current = 'outbound'
      continue
    }
    if (lower === 'retur') {
      current = 'return'
      continue
    }

    const m = LINE_RE.exec(trimmed)
    if (m && current) {
      const seat = `${m[1].padStart(2, '0')}${m[2].toUpperCase()}`
      result[current][seat] = m[3].trim()
    }
  }

  // Fall back to outbound if no header was present before the first seat.
  if (!Object.keys(result.outbound).length && !Object.keys(result.return).length) {
    return result
  }
  return result
}

export const DEFAULT_ASSIGNMENTS: ParsedAssignments = parseAssignments(rawAssignments)

// Serialize back to the exact seatassignments.txt format (header + "SEAT – NAME").
export function serializeAssignments(a: ParsedAssignments): string {
  const lines: string[] = []
  for (const meta of FLIGHTS) {
    lines.push(meta.label)
    const seats = Object.keys(a[meta.id]).sort((x, y) => x.localeCompare(y))
    for (const seat of seats) {
      lines.push(`${seat} – ${a[meta.id][seat]}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd() + '\n'
}
