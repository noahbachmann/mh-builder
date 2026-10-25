/**
 * Hand-written table: skill + level -> numeric modifiers.
 *
 * Values are taken from the in-game skill descriptions (shipped in `src/data/skills.json`)
 * unless noted. Raw values are TRUE raw (MHW skill text lists true raw), element and status
 * values are DISPLAYED (x10) like the weapon stat.
 *
 * `conditional` effects only apply when their condition is switched on (`EffectOptions`).
 */
import type { Element, ElementalResistances, Status, WeaponType } from '../data/types'
import { AMMO_SHOT_MULTIPLIER, CRIT_BOOST_MULTIPLIER, type ShotAmmo } from './constants'

export interface SkillEffect {
  /** flat true raw */
  rawFlat?: number
  /** multiplier on base true raw */
  rawMul?: number
  affinity?: number
  /** extra affinity on wounded (tenderized) parts, on top of `affinity` (Weakness Exploit) */
  woundAffinity?: number
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
  /** raw multiplier on one bowgun ammo group (Normal / Piercing / Spread Shots; not applied to bow arrows) */
  ammoMul?: number
  ammo?: ShotAmmo
  /** short label of the condition; present => conditional */
  conditional?: string
}

type Table = Record<string, SkillEffect[]>

/** Weakness Exploit's condition; the monster damage table applies it per hitzone instead of as a toggle. */
export const WEAK_SPOT_CONDITION = 'Weak spot hit'

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

// skill text has no numbers: values from constants (MoonBunnie & Deathcream)
const ammoShots = (ammo: ShotAmmo) => AMMO_SHOT_MULTIPLIER[ammo].map((ammoMul) => ({ ammo, ammoMul }))

const allRes = (n: number): ElementalResistances => ({ fire: n, water: n, thunder: n, ice: n, dragon: n })

export const SKILL_EFFECTS: Table = {
  'attack-boost': perLevel([3, 6, 9, 12, 15, 18, 21], (raw, i) => ({
    rawFlat: raw,
    ...(i >= 3 ? { affinity: 5 } : {}),
  })),
  'critical-eye': perLevel([5, 10, 15, 20, 25, 30, 40], (affinity) => ({ affinity })),
  'critical-boost': CRIT_BOOST_MULTIPLIER.map((critMultiplier) => ({ critMultiplier })),
  'weakness-exploit': perLevel(
    [
      [10, 5],
      [15, 15],
      [30, 20],
    ],
    ([affinity, woundAffinity]) => ({ affinity, woundAffinity, conditional: WEAK_SPOT_CONDITION }),
  ),
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
  'affinity-sliding': [{ affinity: 30, conditional: 'After sliding' }],
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
  'normal-shots': ammoShots('normal'),
  'piercing-shots': ammoShots('pierce'),
  'spread-power-shots': ammoShots('spread'),
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
  /** apply every conditional effect ("all conditions met") */
  includeConditional?: boolean
  /** apply the conditional effects of these skill ids */
  conditions?: ReadonlySet<string>
}

/** Skills with a conditional effect and their condition label, in table order. */
export const CONDITIONAL_SKILLS: { skillId: string; label: string }[] = Object.entries(SKILL_EFFECTS).flatMap(([skillId, levels]) => {
  const label = levels.find((e) => e.conditional)?.conditional
  return label ? [{ skillId, label }] : []
})

/**
 * Skills that change damage but aren't in the table: the data gives no numbers, or they affect only some
 * moves / ammo / status. Shown as "not included" so totals don't silently mislead.
 */
export const UNMODELLED_DAMAGE_SKILLS: Readonly<Record<string, string>> = {
  fortify: 'attack up after each faint',
  airborne: 'jumping attacks only',
  'elemental-airborne': 'jumping attacks only',
  'punishing-draw': 'draw attacks only',
  bludgeoner: 'attack up as sharpness drops',
  frostcraft: 'attack up while the frost aura lasts',
  'element-acceleration': 'element up while attacking',
  'true-element-acceleration': 'element up while attacking',
  'dragonvein-awakening': 'element / affinity up with weapon drawn',
  'true-dragonvein-awakening': 'element / affinity up with weapon drawn',
  'element-conversion': 'element up from armor resistances',
  'critical-status': 'status on crits (status not calculated)',
  'true-critical-status': 'status on crits (status not calculated)',
  'normal-shots': 'arrow type only',
  'piercing-shots': 'arrow type only',
  'spread-power-shots': 'arrow type only',
  'special-ammo-boost': 'special ammo only',
  artillery: 'shelling, phials, Wyvern\'s Fire',
  'heavy-artillery': 'siege weapons only',
}

/** Unmodelled only for these weapon types (bowgun ammo is calculated, bow arrows aren't). */
export const UNMODELLED_FOR: Readonly<Record<string, readonly WeaponType[]>> = {
  'normal-shots': ['bow'],
  'piercing-shots': ['bow'],
  'spread-power-shots': ['bow'],
}

/** Conditions that can't hold together: Peak Performance needs full health, Heroics / Resentment low or red health. */
export const CONDITION_CONFLICTS: Readonly<Record<string, readonly string[]>> = {
  'peak-performance': ['heroics', 'resentment'],
  heroics: ['peak-performance'],
  resentment: ['peak-performance'],
}

/** Only one move benefits (draw attacks), so never part of "all conditions met". */
const MOVE_ONLY = new Set(['critical-draw'])

/**
 * Condition sets for "all conditions met": every situational skill except move-only ones, once with full
 * health (Peak Performance) and once with low health (Heroics + Resentment). Callers keep the better one.
 */
export const POTENTIAL_CONDITIONS: ReadonlySet<string>[] = (() => {
  const health = new Set(Object.keys(CONDITION_CONFLICTS))
  const always = CONDITIONAL_SKILLS.map((c) => c.skillId).filter((id) => !MOVE_ONLY.has(id) && !health.has(id))
  return [new Set([...always, 'peak-performance']), new Set([...always, 'heroics', 'resentment'])]
})()

/** All active effects for a set of skill levels. */
export function activeEffects(levels: Map<string, number>, opts: EffectOptions = {}): SkillEffect[] {
  const out: SkillEffect[] = []
  for (const [id, level] of levels) {
    const e = skillEffect(id, level)
    if (e && (!e.conditional || opts.includeConditional || opts.conditions?.has(id))) out.push(e)
  }
  return out
}
