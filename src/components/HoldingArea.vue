<script setup lang="ts">
import { ref } from 'vue'
import { useSeatStore } from '../store'
import { displayName } from '../format'

const emit = defineEmits<{ selectHolding: [name: string] }>()
const store = useSeatStore()

const isDragOver = ref(false)
let enterCount = 0

function onDragEnter() {
  enterCount++
  isDragOver.value = true
}
function onDragLeave() {
  if (--enterCount <= 0) {
    enterCount = 0
    isDragOver.value = false
  }
}
function onDrop(e: DragEvent) {
  enterCount = 0
  isDragOver.value = false
  store.setDraggingFromHolding(false)
  const data = e.dataTransfer?.getData('text/plain') ?? ''
  if (data && !data.startsWith('holding:')) store.seatToHolding(data)
}
function onChipDragStart(name: string, e: DragEvent) {
  store.setDraggingFromHolding(true)
  e.dataTransfer?.setData('text/plain', `holding:${name}`)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onChipDragEnd() {
  store.setDraggingFromHolding(false)
}
</script>

<template>
  <div
    class="holding-bar"
    :class="{ 'drag-over': isDragOver, 'has-passengers': store.currentHolding.length }"
    @dragenter.prevent="onDragEnter"
    @dragleave="onDragLeave"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <span class="label">⏸ Venteområde</span>
    <template v-if="store.currentHolding.length">
      <button
        v-for="name in store.currentHolding"
        :key="name"
        class="chip"
        type="button"
        :title="displayName(name)"
        draggable="true"
        @click="emit('selectHolding', name)"
        @dragstart="onChipDragStart(name, $event)"
        @dragend="onChipDragEnd"
      >
        {{ displayName(name) }}
      </button>
    </template>
    <span v-else class="empty-hint">Slipp en passasjer hit for å parkere midlertidig</span>
  </div>
</template>

<style scoped>
.holding-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  border: 2px dashed #fcd34d;
  border-radius: 10px;
  padding: 0.5rem 0.9rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  background: #fffbeb;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.holding-bar.has-passengers {
  border-style: solid;
}
.holding-bar.drag-over {
  background: #fef3c7;
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3);
}
.label {
  font-weight: 700;
  color: #92400e;
  white-space: nowrap;
}
.chip {
  background: #f59e0b;
  color: #fff;
  border-radius: 20px;
  padding: 0.2rem 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid #f59e0b;
  cursor: grab;
}
.chip:active {
  cursor: grabbing;
}
.empty-hint {
  color: #b45309;
  font-style: italic;
}
</style>
