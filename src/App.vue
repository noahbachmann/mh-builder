<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { installKeyboard } from './input/keyboard'
import { focusRegion } from './input/focus-grid'
import { useBreakpoint } from './composables/useBreakpoint'
import { usePreviewStore } from './stores/preview'
import { useMonsterStore } from './stores/monster'
import { useUiStore, VIEWS, type Drawer, type View } from './stores/ui'
import SlotList from './components/left/SlotList.vue'
import BuildManager from './components/left/BuildManager.vue'
import Sidebar from './components/sidebar/Sidebar.vue'
import WeaponTree from './components/center/WeaponTree.vue'
import ArmorPicker from './components/center/ArmorPicker.vue'
import CharmPicker from './components/center/CharmPicker.vue'
import DecorationScreen from './components/center/DecorationScreen.vue'
import CompareScreen from './components/center/CompareScreen.vue'
import MaterialsScreen from './components/center/MaterialsScreen.vue'
import BuildOverview from './components/center/BuildOverview.vue'
import HelpOverlay from './components/HelpOverlay.vue'
import SkillInfobox from './components/base/SkillInfobox.vue'
import MonsterList from './components/monsters/MonsterList.vue'
import MonsterGuide from './components/monsters/MonsterGuide.vue'
import MonsterSidebar from './components/monsters/MonsterSidebar.vue'

const ui = useUiStore()
const preview = usePreviewStore()
const bp = useBreakpoint()
// syncs ?view= / ?m= and loads monster data when the page opens
useMonsterStore()
const VIEW_LABEL: Record<View, string> = { equipment: 'Equipment', monsters: 'Monsters' }

// leaving a screen ends any hover preview
watch(
  () => [ui.screen, ui.view],
  () => preview.clear(),
)

// drawers that no longer exist at this width, or belong to the other page
watch(bp.leftDrawer, (d) => !d && ui.drawer === 'left' && ui.closeDrawer())
watch(bp.rightDrawer, (d) => !d && ui.drawer === 'right' && ui.closeDrawer())
watch(() => ui.view, () => ui.closeDrawer())

function toggleDrawer(side: Drawer) {
  ui.toggleDrawer(side)
  if (ui.drawer !== side) return
  const region = side === 'right' ? 'sidebar-tabs' : ui.view === 'monsters' ? 'monsters' : 'slots'
  // after the inert attribute is gone
  nextTick(() => focusRegion(region))
}
// phone: credits collapsed to one footer line
const showCredits = ref(false)
const leftInert = () => bp.leftDrawer.value && ui.drawer !== 'left'
const rightInert = () => bp.rightDrawer.value && ui.drawer !== 'right'

let uninstall: (() => void) | undefined
onMounted(() => (uninstall = installKeyboard()))
onBeforeUnmount(() => uninstall?.())
</script>

<template>
  <div class="app">
    <header class="top">
      <button
        v-if="bp.leftDrawer.value"
        class="icon-btn"
        :class="{ 'is-active': ui.drawer === 'left' }"
        :aria-label="ui.view === 'monsters' ? 'Monster list' : 'Equipment slots'"
        :aria-expanded="ui.drawer === 'left'"
        data-testid="toggle-left"
        @click="toggleDrawer('left')"
      >
        <span class="burger" aria-hidden="true"><span /><span /><span /></span>
      </button>
      <h1><span class="t-long">MHW Equipment Builder</span><span class="t-short">MHW Builder</span><span class="t-min">MHW</span></h1>
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
        <span class="kbd" title="Switch page">S</span>
      </nav>
      <button class="btn help-btn" @click="ui.showHelp = !ui.showHelp"><span class="kbd">?</span> Shortcuts</button>
      <button
        v-if="bp.rightDrawer.value"
        class="icon-btn info-btn"
        :class="{ 'is-active': ui.drawer === 'right', 'has-preview': preview.pinned }"
        :aria-label="ui.view === 'monsters' ? 'Monster information' : 'Build information'"
        :aria-expanded="ui.drawer === 'right'"
        data-testid="toggle-right"
        @click="toggleDrawer('right')"
      >
        <span class="info-i" aria-hidden="true">i</span>
      </button>
    </header>
    <main v-if="ui.view === 'monsters'" class="layout monsters">
      <MonsterList class="mlist drawer-left" :class="{ 'is-open': ui.drawer === 'left' }" :inert="leftInert()" />
      <MonsterGuide class="center" />
      <MonsterSidebar class="right drawer-right" :class="{ 'is-open': ui.drawer === 'right' }" :inert="rightInert()" />
      <div v-if="ui.drawer" class="backdrop" data-testid="drawer-backdrop" @click="ui.closeDrawer()" />
    </main>
    <main v-else class="layout">
      <div class="left drawer-left" :class="{ 'is-open': ui.drawer === 'left' }" :inert="leftInert()">
        <SlotList />
        <BuildManager />
      </div>
      <div class="center">
        <WeaponTree v-if="ui.screen === 'weapon'" />
        <ArmorPicker v-else-if="ui.screen === 'armor'" />
        <CharmPicker v-else-if="ui.screen === 'charm'" />
        <DecorationScreen v-else-if="ui.screen === 'decorations'" />
        <CompareScreen v-else-if="ui.screen === 'compare'" />
        <MaterialsScreen v-else-if="ui.screen === 'materials'" />
        <BuildOverview v-else />
      </div>
      <Sidebar class="right drawer-right" :class="{ 'is-open': ui.drawer === 'right' }" :inert="rightInert()" />
      <div v-if="ui.drawer" class="backdrop" data-testid="drawer-backdrop" @click="ui.closeDrawer()" />
    </main>
    <footer class="foot faint">
      Fan-made, non-commercial, not affiliated with Capcom.
      <button class="credits-btn" :aria-expanded="showCredits" @click="showCredits = !showCredits">Credits</button>
      <span class="credits" :class="{ 'is-open': showCredits }">Data:
      <a href="https://github.com/gatheringhallstudios/MHWorldData" target="_blank" rel="noopener">MHWorldData</a> (MIT). Icons:
      <a href="https://github.com/OthelloRhin/MHW_Icons_SVG" target="_blank" rel="noopener">MHW_Icons_SVG</a> (MIT). Renders:
      <a href="https://monsterhunterworld.wiki.fextralife.com/" target="_blank" rel="noopener">MHW Wiki (Fextralife)</a>. Game images © Capcom.</span>
    </footer>
    <HelpOverlay />
    <SkillInfobox />
  </div>
