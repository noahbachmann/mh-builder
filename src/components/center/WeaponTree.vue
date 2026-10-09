<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { db, WEAPON_TYPES, type Weapon, type WeaponType } from '../../data'
import { edgePath, layoutTrees, type TreeLayout } from '../../engine'
import { icons } from '../../icons'
import { WEAPON_TYPE_LABEL, elementLabel, fmt } from '../../format'
import { focusCell, vFocusCell } from '../../input/focus-grid'
import { useCandidate } from '../../composables/useCandidate'
import { useBuildStore } from '../../stores/build'
import { useUiStore } from '../../stores/ui'
import Icon from '../base/Icon.vue'

const CELL_W = 196
const CELL_H = 34
const NODE_W = 170

const build = useBuildStore()
const ui = useUiStore()
const candidate = useCandidate()

// special (Kulve/Safi) weapons wait for the "Special" tab milestone
const treeWeapons = db.data.weapons.filter((w) => !w.special)
const layouts = new Map<WeaponType, TreeLayout>()
const layoutFor = (t: WeaponType) => {
  let l = layouts.get(t)
  if (!l) {
    l = layoutTrees(treeWeapons.filter((w) => w.type === t))
    layouts.set(t, l)
  }
  return l
}

const layout = computed(() => layoutFor(ui.weaponType))
const nodes = computed(() => layout.value.nodes.map((n) => ({ ...n, weapon: db.weapon.get(n.id)! })))
const paths = computed(() =>
  layout.value.edges.map((e) => edgePath(layout.value.byId.get(e.from)!, layout.value.byId.get(e.to)!, CELL_W, CELL_H, NODE_W)),
)

const scroller = ref<HTMLElement | null>(null)
const highlight = ref<number | null>(null)
const query = ref('')

const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (q.length < 2) return []
  return treeWeapons.filter((w) => w.name.toLowerCase().includes(q)).slice(0, 8)
})

function nodeEl(id: number) {
  return scroller.value?.querySelector<HTMLElement>(`[data-weapon-id="${id}"]`) ?? null
}

async function jumpTo(w: Weapon) {
  ui.weaponType = w.type
  highlight.value = w.id
  query.value = ''
  await nextTick()
  const el = nodeEl(w.id)
  if (el) {
    focusCell(el)
    el.scrollIntoView({ block: 'center', inline: 'center' })
  }
}

function equip(w: Weapon) {
  build.equip('weapon', w.id)
}

const equippedId = computed(() => build.build.weapon)

function focusInitial() {
  const id = equippedId.value
  const el = (id !== null && nodeEl(id)) || scroller.value?.querySelector<HTMLElement>('[data-weapon-id]')
  if (el) focusCell(el)
}

onMounted(() => {
  const w = equippedId.value !== null ? db.weapon.get(equippedId.value) : undefined
  if (w && !w.special) ui.weaponType = w.type
  nextTick(focusInitial)
})
watch(
  () => ui.weaponType,
  () => {
    highlight.value = null
    scroller.value?.scrollTo({ left: 0, top: 0 })
  },
)

const mainElement = (w: Weapon) => w.elements[0]
</script>

