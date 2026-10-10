import type { DataIndex } from '../data'
import type { ElementOrStatus, SetBonus, Skill } from '../data/types'
import type { Build } from './build'
import { diffNumber, type NumberDiff } from './build-diff'
import { evaluateBuild, type BuildStats } from './evaluate'

/** One build in a comparison: plain stats + stats with every conditional skill active. */
export interface CompareEntry {
  stats: BuildStats
  /** all conditions met (Agitator active, WEX on weakspot, ...) */
  potential: BuildStats
}

export type MetricKey =
  | 'efr'
  | 'efr-potential'
  | `efe-${ElementOrStatus}`
  | 'true-raw'
  | 'attack'
  | 'affinity'
  | 'crit-multiplier'
  | `element-${ElementOrStatus}`
  | 'sharpness'
  | 'defense'
  | `res-${'fire' | 'water' | 'thunder' | 'ice' | 'dragon'}`

export interface MetricRow {
  key: MetricKey
  group: 'damage' | 'offense' | 'defense'
  /** per build, null = not applicable (no weapon, no such element) */
  values: (number | null)[]
  /** indices holding the best value; empty when all are equal or fewer than two values exist */
  best: number[]
  /** each build vs the first one */
  deltas: NumberDiff[]
}

export interface SkillRow {
  skill: Skill
  /** 0 = not present */
  levels: number[]
  caps: number[]
}

export interface SetBonusRow {
  bonus: SetBonus
  pieces: number[]
  /** set bonus skills active per build */
  active: number[]
}

export interface BuildComparison {
  metrics: MetricRow[]
  skills: SkillRow[]
  setBonuses: SetBonusRow[]
}

const RESISTANCES = ['fire', 'water', 'thunder', 'ice', 'dragon'] as const
const EPS = 1e-9

export function evaluateForCompare(build: Build, db: DataIndex): CompareEntry {
  return { stats: evaluateBuild(build, db), potential: evaluateBuild(build, db, { includeConditional: true }) }
}

/** Indices of the highest values; empty on a full tie or with fewer than two values. */
export function bestOf(values: (number | null)[]): number[] {
  const nums = values.filter((v): v is number => v !== null)
  if (nums.length < 2) return []
  const max = Math.max(...nums)
  if (nums.every((v) => Math.abs(v - max) < EPS)) return []
  return values.flatMap((v, i) => (v !== null && Math.abs(v - max) < EPS ? [i] : []))
}

function row(key: MetricKey, group: MetricRow['group'], values: (number | null)[]): MetricRow {
  return { key, group, values, best: bestOf(values), deltas: values.map((v) => diffNumber(values[0], v)) }
}

/** Side-by-side metrics, skills and set bonuses for several builds; higher is better for every metric. */
export function compareBuilds(entries: CompareEntry[]): BuildComparison {
  const s = entries.map((e) => e.stats)
  const metrics: MetricRow[] = []
  const add = (key: MetricKey, group: MetricRow['group'], pick: (b: BuildStats, i: number) => number | null | undefined) =>
    metrics.push(row(key, group, s.map((b, i) => pick(b, i) ?? null)))

  add('efr', 'damage', (b) => b.efr?.efr)
  add('efr-potential', 'damage', (_, i) => entries[i]!.potential.efr?.efr)
  const efeTypes = [...new Set(s.flatMap((b) => b.efe.map((e) => e.type)))]
  for (const t of efeTypes) add(`efe-${t}`, 'damage', (b) => b.efe.find((e) => e.type === t)?.efe)
  add('true-raw', 'damage', (b) => b.efr?.trueRaw)

  add('attack', 'offense', (b) => b.weapon?.attack)
  add('affinity', 'offense', (b) => b.weapon?.affinity)
  add('crit-multiplier', 'offense', (b) => b.efr?.critMultiplier)
  const elTypes = [...new Set(s.flatMap((b) => (b.weapon?.elements ?? []).filter((e) => e.active).map((e) => e.type)))]
  for (const t of elTypes) add(`element-${t}`, 'offense', (b) => b.weapon?.elements.find((e) => e.type === t && e.active)?.value)
  // gunners have no sharpness (-1)
  add('sharpness', 'offense', (b) => (b.weapon && b.weapon.sharpnessIndex >= 0 ? b.weapon.sharpnessIndex : null))

  add('defense', 'defense', (b) => b.defense.defense)
  for (const r of RESISTANCES) add(`res-${r}`, 'defense', (b) => b.defense.resistances[r])

  const skillIds = [...new Set(s.flatMap((b) => b.skills.skills.map((x) => x.skill.id)))]
  const skills: SkillRow[] = skillIds.map((id) => {
    const totals = s.map((b) => b.skills.skills.find((x) => x.skill.id === id))
    const skill = totals.find((t) => t)!.skill
    return { skill, levels: totals.map((t) => t?.level ?? 0), caps: totals.map((t) => t?.cap ?? skill.maxLevel) }
  })
  skills.sort((a, b) => Math.max(...b.levels) - Math.max(...a.levels) || a.skill.name.localeCompare(b.skill.name))

  const bonusIds = [...new Set(s.flatMap((b) => b.skills.setBonuses.map((x) => x.bonus.id)))]
  const setBonuses: SetBonusRow[] = bonusIds.map((id) => {
    const st = s.map((b) => b.skills.setBonuses.find((x) => x.bonus.id === id))
    return {
      bonus: st.find((x) => x)!.bonus,
      pieces: st.map((x) => x?.pieces ?? 0),
      active: st.map((x) => x?.ranks.filter((r) => r.active).length ?? 0),
    }
  })

  return { metrics, skills, setBonuses }
}
