import { defineStore } from 'pinia'
import {
  DEFAULT_ASSIGNMENTS,
  FLIGHTS,
  parseAssignments,
  serializeAssignments,
  type FlightId,
  type ParsedAssignments,
} from './data'

export type ChangeType = 'added' | 'removed' | 'changed'

export interface SeatChange {
  flight: FlightId
  flightLabel: string
  seat: string
  original: string
  current: string
  type: ChangeType
}

export interface SeatRow {
  seat: string
  original: string
  current: string
  changed: boolean
}

const STORAGE_KEY = 'fly.seatAssignments.v1'

function clone(a: ParsedAssignments): ParsedAssignments {
  return {
    outbound: { ...a.outbound },
    return: { ...a.return },
  }
}

function loadInitial(): ParsedAssignments {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as ParsedAssignments
      if (parsed && parsed.outbound && parsed.return) return parsed
    }
  } catch {
    // ignore corrupt storage and fall back to defaults
  }
  return clone(DEFAULT_ASSIGNMENTS)
}

export const useSeatStore = defineStore('seats', {
  state: () => ({
    flight: 'outbound' as FlightId,
    assignments: loadInitial(),
    dirty: false,
  }),
  getters: {
    flights: () => FLIGHTS,
    current(state): Record<string, string> {
      return state.assignments[state.flight]
    },
    occupiedCount(state): number {
      return Object.keys(state.assignments[state.flight]).length
    },
    // Seats that existed in the original txt for the current flight. Only these
    // are bookable/selectable — everything else in the cabin is unavailable.
    availableSeats(state): Set<string> {
      return new Set(Object.keys(DEFAULT_ASSIGNMENTS[state.flight]))
    },
    // One row per original seat in the current flight: original vs. current name.
    seatRows(state): SeatRow[] {
      const original = DEFAULT_ASSIGNMENTS[state.flight]
      const current = state.assignments[state.flight]
      return Object.keys(original)
        .map((seat) => {
          const o = original[seat]
          const c = current[seat] ?? ''
          return { seat, original: o, current: c, changed: o !== c }
        })
        .sort((a, b) => a.seat.localeCompare(b.seat))
    },
    // Every seat that differs from the bundled seatassignments.txt, across both flights.
    changes(state): SeatChange[] {
      const out: SeatChange[] = []
      for (const meta of FLIGHTS) {
        const original = DEFAULT_ASSIGNMENTS[meta.id]
        const current = state.assignments[meta.id]
        const seats = new Set([...Object.keys(original), ...Object.keys(current)])
        for (const seat of seats) {
          const o = original[seat] ?? ''
          const c = current[seat] ?? ''
          if (o === c) continue
          const type: ChangeType = !o ? 'added' : !c ? 'removed' : 'changed'
          out.push({ flight: meta.id, flightLabel: meta.label, seat, original: o, current: c, type })
        }
      }
      return out.sort((a, b) => a.seat.localeCompare(b.seat))
    },
    changeCount(): number {
      return (this as any).changes.length
    },
  },
  actions: {
    setFlight(flight: FlightId) {
      this.flight = flight
    },
    nameFor(seat: string): string {
      return this.assignments[this.flight][seat] ?? ''
    },
    isAvailable(seat: string): boolean {
      return Object.prototype.hasOwnProperty.call(DEFAULT_ASSIGNMENTS[this.flight], seat)
    },
    isChanged(seat: string): boolean {
      const original = DEFAULT_ASSIGNMENTS[this.flight][seat] ?? ''
      return original !== (this.assignments[this.flight][seat] ?? '')
    },
    assignSeat(seat: string, name: string) {
      if (!this.isAvailable(seat)) return
      const trimmed = name.trim()
      if (trimmed) {
        this.assignments[this.flight][seat] = trimmed
      } else {
        delete this.assignments[this.flight][seat]
      }
      this.dirty = true
    },
    clearSeat(seat: string) {
      delete this.assignments[this.flight][seat]
      this.dirty = true
    },
    // Move a passenger to another seat; swaps if the target is taken.
    moveSeat(fromSeat: string, toSeat: string) {
      if (fromSeat === toSeat) return
      if (!this.isAvailable(fromSeat) || !this.isAvailable(toSeat)) return
      const map = this.assignments[this.flight]
      const moving = map[fromSeat]
      if (!moving) return
      const existing = map[toSeat]
      map[toSeat] = moving
      if (existing) {
        map[fromSeat] = existing
      } else {
        delete map[fromSeat]
      }
      this.dirty = true
    },
    resetToDefault() {
      this.assignments = clone(DEFAULT_ASSIGNMENTS)
      this.dirty = true
    },
    saveToSession() {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.assignments))
      this.dirty = false
    },
    // Current assignments in seatassignments.txt format (for download).
    exportText(): string {
      this.dirty = false
      return serializeAssignments(this.assignments)
    },
    // Replace current assignments from an uploaded txt file. Returns the number
    // of seats loaded, or throws if the file contains no recognizable seats.
    importText(raw: string): number {
      const parsed = parseAssignments(raw)
      const count =
        Object.keys(parsed.outbound).length + Object.keys(parsed.return).length
      if (!count) throw new Error('Ingen seteplasseringer funnet i den opplastede filen.')
      this.assignments = clone(parsed)
      return count
    },
  },
})
