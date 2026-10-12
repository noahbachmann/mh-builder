<script setup lang="ts">
import { vFocusCell } from '../../input/focus-grid'
import { useBuildStore } from '../../stores/build'
import { useUiStore } from '../../stores/ui'
import BuildList from './BuildList.vue'

const build = useBuildStore()
const ui = useUiStore()
</script>

<template>
  <section class="panel builds" aria-label="Saved builds">
    <header class="panel-head">
      Builds
      <span class="actions">
        <button v-focus-cell="{ region: 'builds', row: 0, col: 0 }" class="btn" data-testid="open-overview" @click="ui.openOverview()">Overview</button>
        <button v-focus-cell="{ region: 'builds', row: 0, col: 1 }" class="btn" data-testid="reset" @click="build.reset()">Clear</button>
      </span>
    </header>
    <BuildList mode="manage" region="builds" />
  </section>
</template>

<style scoped>
.builds .panel-head {
  flex-wrap: wrap;
  row-gap: 4px;
}
.actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  text-transform: none;
  letter-spacing: 0;
}
</style>
