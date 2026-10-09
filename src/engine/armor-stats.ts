import { ARMOR_TYPES, ELEMENTS, type DataIndex, type ElementalResistances } from '../data'
import type { Build } from './build'
import type { SkillEffect } from './skill-effects'

export interface DefenseStats {
  /** sum of equipment defense before skills */
  baseDefense: number
  defense: number
  resistances: ElementalResistances
}

const zeroRes = (): ElementalResistances => ({ fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 })

/** Defense = (armor + weapon defense) x Defense Boost % + flat bonuses; resistances are sums. */
export function computeDefense(build: Build, db: DataIndex, effects: SkillEffect[]): DefenseStats {
  let baseDefense = 0
  const resistances = zeroRes()
  for (const slot of ARMOR_TYPES) {
    const id = build[slot]
    const piece = id !== null ? db.armor.get(id) : undefined
    if (!piece) continue
    baseDefense += piece.defense
    for (const el of ELEMENTS) resistances[el] += piece.resistances[el]
  }
  const weapon = build.weapon !== null ? db.weapon.get(build.weapon) : undefined
  baseDefense += weapon?.defense ?? 0

  let mul = 1
  let flat = 0
  for (const e of effects) {
    mul *= e.defenseMul ?? 1
    flat += e.defenseFlat ?? 0
    for (const el of ELEMENTS) resistances[el] += e.resistances?.[el] ?? 0
  }
  return { baseDefense, defense: Math.floor(baseDefense * mul + flat), resistances }
}
