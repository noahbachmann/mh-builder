<script setup lang="ts">
import { SHORTCUTS } from '../input/keyboard'
import { useUiStore } from '../stores/ui'
const ui = useUiStore()
</script>

<template>
  <div v-if="ui.showHelp" class="overlay" role="dialog" aria-label="Keyboard shortcuts" @click.self="ui.showHelp = false">
    <div class="panel help">
      <header class="panel-head">Keyboard shortcuts</header>
      <dl class="stat-list">
        <template v-for="[k, v] in SHORTCUTS" :key="k">
          <dt><span class="kbd">{{ k }}</span></dt>
          <dd>{{ v }}</dd>
        </template>
      </dl>
      <p class="faint foot">Hover or move the cursor onto an item to preview it. Press <span class="kbd">Esc</span> to close.</p>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: grid;
  place-items: center;
  z-index: 100;
}
.help {
  width: min(460px, calc(100vw - 32px));
}
.help .stat-list > dd {
  text-align: left;
}
.help .stat-list {
  grid-template-columns: auto 1fr;
  padding: 10px 14px;
}
.foot {
  margin: 0;
  padding: 0 14px 12px;
  font-size: 12px;
}
</style>
