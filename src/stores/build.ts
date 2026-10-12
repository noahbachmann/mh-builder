import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { db } from '../data'
import {
  decodeBuild,
  emptyBuild,
  encodeBuild,
  equip as equipFn,
  evaluateBuild,
  setDecoration,
  type Build,
  type DecoSlot,
  type EquipSlot,
} from '../engine'

const PARAM = 'b'

function readUrlBuild(): Build | null {
  const code = new URLSearchParams(location.search).get(PARAM)
  return code ? decodeBuild(code, db) : null
}

/** Link that opens `code` on the Equipment page (other query params dropped). */
export function shareUrlFor(code: string): string {
  const url = new URL(location.pathname, location.origin)
  url.searchParams.set(PARAM, code)
  return url.toString()
}

/** Equipped build + derived stats; mirrors the build into `?b=` so the URL is always shareable. */
export const useBuildStore = defineStore('build', () => {
  const build = ref<Build>(readUrlBuild() ?? emptyBuild())
  const stats = computed(() => evaluateBuild(build.value, db))
  const code = computed(() => encodeBuild(build.value))

  watch(code, (c) => {
    const url = new URL(location.href)
    if (c === encodeBuild(emptyBuild())) url.searchParams.delete(PARAM)
    else url.searchParams.set(PARAM, c)
    history.replaceState(history.state, '', url)
  })

  function equip(slot: EquipSlot, id: number | null) {
    build.value = equipFn(build.value, slot, id, db)
  }
  function setDeco(slot: DecoSlot, index: number, id: number | null) {
    build.value = setDecoration(build.value, slot, index, id, db)
  }
  function load(b: Build) {
    build.value = b
  }
  function loadCode(c: string): boolean {
    const b = decodeBuild(c, db)
    if (b) build.value = b
    return b !== null
  }
  function reset() {
    build.value = emptyBuild()
  }

  return { build, stats, code, equip, setDeco, load, loadCode, reset }
})
