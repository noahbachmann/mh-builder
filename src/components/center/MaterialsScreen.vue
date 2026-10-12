<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { db } from '../../data'
import { weaponCraftPath, type MaterialLine } from '../../engine'
import { SLOT_LABEL } from '../../format'
import { vFocusCell } from '../../input/focus-grid'
import { useCraftingStore } from '../../stores/crafting'
import { useUiStore } from '../../stores/ui'

const crafting = useCraftingStore()
const ui = useUiStore()
onMounted(() => void crafting.ensureLoaded())

const lines = computed(() => crafting.materials?.lines ?? [])
const done = computed(() => lines.value.filter((l) => crafting.checked.has(l.itemId)).length)
const item = (id: number) => crafting.index?.item.get(id)
const missing = computed(() => (crafting.materials?.missing ?? []).map((slot) => SLOT_LABEL[slot]).join(', '))
const sources = (l: MaterialLine) => l.sources.map((src) => `${SLOT_LABEL[src.slot]} ${src.qty}`).join(' · ')

/** "Forged as X, N upgrades" when the weapon can't be forged directly */
const weaponNote = computed(() => {
  const w = crafting.shown?.build.weapon
  if (w == null || !crafting.index) return null
  const path = weaponCraftPath(w, db, crafting.index)
  if (!path || path.length < 2) return null
  const n = path.length - 1
  return `Weapon from scratch: forge ${db.weapon.get(path[0]!.weaponId)?.name}, then ${n} upgrade${n > 1 ? 's' : ''}.`
})
</script>

<template>
  <section class="panel materials" aria-label="Build materials" data-testid="materials-screen">
    <header class="panel-head">
      Materials
      <span class="head-actions">
        <button
          v-focus-cell="{ region: 'center-tabs', row: 0, col: 0 }"
          class="btn"
          :disabled="!done"
          data-testid="materials-reset"
          @click="crafting.clearChecks()"
        >
          Uncheck all
        </button>
        <button v-focus-cell="{ region: 'center-tabs', row: 0, col: 1 }" class="btn" @click="ui.close()">Close <span class="kbd">Esc</span></button>
      </span>
    </header>
    <nav class="tabs" aria-label="Build">
      <span class="kbd">A</span>
      <button
        v-for="(t, i) in crafting.targets"
        :key="t.id"
        v-focus-cell="{ region: 'center-tabs', row: 1, col: i }"
        class="tab"
        :class="{ 'is-active': crafting.target === t.id }"
        :title="t.name"
        data-testid="materials-target"
        @click="crafting.target = t.id"
      >
        {{ t.name }}
      </button>
      <span class="kbd">D</span>
    </nav>
    <div class="panel-body">
      <p v-if="!crafting.index" class="faint note">Loading…</p>
      <template v-else>
        <div v-if="lines.length" class="progress" data-testid="materials-progress">
          <div class="bar"><div class="fill" :style="{ width: `${(done / lines.length) * 100}%` }" /></div>
          <span class="num">{{ done }} / {{ lines.length }}</span>
        </div>
        <p v-if="weaponNote" class="faint note">{{ weaponNote }}</p>
        <p v-if="missing" class="faint note">No crafting data for: {{ missing }}.</p>
        <p v-if="!lines.length" class="faint note">Nothing to craft: equip some items first.</p>
        <button
          v-for="(l, i) in lines"
          :key="l.itemId"
          v-focus-cell="{ region: 'center', row: i, col: 0 }"
          class="row-btn line"
          :class="{ done: crafting.checked.has(l.itemId) }"
          role="checkbox"
          :aria-checked="crafting.checked.has(l.itemId)"
          data-testid="material-line"
          @click="crafting.toggle(l.itemId)"
        >
          <span class="box" aria-hidden="true">{{ crafting.checked.has(l.itemId) ? '✓' : '' }}</span>
          <span class="main">
            <span class="nm" :class="`r${item(l.itemId)?.rarity ?? 1}`">{{ item(l.itemId)?.name ?? '?' }}</span>
            <span class="faint src">{{ sources(l) }}</span>
          </span>
          <span class="qty num">× {{ l.qty }}</span>
        </button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.materials {
  height: 100%;
}
.head-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}
.tabs {
  overflow-x: auto;
}
.tab {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}
.note {
  padding: 4px 12px;
  margin: 0;
  font-size: 12px;
}
.progress {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 6px;
  font-size: 12px;
}
.bar {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border);
  border-radius: 3px;
  overflow: hidden;
}
.fill {
  height: 100%;
  background: var(--gold);
  transition: width 0.15s;
}
.line {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 12px;
}
.box {
  width: 16px;
  height: 16px;
  border: 1px solid var(--gold-dim);
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--gold);
}
.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  text-align: left;
}
.nm,
.src {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.src {
  font-size: 11px;
}
.qty {
  font-variant-numeric: tabular-nums;
}
.line.done .nm,
.line.done .qty {
  text-decoration: line-through;
  opacity: 0.5;
}
</style>
