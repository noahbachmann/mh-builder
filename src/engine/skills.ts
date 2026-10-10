import type { DataIndex, SetBonus, Skill } from '../data'
import { DECO_SLOTS, type Build, type EquipSlot } from './build'

export type SkillSource = EquipSlot | 'decoration' | 'set-bonus'

export interface SkillTotal {
  skill: Skill
  /** raw sum of all sources */
  points: number
  /** level that actually applies (points capped) */
  level: number
  /** current cap: maxLevel, or unlockedMaxLevel when a secret is active */
  cap: number
  secretActive: boolean
  sources: { source: SkillSource; level: number }[]
}

export interface SetBonusStatus {
  bonus: SetBonus
  pieces: number
  ranks: { skillId: string; required: number; active: boolean }[]
}

export interface SkillSummary {
  /** sorted: level desc, then name */
  skills: SkillTotal[]
  setBonuses: SetBonusStatus[]
}

/** Sums skills from all equipment, decorations, charm and active set bonuses; applies caps and secrets. */
export function computeSkills(build: Build, db: DataIndex): SkillSummary {
  const points = new Map<string, SkillTotal['sources']>()
  const add = (skillId: string, level: number, source: SkillSource) => {
    const list = points.get(skillId) ?? []
    list.push({ source, level })
    points.set(skillId, list)
  }

  const bonusPieces = new Map<string, number>()
  const weapon = build.weapon !== null ? db.weapon.get(build.weapon) : undefined
  if (weapon?.skill) add(weapon.skill.skillId, weapon.skill.level, 'weapon')
  if (weapon?.setBonusId) bonusPieces.set(weapon.setBonusId, 1)

  for (const slot of ['head', 'chest', 'arms', 'waist', 'legs'] as const) {
    const id = build[slot]
    const piece = id !== null ? db.armor.get(id) : undefined
    if (!piece) continue
    for (const s of piece.skills) add(s.skillId, s.level, slot)
    const bonusId = piece.setId ? db.armorSet.get(piece.setId)?.bonusId : null
    if (bonusId) bonusPieces.set(bonusId, (bonusPieces.get(bonusId) ?? 0) + 1)
  }

  const charm = build.charm !== null ? db.charm.get(build.charm) : undefined
  if (charm) for (const s of charm.skills) add(s.skillId, s.level, 'charm')

  for (const slot of DECO_SLOTS) {
    for (const decoId of build.decorations[slot]) {
      const deco = decoId !== null ? db.decoration.get(decoId) : undefined
      if (deco) for (const s of deco.skills) add(s.skillId, s.level, 'decoration')
    }
  }

  const setBonuses: SetBonusStatus[] = []
  for (const [bonusId, pieces] of bonusPieces) {
    const bonus = db.setBonus.get(bonusId)
    if (!bonus) continue
    const ranks = bonus.ranks.map((r) => ({ ...r, active: pieces >= r.required }))
    for (const r of ranks) if (r.active) add(r.skillId, 1, 'set-bonus')
    setBonuses.push({ bonus, pieces, ranks })
  }
  setBonuses.sort((a, b) => b.pieces - a.pieces || a.bonus.name.localeCompare(b.bonus.name))

  const unlocked = new Set<string>()
  for (const id of points.keys()) {
    const target = db.skill.get(id)?.unlocks
    if (target) unlocked.add(target)
  }

  const skills: SkillTotal[] = []
  for (const [id, sources] of points) {
    const skill = db.skill.get(id)
    if (!skill) continue
    const total = sources.reduce((n, s) => n + s.level, 0)
    const secretActive = unlocked.has(id)
    const cap = secretActive ? skill.unlockedMaxLevel : skill.maxLevel
    skills.push({ skill, points: total, level: Math.min(total, cap), cap, secretActive, sources })
  }
  skills.sort((a, b) => b.level - a.level || a.skill.name.localeCompare(b.skill.name))
  return { skills, setBonuses }
}

/** skillId -> effective level */
export function skillLevels(summary: SkillSummary): Map<string, number> {
  return new Map(summary.skills.map((s) => [s.skill.id, s.level]))
}

export interface SkillUnlocker {
  secret: Skill
  /** set bonuses granting the secret, with pieces required */
  bonuses: { bonus: SetBonus; required: number }[]
}

/** Secret skills that raise `skillId`'s cap, and the set bonuses that grant them. */
export function skillUnlockers(skillId: string, db: DataIndex): SkillUnlocker[] {
  return db.data.skills
    .filter((s) => s.unlocks === skillId)
    .map((secret) => ({
      secret,
      bonuses: db.data.setBonuses.flatMap((bonus) =>
        bonus.ranks.filter((r) => r.skillId === secret.id).map((r) => ({ bonus, required: r.required })),
      ),
    }))
}
