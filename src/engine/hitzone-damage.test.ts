import { describe, expect, it } from 'vitest'
import { db } from '../data'
import type { Hitzone, Monster } from '../data/types'
import { emptyBuild, equip, setDecoration } from './build'
import { tenderize } from './constants'
import {
  damageTable,
  defaultMode,
  evaluateForMonster,
  hitDamage,
  monsterModes,
  monsterParts,
  weightedAverage,
  type DamageRow,
} from './hitzone-damage'
import type { SkillEffect } from './skill-effects'
import { weapon } from './test-fixtures'
import { computeWeaponStats } from './weapon-stats'

const hz = (part: string, over: Partial<Hitzone> = {}): Hitzone => ({
  part,
  tags: [],
  cut: 65,
  impact: 70,
  shot: 60,
  fire: 20,
  water: 10,
  thunder: 0,
  ice: 30,
  dragon: 5,
  ko: 0,
  ...over,
})

const monster = (hitzones: Hitzone[]): Monster => ({
  id: 1,
  slug: 'test',
  name: 'Test',
  ecology: '',
  description: '',
  traps: { pitfall: true, shock: true, vine: true },
  weaknesses: { fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0, poison: 0, paralysis: 0, sleep: 0, blast: 0, stun: 0 },
  altWeaknesses: [],
  ailments: [],
  hitzones,
  parts: [],
  rewards: [],
})

// 200 true raw, purple (1.39 raw / 1.25 element) at Handicraft 0
const stats = (over: Parameters<typeof weapon>[0] = {}, effects: SkillEffect[] = []) => computeWeaponStats(weapon(over), effects)
const hit = (s = stats(), h = hz('Head'), wex = 0, opts = {}) => hitDamage(s, h, wex, { mv: 100, wounded: false, ...opts })

