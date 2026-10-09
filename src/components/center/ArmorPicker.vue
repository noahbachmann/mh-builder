<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { db, type ArmorType, type Rank } from '../../data'
import { icons } from '../../icons'
import { RANK_LABEL, SLOT_LABEL } from '../../format'
import { focusCell, vFocusCell } from '../../input/focus-grid'
import { useCandidate } from '../../composables/useCandidate'
import { useBuildStore } from '../../stores/build'
import { useUiStore } from '../../stores/ui'
import Icon from '../base/Icon.vue'
import SlotPips from '../base/SlotPips.vue'
import SkillChips from './SkillChips.vue'

const build = useBuildStore()
const ui = useUiStore()
const candidate = useCandidate()
const query = ref('')
const list = ref<HTMLElement | null>(null)

const slot = computed(() => ui.selectedSlot as ArmorType)
const RANKS: (Rank | 'all')[] = ['all', 'LR', 'HR', 'MR']

const items = computed(() => {
  const q = query.value.trim().toLowerCase()
  return db.data.armor
    .filter((a) => a.type === slot.value && (ui.armorRank === 'all' || a.rank === ui.armorRank))
    .filter(
      (a) =>
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.skills.some((s) => db.skill.get(s.skillId)?.name.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.rarity - a.rarity || a.id - b.id)
})

const equippedId = computed(() => build.build[slot.value])
const setName = (id: string | null) => (id ? db.armorSet.get(id)?.name : null)

function focusInitial() {
  const el =
    list.value?.querySelector<HTMLElement>('.is-equipped') ?? list.value?.querySelector<HTMLElement>('[data-armor-id]')
  if (el) focusCell(el)
}
onMounted(() => nextTick(focusInitial))
watch(slot, () => nextTick(focusInitial))
</script>

<template>
  <section class="panel picker" :aria-label="`${SLOT_LABEL[slot]} armor`">
    <header class="panel-head">
      <Icon :id="icons.armor(slot)" :size="18" />
      {{ SLOT_LABEL[slot] }} Armor
      <input v-model="query" class="search head-search" data-search placeholder="Search name or skill  ( / )" aria-label="Search armor" data-testid="armor-search" />
    </header>
    <nav class="tabs" aria-label="Rank">
      <span class="kbd">[</span>
      <button
        v-for="(r, i) in RANKS"
        :key="r"
        v-focus-cell="{ region: 'center-tabs', row: 0, col: i }"
        class="tab"
        :class="{ 'is-active': ui.armorRank === r }"
        :data-testid="`rank-${r}`"
        @click="ui.armorRank = r"
      >
        {{ r === 'all' ? 'All' : RANK_LABEL[r] }}
      </button>
      <span class="kbd">]</span>
      <span class="count faint num">{{ items.length }} pieces</span>
    </nav>
    <div ref="list" class="panel-body list">
      <button
        v-focus-cell="{ region: 'center', row: 0, col: 0 }"
        v-on="candidate({ kind: 'equip', slot, id: null })"
        class="row-btn item remove"
        data-testid="unequip"
        @click="build.equip(slot, null)"
      >
        <span class="faint">— Remove {{ SLOT_LABEL[slot].toLowerCase() }} armor</span>
      </button>
      <button
        v-for="(a, i) in items"
        :key="a.id"
        v-focus-cell="{ region: 'center', row: i + 1, col: 0 }"
        v-on="candidate({ kind: 'equip', slot, id: a.id })"
        class="row-btn item"
        :class="{ 'is-equipped': equippedId === a.id }"
        :data-armor-id="a.id"
        :aria-label="a.name"
        @click="build.equip(slot, a.id)"
      >
        <span class="rarity num" :class="`r${a.rarity}`">R{{ a.rarity }}</span>
        <span class="main">
          <span class="nm" :class="`r${a.rarity}`">{{ a.name }}</span>
          <SkillChips :skills="a.skills" />
        </span>
        <span class="set faint">{{ setName(a.setId) }}</span>
        <SlotPips :slots="a.slots" />
        <span class="def num"><Icon :id="icons.stat('defense')" :size="14" /> {{ a.defense }}</span>
      </button>
      <p v-if="!items.length" class="faint empty">No armor matches.</p>
    </div>
  </section>
</template>

<style scoped>
.picker {
  height: 100%;
}
.head-search {
  margin-left: auto;
  width: 260px;
  padding: 3px 8px;
  font-size: 13px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}
.count {
  margin-left: auto;
  align-self: center;
  font-size: 12px;
  padding-right: 8px;
}
.item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 130px 70px 64px;
  gap: 10px;
  border-bottom: 1px solid rgba(59, 53, 38, 0.35);
}
.item.remove {
  display: flex;
}
.item.is-equipped::after {
  position: absolute;
  right: 4px;
}
.item {
  position: relative;
}
.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.nm {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.set {
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.def {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: flex-end;
  padding-right: 16px;
}
.empty {
  padding: 12px;
}
</style>
