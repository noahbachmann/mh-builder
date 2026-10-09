import type { DataIndex } from '../data'
import type { Build } from './build'
import { computeDefense, type DefenseStats } from './armor-stats'
import { computeEfe, computeEfr, type EfeBreakdown, type EfrBreakdown } from './efr'
import { activeEffects, type EffectOptions } from './skill-effects'
import { computeSkills, skillLevels, type SkillSummary } from './skills'
import { computeWeaponStats, type WeaponStats } from './weapon-stats'

/** Everything the UI shows for a build. */
export interface BuildStats {
  skills: SkillSummary
  weapon: WeaponStats | null
  efr: EfrBreakdown | null
  efe: EfeBreakdown[]
  defense: DefenseStats
}

export function evaluateBuild(build: Build, db: DataIndex, opts: EffectOptions = {}): BuildStats {
  const skills = computeSkills(build, db)
  const effects = activeEffects(skillLevels(skills), opts)
  const w = build.weapon !== null ? db.weapon.get(build.weapon) : undefined
  const weapon = w ? computeWeaponStats(w, effects) : null
  return {
    skills,
    weapon,
    efr: weapon ? computeEfr(weapon) : null,
    efe: weapon ? computeEfe(weapon) : [],
    defense: computeDefense(build, db, effects),
  }
}