describe('hitDamage', () => {
  it('cut weapon: true raw x sharpness x MV x cut HZV', () => {
    const d = hit()
    expect(d.rawHzv).toBe(65)
    expect(d.raw).toBeCloseTo(200 * 1.39 * 0.65)
    expect(d.element).toBe(0)
    expect(d.total).toBeCloseTo(d.raw)
  })

  it('scales raw with the motion value', () => {
    expect(hit(stats(), hz('Head'), 0, { mv: 48 }).raw).toBeCloseTo(200 * 1.39 * 0.48 * 0.65)
  })

  it('impact weapon uses the impact column', () => {
    const d = hit(stats({ type: 'hammer', attack: 1040 }))
    expect(d.rawHzv).toBe(70)
    expect(d.raw).toBeCloseTo(200 * 1.39 * 0.7)
  })

  it('gunners use the shot column and no sharpness', () => {
    const d = hit(stats({ type: 'bow', attack: 240, sharpness: null }), hz('Head'), 0, { sharpnessIndex: 0 })
    expect(d.rawHzv).toBe(60)
    expect(d.raw).toBeCloseTo(200 * 0.6)
  })

  it('Weakness Exploit applies from HZV 45', () => {
    expect(hit(stats(), hz('A', { cut: 45 }), 3).raw).toBeCloseTo(200 * 1.39 * 0.45 * (1 + 0.3 * 0.25))
    const below = hit(stats(), hz('A', { cut: 44 }), 3)
    expect(below.weakSpot).toBe(false)
    expect(below.raw).toBeCloseTo(200 * 1.39 * 0.44)
  })

  it('wounded: tenderized HZV and the wound bonus', () => {
    // 20 -> 40: still not a weak spot, so no Weakness Exploit at all (the wound bonus is extra on weak spots)
    const soft = hit(stats(), hz('A', { cut: 20 }), 3, { wounded: true })
    expect(soft.rawHzv).toBe(40)
    expect(soft.affinity).toBe(0)
    expect(soft.raw).toBeCloseTo(200 * 1.39 * 0.4)
    // 30 -> 47: wounding makes it a weak spot, 30 + 20
    expect(hit(stats(), hz('A', { cut: 30 }), 3, { wounded: true }).affinity).toBe(50)
    // 45 -> 58: weak spot 30 + wound 20
    expect(hit(stats(), hz('A', { cut: 45 }), 3, { wounded: true }).affinity).toBe(50)
    // without the skill wounding still tenderizes
    expect(hit(stats(), hz('A', { cut: 45 }), 0, { wounded: true }).affinity).toBe(0)
  })

  it('wounding leaves elemental hitzones alone', () => {
    const s = stats({ elements: [{ type: 'fire', value: 300, hidden: false }] })
    expect(hit(s, hz('A'), 0, { wounded: true }).element).toBeCloseTo(hit(s).element)
  })

  it('caps affinity at 100', () => {
    expect(hit(stats({ affinity: 90 }), hz('A'), 3).affinity).toBe(100)
  })

  it('negative affinity uses the 0.75 crit multiplier', () => {
    expect(hit(stats({ affinity: -20 })).raw).toBeCloseTo(200 * 1.39 * 0.65 * (1 - 0.2 * 0.25))
  })

  it('sharpness override, clamped to the top colour', () => {
    expect(hit(stats(), hz('Head'), 0, { sharpnessIndex: 4 }).raw).toBeCloseTo(200 * 1.2 * 0.65)
    const white = stats({ sharpness: [50, 50, 50, 50, 50, 100, 0] })
    expect(hit(white, hz('Head'), 0, { sharpnessIndex: 6 }).raw).toBeCloseTo(200 * 1.32 * 0.65)
  })

  it('element: true element x element sharpness x elemental HZV', () => {
    const d = hit(stats({ elements: [{ type: 'fire', value: 300, hidden: false }] }))
    expect(d.element).toBeCloseTo(30 * 1.25 * 0.2)
    expect(d.total).toBeCloseTo(d.raw + d.element)
  })

  it('dual element alternates: averaged per hit', () => {
    const s = stats({
      type: 'dual-blades',
      attack: 280,
      elements: [
        { type: 'fire', value: 300, hidden: false },
        { type: 'ice', value: 200, hidden: false },
      ],
    })
    expect(hit(s).element).toBeCloseTo((30 * 1.25 * 0.2 + 20 * 1.25 * 0.3) / 2)
  })

  it('hidden element only counts with Free Element, scaled by its level', () => {
    const hidden = { elements: [{ type: 'water' as const, value: 300, hidden: true }] }
    expect(hit(stats(hidden)).element).toBe(0)
    // Free Elem 1 / 3: 33% / 100% of the hidden value; Rathalos-like water HZV 10
    expect(hit(stats(hidden, [{ freeElement: 0.33 }])).element).toBeCloseTo(30 * 0.33 * 1.25 * 0.1)
    expect(hit(stats(hidden, [{ freeElement: 1 }])).element).toBeCloseTo(30 * 1.25 * 0.1)
  })

  it('status adds no damage', () => {
    expect(hit(stats({ elements: [{ type: 'paralysis', value: 300, hidden: false }] })).element).toBe(0)
  })

  it('critical element uses the affinity incl. Weakness Exploit', () => {
    const s = stats({ affinity: 70, elements: [{ type: 'fire', value: 300, hidden: false }] }, [{ critElement: 'normal' }])
    // GS: 1.5 element crit, 70 + 30 = 100% affinity
    expect(hit(s, hz('Head'), 3).element).toBeCloseTo(30 * 1.25 * 0.2 * 1.5)
  })
})

describe('tenderize', () => {
  it('matches the wiki tenderized values', () => {
    expect([20, 25, 35, 45, 60, 90, 10, 28].map(tenderize)).toEqual([40, 43, 51, 58, 70, 92, 32, 46])
  })
})

describe('monster modes and parts', () => {
  const m = monster([
    hz('Head'),
    hz('Head', { tags: ['Mud'], cut: 20 }),
    hz('Head', { tags: ['Broken'], cut: 80 }),
    hz('Head', { tags: ['Broken', 'Mud'], cut: 30 }),
    hz('Tail'),
    hz('Shell', { tags: ['Mud'] }),
    hz('Leg', { tags: ['Broken'], cut: 40 }),
  ])
  const cut = (mode: string | null, broken: string[] = []) =>
    Object.fromEntries(monsterParts(m, mode, new Set(broken)).map((p) => [p.part, p.hitzone?.cut ?? null]))

  it('lists modes and defaults to the base mode', () => {
    expect(monsterModes(m)).toEqual(['Mud'])
    expect(defaultMode(m)).toBeNull()
    expect(defaultMode(monster([hz('Head', { tags: ['Fire'] }), hz('Head', { tags: ['Ice'] })]))).toBe('Fire')
  })

  it('picks the mode variant over the base row', () => {
    expect(cut(null)).toEqual({ Head: 65, Tail: 65, Leg: null })
    expect(cut('Mud')).toEqual({ Head: 20, Tail: 65, Shell: 65, Leg: null })
  })

  it('broken variants per part, combined with the mode', () => {
    expect(cut(null, ['Head', 'Leg'])).toEqual({ Head: 80, Tail: 65, Leg: 40 })
    expect(cut('Mud', ['Head'])).toMatchObject({ Head: 30 })
    expect(monsterParts(m, null).map((p) => p.breakable)).toEqual([true, false, true])
  })
})