<template>
  <section class="panel tree-screen" aria-label="Weapon tree">
    <header class="panel-head">
      Weapon Tree <span class="dim type-name">{{ WEAPON_TYPE_LABEL[ui.weaponType] }}</span>
      <div class="search-wrap">
        <input
          v-model="query"
          class="search"
          data-search
          placeholder="Search weapon  ( / )"
          aria-label="Search weapon"
          data-testid="weapon-search"
          @keydown.enter.prevent="matches[0] && jumpTo(matches[0])"
        />
        <ul v-if="matches.length" class="suggestions panel">
          <li v-for="m in matches" :key="m.id">
            <button class="row-btn" @mousedown.prevent="jumpTo(m)">
              <Icon :id="icons.weapon(m.type)" :size="16" />
              <span :class="`r${m.rarity}`">{{ m.name }}</span>
              <span class="faint">{{ WEAPON_TYPE_LABEL[m.type] }}</span>
            </button>
          </li>
        </ul>
      </div>
    </header>
    <nav class="tabs type-tabs" aria-label="Weapon types">
      <span class="kbd">[</span>
      <button
        v-for="(t, i) in WEAPON_TYPES"
        :key="t"
        v-focus-cell="{ region: 'center-tabs', row: 0, col: i }"
        class="tab type-tab"
        :class="{ 'is-active': ui.weaponType === t }"
        :title="WEAPON_TYPE_LABEL[t]"
        :aria-label="WEAPON_TYPE_LABEL[t]"
        :data-testid="`type-${t}`"
        @click="ui.weaponType = t"
      >
        <Icon :id="icons.weapon(t)" :size="26" :label="WEAPON_TYPE_LABEL[t]" />
      </button>
      <span class="kbd">]</span>
    </nav>
    <div ref="scroller" class="panel-body tree-scroll">
      <div class="tree" :style="{ width: `${layout.cols * CELL_W}px`, height: `${layout.rows * CELL_H}px` }">
        <div
          v-for="(b, i) in layout.bands"
          :key="b.rootId"
          class="band"
          :class="{ alt: i % 2 }"
          :style="{ top: `${b.rowStart * CELL_H}px`, height: `${b.rowCount * CELL_H}px` }"
        />
        <svg class="edges" :width="layout.cols * CELL_W" :height="layout.rows * CELL_H" aria-hidden="true">
          <path v-for="(d, i) in paths" :key="i" :d="d" />
        </svg>
        <button
          v-for="n in nodes"
          :key="n.id"
          v-focus-cell="{ region: 'center', row: n.row, col: n.col }"
          v-on="candidate({ kind: 'equip', slot: 'weapon', id: n.id })"
          class="node"
          :class="{ equipped: equippedId === n.id, highlight: highlight === n.id }"
          :style="{ left: `${n.col * CELL_W}px`, top: `${n.row * CELL_H + 3}px`, width: `${NODE_W}px`, height: `${CELL_H - 6}px` }"
          :data-weapon-id="n.id"
          :aria-label="n.weapon.name"
          @click="equip(n.weapon)"
        >
          <span class="rar" :style="{ background: `var(--r${n.weapon.rarity})` }" />
          <span class="nm">{{ n.weapon.name }}</span>
          <span class="meta num">
            {{ fmt(n.weapon.attack) }}
            <span
              v-if="mainElement(n.weapon)"
              class="dot"
              :class="`el-${mainElement(n.weapon)!.type}`"
              :title="`${elementLabel(mainElement(n.weapon)!.type)}${mainElement(n.weapon)!.hidden ? ' (hidden)' : ''}`"
              >{{ mainElement(n.weapon)!.hidden ? '◌' : '●' }}</span
            >
          </span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tree-screen {
  height: 100%;
}
.type-name {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}
.search-wrap {
  margin-left: auto;
  position: relative;
  width: 240px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}
.search-wrap .search {
  padding: 3px 8px;
  font-size: 13px;
}
.suggestions {
  position: absolute;
  z-index: 10;
  top: 100%;
  right: 0;
  width: 360px;
  list-style: none;
  margin: 2px 0 0;
  padding: 2px 0;
  color: var(--text);
}
.suggestions .row-btn {
  min-height: 26px;
  font-size: 13px;
}
.suggestions .faint {
  margin-left: auto;
  font-size: 11px;
}
.type-tabs {
  align-items: center;
}
.type-tab {
  padding: 4px 6px;
}
.tree-scroll {
  position: relative;
}
.tree {
  position: relative;
  margin: 8px 12px;
}
.band {
  position: absolute;
  left: -12px;
  right: -12px;
  border-top: 1px solid rgba(59, 53, 38, 0.6);
}
.band.alt {
  background: rgba(255, 255, 255, 0.018);
}
.edges {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.edges path {
  fill: none;
  stroke: #5a5038;
  stroke-width: 1.5;
}
.node {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px 0 0;
  background: #131a23;
  border: 1px solid #2d2a20;
  border-radius: 2px;
  font-size: 12px;
  overflow: hidden;
}
.node:hover,
.node:focus-visible,
.node:focus {
  border-color: var(--gold);
  background: #2a2518;
  z-index: 1;
}
.node.equipped {
  border-color: var(--gold-dim);
  box-shadow: inset 0 0 0 1px var(--gold-dim);
}
.node.highlight {
  animation: pulse 1.2s ease-in-out 2;
}
@keyframes pulse {
  50% {
    box-shadow: 0 0 0 3px var(--gold);
  }
}
.rar {
  width: 4px;
  align-self: stretch;
  flex: none;
}
.nm {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta {
  color: var(--text-dim);
  font-size: 11px;
  display: flex;
  gap: 3px;
  align-items: center;
}
</style>
