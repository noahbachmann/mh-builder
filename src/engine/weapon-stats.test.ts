import { describe, expect, it } from 'vitest'
import { db } from '../data'
import { BLOAT } from './constants'
import { skillEffect, type SkillEffect } from './skill-effects'
import { weapon } from './test-fixtures'
import { applyHandicraft, computeWeaponStats, topSharpness } from './weapon-stats'

const fx = (...pairs: [string, number][]): SkillEffect[] => pairs.map(([id, lv]) => skillEffect(id, lv)!)

describe('applyHandicraft', () => {
  it('trims 10 hits per missing level from the top', () => {
    expect(applyHandicraft([60, 50, 110, 90, 60, 20, 10], 0, false)).toEqual([60, 50, 110, 90, 40, 0, 0])
    expect(applyHandicraft([60, 50, 110, 90, 60, 20, 10], 3, false)).toEqual([60, 50, 110, 90, 60, 10, 0])
    expect(applyHandicraft([60, 50, 110, 90, 60, 20, 10], 5, false)).toEqual([60, 50, 110, 90, 60, 20, 10])
  })
  it('leaves maxed bars untouched', () => {
    expect(applyHandicraft([10, 10, 10, 10, 10, 10, 10], 0, true)).toEqual([10, 10, 10, 10, 10, 10, 10])
  })
  it('topSharpness finds the highest non-empty colour', () => {
    expect(topSharpness([60, 50, 110, 90, 40, 0, 0])).toBe(4)
  })
})

