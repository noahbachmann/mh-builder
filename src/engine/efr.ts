import { AFFINITY_CAP, ELEMENT_SHARPNESS, NEGATIVE_CRIT_MULTIPLIER, RAW_SHARPNESS, WEAK_SPOT_HZV } from './constants'
import { skillEffect } from './skill-effects'
import { trueElement, type WeaponStats } from './weapon-stats'
import type { ElementOrStatus } from '../data/types'

export interface EfrBreakdown {
  trueRaw: number
  sharpnessMultiplier: number
  affinity: number
  /** multiplier applied on crit: crit boost on positive affinity, 0.75 on negative */
  critMultiplier: number
  /** expected multiplier from affinity: 1 + |affinity| x (crit - 1) */
  affinityFactor: number
  efr: number
}

export interface EfeBreakdown {
  type: ElementOrStatus
  trueElement: number
  sharpnessMultiplier: number
  critElementMultiplier: number
  affinityFactor: number
  efe: number
}

/** Expected raw multiplier from affinity (%): 1 + |aff| x (crit - 1), crit 0.75 on negative affinity. */
export function rawAffinityFactor(affinity: number, critMultiplier: number): number {
  const aff = affinity / 100
  return 1 + Math.abs(aff) * ((aff < 0 ? NEGATIVE_CRIT_MULTIPLIER : critMultiplier) - 1)
}

/** Expected element multiplier from affinity (%): element crit only on positive affinity. */
export function elementAffinityFactor(affinity: number, critElementMultiplier: number): number {
  return 1 + (Math.max(0, affinity) / 100) * (critElementMultiplier - 1)
}

/**
 * Affinity on one hitzone: base affinity + Weakness Exploit on weak spots (raw HZV >= 45, already tenderized
 * when wounded), plus its wound bonus on wounded weak spots only (Fextralife "Weakness Exploit"). Capped.
 */
export function hitAffinity(base: number, rawHzv: number, wexLevel: number, wounded: boolean): { affinity: number; weakSpot: boolean } {
  const weakSpot = rawHzv >= WEAK_SPOT_HZV
  const wex = skillEffect('weakness-exploit', wexLevel)
  const bonus = weakSpot ? (wex?.affinity ?? 0) + (wounded ? (wex?.woundAffinity ?? 0) : 0) : 0
  return { affinity: Math.max(-AFFINITY_CAP, Math.min(AFFINITY_CAP, base + bonus)), weakSpot }
}

/** EFR = true raw x raw sharpness x (1 + affinity x (crit - 1)); gunners use sharpness 1.0. */
export function computeEfr(stats: WeaponStats): EfrBreakdown {
  const sharpnessMultiplier = stats.sharpnessIndex < 0 ? 1 : RAW_SHARPNESS[stats.sharpnessIndex]!
  const critMultiplier = stats.affinity < 0 ? NEGATIVE_CRIT_MULTIPLIER : stats.critMultiplier
  const affinityFactor = rawAffinityFactor(stats.affinity, stats.critMultiplier)
  return {
    trueRaw: stats.trueRaw,
    sharpnessMultiplier,
    affinity: stats.affinity,
    critMultiplier,
    affinityFactor,
    efr: stats.trueRaw * sharpnessMultiplier * affinityFactor,
  }
}

/**
 * EFE per active element (statuses excluded: their damage model differs).
 * Elemental crit only applies on positive affinity with Critical Element.
 */
export function computeEfe(stats: WeaponStats): EfeBreakdown[] {
  const sharpnessMultiplier = stats.sharpnessIndex < 0 ? 1 : ELEMENT_SHARPNESS[stats.sharpnessIndex]!
  const affinityFactor = elementAffinityFactor(stats.affinity, stats.critElementMultiplier)
  return stats.elements
    .filter((e) => e.active && !e.isStatus)
    .map((e) => {
      const te = trueElement(e.value)
      return {
        type: e.type,
        trueElement: te,
        sharpnessMultiplier,
        critElementMultiplier: stats.critElementMultiplier,
        affinityFactor,
        efe: te * sharpnessMultiplier * affinityFactor,
      }
    })
}
