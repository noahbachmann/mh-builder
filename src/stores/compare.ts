import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { db } from '../data'
import { compareBuilds, decodeBuild, evaluateForCompare, type Build, type CompareEntry } from '../engine'
import { useBuildStore } from './build'
import { useSavedStore } from './saved'

const KEY = 'mhw-builder.compare'
/** saved builds next to the current one */
export const MAX_COMPARED = 3

export interface CompareColumn extends CompareEntry {
  /** saved build or preset id, or 'current' */
  id: string
  name: string
  build: Build
}

function read(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string').slice(0, MAX_COMPARED) : []
  } catch {
    return []
  }
}

/** Saved builds / presets picked for comparison; the current build is always the first column. */
export const useCompareStore = defineStore('compare', () => {
  const saved = useSavedStore()
  const current = useBuildStore()
  const selected = ref<string[]>(read())

  // drop ids of deleted builds (and presets that no longer exist)
  watch(
    () => saved.builds,
    () => (selected.value = selected.value.filter((id) => saved.find(id))),
    { immediate: true },
  )
  watch(selected, (ids) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids))
    } catch {
      // storage disabled: keep in memory
    }
  })

  const isSelected = (id: string) => selected.value.includes(id)
  const isFull = computed(() => selected.value.length >= MAX_COMPARED)

  function toggle(id: string) {
    if (isSelected(id)) remove(id)
    else if (!isFull.value) selected.value = [...selected.value, id]
  }
  function remove(id: string) {
    selected.value = selected.value.filter((x) => x !== id)
  }

  // saved builds evaluated once per code, not on every current-build change
  const savedColumns = computed(() =>
    selected.value.flatMap((id): CompareColumn[] => {
      const b = saved.find(id)
      const build = b && decodeBuild(b.code, db)
      return b && build ? [{ id, name: b.name, build, ...evaluateForCompare(build, db) }] : []
    }),
  )
  const columns = computed<CompareColumn[]>(() => [
    { id: 'current', name: 'Current build', build: current.build, ...evaluateForCompare(current.build, db) },
    ...savedColumns.value,
  ])
  const comparison = computed(() => compareBuilds(columns.value))

  return { selected, isSelected, isFull, toggle, remove, columns, comparison }
})
