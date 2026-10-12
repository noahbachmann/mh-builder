<script setup lang="ts">
import { vFocusCell } from '../../input/focus-grid'
import { useCompareStore } from '../../stores/compare'
import { OVERVIEW_TABS, useUiStore, type OverviewTab } from '../../stores/ui'
import BuildOverview from './BuildOverview.vue'
import CompareScreen from './CompareScreen.vue'
import MaterialsScreen from './MaterialsScreen.vue'

const ui = useUiStore()
const compare = useCompareStore()

const LABEL: Record<OverviewTab, string> = { summary: 'Summary', compare: 'Compare', materials: 'Materials' }
</script>

<template>
  <section class="panel overview" aria-label="Build overview">
    <header class="panel-head">Overview</header>
    <nav class="tabs" role="tablist" aria-label="Overview">
      <span class="kbd">A</span>
      <button
        v-for="(t, i) in OVERVIEW_TABS"
        :key="t"
        v-focus-cell="{ region: 'center-tabs', row: 0, col: i }"
        class="tab"
        role="tab"
        :class="{ 'is-active': ui.overviewTab === t }"
        :aria-selected="ui.overviewTab === t"
        data-testid="overview-tab"
        :data-tab="t"
        @click="ui.overviewTab = t"
      >
        {{ LABEL[t] }}<span v-if="t === 'compare' && compare.selected.length" class="faint num count">{{ compare.selected.length }}</span>
      </button>
      <span class="kbd">D</span>
    </nav>
    <CompareScreen v-if="ui.overviewTab === 'compare'" />
    <MaterialsScreen v-else-if="ui.overviewTab === 'materials'" />
    <BuildOverview v-else />
  </section>
</template>

<style scoped>
.overview {
  height: 100%;
}
.tabs .kbd {
  align-self: center;
}
.count {
  margin-left: 5px;
}
</style>
