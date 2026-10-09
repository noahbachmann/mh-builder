<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { installKeyboard } from './input/keyboard'
import { usePreviewStore } from './stores/preview'
import { useUiStore } from './stores/ui'
import SlotList from './components/left/SlotList.vue'
import BuildManager from './components/left/BuildManager.vue'
import Sidebar from './components/sidebar/Sidebar.vue'
import WeaponTree from './components/center/WeaponTree.vue'
import ArmorPicker from './components/center/ArmorPicker.vue'
import CharmPicker from './components/center/CharmPicker.vue'
import DecorationScreen from './components/center/DecorationScreen.vue'
import BuildOverview from './components/center/BuildOverview.vue'
import HelpOverlay from './components/HelpOverlay.vue'

const ui = useUiStore()
const preview = usePreviewStore()

// leaving a screen ends any hover preview
watch(
  () => ui.screen,
  () => preview.clear(),
)

let uninstall: (() => void) | undefined
onMounted(() => (uninstall = installKeyboard()))
onBeforeUnmount(() => uninstall?.())
</script>

<template>
  <div class="app">
    <header class="top">
      <h1>MHW Equipment Builder</h1>
      <span class="faint sub">Monster Hunter: World · Iceborne</span>
      <button class="btn help-btn" @click="ui.showHelp = !ui.showHelp"><span class="kbd">?</span> Shortcuts</button>
    </header>
    <main class="layout">
      <div class="left">
        <SlotList />
        <BuildManager />
      </div>
      <div class="center">
        <WeaponTree v-if="ui.screen === 'weapon'" />
        <ArmorPicker v-else-if="ui.screen === 'armor'" />
        <CharmPicker v-else-if="ui.screen === 'charm'" />
        <DecorationScreen v-else-if="ui.screen === 'decorations'" />
        <BuildOverview v-else />
      </div>
      <Sidebar class="right" />
    </main>
    <footer class="foot faint">
      Fan-made, non-commercial, not affiliated with Capcom. Data:
      <a href="https://github.com/gatheringhallstudios/MHWorldData" target="_blank" rel="noopener">MHWorldData</a> (MIT).
    </footer>
    <HelpOverlay />
  </div>
</template>

<style scoped>
.app {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 10px 12px 6px;
  gap: 8px;
}
.top {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--gold);
  letter-spacing: 0.04em;
}
.sub {
  font-size: 12px;
}
.help-btn {
  margin-left: auto;
}
.layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr) 480px;
  gap: 8px;
}
.left {
  display: grid;
  grid-template-rows: auto minmax(120px, 1fr);
  gap: 8px;
  min-height: 0;
}
.center,
.right {
  min-height: 0;
}
.foot {
  font-size: 11px;
  text-align: center;
}
.foot a {
  color: var(--text-dim);
}

@media (max-width: 1100px) {
  body {
    overflow: auto;
  }
  .app {
    height: auto;
    min-height: 100%;
  }
  .layout {
    grid-template-columns: 1fr;
  }
  .center {
    height: 70vh;
  }
  .right {
    height: 80vh;
  }
}
</style>
