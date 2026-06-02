<script setup lang="ts">
import { ref } from 'vue'
import { useSeatStore } from '../store'
import {
  ROWS,
  COLUMNS,
  LEFT_COLUMNS,
  RIGHT_COLUMNS,
  seatId,
  OVERWING_SET,
  OVERWING_START,
  OVERWING_ROWS,
} from '../layout'
import { displayName } from '../format'

const emit = defineEmits<{ select: [seat: string] }>()

const store = useSeatStore()

// Wing height spans the overwing rows; each seat-row is ~2.3rem tall.
const wingHeight = `${OVERWING_ROWS.length * 2.3}rem`

const tip = ref<{ seat: string; name: string; x: number; y: number } | null>(null)
const dragging = ref<string | null>(null)
const dragOver = ref<string | null>(null)

function showTip(e: MouseEvent, seat: string) {
  if (!store.availableSeats.has(seat)) {
    tip.value = null
    return
  }
  const name = store.nameFor(seat)
  const isVacated = store.isChanged(seat) && !name
  tip.value = {
    seat,
    name: name ? displayName(name) : isVacated ? 'Frigitt' : 'Ledig',
    x: e.clientX,
    y: e.clientY,
  }
}
function moveTip(e: MouseEvent) {
  if (tip.value) {
    tip.value.x = e.clientX
    tip.value.y = e.clientY
  }
}
function hideTip() {
  tip.value = null
}

function onSeatClick(seat: string) {
  if (!store.availableSeats.has(seat)) return
  emit('select', seat)
}

function onDragStart(seat: string, e: DragEvent) {
  if (!store.nameFor(seat) || !store.availableSeats.has(seat)) {
    e.preventDefault()
    return
  }
  dragging.value = seat
  hideTip()
  e.dataTransfer?.setData('text/plain', seat)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDragEnter(seat: string) {
  if (dragging.value !== seat && store.availableSeats.has(seat)) {
    dragOver.value = seat
  }
}
function onDrop(seat: string, e: DragEvent) {
  const from = dragging.value
  if (from && from !== seat && store.availableSeats.has(seat)) {
    store.moveSeat(from, seat)
  } else if (!from) {
    const data = e.dataTransfer?.getData('text/plain') ?? ''
    if (data.startsWith('holding:') && store.availableSeats.has(seat)) {
      store.holdingToSeat(data.slice(8), seat)
    }
  }
  store.setDraggingFromHolding(false)
  dragging.value = null
  dragOver.value = null
}
function onDragEnd() {
  dragging.value = null
  dragOver.value = null
}
</script>

<template>
  <div class="cabin" :class="{ 'drag-active': !!dragging || store.draggingFromHolding }">
    <div class="fuselage">
      <div class="nose">
        <span class="model">A20N</span>
        <span class="sub">Airbus A320-251N</span>
      </div>

      <div class="rows">
        <div class="col-header">
          <span class="rownum"></span>
          <span v-for="c in LEFT_COLUMNS" :key="c" class="colname">{{ c }}</span>
          <span class="aisle-gap"></span>
          <span v-for="c in RIGHT_COLUMNS" :key="c" class="colname">{{ c }}</span>
        </div>

        <div
          v-for="row in ROWS"
          :key="row"
          class="seat-row"
          :class="{ overwing: OVERWING_SET.has(row), 'overwing-start': row === OVERWING_START }"
        >
          <template v-if="row === OVERWING_START">
            <div class="wing left" :style="{ height: wingHeight }"></div>
            <div class="wing right" :style="{ height: wingHeight }"></div>
          </template>

          <span class="rownum">{{ row }}</span>

          <template v-for="(c, i) in COLUMNS" :key="c">
            <span v-if="i === LEFT_COLUMNS.length" class="aisle-gap"></span>
            <button
              class="seat"
              :class="{
                occupied: !!store.nameFor(seatId(row, c)),
                unavailable: !store.availableSeats.has(seatId(row, c)),
                vacated: store.availableSeats.has(seatId(row, c)) && store.isChanged(seatId(row, c)) && !store.nameFor(seatId(row, c)),
                changed: store.availableSeats.has(seatId(row, c)) && store.isChanged(seatId(row, c)) && !!store.nameFor(seatId(row, c)),
                dragging: dragging === seatId(row, c),
                dragover: dragOver === seatId(row, c),
              }"
              :disabled="!store.availableSeats.has(seatId(row, c))"
              :draggable="!!store.nameFor(seatId(row, c))"
              @click="onSeatClick(seatId(row, c))"
              @mouseenter="showTip($event, seatId(row, c))"
              @mousemove="moveTip"
              @mouseleave="hideTip"
              @dragstart="onDragStart(seatId(row, c), $event)"
              @dragenter.prevent="onDragEnter(seatId(row, c))"
              @dragover.prevent
              @drop.prevent="onDrop(seatId(row, c), $event)"
              @dragend="onDragEnd"
            >
              {{ store.availableSeats.has(seatId(row, c)) ? c : '✕' }}
            </button>
          </template>
        </div>
      </div>

      <div class="tail"></div>
    </div>

    <div
      v-if="tip"
      class="tooltip"
      :style="{ left: tip.x + 14 + 'px', top: tip.y + 14 + 'px' }"
    >
      <strong>{{ tip.seat }}</strong>
      <span :class="{ empty: tip.name === 'Ledig' }">{{ tip.name }}</span>
    </div>
  </div>
