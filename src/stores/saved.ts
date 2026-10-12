import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../data'
import { PRESETS } from '../data/presets'
import { encodeBuild, PRESET_PREFIX, resolvePreset, type PresetGroup } from '../engine'

/** anything listed in the Builds panel: a saved build or a preset */
export interface NamedBuild {
  id: string
  name: string
  code: string
}

export interface SavedBuild extends NamedBuild {
  savedAt: number
}

export interface PresetBuild extends NamedBuild {
  group: PresetGroup
  note: string
}

/** read-only seeded builds, ids `preset:<slug>` */
export const PRESET_BUILDS: PresetBuild[] = PRESETS.map((p) => ({
  id: PRESET_PREFIX + p.slug,
  name: p.name,
  code: encodeBuild(resolvePreset(p, db).build),
  group: p.group,
  note: p.note,
}))

export const isPresetId = (id: string) => id.startsWith(PRESET_PREFIX)

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

  /** saved build or preset by id */
  function find(id: string): NamedBuild | undefined {
    return isPresetId(id) ? PRESET_BUILDS.find((b) => b.id === id) : builds.value.find((b) => b.id === id)
  }

  return { builds, presets: PRESET_BUILDS, find, save, overwrite, rename, remove }
})
