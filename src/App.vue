<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSeatStore } from './store'
import SeatMap from './components/SeatMap.vue'
import SeatPopup from './components/SeatPopup.vue'
import { displayName } from './format'

const store = useSeatStore()

const selectedSeat = ref<string | null>(null)
const savedNote = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (store.dirty) e.preventDefault()
}

onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))

function selectSeat(seat: string) {
  selectedSeat.value = seat
}

function closePopup() {
  selectedSeat.value = null
}

function saveSession() {
  store.saveToSession()
  savedNote.value = true
  window.setTimeout(() => (savedNote.value = false), 2000)
}

function reset() {
  if (confirm('Tilbakestille alle seter på begge flygninger til de opprinnelige plasseringene?')) {
    store.resetToDefault()
  }
}

function exportFile() {
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
    store.saveToSession()
    alert(`Lastet inn ${count} seteplasseringer og lagret til denne økten.`)
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
      <button class="ghost" @click="exportFile">Last ned .txt</button>
      <button class="save" @click="saveSession">Lagre til økt</button>
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

    <main class="layout">
      <div class="plane-col">
        <SeatMap @select="selectSeat" />
      </div>

      <section class="table-panel">
        <h2>{{ store.flights.find((f) => f.id === store.flight)?.label }} — passasjerliste</h2>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Sete</th>
                <th>Passasjer</th>
                <th>Fra fil</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in store.seatRows"
                :key="row.seat"
                :class="{ changed: row.changed, active: selectedSeat === row.seat }"
                @click="selectSeat(row.seat)"
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

    <SeatPopup v-if="selectedSeat" :seat="selectedSeat" @close="closePopup" />

    <footer>
      <span class="legend"><i class="dot empty"></i> Ledig</span>
      <span class="legend"><i class="dot occ"></i> Opptatt</span>
      <span class="legend"><i class="dot chg"></i> Endret</span>
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
.toolbar .ghost {
  background: #fff;
  color: #475569;
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
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
}
.dot.occ {
  background: #2563eb;
}
.dot.chg {
  background: #fbbf24;
}
.hint {
  margin-left: auto;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
