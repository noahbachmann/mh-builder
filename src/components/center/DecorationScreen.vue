<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { db } from '../../data'
import { DECO_SLOTS, slotSizes, type DecoSlot } from '../../engine'
import { icons } from '../../icons'
import { SLOT_LABEL } from '../../format'
import { focusCell, focusRegion, vFocusCell } from '../../input/focus-grid'
import { useCandidate } from '../../composables/useCandidate'
import { usePreviewStore } from '../../stores/preview'
import { useBuildStore } from '../../stores/build'
import { useUiStore } from '../../stores/ui'
import Icon from '../base/Icon.vue'
import SkillChips from './SkillChips.vue'

const build = useBuildStore()
const ui = useUiStore()
const candidate = useCandidate()
const preview = usePreviewStore()
const query = ref('')

const pieces = computed(() =>
  DECO_SLOTS.map((slot) => {
    const id = build.build[slot]
    const item = id === null ? null : slot === 'weapon' ? db.weapon.get(id) : db.armor.get(id)
    const sizes = slotSizes(build.build, slot, db)
    return { slot, item, sizes, decos: build.build.decorations[slot] }
  }).filter((p) => p.item),
)
const allSlots = computed(() => pieces.value.flatMap((p) => p.sizes.map((size, index) => ({ slot: p.slot, index, size }))))

// pick the first slot when none (or a stale one) is selected
const selected = computed(() => {
  const s = ui.decoSlot
  if (s && allSlots.value.some((x) => x.slot === s.slot && x.index === s.index)) return s
  return allSlots.value[0] ? { slot: allSlots.value[0].slot, index: allSlots.value[0].index } : null
})
const selectedSize = computed(() => {
  const s = selected.value
  return s ? (slotSizes(build.build, s.slot, db)[s.index] ?? 0) : 0
})
const currentDeco = computed(() => {
  const s = selected.value
  return s ? (build.build.decorations[s.slot][s.index] ?? null) : null
})

