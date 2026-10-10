<script setup lang="ts">
import { vFocusCell } from '../../input/focus-grid'
import { MONSTER_TABS, useMonsterStore, type MonsterTab } from '../../stores/monster'
import MonsterInfo from './MonsterInfo.vue'
import DamageOutput from './DamageOutput.vue'
import LootTable from './LootTable.vue'

const store = useMonsterStore()
const LABEL: Record<MonsterTab, string> = { info: 'Monster Info', damage: 'Damage Output', loot: 'Loot' }
// narrow sidebar (phone drawer, tablet / lg column)
const SHORT: Record<MonsterTab, string> = { info: 'Info', damage: 'Damage', loot: 'Loot' }
</script>

<template>
  <aside class="panel sidebar" aria-label="Monster information">
    <nav class="tabs" role="tablist">
      <span class="kbd">Q</span>
      <button
        v-for="(t, i) in MONSTER_TABS"
        :key="t"
        v-focus-cell="{ region: 'sidebar-tabs', row: 0, col: i }"
        role="tab"
        class="tab"
        :class="{ 'is-active': store.tab === t }"
        :aria-selected="store.tab === t"
        :data-testid="`mtab-${t}`"
        @click="store.tab = t"
      >
        <span class="l-long">{{ LABEL[t] }}</span><span class="l-short">{{ SHORT[t] }}</span>
      </button>
      <span class="kbd">E</span>
    </nav>
    <div class="panel-body" role="tabpanel">
      <template v-if="store.monster">
        <MonsterInfo v-if="store.tab === 'info'" />
        <DamageOutput v-else-if="store.tab === 'damage'" />
        <LootTable v-else />
      </template>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  height: 100%;
  container: sidebar / inline-size;
}
.l-short {
  display: none;
}
@container sidebar (max-width: 419px) {
  .l-long {
    display: none;
  }
  .l-short {
    display: inline;
  }
}
.sidebar .tabs {
  align-items: center;
}
.sidebar .tab {
  flex: 1;
  text-align: center;
  padding: 7px 6px;
}
</style>
