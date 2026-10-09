import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SavedBuild {
  id: string
  name: string
  code: string
  savedAt: number
}

const KEY = 'mhw-builder.saved'

function read(): SavedBuild[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(list) ? (list as SavedBuild[]).filter((b) => b && typeof b.code === 'string') : []
  } catch {
    return []
  }
}

/** Saved builds in localStorage; stores codec strings, not objects, so data changes stay compatible. */
export const useSavedStore = defineStore('saved', () => {
  const builds = ref<SavedBuild[]>(read())

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(builds.value))
    } catch {
      // storage full / disabled: keep in memory
    }
  }

  function save(name: string, code: string): SavedBuild {
    const b = { id: crypto.randomUUID(), name: name.trim() || 'Unnamed build', code, savedAt: Date.now() }
    builds.value = [b, ...builds.value]
    persist()
    return b
  }
  function overwrite(id: string, code: string) {
    builds.value = builds.value.map((b) => (b.id === id ? { ...b, code, savedAt: Date.now() } : b))
    persist()
  }
  function rename(id: string, name: string) {
    builds.value = builds.value.map((b) => (b.id === id ? { ...b, name: name.trim() || b.name } : b))
    persist()
  }
  function remove(id: string) {
    builds.value = builds.value.filter((b) => b.id !== id)
    persist()
  }

  return { builds, save, overwrite, rename, remove }
})
