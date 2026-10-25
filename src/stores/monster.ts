import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import { db } from '../data'
import { loadMonsters, type MonsterIndex } from '../data/monsters'
import type { AmmoKey, Rank } from '../data/types'
import {
  CONDITION_CONFLICTS,
  ammoChoices,
  damageTable,
  defaultMode,
  evaluateForMonster,
  resolveAmmo,
  weaponAmmo,
  weightedAverage,
  type DamageSettings,
} from '../engine'
import { useCompareStore } from './compare'
import { useUiStore } from './ui'

export const MONSTER_TABS = ['info', 'damage', 'loot'] as const
export type MonsterTab = (typeof MONSTER_TABS)[number]
export const LOOT_RANKS: readonly Rank[] = ['LR', 'HR', 'MR']
export const DEFAULT_MV = 100
export const MAX_WEIGHT = 10

const PARAM = 'm'

/**
 * Monsters page: selected monster, sidebar tab, damage settings. Monster data loads on first visit.
 * Builds are the compare selection (current + up to 3 saved, `stores/compare.ts`); the current build can be left out.
 */
export const useMonsterStore = defineStore('monster', () => {
  const ui = useUiStore()
  const compare = useCompareStore()

  const index = shallowRef<MonsterIndex | null>(null)
  const slug = ref<string | null>(new URLSearchParams(location.search).get(PARAM))
  const tab = ref<MonsterTab>('info')
  const lootRank = ref<Rank>('MR')

  // per monster
  const mode = ref<string | null>(null)
  const broken = ref(new Set<string>())
  const wounded = ref(new Set<string>())
  /** part -> weight for the average; missing = 1 */
  const weights = ref<Record<string, number>>({})

  // per build set, kept across monsters
  const mv = ref(DEFAULT_MV)
  /** sharpness colour index, null = each weapon's top colour */
  const sharpness = ref<number | null>(null)
  /** conditional skill ids switched on; Weakness Exploit on = applied per hitzone */
  const conditions = ref(new Set<string>(['weakness-exploit']))
  /** include the equipped build as a column */
  const includeCurrent = ref(true)
  /** bowgun ammo picked per build id; missing = best for the monster */
  const ammo = ref<Record<string, AmmoKey>>({})

  const monsters = computed(() => index.value?.data.monsters ?? [])
  const monster = computed(() => (index.value && slug.value ? (index.value.bySlug.get(slug.value) ?? null) : null))
  const ranks = computed(() => LOOT_RANKS.filter((r) => monster.value?.rewards.some((x) => x.rank === r)))

  function select(s: string) {
    slug.value = s
  }

  // new monster: reset its state, keep the loot rank if it has one
  watch(
    monster,
    (m) => {
      if (!m) return
      mode.value = defaultMode(m)
      broken.value = new Set()
      wounded.value = new Set()
      weights.value = {}
      if (!ranks.value.includes(lootRank.value)) lootRank.value = ranks.value[ranks.value.length - 1] ?? 'MR'
    },
    { immediate: true },
  )

  /** loads the data once; resolves when the list can render */
  async function ensureLoaded() {
    if (index.value) return
    const idx = await loadMonsters()
    if (index.value) return
    index.value = idx
    if (!monster.value) slug.value = idx.data.monsters[0]?.slug ?? null
  }

  watch(
    () => ui.view,
    (v) => {
      if (v === 'monsters') void ensureLoaded()
    },
    { immediate: true },
  )

  watch([() => ui.view, slug], ([v, s]) => {
    const url = new URL(location.href)
    if (v === 'monsters') {
      url.searchParams.set('view', v)
      if (s) url.searchParams.set(PARAM, s)
    } else {
      url.searchParams.delete('view')
      url.searchParams.delete(PARAM)
    }
    history.replaceState(history.state, '', url)
  })

  const toggleIn = (set: typeof broken, key: string) => {
    const next = new Set(set.value)
    if (!next.delete(key)) next.add(key)
    set.value = next
  }
  const toggleBroken = (part: string) => toggleIn(broken, part)
  const toggleWounded = (part: string) => toggleIn(wounded, part)
  /** switching a health condition on switches off the ones it can't coexist with */
  function toggleCondition(skillId: string) {
    const next = new Set(conditions.value)
    if (next.delete(skillId)) return void (conditions.value = next)
    next.add(skillId)
    for (const c of CONDITION_CONFLICTS[skillId] ?? []) next.delete(c)
    conditions.value = next
  }
  const weight = (part: string) => weights.value[part] ?? 1
  function setWeight(part: string, w: number) {
    weights.value = { ...weights.value, [part]: Math.max(0, Math.min(MAX_WEIGHT, Math.round(w))) }
  }

  /** null = back to the best ammo */
  function setAmmo(buildId: string, key: AmmoKey | null) {
    const next = { ...ammo.value }
    if (key) next[buildId] = key
    else delete next[buildId]
    ammo.value = next
  }

  function cycleTab(step: 1 | -1) {
    const i = MONSTER_TABS.indexOf(tab.value)
    tab.value = MONSTER_TABS[(i + step + MONSTER_TABS.length) % MONSTER_TABS.length]!
  }
  function cycleRank(step: 1 | -1) {
    const list = ranks.value
    if (!list.length) return
    const i = list.indexOf(lootRank.value)
    lootRank.value = list[(i + step + list.length) % list.length]!
  }

  /** one entry per compare column, evaluated with the chosen conditions */
  const builds = computed(() =>
    compare.columns
      .filter((c) => includeCurrent.value || c.id !== 'current')
      .map((c) => ({ id: c.id, name: c.name, stats: evaluateForMonster(c.build, db, conditions.value) })),
  )
  const settings = computed<DamageSettings>(() => ({
    mode: mode.value,
    broken: broken.value,
    wounded: wounded.value,
    mv: mv.value,
    sharpnessIndex: sharpness.value,
    weaknessExploit: conditions.value.has('weakness-exploit'),
  }))
  /** per build: damaging ammo with averages (empty for non-bowguns) and the ammo fired */
  const ammoState = computed(() =>
    builds.value.map((b) => {
      const m = monster.value
      const slots = weaponAmmo(b.stats.weapon?.weapon, db)
      const choices = m && slots.length ? ammoChoices(m, b.stats, slots, settings.value, weights.value) : []
      const picked = ammo.value[b.id] ?? null
      return { choices, picked, fired: resolveAmmo(choices, picked) }
    }),
  )
  const rows = computed(() =>
    monster.value
      ? damageTable(
          monster.value,
          builds.value.map((b) => b.stats),
          { ...settings.value, ammo: ammoState.value.map((a) => a.fired) },
        )
      : [],
  )
  const averages = computed(() => weightedAverage(rows.value, weights.value, builds.value.length))

  return {
    index,
    monsters,
    monster,
    slug,
    tab,
    lootRank,
    ranks,
    mode,
    broken,
    wounded,
    weights,
    mv,
    sharpness,
    conditions,
    includeCurrent,
    ammo,
    ammoState,
    builds,
    rows,
    averages,
    select,
    ensureLoaded,
    toggleBroken,
    toggleWounded,
    toggleCondition,
    weight,
    setWeight,
    setAmmo,
    cycleTab,
    cycleRank,
  }
})
