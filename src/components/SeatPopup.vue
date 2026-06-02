<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useSeatStore } from '../store'
import { ROWS, COLUMNS } from '../layout'
import { displayName } from '../format'

const props = defineProps<{
  seat?: string | null
  holdingName?: string | null
}>()
const emit = defineEmits<{ close: [] }>()

const store = useSeatStore()

const moveTarget = ref('')
const fromHolding = computed(() => !!props.holdingName)
const seatId = computed(() => props.seat ?? '')
const raw = computed(() => (fromHolding.value ? props.holdingName ?? '' : store.nameFor(seatId.value)))

watch(
  () => [props.seat, props.holdingName],
  () => {
    moveTarget.value = ''
  },
)

const allAvailableSeats = computed(() => {
  const seats: string[] = []
  for (const row of ROWS)
    for (const col of COLUMNS) {
      const id = `${String(row).padStart(2, '0')}${col}`
      if (store.availableSeats.has(id)) seats.push(id)
    }
  return seats
})

const occupiedSeats = computed(() => allAvailableSeats.value.filter((seat) => !!store.nameFor(seat)))
const emptySeats = computed(() => allAvailableSeats.value.filter((seat) => !store.nameFor(seat)))

const hasOptions = computed(() =>
  fromHolding.value
    ? allAvailableSeats.value.length > 0
    : occupiedSeats.value.some((s) => s !== seatId.value) || store.currentHolding.length > 0,
)

function sendToHolding() {
  if (!seatId.value) return
  store.seatToHolding(seatId.value)
  emit('close')
}

function move() {
  if (!moveTarget.value) return
  if (fromHolding.value) {
    if (!props.holdingName) return
    store.holdingToSeat(props.holdingName, moveTarget.value)
    emit('close')
    return
  }
  if (!seatId.value) return
  if (moveTarget.value.startsWith('holding:')) {
    store.holdingToSeat(moveTarget.value.slice(8), seatId.value)
  } else if (raw.value) {
    // occupied → swap with selected seat
    store.moveSeat(seatId.value, moveTarget.value)
  } else {
    // empty → pull the selected person into this seat
    store.moveSeat(moveTarget.value, seatId.value)
  }
  emit('close')
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="popup" role="dialog" aria-modal="true">
      <header>
        <h2>{{ fromHolding ? 'Venteområde' : `Sete ${seatId}` }}</h2>
        <button class="icon" aria-label="Lukk" @click="emit('close')">✕</button>
      </header>

      <p class="current">
        <template v-if="raw">{{ displayName(raw) }}</template>
        <em v-else>{{ fromHolding ? 'Ingen passasjer valgt' : 'Tomt sete' }}</em>
      </p>

      <label>
        {{ fromHolding ? 'Plasser i sete' : raw ? 'Bytt sete med' : 'Flytt hit fra' }}
        <select v-model="moveTarget" :disabled="!hasOptions">
          <option value="">{{ fromHolding ? '— velg sete —' : '— velg passasjer —' }}</option>
          <template v-if="fromHolding">
            <optgroup v-if="emptySeats.length" label="Ledige seter">
              <option v-for="s in emptySeats" :key="`empty-${s}`" :value="s">
                {{ s }} (ledig)
              </option>
            </optgroup>
            <optgroup v-if="occupiedSeats.length" label="Opptatte seter">
              <option v-for="s in occupiedSeats" :key="`occ-${s}`" :value="s">
                {{ s }} ({{ displayName(store.nameFor(s)) }})
              </option>
            </optgroup>
          </template>
          <template v-else>
            <optgroup v-if="store.currentHolding.length" label="Fra venteområde">
              <option
                v-for="name in store.currentHolding"
                :key="name"
                :value="`holding:${name}`"
              >
                {{ displayName(name) }} (venter)
              </option>
            </optgroup>
            <optgroup v-if="occupiedSeats.some((s) => s !== seatId)" label="Bytt med sete">
              <option v-for="s in occupiedSeats" :key="s" :value="s" :disabled="s === seatId">
                {{ s }} ({{ displayName(store.nameFor(s)) }})
              </option>
            </optgroup>
          </template>
        </select>
      </label>

      <div class="actions">
        <button v-if="raw && !fromHolding" class="hold" @click="sendToHolding">Legg i venteområde</button>
        <button class="primary" :disabled="!moveTarget" @click="move">
          {{ fromHolding ? 'Plasser' : moveTarget.startsWith('holding:') ? 'Plasser her' : raw ? 'Bytt' : 'Flytt hit' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.popup {
  background: #fff;
  width: min(420px, 92vw);
  border-radius: 14px;
  padding: 1.25rem 1.4rem 1.4rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
h2 {
  margin: 0;
  font-size: 1.25rem;
}
.icon {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #64748b;
}
.current {
  margin: 0.4rem 0 1rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: #0f172a;
}
.current em {
  color: #94a3b8;
  font-weight: 400;
}
label {
  display: block;
  font-size: 0.8rem;
  color: #475569;
  margin-bottom: 0.9rem;
}
input,
select {
  width: 100%;
  margin-top: 0.3rem;
  padding: 0.55rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.4rem;
}
.actions button {
  flex: 1;
  padding: 0.55rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  cursor: pointer;
  font-weight: 600;
}
.actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.actions .primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.actions .hold {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #fff;
}
</style>
