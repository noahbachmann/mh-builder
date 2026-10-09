import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Rank, WeaponType } from '../data/types'
import type { DecoSlot, EquipSlot } from '../engine'

export const SIDEBAR_TABS = ['stats', 'skills', 'equipment'] as const
export type SidebarTab = (typeof SIDEBAR_TABS)[number]

export type Screen = 'overview' | 'weapon' | 'armor' | 'charm' | 'decorations'

/** Which screen/tab is open; selection state that is UI-only. */
export const useUiStore = defineStore('ui', () => {
  const tab = ref<SidebarTab>('stats')
  const screen = ref<Screen>('overview')
  /** slot shown in the Selected Equipment tab */
  const selectedSlot = ref<EquipSlot>('weapon')
  const weaponType = ref<WeaponType>('great-sword')
  const armorRank = ref<Rank | 'all'>('MR')
  const decoSlot = ref<{ slot: DecoSlot; index: number } | null>(null)
  const showHelp = ref(false)

  function cycleTab(step: 1 | -1) {
    const i = SIDEBAR_TABS.indexOf(tab.value)
    tab.value = SIDEBAR_TABS[(i + step + SIDEBAR_TABS.length) % SIDEBAR_TABS.length]!
  }

  function openSlot(slot: EquipSlot) {
    selectedSlot.value = slot
    screen.value = slot === 'weapon' ? 'weapon' : slot === 'charm' ? 'charm' : 'armor'
  }

  function openDecorations(slot?: DecoSlot, index = 0) {
    screen.value = 'decorations'
    if (slot) {
      selectedSlot.value = slot
      decoSlot.value = { slot, index }
    }
  }

  function close() {
    screen.value = 'overview'
  }

  return {
    tab,
    screen,
    selectedSlot,
    weaponType,
    armorRank,
    decoSlot,
    showHelp,
    cycleTab,
    openSlot,
    openDecorations,
    close,
  }
})