const decos = computed(() => {
  const q = query.value.trim().toLowerCase()
  const size = selectedSize.value
  return db.data.decorations
    .filter((d) => d.size <= size)
    .filter(
      (d) =>
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.skills.some((s) => db.skill.get(s.skillId)?.name.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.size - a.size || a.name.localeCompare(b.name))
})

function pickSlot(slot: DecoSlot, index: number) {
  ui.decoSlot = { slot, index }
  ui.selectedSlot = slot
  nextTick(() => focusRegion('center'))
}

function place(id: number | null) {
  const s = selected.value
  if (!s) return
  build.setDeco(s.slot, s.index, id)
  // back to the slot column on the next slot, like the in-game flow
  const list = allSlots.value
  const i = list.findIndex((x) => x.slot === s.slot && x.index === s.index)
  const next = list[i + 1] ?? list[i]!
  ui.decoSlot = { slot: next.slot, index: next.index }
  nextTick(() => {
    const el = document.querySelector<HTMLElement>(`[data-deco-slot="${next.slot}-${next.index}"]`)
    if (el) focusCell(el)
  })
}

onMounted(() => {
  if (ui.decoSlot) nextTick(() => focusRegion('center'))
  else
    nextTick(() => {
      const el = document.querySelector<HTMLElement>('[data-deco-slot]')
      if (el) focusCell(el)
    })
})

const rowOf = (slot: DecoSlot, index: number) => allSlots.value.findIndex((x) => x.slot === slot && x.index === index)
</script>

<template>
  <section class="panel deco-screen" aria-label="Decorations">
    <header class="panel-head">
      <Icon :id="icons.deco(4)" :size="18" /> Decorations
      <span class="dim hint">Pick a slot, then a decoration. <span class="kbd">A</span> <span class="kbd">D</span> switch equipment</span>
    </header>
    <div class="cols">
      <div class="slots-col panel-body" aria-label="Equipment slots">
        <p v-if="!allSlots.length" class="faint empty">Equip a weapon or armor with decoration slots first.</p>
        <template v-for="p in pieces" :key="p.slot">
          <div v-if="p.sizes.length" class="piece">
            <div class="piece-head">
              <span class="dim">{{ SLOT_LABEL[p.slot] }}</span>
              <span :class="`r${p.item!.rarity}`">{{ p.item!.name }}</span>
            </div>
            <button
              v-for="(size, i) in p.sizes"
              :key="i"
              v-focus-cell="{ region: 'deco-slots', row: rowOf(p.slot, i), col: 0 }"
              class="row-btn slot-btn"
              :class="{ 'is-selected': selected?.slot === p.slot && selected?.index === i }"
              :data-deco-slot="`${p.slot}-${i}`"
              :data-testid="`deco-slot-${p.slot}-${i}`"
              @click="pickSlot(p.slot, i)"
            >
              <Icon :id="icons.slot(size)" :size="18" :label="String(size)" />
              <span :class="p.decos[i] != null ? '' : 'faint'">
                {{ p.decos[i] != null ? db.decoration.get(p.decos[i]!)?.name : `Empty (size ${size})` }}
              </span>
            </button>
          </div>
        </template>
      </div>
      <div class="decos-col">
        <div class="filter">
          <span class="dim">Size ≤ <b class="num">{{ selectedSize }}</b></span>
          <input v-model="query" class="search" data-search placeholder="Search decoration or skill  ( F )" aria-label="Search decoration" data-testid="deco-search" />
        </div>
        <div class="panel-body">
          <template v-if="selected">
            <button
              v-focus-cell="{ region: 'center', row: 0, col: 0 }"
              v-on="candidate({ kind: 'deco', slot: selected.slot, index: selected.index, id: null }, () => place(null))"
              class="row-btn deco remove"
              :class="{ 'is-previewing': preview.isPinned({ kind: 'deco', slot: selected.slot, index: selected.index, id: null }) }"
              data-testid="deco-remove"
            >
              <span class="faint">— Remove decoration</span>
            </button>
            <button
              v-for="(d, i) in decos"
              :key="d.id"
              v-focus-cell="{ region: 'center', row: i + 1, col: 0 }"
              v-on="candidate({ kind: 'deco', slot: selected.slot, index: selected.index, id: d.id }, () => place(d.id))"
              class="row-btn deco"
              :class="{ 'is-equipped': currentDeco === d.id, 'is-previewing': preview.isPinned({ kind: 'deco', slot: selected.slot, index: selected.index, id: d.id }) }"
              :data-deco-id="d.id"
              :aria-label="d.name"
            >
              <Icon :id="icons.decoration(d)" :size="18" :label="String(d.size)" />
              <span class="nm" :class="`r${d.rarity}`">{{ d.name }}</span>
              <SkillChips :skills="d.skills" />
            </button>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.deco-screen {
  height: 100%;
}
.hint {
  margin-left: auto;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
  font-size: 12px;
}
.cols {
  display: grid;
  grid-template-columns: 280px 1fr;
  flex: 1;
  min-height: 0;
}
.slots-col {
  border-right: 1px solid var(--border);
}
.piece {
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
}
.piece-head {
  display: flex;
  flex-direction: column;
  padding: 8px 12px 2px;
  font-size: 12px;
}
.slot-btn {
  min-height: 28px;
  padding-left: 18px;
  font-size: 13px;
}
.decos-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.filter {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.deco {
  display: grid;
  grid-template-columns: 20px 220px 1fr 24px;
  gap: 10px;
  border-bottom: 1px solid rgba(59, 53, 38, 0.35);
}
.nm {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.empty {
  padding: 12px;
}
.deco.remove {
  display: flex;
}
/* narrow center: slots on top, decoration list below; skills under the name */
@container center (max-width: 599px) {
  .hint {
    display: none;
  }
  .cols {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 2fr) minmax(0, 3fr);
  }
  .slots-col {
    border-right: 0;
    border-bottom: 1px solid var(--border-strong);
  }
  .filter .search {
    min-width: 0;
  }
  .deco:not(.remove) {
    grid-template-columns: 20px minmax(0, 1fr) 24px;
    row-gap: 2px;
  }
  .deco .chips {
    grid-row: 2;
    grid-column: 2;
  }
}
</style>
