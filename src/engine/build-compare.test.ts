import { describe, expect, it } from 'vitest'
import { db } from '../data'
import { emptyBuild, equip, setDecoration } from './build'
import { compareBuilds, evaluateForCompare } from './build-compare'
import { POTENTIAL_CONDITIONS } from './skill-effects'

const weaponId = (name: string) => db.data.weapons.find((w) => w.name === name)!.id
const armorId = (name: string) => db.data.armor.find((a) => a.name === name)!.id
const decoId = (name: string) => db.data.decorations.find((d) => d.name === name)!.id

const gs1 = equip(emptyBuild(), 'weapon', weaponId('Defender Great Sword I'), db)
const gs2 = equip(emptyBuild(), 'weapon', weaponId('Defender Great Sword II'), db)
// Rimeguard Helm α+: slots [3, 2], Divine Blessing 2 + Coalescence 1
const helm = equip(gs2, 'head', armorId('Rimeguard Helm α+'), db)
const agitator = setDecoration(helm, 'head', 0, decoId('Challenger Jewel 2'), db)

const compare = (...builds: (typeof gs1)[]) => compareBuilds(builds.map((b) => evaluateForCompare(b, db)))
const metric = (c: ReturnType<typeof compare>, key: string) => c.metrics.find((m) => m.key === key)!

describe('compareBuilds', () => {
  it('marks the best value and deltas against the first build', () => {
    const c = compare(gs1, gs2)
    const efr = metric(c, 'efr')
    expect(efr.values[1]!).toBeGreaterThan(efr.values[0]!)
    expect(efr.best).toEqual([1])
    expect(efr.deltas[0]!.dir).toBe('same')
    expect(efr.deltas[1]!.dir).toBe('up')
    expect(metric(c, 'attack').values).toEqual([624, 816])
  })

  it('no best when all values tie or only one value exists', () => {
    expect(metric(compare(gs2, gs2), 'efr').best).toEqual([])
    const c = compare(emptyBuild(), gs2)
    expect(metric(c, 'efr').values[0]).toBeNull()
    expect(metric(c, 'efr').best).toEqual([])
  })

  it('ties share the best mark', () => {
    expect(metric(compare(gs1, gs2, gs2), 'attack').best).toEqual([1, 2])
  })

  it('potential EFR includes conditional skills', () => {
    const c = compare(helm, agitator)
    const base = metric(c, 'efr').values
    const pot = metric(c, 'efr-potential').values
    expect(base[1]).toBeCloseTo(base[0]!) // Agitator is conditional
    expect(pot[0]!).toBeGreaterThan(base[0]!) // helm's Coalescence is too
    expect(pot[1]!).toBeGreaterThan(pot[0]!)
  })

  it('potential never combines full-health and low-health skills, nor draw-only Critical Draw', () => {
    const flat = POTENTIAL_CONDITIONS.map((c) => [...c])
    expect(flat[0]).toContain('peak-performance')
    expect(flat[0]).not.toContain('heroics')
    expect(flat[1]).toEqual(expect.arrayContaining(['heroics', 'resentment']))
    expect(flat[1]).not.toContain('peak-performance')
    expect(flat.flat()).not.toContain('critical-draw')
    expect(flat.every((c) => c.includes('agitator') && c.includes('weakness-exploit'))).toBe(true)
  })

  it('unions skills across builds with 0 for missing', () => {
    const c = compare(gs2, agitator)
    const ag = c.skills.find((s) => s.skill.id === 'agitator')!
    expect(ag.levels).toEqual([0, 1])
    expect(ag.caps[1]).toBe(ag.skill.maxLevel)
    expect(c.skills.find((s) => s.skill.id === 'divine-blessing')!.levels).toEqual([0, 2])
    // sorted by highest level
    const maxes = c.skills.map((s) => Math.max(...s.levels))
    expect(maxes).toEqual([...maxes].sort((a, b) => b - a))
  })

  it('gunners have no sharpness value', () => {
    const bow = db.data.weapons.find((w) => w.type === 'bow' && !w.special)!
    const c = compare(gs2, equip(emptyBuild(), 'weapon', bow.id, db))
    expect(metric(c, 'sharpness').values[1]).toBeNull()
  })
})
