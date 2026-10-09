import { ELEMENT_SHARPNESS, NEGATIVE_CRIT_MULTIPLIER, RAW_SHARPNESS } from './constants'
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

/** EFR = true raw x raw sharpness x (1 + affinity x (crit - 1)); gunners use sharpness 1.0. */
export function computeEfr(stats: WeaponStats): EfrBreakdown {
  const sharpnessMultiplier = stats.sharpnessIndex < 0 ? 1 : RAW_SHARPNESS[stats.sharpnessIndex]!
  const aff = stats.affinity / 100
  const critMultiplier = aff < 0 ? NEGATIVE_CRIT_MULTIPLIER : stats.critMultiplier
  const affinityFactor = 1 + Math.abs(aff) * (critMultiplier - 1)
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
  const aff = Math.max(0, stats.affinity) / 100
  const affinityFactor = 1 + aff * (stats.critElementMultiplier - 1)
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
