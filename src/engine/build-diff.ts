import type { ElementOrStatus, Skill } from '../data/types'
import type { BuildStats } from './evaluate'

export type Direction = 'up' | 'down' | 'same'

export interface NumberDiff {
  from: number | null
  to: number | null
  /** to - from (null side counts as 0) */
  delta: number
  dir: Direction
}

export interface SkillDiff {
  skill: Skill
  from: number
  to: number
  dir: Direction
}

export interface StatsDiff {
  attack: NumberDiff
  affinity: NumberDiff
  defense: NumberDiff
  efr: NumberDiff
  sharpnessIndex: NumberDiff
  elements: Partial<Record<ElementOrStatus, NumberDiff>>
  efe: Partial<Record<ElementOrStatus, NumberDiff>>
  resistances: Record<'fire' | 'water' | 'thunder' | 'ice' | 'dragon', NumberDiff>
  /** only skills whose level changed */
  skills: SkillDiff[]
}

const EPS = 1e-9

export function diffNumber(from: number | null | undefined, to: number | null | undefined): NumberDiff {
  const f = from ?? null
  const t = to ?? null
  const delta = (t ?? 0) - (f ?? 0)
  return { from: f, to: t, delta, dir: delta > EPS ? 'up' : delta < -EPS ? 'down' : 'same' }
}

/** Compares current build stats against a candidate (hover preview). */
export function diffStats(from: BuildStats, to: BuildStats): StatsDiff {
  const elements: StatsDiff['elements'] = {}
  const types = new Set([...(from.weapon?.elements ?? []), ...(to.weapon?.elements ?? [])].map((e) => e.type))
  for (const t of types) {
    const a = from.weapon?.elements.find((e) => e.type === t && e.active)
    const b = to.weapon?.elements.find((e) => e.type === t && e.active)
    elements[t] = diffNumber(a?.value, b?.value)
  }
  const efe: StatsDiff['efe'] = {}
  const efeTypes = new Set([...from.efe, ...to.efe].map((e) => e.type))
  for (const t of efeTypes)
    efe[t] = diffNumber(from.efe.find((e) => e.type === t)?.efe, to.efe.find((e) => e.type === t)?.efe)

  const levelsA = new Map(from.skills.skills.map((s) => [s.skill.id, s]))
  const levelsB = new Map(to.skills.skills.map((s) => [s.skill.id, s]))
  const skills: SkillDiff[] = []
  for (const id of new Set([...levelsA.keys(), ...levelsB.keys()])) {
    const a = levelsA.get(id)
    const b = levelsB.get(id)
    const f = a?.level ?? 0
    const t = b?.level ?? 0
    if (f !== t) skills.push({ skill: (a ?? b)!.skill, from: f, to: t, dir: t > f ? 'up' : 'down' })
  }
  skills.sort((x, y) => y.to - x.to || x.skill.name.localeCompare(y.skill.name))

  const res = (k: keyof StatsDiff['resistances']) =>
    diffNumber(from.defense.resistances[k], to.defense.resistances[k])
  return {
    attack: diffNumber(from.weapon?.attack, to.weapon?.attack),
    affinity: diffNumber(from.weapon?.affinity, to.weapon?.affinity),
    defense: diffNumber(from.defense.defense, to.defense.defense),
    efr: diffNumber(from.efr?.efr, to.efr?.efr),
    sharpnessIndex: diffNumber(from.weapon?.sharpnessIndex, to.weapon?.sharpnessIndex),
    elements,
    efe,
    resistances: { fire: res('fire'), water: res('water'), thunder: res('thunder'), ice: res('ice'), dragon: res('dragon') },
    skills,
  }
}
