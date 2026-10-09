import type { ElementOrStatus, SharpnessBar, Weapon } from '../data/types'
import { ELEMENTS } from '../data/types'
import {
  AFFINITY_CAP,
  BASE_CRIT_MULTIPLIER,
  BLOAT,
  CRIT_ELEMENT_MULTIPLIER,
  ELEMENT_BLOAT,
  GUNNERS,
  HANDICRAFT_MAX_LEVEL,
  HANDICRAFT_PER_LEVEL,
  NEB_MULTIPLIER,
  TRUE_CRIT_ELEMENT_MULTIPLIER,
  elementCap,
} from './constants'
import type { SkillEffect } from './skill-effects'

export interface ElementStat {
  type: ElementOrStatus
  isStatus: boolean
  /** displayed value printed on the weapon */
  base: number
  /** displayed value after hidden-element unlock and skills */
  value: number
  hidden: boolean
  /** false when hidden and not drawn out by Free Element */
  active: boolean
  capped: boolean
}

export interface WeaponStats {
  weapon: Weapon
  bloat: number
  baseTrueRaw: number
  trueRaw: number
  /** displayed attack */
  attack: number
  /** capped to +-100 */
  affinity: number
  critMultiplier: number
  /** elemental crit multiplier, 1 without Critical Element */
  critElementMultiplier: number
  elements: ElementStat[]
  /** bar after Handicraft, null for gunners */
  sharpness: SharpnessBar | null
  /** index of top colour (SHARPNESS_COLORS), -1 for gunners */
  sharpnessIndex: number
  handicraft: number
  nonElementalBoost: boolean
}

const isElement = (t: ElementOrStatus) => (ELEMENTS as readonly string[]).includes(t)

/** Bar at `handicraft`; data stores level 5, each missing level trims 10 hits from the top. */
export function applyHandicraft(bar: SharpnessBar, handicraft: number, maxed: boolean): SharpnessBar {
  const out = [...bar] as SharpnessBar
  if (maxed) return out
  let remove = (HANDICRAFT_MAX_LEVEL - Math.min(handicraft, HANDICRAFT_MAX_LEVEL)) * HANDICRAFT_PER_LEVEL
  for (let i = out.length - 1; i >= 0 && remove > 0; i--) {
    const take = Math.min(out[i]!, remove)
    out[i] = out[i]! - take
    remove -= take
  }
  return out
}

export function topSharpness(bar: SharpnessBar): number {
  for (let i = bar.length - 1; i >= 0; i--) if (bar[i]! > 0) return i
  return 0
}

/**
 * Applies skill effects to a weapon.
 * Order of operations (community formula, Fextralife "Damage Formula"): multipliers apply to the
 * weapon's base true raw first, then flat bonuses are added. Element works the same way on the
 * displayed value: base x multiplier + flat, then the element cap.
 */
export function computeWeaponStats(weapon: Weapon, effects: SkillEffect[]): WeaponStats {
  const bloat = BLOAT[weapon.type]
  const baseTrueRaw = weapon.attack / bloat
  const freeElement = Math.max(0, ...effects.map((e) => e.freeElement ?? 0))

  const elements: ElementStat[] = weapon.elements.map((el) => {
    const isStatus = !isElement(el.type)
    const active = !el.hidden || freeElement > 0
    const base = el.hidden ? el.value * freeElement : el.value
    let mul = 1
    let flat = 0
    if (active) {
      for (const e of effects) {
        if (!isStatus && (e.element === el.type || e.element === 'all')) {
          mul *= e.elementMul ?? 1
          flat += e.elementFlat ?? 0
        }
        if (isStatus && (e.status === el.type || (e.statusMul && !e.status))) {
          mul *= e.statusMul ?? 1
          flat += e.statusFlat ?? 0
        }
      }
    }
    let value = active ? base * mul + flat : 0
    const cap = isStatus ? null : elementCap(base)
    const capped = cap !== null && value > cap
    if (capped) value = cap
    return { type: el.type, isStatus, base: el.value, value, hidden: el.hidden, active, capped }
  })

  const hasActiveElement = elements.some((e) => e.active)
  const nonElementalBoost =
    effects.some((e) => e.nonElementalBoost) &&
    !hasActiveElement &&
    !(GUNNERS.has(weapon.type) && weapon.type !== 'bow' && weapon.elementalAmmo)

  let rawMul = nonElementalBoost ? NEB_MULTIPLIER : 1
  let rawFlat = 0
  let affinity = weapon.affinity
  let critMultiplier = BASE_CRIT_MULTIPLIER
  let critElement: 'normal' | 'true' | null = null
  let handicraft = 0
  for (const e of effects) {
    rawMul *= e.rawMul ?? 1
    rawFlat += e.rawFlat ?? 0
    affinity += e.affinity ?? 0
    if (e.critMultiplier) critMultiplier = Math.max(critMultiplier, e.critMultiplier)
    if (e.critElement === 'true' || (e.critElement === 'normal' && critElement === null)) critElement = e.critElement
    handicraft = Math.max(handicraft, e.handicraft ?? 0)
  }
  const trueRaw = baseTrueRaw * rawMul + rawFlat
  affinity = Math.max(-AFFINITY_CAP, Math.min(AFFINITY_CAP, affinity))
  const critElementMultiplier =
    critElement === 'true'
      ? TRUE_CRIT_ELEMENT_MULTIPLIER[weapon.type]
      : critElement === 'normal'
        ? CRIT_ELEMENT_MULTIPLIER[weapon.type]
        : 1

  const sharpness = weapon.sharpness ? applyHandicraft(weapon.sharpness, handicraft, weapon.sharpnessMaxed) : null
  return {
    weapon,
    bloat,
    baseTrueRaw,
    trueRaw,
    attack: Math.round(trueRaw * bloat),
    affinity,
    critMultiplier,
    critElementMultiplier,
    elements,
    sharpness,
    sharpnessIndex: sharpness ? topSharpness(sharpness) : -1,
    handicraft,
    nonElementalBoost,
  }
}

export const trueElement = (displayed: number) => displayed / ELEMENT_BLOAT
