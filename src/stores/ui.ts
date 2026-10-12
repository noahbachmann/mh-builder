import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Rank, WeaponType } from '../data/types'
import type { DecoSlot, EquipSlot } from '../engine'

export const SIDEBAR_TABS = ['stats', 'skills', 'equipment'] as const
export type SidebarTab = (typeof SIDEBAR_TABS)[number]

export const VIEWS = ['equipment', 'monsters'] as const
export type View = (typeof VIEWS)[number]

/** open overlay column on small screens (see `composables/useBreakpoint`) */
export type Drawer = 'left' | 'right'

export type Screen = 'overview' | 'weapon' | 'armor' | 'charm' | 'decorations'

/** sub-tabs of the default (overview) screen */
export const OVERVIEW_TABS = ['summary', 'compare', 'materials'] as const
export type OverviewTab = (typeof OVERVIEW_TABS)[number]

/** Which screen/tab is open; selection state that is UI-only. */
export const useUiStore = defineStore('ui', () => {
  /** major page; mirrored to `?view=` by the monster store */
  const view = ref<View>(new URLSearchParams(location.search).get('view') === 'monsters' ? 'monsters' : 'equipment')
  const tab = ref<SidebarTab>('stats')
  const screen = ref<Screen>('overview')
  const overviewTab = ref<OverviewTab>('summary')
  /** slot shown in the Selected Equipment tab */
  const selectedSlot = ref<EquipSlot>('weapon')
  const weaponType = ref<WeaponType>('great-sword')
  const armorRank = ref<Rank | 'all'>('MR')
  const decoSlot = ref<{ slot: DecoSlot; index: number } | null>(null)
  const showHelp = ref(false)
  const drawer = ref<Drawer | null>(null)

  function toggleDrawer(side: Drawer) {
    drawer.value = drawer.value === side ? null : side
  }
  function closeDrawer() {
    drawer.value = null
  }

  function cycleTab(step: 1 | -1) {
    const i = SIDEBAR_TABS.indexOf(tab.value)
    tab.value = SIDEBAR_TABS[(i + step + SIDEBAR_TABS.length) % SIDEBAR_TABS.length]!
  }

  // opening a screen from the slot drawer shows it
  function openSlot(slot: EquipSlot) {
    closeDrawer()
    selectedSlot.value = slot
    screen.value = slot === 'weapon' ? 'weapon' : slot === 'charm' ? 'charm' : 'armor'
  }

  function openDecorations(slot?: DecoSlot, index = 0) {
    closeDrawer()
    screen.value = 'decorations'
    if (slot) {
      selectedSlot.value = slot
      decoSlot.value = { slot, index }
    }
  }

  /** no tab: keeps the last sub-tab */
  function openOverview(sub?: OverviewTab) {
    closeDrawer()
    screen.value = 'overview'
    if (sub) overviewTab.value = sub
  }

  function cycleOverviewTab(step: 1 | -1) {
    const i = OVERVIEW_TABS.indexOf(overviewTab.value)
    overviewTab.value = OVERVIEW_TABS[(i + step + OVERVIEW_TABS.length) % OVERVIEW_TABS.length]!
  }

  function close() {
    screen.value = 'overview'
  }

  return {
    view,
    tab,
    screen,
    overviewTab,
    selectedSlot,
    weaponType,
    armorRank,
    decoSlot,
    showHelp,
    drawer,
    toggleDrawer,
    closeDrawer,
    cycleTab,
    openSlot,
    openDecorations,
    openOverview,
    cycleOverviewTab,
    close,
  }
})
