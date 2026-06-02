<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useSeatStore } from './store'
import SeatMap from './components/SeatMap.vue'
import SeatPopup from './components/SeatPopup.vue'
import HoldingArea from './components/HoldingArea.vue'
import { displayName } from './format'

const store = useSeatStore()

const selectedSeat = ref<string | null>(null)
const selectedHolding = ref<string | null>(null)
const hoveredSeat = ref<string | null>(null)
const savedNote = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const tableScroll = ref<HTMLElement | null>(null)
const seatRows = ref<Record<string, HTMLTableRowElement>>({})
const searchQuery = ref('')
const hasPassengersInHolding = computed(
  () => store.holding.outbound.length + store.holding.return.length > 0,
)

const filteredRows = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return store.seatRows
  
  return store.seatRows.filter((row) => {
    const seatMatch = row.seat.toLowerCase().includes(query)
    const passengerMatch = row.current && displayName(row.current).toLowerCase().includes(query)
    const originalMatch = row.original && displayName(row.original).toLowerCase().includes(query)
    return seatMatch || passengerMatch || originalMatch
  })
})

const filteredHolding = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return store.currentHolding
  
  return store.currentHolding.filter((name) =>
    displayName(name).toLowerCase().includes(query),
  )
})

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (store.dirty) e.preventDefault()
}

onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))

function selectSeat(seat: string) {
  selectedHolding.value = null
  selectedSeat.value = seat
}

function selectHolding(name: string) {
  selectedSeat.value = null
  selectedHolding.value = name
}

function closePopup() {
  selectedSeat.value = null
  selectedHolding.value = null
}

function setHoveredSeat(seat: string | null) {
  hoveredSeat.value = seat
}

function setSeatRowRef(seat: string, el: unknown) {
  if (el instanceof HTMLTableRowElement) {
    seatRows.value[seat] = el
    return
  }
  delete seatRows.value[seat]
}

