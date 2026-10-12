import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import { db } from '../data'
import { loadCrafting, type CraftingIndex } from '../data/crafting'
import { buildMaterials, decodeBuild, type Build } from '../engine'
import { useBuildStore } from './build'
import { useSavedStore } from './saved'

const KEY = 'mhw-builder.materials'

/** checklist key: saved build id, or `code:<build code>` for an unsaved current build */
type Checks = Record<string, number[]>

function read(): Checks {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
    return Object.fromEntries(
      Object.entries(v).filter((e): e is [string, number[]] => Array.isArray(e[1]) && e[1].every((x) => typeof x === 'number')),
    )
  } catch {
    return {}
  }
}

/** Lazy recipe data + the per-build materials checklist (checked item ids in localStorage). */
export const useCraftingStore = defineStore('crafting', () => {
  const saved = useSavedStore()
  const current = useBuildStore()
  const index = shallowRef<CraftingIndex | null>(null)
  const checks = ref<Checks>(read())
  /** build shown on the Materials screen: 'current' or a saved build id */
  const target = ref<string>('current')

  async function ensureLoaded() {
    index.value ??= await loadCrafting()
  }

  // saving the current build carries its checklist over; deleted builds drop theirs
  watch(
    () => saved.builds,
    (list) => {
      const ids = new Set(list.map((b) => b.id))
      if (target.value !== 'current' && !ids.has(target.value)) target.value = 'current'
      const next: Checks = Object.fromEntries(Object.entries(checks.value).filter(([k]) => k.startsWith('code:') || ids.has(k)))
      for (const b of list) {
        const unsaved = next[`code:${b.code}`]
        if (unsaved && !next[b.id]) {
          next[b.id] = unsaved
          delete next[`code:${b.code}`]
        }
      }
      if (JSON.stringify(next) !== JSON.stringify(checks.value)) checks.value = next
    },
  )
  watch(
    checks,
    (c) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(c))
      } catch {
        // storage disabled: keep in memory
      }
    },
    { deep: true },
  )

  /** targets: current build first, then saved builds */
  const targets = computed(() => [
    { id: 'current', name: 'Current build' },
    ...saved.builds.map((b) => ({ id: b.id, name: b.name })),
  ])

  const shown = computed<{ key: string; build: Build } | null>(() => {
    if (target.value === 'current') {
      // current build equal to a saved one shares its checklist
      const match = saved.builds.find((b) => b.code === current.code)
      return { key: match ? match.id : `code:${current.code}`, build: current.build }
    }
    const b = saved.builds.find((x) => x.id === target.value)
    const build = b && decodeBuild(b.code, db)
    return b && build ? { key: b.id, build } : null
  })
  const materials = computed(() => (index.value && shown.value ? buildMaterials(shown.value.build, db, index.value) : null))

  const checked = computed(() => new Set(shown.value ? (checks.value[shown.value.key] ?? []) : []))
  function toggle(itemId: number) {
    const key = shown.value?.key
    if (!key) return
    const list = checks.value[key] ?? []
    checks.value[key] = list.includes(itemId) ? list.filter((x) => x !== itemId) : [...list, itemId]
  }
  function clearChecks() {
    const key = shown.value?.key
    if (key) delete checks.value[key]
  }

  return { index, ensureLoaded, target, targets, shown, materials, checked, toggle, clearChecks }
})
