/**
 * Global keyboard shortcuts. Arrow keys move in the focus grid, Enter/Space activate the
 * focused button natively.
 *
 *   1-7       open Weapon / Head / Chest / Arms / Waist / Legs / Charm
 *   8         open Decorations
 *   C         compare saved builds
 *   M         build materials checklist
 *   S         switch Equipment / Monsters page
 *   Q / E     previous / next sidebar tab (monster tab on the Monsters page)
 *   A / D     previous / next sub-tab of the open screen (weapon type, rank, equipment piece; loot rank)
 *   F         focus search
 *   Esc       back (close screen -> slot list)
 *   ?         toggle shortcut help
 */
import { nextTick } from 'vue'
import { EQUIP_SLOTS, DECO_SLOTS } from '../engine'
import { WEAPON_TYPES } from '../data/types'
import { useBuildStore } from '../stores/build'
import { useCraftingStore } from '../stores/crafting'
import { useMonsterStore } from '../stores/monster'
import { useUiStore } from '../stores/ui'
import { focusRegion, moveFocus, type Direction } from './focus-grid'

export const SHORTCUTS: [string, string][] = [
  ['↑ ↓ ← →', 'Move'],
  ['Enter', 'Select / equip'],
  ['Esc', 'Back'],
  ['1 – 7', 'Weapon, Head, Chest, Arms, Waist, Legs, Charm'],
  ['8', 'Decorations'],
  ['C', 'Compare saved builds'],
  ['M', 'Build materials checklist'],
  ['S', 'Equipment / Monsters page'],
  ['Q / E', 'Previous / next sidebar tab'],
  ['A / D', 'Previous / next weapon type, rank, equipment piece, materials build or loot rank'],
  ['Tab', 'Next panel'],
  ['F', 'Search'],
  ['?', 'Show / hide this help'],
]

const ARROWS: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
const RANKS = ['all', 'LR', 'HR', 'MR'] as const

const cycle = <T>(list: readonly T[], cur: T, step: number): T =>
  list[(list.indexOf(cur) + step + list.length) % list.length]!

export function installKeyboard(): () => void {
  const ui = useUiStore()
  const build = useBuildStore()
  const monster = useMonsterStore()
  const crafting = useCraftingStore()

  const focusCenter = () => nextTick(() => focusRegion('center') || focusRegion('center-tabs'))

  function subTab(step: 1 | -1) {
    if (ui.screen === 'weapon') ui.weaponType = cycle(WEAPON_TYPES, ui.weaponType, step)
    else if (ui.screen === 'armor') ui.armorRank = cycle(RANKS, ui.armorRank, step)
    else if (ui.screen === 'decorations') {
      const withSlots = DECO_SLOTS.filter((s) => build.build.decorations[s].length > 0)
      if (!withSlots.length) return
      const cur = ui.decoSlot?.slot ?? withSlots[0]!
      const next = withSlots.includes(cur) ? cycle(withSlots, cur, step) : withSlots[0]!
      ui.openDecorations(next, 0)
    } else if (ui.screen === 'materials') crafting.cycleTarget(step)
    else return
    focusCenter()
  }

  function toggleView() {
    ui.view = ui.view === 'monsters' ? 'equipment' : 'monsters'
    if (ui.view === 'equipment') nextTick(() => focusRegion('slots'))
    // first visit: list renders once the data chunk is loaded
    else void monster.ensureLoaded().then(() => nextTick(() => focusRegion('monsters')))
  }

  /** Monsters page keys; false = not handled here */
  function monsterKey(key: string): boolean {
    if (key === 'q') monster.cycleTab(-1)
    else if (key === 'e') monster.cycleTab(1)
    else if (key === 'a' || key === 'd') {
      if (monster.tab === 'loot') monster.cycleRank(key === 'a' ? -1 : 1)
    } else return false
    return true
  }

  function onKey(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const t = e.target as HTMLElement | null
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)

    if (e.key === 'Escape') {
      if (typing) {
        t.blur()
        focusCenter()
      } else if (ui.showHelp) ui.showHelp = false
      else if (ui.drawer) ui.closeDrawer()
      else if (ui.view === 'monsters') {
        if (!focusRegion('monsters')) return
      } else if (ui.screen !== 'overview') {
        ui.close()
        nextTick(() => focusRegion('slots'))
      } else return
      e.preventDefault()
      return
    }
    if (typing) {
      // leave the search box with arrow down
      if (e.key === 'ArrowDown' && t.dataset.search !== undefined) {
        e.preventDefault()
        focusCenter()
      }
      return
    }

    const dir = ARROWS[e.key]
    if (dir) {
      if (moveFocus(dir)) e.preventDefault()
      return
    }

    const key = e.key.toLowerCase()
    if (key === 's') {
      toggleView()
      e.preventDefault()
      return
    }
    if (ui.view === 'monsters') {
      if (monsterKey(key)) {
        e.preventDefault()
        return
      }
      // equipment shortcuts switch back to the Equipment page
      if (/^[1-8cm]$/.test(key)) ui.view = 'equipment'
    }
    if (/^[1-7]$/.test(key)) {
      ui.openSlot(EQUIP_SLOTS[Number(key) - 1]!)
      focusCenter()
    } else if (key === '8') {
      ui.openDecorations()
      focusCenter()
    } else if (key === 'c') {
      ui.openCompare()
      focusCenter()
    } else if (key === 'm') {
      ui.openMaterials()
      focusCenter()
    } else if (key === 'q') ui.cycleTab(-1)
    else if (key === 'e') ui.cycleTab(1)
    else if (key === 'a') subTab(-1)
    else if (key === 'd') subTab(1)
    else if (key === 'f') {
      const search = document.querySelector<HTMLInputElement>('[data-search]')
      if (!search) return
      search.focus()
      search.select()
    } else if (key === '?') ui.showHelp = !ui.showHelp
    else return
    e.preventDefault()
  }

  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}
