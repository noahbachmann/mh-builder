<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { db } from '../../data'
import { icons } from '../../icons'
import { focusCell, vFocusCell } from '../../input/focus-grid'
import { useCandidate } from '../../composables/useCandidate'
import { useBuildStore } from '../../stores/build'
import Icon from '../base/Icon.vue'
import SkillChips from './SkillChips.vue'

const build = useBuildStore()
const candidate = useCandidate()
const query = ref('')
const list = ref<HTMLElement | null>(null)

const items = computed(() => {
  const q = query.value.trim().toLowerCase()
  return db.data.charms
    .filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.skills.some((s) => db.skill.get(s.skillId)?.name.toLowerCase().includes(q)),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
})

onMounted(() =>
  nextTick(() => {
    const el =
      list.value?.querySelector<HTMLElement>('.is-equipped') ?? list.value?.querySelector<HTMLElement>('[data-charm-id]')
    if (el) focusCell(el)
  }),
)
</script>

<template>
  <section class="panel picker" aria-label="Charms">
    <header class="panel-head">
      <Icon :id="icons.charm()" :size="18" /> Charm
      <input v-model="query" class="search head-search" data-search placeholder="Search name or skill  ( / )" aria-label="Search charm" data-testid="charm-search" />
    </header>
    <div ref="list" class="panel-body">
      <button
        v-focus-cell="{ region: 'center', row: 0, col: 0 }"
        v-on="candidate({ kind: 'equip', slot: 'charm', id: null })"
        class="row-btn item remove"
        data-testid="unequip"
        @click="build.equip('charm', null)"
      >
        <span class="faint">— Remove charm</span>
      </button>
      <button
        v-for="(c, i) in items"
        :key="c.id"
        v-focus-cell="{ region: 'center', row: i + 1, col: 0 }"
        v-on="candidate({ kind: 'equip', slot: 'charm', id: c.id })"
        class="row-btn item"
        :class="{ 'is-equipped': build.build.charm === c.id }"
        :data-charm-id="c.id"
        :aria-label="c.name"
        @click="build.equip('charm', c.id)"
      >
        <span class="rarity num" :class="`r${c.rarity}`">R{{ c.rarity }}</span>
        <span class="nm" :class="`r${c.rarity}`">{{ c.name }}</span>
        <SkillChips :skills="c.skills" />
      </button>
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
.item {
  display: grid;
  grid-template-columns: 34px 240px 1fr 24px;
  gap: 10px;
  border-bottom: 1px solid rgba(59, 53, 38, 0.35);
}
.nm {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item.remove {
  display: flex;
}
</style>