describe('computeWeaponStats', () => {
  it('true raw = displayed / bloat for every class', () => {
    for (const type of Object.keys(BLOAT) as (keyof typeof BLOAT)[]) {
      const s = computeWeaponStats(weapon({ type, attack: Math.round(200 * BLOAT[type]) }), [])
      expect(s.trueRaw).toBeCloseTo(200, 0)
    }
  })

  it('Black Fatalis Blade: 1632 display = 340 true raw, -30 affinity', () => {
    const s = computeWeaponStats(db.weapon.get(3237)!, [])
    expect(s.trueRaw).toBe(340)
    expect(s.affinity).toBe(-30)
    expect(s.sharpness).toEqual([160, 20, 20, 70, 40, 30, 10])
    expect(s.sharpnessIndex).toBe(6)
  })

  it('Attack Boost 7 adds 21 true raw and 5% affinity', () => {
    const s = computeWeaponStats(weapon(), fx(['attack-boost', 7]))
    expect(s.trueRaw).toBe(221)
    expect(s.attack).toBe(Math.round(221 * 4.8))
    expect(s.affinity).toBe(5)
  })

  it('multipliers apply to base raw before flat bonuses', () => {
    const s = computeWeaponStats(weapon(), [...fx(['attack-boost', 3]), { rawMul: 1.1 }])
    expect(s.trueRaw).toBeCloseTo(200 * 1.1 + 9)
  })

  it('affinity is capped at 100 and -100', () => {
    expect(computeWeaponStats(weapon({ affinity: 80 }), fx(['critical-eye', 7])).affinity).toBe(100)
    expect(computeWeaponStats(weapon({ affinity: -150 }), []).affinity).toBe(-100)
  })

  it('Critical Boost raises the crit multiplier', () => {
    expect(computeWeaponStats(weapon(), []).critMultiplier).toBe(1.25)
    expect(computeWeaponStats(weapon(), fx(['critical-boost', 3])).critMultiplier).toBe(1.4)
  })

  it('element skills: base x % + flat', () => {
    const w = weapon({ elements: [{ type: 'fire', value: 300, hidden: false }] })
    expect(computeWeaponStats(w, fx(['fire-attack', 3])).elements[0]!.value).toBe(400)
    expect(computeWeaponStats(w, fx(['fire-attack', 6])).elements[0]!.value).toBeCloseTo(300 * 1.2 + 100)
    // other elements unaffected
    expect(computeWeaponStats(w, fx(['ice-attack', 6])).elements[0]!.value).toBe(300)
  })

  it('status skills apply to status weapons only', () => {
    const w = weapon({ elements: [{ type: 'paralysis', value: 200, hidden: false }] })
    const s = computeWeaponStats(w, fx(['paralysis-attack', 4], ['fire-attack', 3]))
    expect(s.elements[0]!.value).toBeCloseTo(200 * 1.3 + 10)
    expect(s.elements[0]!.isStatus).toBe(true)
  })

  it('hidden element needs Free Element and scales by its fraction', () => {
    const w = weapon({ elements: [{ type: 'water', value: 300, hidden: true }] })
    const off = computeWeaponStats(w, [])
    expect(off.elements[0]).toMatchObject({ active: false, value: 0 })
    const on = computeWeaponStats(w, fx(['free-elem-ammo-up', 3]))
    expect(on.elements[0]).toMatchObject({ active: true, value: 300 })
    expect(computeWeaponStats(w, fx(['free-elem-ammo-up', 1])).elements[0]!.value).toBeCloseTo(99)
  })

  it('Non-elemental Boost x1.05 only without an active element', () => {
    const raw = computeWeaponStats(weapon(), fx(['non-elemental-boost', 1]))
    expect(raw.nonElementalBoost).toBe(true)
    expect(raw.trueRaw).toBeCloseTo(210)
    const hidden = weapon({ elements: [{ type: 'water', value: 300, hidden: true }] })
    expect(computeWeaponStats(hidden, fx(['non-elemental-boost', 1])).nonElementalBoost).toBe(true)
    expect(computeWeaponStats(hidden, fx(['non-elemental-boost', 1], ['free-elem-ammo-up', 1])).nonElementalBoost).toBe(false)
    const elem = weapon({ elements: [{ type: 'fire', value: 300, hidden: false }] })
    expect(computeWeaponStats(elem, fx(['non-elemental-boost', 1])).trueRaw).toBe(200)
  })

  it('bowguns with elemental ammo get no Non-elemental Boost', () => {
    const hbg = weapon({ type: 'heavy-bowgun', attack: 300, sharpness: null, elementalAmmo: true })
    expect(computeWeaponStats(hbg, fx(['non-elemental-boost', 1])).nonElementalBoost).toBe(false)
    expect(computeWeaponStats({ ...hbg, elementalAmmo: false }, fx(['non-elemental-boost', 1])).nonElementalBoost).toBe(true)
  })

  it('Critical Element uses per-class multiplier, True overrides', () => {
    expect(computeWeaponStats(weapon(), []).critElementMultiplier).toBe(1)
    expect(computeWeaponStats(weapon(), fx(['critical-element', 1])).critElementMultiplier).toBe(1.5)
    expect(computeWeaponStats(weapon({ type: 'dual-blades' }), fx(['critical-element', 1])).critElementMultiplier).toBe(1.35)
    expect(computeWeaponStats(weapon({ type: 'light-bowgun', sharpness: null }), fx(['critical-element', 1])).critElementMultiplier).toBe(1.25)
    expect(
      computeWeaponStats(weapon({ type: 'bow', sharpness: null }), fx(['critical-element', 1], ['true-critical-element', 1])).critElementMultiplier,
    ).toBe(1.55)
  })

  it('Handicraft skill extends the bar', () => {
    const w = weapon({ sharpness: [60, 50, 110, 90, 60, 20, 10] })
    expect(computeWeaponStats(w, []).sharpnessIndex).toBe(4)
    expect(computeWeaponStats(w, fx(['handicraft', 5])).sharpnessIndex).toBe(6)
  })

  it('gunners have no sharpness', () => {
    expect(computeWeaponStats(weapon({ type: 'bow', sharpness: null }), []).sharpnessIndex).toBe(-1)
  })
})
