import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db } from '../data'
import { diffStats, equip, evaluateBuild, setDecoration, type DecoSlot, type EquipSlot } from '../engine'
import { useBuildStore } from './build'

export type Candidate =
  | { kind: 'equip'; slot: EquipSlot; id: number | null }
  | { kind: 'deco'; slot: DecoSlot; index: number; id: number | null }

const same = (a: Candidate | null, b: Candidate | null) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Hovered / focused candidate and the build it would produce. A tapped candidate (touch) is
 * `pinned`: blur / leave don't clear it, so the diff stays while the sidebar drawer is opened.
 */
export const usePreviewStore = defineStore('preview', () => {
  const candidate = ref<Candidate | null>(null)
  const pinned = ref(false)
  const buildStore = useBuildStore()

  const build = computed(() => {
    const c = candidate.value
    if (!c) return null
    const b = buildStore.build
    return c.kind === 'equip' ? equip(b, c.slot, c.id, db) : setDecoration(b, c.slot, c.index, c.id, db)
  })
  const stats = computed(() => (build.value ? evaluateBuild(build.value, db) : null))
  const diff = computed(() => (stats.value ? diffStats(buildStore.stats, stats.value) : null))

  function show(c: Candidate, opts: { pinned?: boolean } = {}) {
    // hover / focus doesn't replace a pinned tap preview of another item
    if (pinned.value && !opts.pinned && !same(c, candidate.value)) return
    candidate.value = c
    pinned.value = opts.pinned ?? (pinned.value && same(c, candidate.value))
  }
  /** Without `c`: always clears (screen change, equip). With `c`: only that unpinned candidate (blur / leave). */
  function clear(c?: Candidate) {
    if (!c) {
      candidate.value = null
      pinned.value = false
    } else if (!pinned.value && same(c, candidate.value)) candidate.value = null
  }
  const isCandidate = (c: Candidate) => same(c, candidate.value)
  /** tapped once: the next tap equips (row gets `.is-previewing`) */
  const isPinned = (c: Candidate) => pinned.value && isCandidate(c)

  return { candidate, pinned, build, stats, diff, show, clear, isCandidate, isPinned }
})
