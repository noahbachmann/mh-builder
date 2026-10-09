import { describe, expect, it } from 'vitest'
import { db } from '../data'
import { diffNumber, diffStats } from './build-diff'
import { emptyBuild, equip } from './build'
import { evaluateBuild } from './evaluate'

const byName = (name: string) => db.data.armor.find((a) => a.name === name)!

describe('evaluateBuild + armor stats', () => {
  it('empty build has nothing', () => {
    const s = evaluateBuild(emptyBuild(), db)
    expect(s.weapon).toBeNull()
    expect(s.efr).toBeNull()
    expect(s.defense.defense).toBe(0)
    expect(s.skills.skills).toEqual([])
  })

  it('sums armor defense and resistances', () => {
    const head = byName('Safi Crested Crown α+')
    const b = equip(emptyBuild(), 'head', head.id, db)
    const s = evaluateBuild(b, db)
    expect(s.defense.baseDefense).toBe(206)
    expect(s.defense.resistances).toEqual(head.resistances)
  })

  it('Defense Boost and resistance skills apply', () => {
    const piece = db.data.armor.find((a) => a.skills.some((x) => x.skillId === 'defense-boost' && x.level >= 3))
    if (!piece) return
    const s = evaluateBuild(equip(emptyBuild(), piece.type, piece.id, db), db)
    const lv = s.skills.skills.find((x) => x.skill.id === 'defense-boost')!.level
    expect(lv).toBeGreaterThanOrEqual(3)
    expect(s.defense.defense).toBeGreaterThan(piece.defense)
  })
})

describe('diff', () => {
  it('diffNumber directions', () => {
    expect(diffNumber(1, 2)).toMatchObject({ delta: 1, dir: 'up' })
    expect(diffNumber(2, 1)).toMatchObject({ delta: -1, dir: 'down' })
    expect(diffNumber(null, null)).toMatchObject({ delta: 0, dir: 'same' })
    expect(diffNumber(null, 5)).toMatchObject({ delta: 5, dir: 'up' })
  })

  it('reports skills gained/lost and stat changes', () => {
    const a = db.data.armor.find((x) => x.type === 'head' && x.skills.length > 0)!
    const from = evaluateBuild(emptyBuild(), db)
    const to = evaluateBuild(equip(emptyBuild(), 'head', a.id, db), db)
    const d = diffStats(from, to)
    expect(d.defense.dir).toBe('up')
    expect(d.skills.map((s) => s.skill.id)).toContain(a.skills[0]!.skillId)
    expect(d.skills.every((s) => s.dir === 'up')).toBe(true)
    expect(diffStats(to, from).skills.every((s) => s.dir === 'down')).toBe(true)
  })

  it('weapon swap diffs attack and element', () => {
    const w1 = db.data.weapons.find((x) => x.name === 'Black Fatalis Blade')!
    const w2 = db.data.weapons.find((x) => x.name === 'Acid Shredder II')!
    const d = diffStats(
      evaluateBuild(equip(emptyBuild(), 'weapon', w1.id, db), db),
      evaluateBuild(equip(emptyBuild(), 'weapon', w2.id, db), db),
    )
    expect(d.attack.dir).toBe('down')
    expect(d.affinity.dir).toBe('up')
    expect(d.elements.dragon).toMatchObject({ dir: 'down', to: null })
  })
})
