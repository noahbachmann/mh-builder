import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db } from '../data'
import { diffStats, equip, evaluateBuild, setDecoration, type DecoSlot, type EquipSlot } from '../engine'
import { useBuildStore } from './build'

export type Candidate =
  | { kind: 'equip'; slot: EquipSlot; id: number | null }
  | { kind: 'deco'; slot: DecoSlot; index: number; id: number | null }

/** Hovered / focused candidate and the build it would produce. */
export const usePreviewStore = defineStore('preview', () => {
  const candidate = ref<Candidate | null>(null)
  const buildStore = useBuildStore()

  const build = computed(() => {
    const c = candidate.value
    if (!c) return null
    const b = buildStore.build
    return c.kind === 'equip' ? equip(b, c.slot, c.id, db) : setDecoration(b, c.slot, c.index, c.id, db)
  })
  const stats = computed(() => (build.value ? evaluateBuild(build.value, db) : null))
  const diff = computed(() => (stats.value ? diffStats(buildStore.stats, stats.value) : null))

  function show(c: Candidate) {
    candidate.value = c
  }
  function clear(c?: Candidate) {
    // only clear if still showing the same candidate (avoids blur/focus races)
    if (!c || JSON.stringify(c) === JSON.stringify(candidate.value)) candidate.value = null
  }

  return { candidate, build, stats, diff, show, clear }
})