describe('damageTable', () => {
  const rath = monster([hz('Head'), hz('Tail', { cut: 45 }), hz('Body', { cut: 25 })])
  const id = (name: string) => db.data.weapons.find((w) => w.name === name)!.id
  const gs1 = evaluateForMonster(equip(emptyBuild(), 'weapon', id('Defender Great Sword I'), db), db, new Set())
  const gs2 = evaluateForMonster(equip(emptyBuild(), 'weapon', id('Defender Great Sword II'), db), db, new Set())
  const settings = { mode: null, broken: new Set<string>(), wounded: new Set<string>(), mv: 100 }

  it('one hit per build per part, best marked, null without weapon', () => {
    const rows = damageTable(rath, [gs1, gs2, evaluateForMonster(emptyBuild(), db, new Set())], settings)
    expect(rows.map((r) => r.part)).toEqual(['Head', 'Tail', 'Body'])
    expect(rows[0]!.hits[1]!.total).toBeGreaterThan(rows[0]!.hits[0]!.total)
    expect(rows[0]!.best).toEqual([1])
    expect(rows[0]!.hits[2]).toBeNull()
  })

  it('conditional skills only count when switched on; Weakness Exploit can be switched off', () => {
    // Rimeguard Helm α+ [3, 2]: Challenger Jewel 2 (Agitator 1) + Tenderizer Jewel 2 (Weakness Exploit 1)
    const helm = equip(equip(emptyBuild(), 'weapon', id('Defender Great Sword II'), db), 'head', 1297, db)
    const build = setDecoration(setDecoration(helm, 'head', 0, 82, db), 'head', 1, 61, db)
    const off = evaluateForMonster(build, db, new Set())
    const agitator = evaluateForMonster(build, db, new Set(['agitator']))
    expect(agitator.weapon!.trueRaw).toBeCloseTo(off.weapon!.trueRaw + 4)
    // WEX in the set is ignored by the evaluation (applied per hitzone instead)
    expect(evaluateForMonster(build, db, new Set(['weakness-exploit'])).weapon!.affinity).toBe(off.weapon!.affinity)

    const head = (on: boolean) => damageTable(rath, [off], { ...settings, weaknessExploit: on })[0]!.hits[0]!
    expect(head(true).affinity).toBe(off.weapon!.affinity + 10)
    expect(head(false).affinity).toBe(off.weapon!.affinity)
  })

  it('wounded parts are marked and tenderized', () => {
    const rows = damageTable(rath, [gs1], { ...settings, wounded: new Set(['Body']) })
    expect(rows[2]!.wounded).toBe(true)
    expect(rows[2]!.hits[0]!.rawHzv).toBe(tenderize(25))
  })

  it('weighted average over parts', () => {
    const rows = damageTable(rath, [gs1], settings)
    const [head, tail, body] = rows.map((r) => r.hits[0]!.total)
    expect(weightedAverage(rows, {}, 1)[0]).toBeCloseTo((head! + tail! + body!) / 3)
    expect(weightedAverage(rows, { Head: 3, Tail: 1, Body: 0 }, 1)[0]).toBeCloseTo((3 * head! + tail!) / 4)
    expect(weightedAverage(rows, { Head: 0, Tail: 0, Body: 0 }, 1)).toEqual([null])
  })

  it('weighted average skips parts without a hitzone', () => {
    const rows: DamageRow[] = damageTable(monster([hz('A'), hz('B', { tags: ['Broken'] })]), [gs1], settings)
    expect(weightedAverage(rows, {}, 1)[0]).toBeCloseTo(rows[0]!.hits[0]!.total)
  })
})
