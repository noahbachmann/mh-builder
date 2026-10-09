/**
 * Hand-written table: skill + level -> numeric modifiers.
 *
 * Values are taken from the in-game skill descriptions (shipped in `src/data/skills.json`)
 * unless noted. Raw values are TRUE raw (MHW skill text lists true raw), element and status
 * values are DISPLAYED (x10) like the weapon stat.
 *
 * `conditional` effects only apply once situational toggles exist (later milestone); the
 * engine ignores them unless asked to include them.
 */
import type { Element, ElementalResistances, Status } from '../data/types'
import { CRIT_BOOST_MULTIPLIER } from './constants'

export interface SkillEffect {
  /** flat true raw */
  rawFlat?: number
  /** multiplier on base true raw */
  rawMul?: number
  affinity?: number
  /** absolute raw crit multiplier (replaces the 1.25 base) */
  critMultiplier?: number
  /** flat displayed element, per element ('all' = every element) */
  elementFlat?: number
  elementMul?: number
  element?: Element | 'all'
  statusFlat?: number
  statusMul?: number
  status?: Status
  critElement?: 'normal' | 'true'
  handicraft?: number
  /** fraction of hidden element drawn out */
  freeElement?: number
  nonElementalBoost?: boolean
  defenseFlat?: number
  defenseMul?: number
  resistances?: Partial<ElementalResistances>
  /** short label of the condition; present => conditional */
  conditional?: string
}

type Table = Record<string, SkillEffect[]>

const perLevel = <T>(values: T[], build: (v: T, i: number) => SkillEffect): SkillEffect[] => values.map(build)

const ELEMENT_LEVELS: [number, number][] = [
  [0, 30],
  [0, 60],
  [0, 100],
  [0.05, 100],
  [0.1, 100],
  [0.2, 100],
]
const elementAttack = (element: Element) =>
  perLevel(ELEMENT_LEVELS, ([mul, flat]) => ({ element, elementMul: 1 + mul, elementFlat: flat }))

const statusAttack = (status: Status) =>
  perLevel([0.05, 0.1, 0.2, 0.3], (mul) => ({ status, statusMul: 1 + mul, statusFlat: 10 }))

const resistance = (key: keyof ElementalResistances) => [
  { resistances: { [key]: 6 } },
  { resistances: { [key]: 12 } },
  { resistances: { [key]: 20 }, defenseFlat: 10 },
]

const allRes = (n: number): ElementalResistances => ({ fire: n, water: n, thunder: n, ice: n, dragon: n })

export const SKILL_EFFECTS: Table = {
  'attack-boost': perLevel([3, 6, 9, 12, 15, 18, 21], (raw, i) => ({
    rawFlat: raw,
    ...(i >= 3 ? { affinity: 5 } : {}),
  })),
  'critical-eye': perLevel([5, 10, 15, 20, 25, 30, 40], (affinity) => ({ affinity })),
  'critical-boost': CRIT_BOOST_MULTIPLIER.map((critMultiplier) => ({ critMultiplier })),
  'weakness-exploit': perLevel([10, 15, 30], (affinity) => ({ affinity, conditional: 'Weak spot hit' })),
  agitator: perLevel(
    [
      [4, 5],
      [8, 5],
      [12, 7],
      [16, 7],
      [20, 10],
      [24, 15],
      [28, 20],
    ],
    ([rawFlat, affinity]) => ({ rawFlat, affinity, conditional: 'Monster enraged' }),
  ),
  'peak-performance': perLevel([5, 10, 20], (rawFlat) => ({ rawFlat, conditional: 'Full health' })),
  'latent-power': perLevel([10, 20, 30, 40, 50, 50, 60], (affinity) => ({ affinity, conditional: 'Latent Power active' })),
  'maximum-might': perLevel([10, 20, 30, 40, 40], (affinity) => ({ affinity, conditional: 'Full stamina' })),
  'critical-draw': perLevel([30, 60, 100], (affinity) => ({ affinity, conditional: 'Draw attack' })),
  resentment: perLevel([5, 10, 15, 20, 25], (rawFlat) => ({ rawFlat, conditional: 'Red health' })),
  'offensive-guard': perLevel([1.05, 1.1, 1.15], (rawMul) => ({ rawMul, conditional: 'After perfect guard' })),
  heroics: perLevel(
    [
      [1, 50],
      [1.05, 50],
      [1.05, 100],
      [1.1, 100],
      [1.15, 100],
      [1.25, 150],
      [1.4, 150],
    ],
    ([rawMul, defenseFlat]) => ({ rawMul, defenseFlat, conditional: 'Health at 35% or less' }),
  ),
  coalescence: perLevel(
    [
      [12, 30, 0.05],
      [15, 60, 0.1],
      [18, 90, 0.15],
    ],
    ([rawFlat, elementFlat, s]) => ({
      rawFlat,
      element: 'all',
      elementFlat,
      statusMul: 1 + s,
      conditional: 'After recovering from a blight',
    }),
  ),
  'non-elemental-boost': [{ nonElementalBoost: true }],
  'critical-element': [{ critElement: 'normal' }],
  'true-critical-element': [{ critElement: 'true' }],
  handicraft: perLevel([1, 2, 3, 4, 5], (handicraft) => ({ handicraft })),
  'free-elem-ammo-up': perLevel([0.33, 0.66, 1], (freeElement) => ({ freeElement })),
  'fire-attack': elementAttack('fire'),
  'water-attack': elementAttack('water'),
  'thunder-attack': elementAttack('thunder'),
  'ice-attack': elementAttack('ice'),
  'dragon-attack': elementAttack('dragon'),
  'poison-attack': statusAttack('poison'),
  'paralysis-attack': statusAttack('paralysis'),
  'sleep-attack': statusAttack('sleep'),
  'blast-attack': statusAttack('blast'),
  'defense-boost': [
    { defenseFlat: 5 },
    { defenseFlat: 10 },
    { defenseMul: 1.05, defenseFlat: 10 },
    { defenseMul: 1.05, defenseFlat: 20, resistances: allRes(3) },
    { defenseMul: 1.08, defenseFlat: 20, resistances: allRes(3) },
    { defenseMul: 1.08, defenseFlat: 35, resistances: allRes(5) },
    { defenseMul: 1.1, defenseFlat: 35, resistances: allRes(5) },
  ],
  'fire-resistance': resistance('fire'),
  'water-resistance': resistance('water'),
  'thunder-resistance': resistance('thunder'),
  'ice-resistance': resistance('ice'),
  'dragon-resistance': resistance('dragon'),
}

/** Effect of `skillId` at `level` (clamped to the table), or null if the skill has no numeric effect. */
export function skillEffect(skillId: string, level: number): SkillEffect | null {
  const levels = SKILL_EFFECTS[skillId]
  if (!levels || level < 1) return null
  return levels[Math.min(level, levels.length) - 1] ?? null
}

export interface EffectOptions {
  /** apply conditional effects too (situational toggles, later milestone) */
  includeConditional?: boolean
}

/** All active effects for a set of skill levels. */
export function activeEffects(levels: Map<string, number>, opts: EffectOptions = {}): SkillEffect[] {
  const out: SkillEffect[] = []
  for (const [id, level] of levels) {
    const e = skillEffect(id, level)
    if (e && (!e.conditional || opts.includeConditional)) out.push(e)
  }
  return out
}
