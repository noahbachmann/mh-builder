<script setup lang="ts">
import { SIDEBAR_TABS, useUiStore, type SidebarTab } from '../../stores/ui'
import { usePreviewStore } from '../../stores/preview'
import { vFocusCell } from '../../input/focus-grid'
import OverallStats from './OverallStats.vue'
import OverallSkills from './OverallSkills.vue'
import SelectedEquipment from './SelectedEquipment.vue'

const ui = useUiStore()
const preview = usePreviewStore()
const LABEL: Record<SidebarTab, string> = { stats: 'Overall Stats', skills: 'Overall Skills', equipment: 'Selected Equipment' }
</script>

<template>
  <aside class="panel sidebar" aria-label="Build information">
    <nav class="tabs" role="tablist">
      <span class="kbd">Q</span>
      <button
        v-for="(t, i) in SIDEBAR_TABS"
        :key="t"
        v-focus-cell="{ region: 'sidebar-tabs', row: 0, col: i }"
        role="tab"
        class="tab"
        :class="{ 'is-active': ui.tab === t }"
        :aria-selected="ui.tab === t"
        :data-testid="`tab-${t}`"
        @click="ui.tab = t"
      >
        {{ LABEL[t] }}
      </button>
      <span class="kbd">E</span>
    </nav>
    <div v-if="preview.candidate" class="preview-banner" data-testid="preview-banner">Previewing change: ▲ better ▼ worse</div>
    <div class="panel-body" role="tabpanel">
      <OverallStats v-if="ui.tab === 'stats'" />
      <OverallSkills v-else-if="ui.tab === 'skills'" />
      <SelectedEquipment v-else />
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  height: 100%;
}
.sidebar .tabs {
  align-items: center;
}
.sidebar .tab {
  flex: 1;
  text-align: center;
  padding: 7px 6px;
}
.preview-banner {
  font-size: 11px;
  color: var(--gold-dim);
  padding: 3px 12px;
  background: rgba(214, 189, 124, 0.06);
  border-bottom: 1px solid var(--border);
}
</style>
