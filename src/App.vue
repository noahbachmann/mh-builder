<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { installKeyboard } from './input/keyboard'
import { usePreviewStore } from './stores/preview'
import { useMonsterStore } from './stores/monster'
import { useUiStore, VIEWS, type View } from './stores/ui'
import SlotList from './components/left/SlotList.vue'
import BuildManager from './components/left/BuildManager.vue'
import Sidebar from './components/sidebar/Sidebar.vue'
import WeaponTree from './components/center/WeaponTree.vue'
import ArmorPicker from './components/center/ArmorPicker.vue'
import CharmPicker from './components/center/CharmPicker.vue'
import DecorationScreen from './components/center/DecorationScreen.vue'
import CompareScreen from './components/center/CompareScreen.vue'
import BuildOverview from './components/center/BuildOverview.vue'
import HelpOverlay from './components/HelpOverlay.vue'
import SkillInfobox from './components/base/SkillInfobox.vue'
import MonsterList from './components/monsters/MonsterList.vue'
import MonsterGuide from './components/monsters/MonsterGuide.vue'
import MonsterSidebar from './components/monsters/MonsterSidebar.vue'

const ui = useUiStore()
const preview = usePreviewStore()
// syncs ?view= / ?m= and loads monster data when the page opens
useMonsterStore()
const VIEW_LABEL: Record<View, string> = { equipment: 'Equipment', monsters: 'Monsters' }

// leaving a screen ends any hover preview
watch(
  () => [ui.screen, ui.view],
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
      <nav class="views" aria-label="Page">
        <button
          v-for="v in VIEWS"
          :key="v"
          class="view"
          :class="{ 'is-active': ui.view === v }"
          :aria-current="ui.view === v ? 'page' : undefined"
          :data-testid="`view-${v}`"
          @click="ui.view = v"
        >
          {{ VIEW_LABEL[v] }}
        </button>
        <span class="kbd" title="Switch page">M</span>
      </nav>
      <button class="btn help-btn" @click="ui.showHelp = !ui.showHelp"><span class="kbd">?</span> Shortcuts</button>
    </header>
    <main v-if="ui.view === 'monsters'" class="layout monsters">
      <MonsterList class="mlist" />
      <MonsterGuide class="center" />
      <MonsterSidebar class="right" />
    </main>
    <main v-else class="layout">
      <div class="left">
        <SlotList />
        <BuildManager />
      </div>
      <div class="center">
        <WeaponTree v-if="ui.screen === 'weapon'" />
        <ArmorPicker v-else-if="ui.screen === 'armor'" />
        <CharmPicker v-else-if="ui.screen === 'charm'" />
        <DecorationScreen v-else-if="ui.screen === 'decorations'" />
        <CompareScreen v-else-if="ui.screen === 'compare'" />
        <BuildOverview v-else />
      </div>
      <Sidebar class="right" />
    </main>
    <footer class="foot faint">
      Fan-made, non-commercial, not affiliated with Capcom. Data:
      <a href="https://github.com/gatheringhallstudios/MHWorldData" target="_blank" rel="noopener">MHWorldData</a> (MIT). Icons:
      <a href="https://github.com/OthelloRhin/MHW_Icons_SVG" target="_blank" rel="noopener">MHW_Icons_SVG</a> (MIT). Renders:
      <a href="https://monsterhunterworld.wiki.fextralife.com/" target="_blank" rel="noopener">MHW Wiki (Fextralife)</a>. Game images © Capcom.
    </footer>
    <HelpOverlay />
    <SkillInfobox />
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
.views {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 16px;
  align-self: center;
}
.view {
  padding: 3px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  color: var(--text-dim);
  font-size: 13px;
}
.view:hover,
.view:focus-visible {
  color: var(--text);
  background: rgba(214, 189, 124, 0.08);
}
.view.is-active {
  color: var(--gold);
  border-color: var(--border-strong);
  background: var(--panel-2);
}
.views .kbd {
  margin-left: 4px;
}
.help-btn {
  margin-left: auto;
}
.layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 400px;
  gap: 8px;
}
/* damage table needs room for up to 4 build columns */
.layout.monsters {
  grid-template-columns: 220px minmax(0, 1fr) 480px;
}
.left {
  display: grid;
  grid-template-rows: auto minmax(120px, 1fr);
  /* long saved-build names must not widen the column */
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  min-height: 0;
}
.center,
.right,
.mlist {
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
  .layout,
  .layout.monsters {
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