</template>

<style scoped>
.cabin {
  display: flex;
  justify-content: center;
}
.fuselage {
  background: #f1f5f9;
  border: 2px solid #cbd5e1;
  border-radius: 60px 60px 24px 24px;
  padding: 1rem 1.5rem 2rem;
  display: inline-block;
  position: relative;
}
.nose {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #94a3b8;
  margin-bottom: 0.75rem;
}
.nose .model {
  font-weight: 700;
  letter-spacing: 0.2em;
}
.nose .sub {
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.col-header,
.seat-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-bottom: 0.3rem;
  position: relative;
}
.seat-row.overwing {
  background: rgba(148, 163, 184, 0.16);
  border-radius: 4px;
}
.seat-row.overwing-start {
  position: relative;
}
/* Swept wings drawn either side of the overwing rows. */
.wing {
  position: absolute;
  top: 0;
  width: 110px;
  background: linear-gradient(180deg, #cbd5e1, #94a3b8);
  border: 1px solid #94a3b8;
  z-index: 0;
  pointer-events: none;
}
.wing.left {
  right: 100%;
  margin-right: 1rem;
  clip-path: polygon(100% 0, 0 52%, 0 72%, 100% 100%);
}
.wing.right {
  left: 100%;
  margin-left: 1rem;
  clip-path: polygon(0 0, 100% 52%, 100% 72%, 0 100%);
}
.rownum {
  width: 1.6rem;
  text-align: right;
  font-size: 0.7rem;
  color: #64748b;
  flex: none;
}
.colname {
  width: 2rem;
  text-align: center;
  font-size: 0.7rem;
  color: #94a3b8;
}
.aisle-gap {
  width: 1.2rem;
  flex: none;
}
.seat {
  width: 2rem;
  height: 2rem;
  border-radius: 6px 6px 8px 8px;
  border: 1px solid #94a3b8;
  background: #fff;
  color: #475569;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.05s ease, background 0.1s ease, box-shadow 0.1s ease;
}
.seat:hover {
  transform: translateY(-1px);
  border-color: #2563eb;
}
.seat.occupied {
  background: #2563eb;
  border-color: #1d4ed8;
  color: #fff;
  font-weight: 600;
  cursor: grab;
}
.seat.changed {
  background: #fbbf24;
  border-color: #d97706;
  color: #7c2d12;
}
.seat.vacated {
  background: #ffedd5;
  border-color: #ea580c;
  border-style: dashed;
  color: #c2410c;
}
.seat.dragging {
  opacity: 0.4;
}
.seat.unavailable {
  background: transparent;
  border: 1px dashed #e2e8f0;
  cursor: default;
  box-shadow: none;
  color: #ef4444;
  font-weight: 700;
}
.seat.unavailable:hover {
  transform: none;
  border-color: #e2e8f0;
}
.seat.dragover {
  outline: 2px dashed #f59e0b;
  outline-offset: 1px;
  border-color: #f59e0b;
}
/* When a drag is in progress, empty available seats glow green as valid drop targets */
.drag-active .seat:not(.occupied):not(.unavailable):not(.dragging) {
  background: #dcfce7;
  border-color: #16a34a;
  color: #15803d;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
}
.drag-active .seat:not(.occupied):not(.unavailable):not(.dragging):hover,
.drag-active .seat.dragover {
  background: #bbf7d0;
  border-color: #15803d;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.35);
  outline: none;
}
.tail {
  height: 1rem;
}
.tooltip {
  position: fixed;
  z-index: 60;
  pointer-events: none;
  background: #0f172a;
  color: #fff;
  padding: 0.3rem 0.55rem;
  border-radius: 6px;
  font-size: 0.78rem;
  line-height: 1.25;
  display: flex;
  flex-direction: column;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}
.tooltip strong {
  font-size: 0.7rem;
  color: #93c5fd;
}
.tooltip .empty {
  color: #94a3b8;
}
</style>
