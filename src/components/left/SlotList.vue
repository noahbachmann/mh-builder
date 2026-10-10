<script setup lang="ts">
import { computed } from 'vue'
import { db } from '../../data'
import { EQUIP_SLOTS, type EquipSlot } from '../../engine'
import { icons } from '../../icons'
import { SLOT_LABEL } from '../../format'
import { vFocusCell } from '../../input/focus-grid'
import { useBuildStore } from '../../stores/build'
import { useUiStore } from '../../stores/ui'
import Icon from '../base/Icon.vue'
import SlotPips from '../base/SlotPips.vue'

const build = useBuildStore()
const ui = useUiStore()

const rows = computed(() =>
  EQUIP_SLOTS.map((slot) => {
    const id = build.build[slot]
    const item =
      id === null ? null : slot === 'weapon' ? db.weapon.get(id) : slot === 'charm' ? db.charm.get(id) : db.armor.get(id)
    const icon =
      slot === 'weapon'
        ? icons.weapon(item && 'type' in item ? (item.type as never) : 'great-sword', item?.rarity)
        : slot === 'charm'
          ? icons.charm(item?.rarity)
          : icons.armor(slot, item?.rarity)
    const slots = item && 'slots' in item ? item.slots : []
    return { slot, item, icon, slots, decos: slot === 'charm' ? [] : build.build.decorations[slot] }
  }),
)

const decoCount = computed(() => {
  let filled = 0
  let total = 0
  for (const r of rows.value) {
    total += r.slots.length
    filled += r.decos.filter((d) => d !== null).length
  }
  return { filled, total }
})

function select(slot: EquipSlot) {
  ui.selectedSlot = slot
}
</script>

<template>
  <section class="panel slot-list" aria-label="Equipment slots">
    <header class="panel-head">Equipment</header>
    <div class="panel-body">
      <button
        v-for="(r, i) in rows"
        :key="r.slot"
        v-focus-cell="{ region: 'slots', row: i, col: 0 }"
        class="row-btn slot-row"
        :class="{ 'is-selected': ui.selectedSlot === r.slot, open: ui.screen !== 'overview' && ui.selectedSlot === r.slot && ui.screen !== 'decorations' }"
        :data-testid="`slot-${r.slot}`"
        @click="ui.openSlot(r.slot)"
        @mouseenter="select(r.slot)"
        @focus="select(r.slot)"
      >
        <span class="kbd">{{ i + 1 }}</span>
        <Icon :id="r.icon" :size="28" :label="SLOT_LABEL[r.slot]" />
        <span class="info">
          <span class="slot-label">{{ SLOT_LABEL[r.slot] }}</span>
          <span class="name" :class="r.item ? `r${r.item.rarity}` : 'faint'" data-testid="slot-item">{{ r.item?.name ?? 'None' }}</span>
          <SlotPips v-if="r.slots.length" :slots="r.slots" :decorations="r.decos" />
        </span>
      </button>
      <button
        v-focus-cell="{ region: 'slots', row: rows.length, col: 0 }"
        class="row-btn slot-row decos-row"
        :class="{ 'is-selected': ui.screen === 'decorations' }"
        data-testid="slot-decorations"
        @click="ui.openDecorations()"
      >
        <span class="kbd">D</span>
        <Icon :id="icons.deco(4)" :size="28" label="Decorations" />
        <span class="info">
          <span class="slot-label">Decorations</span>
          <span class="name dim num">{{ decoCount.filled }} / {{ decoCount.total }} slots filled</span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.slot-row {
  padding: 7px 10px;
  border-bottom: 1px solid rgba(59, 53, 38, 0.5);
}
.slot-row.open {
  border-left-color: var(--gold);
  background: var(--selected);
}
.info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
}
.slot-label {
  font-size: 11px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.decos-row {
  margin-top: 4px;
}
</style>