function ensureHoveredRowVisible(seat: string | null) {
  if (!seat) return
  const row = seatRows.value[seat]
  const container = tableScroll.value
  if (!row || !container) return

  const rowTop = row.offsetTop
  const rowBottom = rowTop + row.offsetHeight
  const viewTop = container.scrollTop
  const viewBottom = viewTop + container.clientHeight
  if (rowTop < viewTop || rowBottom > viewBottom) {
    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
}

watch(hoveredSeat, (seat) => ensureHoveredRowVisible(seat))

function saveSession() {
  if (hasPassengersInHolding.value) {
    alert('Kan ikke lagre før alle passasjerer er plassert (venteområdet må være tomt).')
    return
  }
  store.saveToLocal()
  savedNote.value = true
  window.setTimeout(() => (savedNote.value = false), 2000)
}

function reset() {
  if (confirm('Tilbakestille alle seter på begge flygninger til de opprinnelige plasseringene?')) {
    store.resetToDefault()
  }
}

function exportFile() {
  if (hasPassengersInHolding.value) {
    alert('Kan ikke laste ned før alle passasjerer er plassert (venteområdet må være tomt).')
    return
  }
  const blob = new Blob([store.exportText()], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `seatassignments-${stamp}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  fileInput.value?.click()
}

async function onFileChosen(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // allow re-uploading the same file
  if (!file) return
  try {
    const text = await file.text()
    const count = store.importText(text)
    store.saveToLocal()
    alert(`Lastet inn ${count} seteplasseringer og lagret lokalt.`)
  } catch (err) {
    alert((err as Error).message)
  }
}
</script>

<template>
  <div class="app">
    <header class="topbar">
      <h1>✈️ Airbus A320-251N · Setekart</h1>
      <div class="flight-tabs">
        <button
          v-for="f in store.flights"
          :key="f.id"
          class="tab"
          :class="{ active: store.flight === f.id }"
          @click="store.setFlight(f.id)"
        >
          {{ f.label }}
        </button>
      </div>
    </header>

    <div class="toolbar">
      <span class="count">{{ store.occupiedCount }} passasjerer plassert</span>
      <span class="count">· {{ store.changeCount }} endret</span>
      <div class="spacer"></div>
      <button class="ghost" @click="triggerImport">Last opp .txt</button>
      <button
        class="ghost"
        :disabled="hasPassengersInHolding"
        :title="hasPassengersInHolding ? 'Plasser alle i sete før nedlasting' : ''"
        @click="exportFile"
      >
        Last ned .txt
      </button>
      <button
        class="save"
        :disabled="hasPassengersInHolding"
        :title="hasPassengersInHolding ? 'Plasser alle i sete før lagring' : ''"
        @click="saveSession"
      >
        Lagre lokalt
      </button>
      <button class="ghost" @click="reset">Tilbakestill</button>
      <input
        ref="fileInput"
        type="file"
        accept=".txt,text/plain"
        class="hidden-input"
        @change="onFileChosen"
      />
      <transition name="fade">
        <span v-if="savedNote" class="saved">Lagret ✓</span>
      </transition>
    </div>

    <HoldingArea @select-holding="selectHolding" />

    <main class="layout">
      <div class="plane-col">
        <SeatMap
          :hovered-seat="hoveredSeat"
          @select="selectSeat"
          @hover="setHoveredSeat"
        />
      </div>

      <section class="table-panel">
        <div class="table-header">
          <h2>{{ store.flights.find((f) => f.id === store.flight)?.label }} — passasjerliste</h2>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Søk passasjer eller sete..."
            class="search-input"
          />
        </div>
        <div ref="tableScroll" class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Sete</th>
                <th>Passasjer</th>
                <th>Opprinnelig</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="name in filteredHolding"
                :key="`holding-${name}`"
                class="holding-row"
              >
                <td class="seat-id">⏸</td>
                <td>{{ displayName(name) }}</td>
                <td class="original-cell">— venter —</td>
              </tr>
              <tr
                v-for="row in filteredRows"
                :key="row.seat"
                :ref="(el) => setSeatRowRef(row.seat, el)"
                :class="{
                  changed: row.changed,
                  active: selectedSeat === row.seat,
                  hovered: hoveredSeat === row.seat,
                }"
                @click="selectSeat(row.seat)"
                @mouseenter="setHoveredSeat(row.seat)"
                @mouseleave="setHoveredSeat(null)"
              >
                <td class="seat-id">{{ row.seat }}</td>
                <td>
                  <template v-if="row.current">{{ displayName(row.current) }}</template>
                  <em v-else class="empty-cell">— tomt —</em>
                </td>
                <td class="original-cell">{{ displayName(row.original) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <SeatPopup
      v-if="selectedSeat || selectedHolding"
      :seat="selectedSeat"
      :holding-name="selectedHolding"
      @close="closePopup"
    />

    <footer>
      <span class="legend"><i class="dot empty"></i> Ledig</span>
      <span class="legend"><i class="dot occ"></i> Opptatt</span>
      <span class="legend"><i class="dot chg"></i> Byttet</span>
      <span class="legend"><i class="dot vac"></i> Frigitt</span>
      <span class="hint">Klikk et sete for å redigere · dra et opptatt sete for å flytte/bytte.</span>
    </footer>
  </div>
</template>

<style scoped>
.app {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.25rem 1rem 3rem;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}
h1 {
  font-size: 1.4rem;
  margin: 0;
}
.flight-tabs {
  display: flex;
  gap: 0.25rem;
  background: #e2e8f0;
  border-radius: 10px;
  padding: 0.25rem;
}
.tab {
  border: none;
  background: transparent;
  padding: 0.4rem 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: #475569;
}
.tab.active {
  background: #fff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0;
  flex-wrap: wrap;
}
.count {
  font-size: 0.85rem;
  color: #475569;
}
.spacer {
  flex: 1;
}
.toolbar button {
  border-radius: 8px;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
  font-weight: 600;
  border: 1px solid #cbd5e1;
}
.toolbar .save {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.toolbar .save:disabled {
  background: #86efac;
  border-color: #86efac;
  cursor: not-allowed;
}
.toolbar .ghost {
  background: #fff;
  color: #475569;
}
.toolbar .ghost:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
.toolbar .ghost.active {
  background: #1e293b;
  border-color: #1e293b;
  color: #fff;
}
.layout {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  flex-wrap: wrap;
}
.plane-col {
  flex: 0 0 auto;
  padding: 0 100px;
}
.table-panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.9rem 1rem;
  flex: 1 1 320px;
  min-width: 300px;
  align-self: flex-start;
}
.table-scroll {
  max-height: 70vh;
  overflow-y: auto;
}
.table-panel h2 {
  margin: 0 0 0.6rem;
  font-size: 0.95rem;
}
.table-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.6rem;
}
.table-header h2 {
  margin: 0;
  font-size: 0.95rem;
  flex: 1;
  min-width: 0;
}
.search-input {
  padding: 0.35rem 0.6rem;
  font-size: 0.8rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  width: 180px;
  color: #334155;
}
.search-input::placeholder {
  color: #cbd5e1;
}
.search-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}
.table-panel table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.table-panel thead th {
  text-align: left;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}
.table-panel tbody td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid #f1f5f9;
}
.table-panel tbody tr {
  cursor: pointer;
}
.table-panel tbody tr:hover {
  background: #f8fafc;
}
.table-panel tbody tr.holding-row {
  background: #fffbeb;
  cursor: default;
}
.table-panel tbody tr.holding-row:hover {
  background: #fef3c7;
}
.table-panel tbody tr.holding-row .seat-id {
  color: #d97706;
}
.table-panel tbody tr.holding-row .original-cell {
  color: #d97706;
  font-style: italic;
  text-decoration: none;
}
.table-panel tbody tr.changed {
  background: #fef3c7;
}
.table-panel tbody tr.changed:hover {
  background: #fde68a;
}
.table-panel tbody tr.active {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}
.table-panel tbody tr.hovered {
  background: #e0f2fe;
}
.table-panel tbody tr.changed.hovered {
  background: #fde68a;
}
.table-panel .seat-id {
  font-weight: 700;
  width: 3rem;
}
.table-panel .original-cell {
  color: #94a3b8;
}
.table-panel tr.changed .original-cell {
  color: #b45309;
  text-decoration: line-through;
}
.table-panel .empty-cell {
  color: #cbd5e1;
}
.saved {
  color: #16a34a;
  font-weight: 600;
  font-size: 0.85rem;
}
.hidden-input {
  display: none;
}
footer {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-top: 1.5rem;
  font-size: 0.8rem;
  color: #64748b;
  flex-wrap: wrap;
}
.legend {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.dot {
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 4px;
  display: inline-block;
}
.dot.empty {
  background: #fff;
  border: 1px solid #94a3b8;
}
.dot.occ {
  background: #2563eb;
}
.dot.chg {
  background: #fbbf24;
}
.dot.vac {
  background: #ffedd5;
  border: 1px dashed #ea580c;
}
.hint {
  margin-left: auto;
}
</style>
