<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useSeatStore } from '../store'
import { ROWS, COLUMNS } from '../layout'
import { displayName } from '../format'

const props = defineProps<{ seat: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useSeatStore()

const raw = computed(() => store.nameFor(props.seat))
const nameInput = ref(raw.value)
const moveTarget = ref('')

watch(
  () => props.seat,
  () => {
    nameInput.value = store.nameFor(props.seat)
    moveTarget.value = ''
  },
)

const allSeats = computed(() => {
  const seats: string[] = []
  for (const row of ROWS)
    for (const col of COLUMNS) {
      const id = `${String(row).padStart(2, '0')}${col}`
      if (store.availableSeats.has(id)) seats.push(id)
    }
  return seats
})

function save() {
  store.assignSeat(props.seat, nameInput.value)
  emit('close')
}

function move() {
  if (!moveTarget.value) return
  store.moveSeat(props.seat, moveTarget.value)
  emit('close')
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="popup" role="dialog" aria-modal="true">
      <header>
        <h2>Sete {{ seat }}</h2>
        <button class="icon" aria-label="Lukk" @click="emit('close')">✕</button>
      </header>

      <p class="current">
        <template v-if="raw">{{ displayName(raw) }}</template>
        <em v-else>Tomt sete</em>
      </p>

      <label>
        Passasjer (ETTERNAVN/FORNAVN)
        <input
          v-model="nameInput"
          type="text"
          placeholder="f.eks. HANSEN/OLE"
          @keyup.enter="save"
        />
      </label>

      <label>
        Flytt / bytt til sete
        <select v-model="moveTarget" :disabled="!raw">
          <option value="">— velg sete —</option>
          <option v-for="s in allSeats" :key="s" :value="s" :disabled="s === seat">
            {{ s }}<template v-if="store.nameFor(s)"> ({{ displayName(store.nameFor(s)) }})</template>
          </option>
        </select>
      </label>

      <div class="actions">
        <button class="primary" @click="save">Lagre</button>
        <button :disabled="!moveTarget" @click="move">Flytt</button>
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
</style>