</template>

<style scoped>
.app {
  height: 100%;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 10px 12px 6px;
  gap: 8px;
}
.top {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--gold);
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.t-short,
.t-min {
  display: none;
}
.sub {
  font-size: 12px;
  white-space: nowrap;
}
.views {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 16px;
}
.view {
  padding: 3px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  color: var(--text-dim);
  font-size: 13px;
  white-space: nowrap;
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
.icon-btn {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--panel-2);
  color: var(--gold-dim);
}
.icon-btn:hover,
.icon-btn.is-active {
  color: var(--gold);
  border-color: var(--border-strong);
}
.burger {
  display: grid;
  gap: 3px;
  width: 16px;
}
.burger span {
  height: 2px;
  background: currentColor;
  border-radius: 1px;
}
.info-i {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 1.5px solid currentColor;
  border-radius: 50%;
  font: italic 700 12px/1 Georgia, serif;
}
/* a tapped item is previewed: the diff is in the sidebar drawer */
.info-btn.has-preview::after {
  content: '';
  position: absolute;
  top: 3px;
  right: 3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--gold);
}
.layout {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 400px;
  gap: 8px;
}
/* damage table needs room for up to 4 build columns */
.layout.monsters {
  grid-template-columns: 200px minmax(0, 1fr) 480px;
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
/* center screens adapt to their own width (it depends on the sidebars), see @container rules */
.center {
  container: center / inline-size;
}
.backdrop {
  display: none;
}
.foot {
  font-size: 11px;
  text-align: center;
}
.foot a {
  color: var(--text-dim);
}
.credits-btn {
  display: none;
  color: var(--text-dim);
  text-decoration: underline;
}

/* breakpoints: keep in sync with BREAKPOINTS in composables/useBreakpoint.ts */
@media (max-width: 1399px) {
  .layout {
    grid-template-columns: 200px minmax(0, 1fr) 340px;
  }
  .layout.monsters {
    grid-template-columns: 180px minmax(0, 1fr) 400px;
  }
}
/* left column becomes a drawer over the center */
@media (max-width: 1023px) {
  .sub {
    display: none;
  }
  .views {
    margin-left: 4px;
  }
  .layout {
    grid-template-columns: minmax(0, 1fr) 340px;
  }
  .layout.monsters {
    grid-template-columns: minmax(0, 1fr) 380px;
  }
  .drawer-left {
    position: absolute;
    z-index: 30;
    top: 0;
    bottom: 0;
    left: 0;
    width: min(300px, 88%);
    background: var(--bg);
    box-shadow: 8px 0 24px rgba(0, 0, 0, 0.6);
    transform: translateX(calc(-100% - 12px));
    visibility: hidden;
    transition:
      transform 0.18s ease-out,
      visibility 0.18s;
  }
  .backdrop {
    display: block;
    position: absolute;
    z-index: 20;
    inset: 0;
    background: rgba(5, 8, 12, 0.6);
  }
}
/* phone: right sidebar becomes a drawer too */
@media (max-width: 767px) {
  .app {
    padding: 6px 8px 4px;
    gap: 6px;
  }
  .top {
    gap: 8px;
  }
  .t-long {
    display: none;
  }
  .t-short {
    display: inline;
  }
  h1 {
    font-size: 16px;
  }
  .views .kbd,
  .help-btn {
    display: none;
  }
  .views {
    margin-left: auto;
  }
  .view {
    padding: 3px 8px;
  }
  .layout,
  .layout.monsters {
    grid-template-columns: minmax(0, 1fr);
  }
  /* closed right drawer sits off-screen: no page scroll */
  .layout {
    overflow: clip;
  }
  .drawer-right {
    position: absolute;
    z-index: 30;
    top: 0;
    bottom: 0;
    right: 0;
    width: min(420px, 100%);
    background: var(--bg);
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.6);
    transform: translateX(calc(100% + 12px));
    visibility: hidden;
    transition:
      transform 0.18s ease-out,
      visibility 0.18s;
  }
  .foot {
    font-size: 10px;
  }
  .credits-btn {
    display: inline;
  }
  .credits:not(.is-open) {
    display: none;
  }
}
@media (max-width: 479px) {
  .t-short {
    display: none;
  }
  .t-min {
    display: inline;
  }
}
@media (max-width: 1023px) {
  .drawer-left.is-open,
  .drawer-right.is-open {
    transform: none;
    visibility: visible;
  }
}
@media (hover: none) {
  .help-btn {
    display: none;
  }
}
</style>
