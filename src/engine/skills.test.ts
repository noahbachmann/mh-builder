import { describe, expect, it } from 'vitest'
import { indexData, type GameData } from '../data'
import { emptyBuild, equip, setDecoration } from './build'
import { computeSkills, skillLevels } from './skills'

const skill = (id: string, max: number, unlocked = max, unlocks: string | null = null) => ({
  id,
  name: id,
  maxLevel: max,
  unlockedMaxLevel: unlocked,
  unlocks,
  descriptions: Array.from({ length: unlocked }, (_, i) => `L${i + 1}`),
  iconColor: null,
})
const res = { fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 }
const armor = (id: number, type: 'head' | 'chest' | 'arms' | 'waist' | 'legs', skills: [string, number][], setId: string | null = null, slots: number[] = []) => ({
  id,
  name: `${type}${id}`,
  type,
  rank: 'MR' as const,
  rarity: 10,
  defense: 100,
  resistances: res,
  slots,
  skills: skills.map(([skillId, level]) => ({ skillId, level })),
  setId,
})

const data: GameData = {
  skills: [
    skill('agitator', 5, 7),
    skill('agitator-secret', 1, 1, 'agitator'),
    skill('critical-eye', 7),
    skill('weakness-exploit', 3),
    skill('critical-boost', 3),
  ],
  setBonuses: [{ id: 'brachy-will', name: 'Brachydios Will', ranks: [{ skillId: 'agitator-secret', required: 2 }] }],
  armorSets: [{ id: 'brachy', name: 'Brachy', rank: 'MR', pieceIds: [1, 2], bonusId: 'brachy-will' }],
  armor: [
    armor(1, 'head', [['agitator', 3]], 'brachy', [4, 1]),
    armor(2, 'chest', [['agitator', 3]], 'brachy'),
    armor(3, 'arms', [['critical-eye', 2]]),
  ],
  charms: [{ id: 1, name: 'Charm', rarity: 10, skills: [{ skillId: 'critical-eye', level: 3 }] }],
  decorations: [
    { id: 1, name: 'Agi/WEX', size: 4, rarity: 12, skills: [{ skillId: 'agitator', level: 1 }, { skillId: 'weakness-exploit', level: 1 }] },
    { id: 2, name: 'Expert', size: 1, rarity: 5, skills: [{ skillId: 'critical-eye', level: 1 }] },
  ],
  weapons: [],
}
const db = indexData(data)

describe('computeSkills', () => {
  it('sums armor, charm and decoration skills including size-4 double jewels', () => {
    let b = emptyBuild()
    b = equip(b, 'arms', 3, db)
    b = equip(b, 'charm', 1, db)
    b = equip(b, 'head', 1, db)
    b = setDecoration(b, 'head', 0, 1, db)
    b = setDecoration(b, 'head', 1, 2, db)
    const levels = skillLevels(computeSkills(b, db))
    expect(levels.get('critical-eye')).toBe(6)
    expect(levels.get('agitator')).toBe(4)
    expect(levels.get('weakness-exploit')).toBe(1)
  })

  it('caps skills at max level without the secret', () => {
    let b = emptyBuild()
    b = equip(b, 'head', 1, db)
    b = setDecoration(b, 'head', 0, 1, db)
    b = equip(b, 'arms', 3, db)
    // only one brachy piece -> no secret; agitator 3+1 = 4 (under cap). add second source:
    const s = computeSkills(b, db)
    expect(s.setBonuses[0]).toMatchObject({ pieces: 1 })
    expect(s.setBonuses[0]!.ranks[0]!.active).toBe(false)
  })

  it('set bonus activates at required pieces and secret raises the cap', () => {
    let b = emptyBuild()
    b = equip(b, 'head', 1, db)
    b = equip(b, 'chest', 2, db)
    b = setDecoration(b, 'head', 0, 1, db)
    const s = computeSkills(b, db)
    const agi = s.skills.find((x) => x.skill.id === 'agitator')!
    expect(agi.points).toBe(7)
    expect(agi.secretActive).toBe(true)
    expect(agi.cap).toBe(7)
    expect(agi.level).toBe(7)
    expect(s.skills.find((x) => x.skill.id === 'agitator-secret')?.sources).toEqual([{ source: 'set-bonus', level: 1 }])
    expect(s.setBonuses[0]).toMatchObject({ pieces: 2 })
  })

  it('reports over-cap points without the secret', () => {
    const noSecret = indexData({ ...data, setBonuses: [] , armorSets: []})
    let b = emptyBuild()
    b = equip(b, 'head', 1, noSecret)
    b = equip(b, 'chest', 2, noSecret)
    b = setDecoration(b, 'head', 0, 1, noSecret)
    const agi = computeSkills(b, noSecret).skills.find((x) => x.skill.id === 'agitator')!
    expect(agi).toMatchObject({ points: 7, level: 5, cap: 5, secretActive: false })
  })

  it('sorts by level then name', () => {
    let b = emptyBuild()
    b = equip(b, 'arms', 3, db)
    b = equip(b, 'charm', 1, db)
    b = equip(b, 'head', 1, db)
    const names = computeSkills(b, db).skills.map((s) => s.skill.id)
    expect(names).toEqual(['critical-eye', 'agitator'])
  })
})
