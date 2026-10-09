import { describe, expect, it } from 'vitest'
import { db, gameData } from './index'

describe('generated data', () => {
  it('has content for every category', () => {
    for (const [name, list] of Object.entries(gameData)) expect(list.length, name).toBeGreaterThan(0)
  })

  it('every weapon parent exists', () => {
    const missing = gameData.weapons.filter((w) => w.previousId !== null && !db.weapon.has(w.previousId))
    expect(missing.map((w) => w.name)).toEqual([])
  })

  it('weapon trees have no cycles', () => {
    for (const w of gameData.weapons) {
      const seen = new Set<number>()
      let cur: number | null = w.id
      while (cur !== null) {
        expect(seen.has(cur), `cycle at ${w.name}`).toBe(false)
        seen.add(cur)
        cur = db.weapon.get(cur)!.previousId
      }
    }
  })

  it('weapon parents share the weapon type', () => {
    const bad = gameData.weapons.filter((w) => w.previousId !== null && db.weapon.get(w.previousId)!.type !== w.type)
    expect(bad.map((w) => w.name)).toEqual([])
  })

  it('every referenced skill exists', () => {
    const refs = [
      ...gameData.armor.flatMap((a) => a.skills),
      ...gameData.decorations.flatMap((d) => d.skills),
      ...gameData.charms.flatMap((c) => c.skills),
      ...gameData.weapons.flatMap((w) => (w.skill ? [w.skill] : [])),
      ...gameData.setBonuses.flatMap((b) => b.ranks),
    ]
    expect(refs.filter((r) => !db.skill.has(r.skillId))).toEqual([])
    const unlocks = gameData.skills.filter((s) => s.unlocks && !db.skill.has(s.unlocks))
    expect(unlocks).toEqual([])
  })

  it('every set bonus / armor set reference exists', () => {
    expect(gameData.armor.filter((a) => a.setId && !db.armorSet.has(a.setId))).toEqual([])
    expect(gameData.armorSets.filter((s) => s.bonusId && !db.setBonus.has(s.bonusId))).toEqual([])
    expect(gameData.weapons.filter((w) => w.setBonusId && !db.setBonus.has(w.setBonusId))).toEqual([])
  })

  it('slot and decoration sizes are 1 to 4', () => {
    const slots = [...gameData.weapons, ...gameData.armor].flatMap((x) => x.slots)
    expect(slots.every((s) => s >= 1 && s <= 4)).toBe(true)
    expect(gameData.decorations.every((d) => d.size >= 1 && d.size <= 4)).toBe(true)
  })

  it('melee weapons have sharpness, gunners do not', () => {
    const gun = new Set(['light-bowgun', 'heavy-bowgun', 'bow'])
    for (const w of gameData.weapons) expect(w.sharpness === null, w.name).toBe(gun.has(w.type))
  })

  it('skill levels are consistent', () => {
    for (const s of gameData.skills) {
      expect(s.maxLevel, s.name).toBeGreaterThanOrEqual(1)
      expect(s.unlockedMaxLevel).toBeGreaterThanOrEqual(s.maxLevel)
      expect(s.descriptions).toHaveLength(s.unlockedMaxLevel)
    }
  })

  it('charms keep only the highest level of each line', () => {
    const names = new Set(gameData.charms.map((c) => c.name))
    expect(names.has('Poison Charm I')).toBe(false)
    expect(names.has('Poison Charm III')).toBe(true)
  })

  it('MR armor uses augmented max defense', () => {
    const safi = gameData.armor.find((a) => a.name === 'Safi Crested Crown α+')!
    expect(safi.rank).toBe('MR')
    expect(safi.defense).toBe(206)
  })
})
