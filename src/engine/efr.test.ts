import { describe, expect, it } from 'vitest'
import { computeEfe, computeEfr } from './efr'
import { skillEffect } from './skill-effects'
import { weapon } from './test-fixtures'
import { computeWeaponStats } from './weapon-stats'

describe('EFR', () => {
  it('positive affinity with Critical Boost 3 on purple', () => {
    // 200 x 1.39 x (1 + 0.3 x 0.4) = 311.36
    const s = computeWeaponStats(weapon({ affinity: 30 }), [skillEffect('critical-boost', 3)!])
    expect(computeEfr(s).efr).toBeCloseTo(311.36, 2)
  })

  it('negative affinity uses 0.75 on white', () => {
    // 200 x 1.32 x (1 - 0.3 x 0.25) = 244.2
    const s = computeWeaponStats(weapon({ affinity: -30, sharpness: [50, 50, 50, 50, 50, 100, 0] }), [])
    const e = computeEfr(s)
    expect(e.critMultiplier).toBe(0.75)
    expect(e.efr).toBeCloseTo(244.2, 2)
  })

  it('zero affinity is just raw x sharpness', () => {
    expect(computeEfr(computeWeaponStats(weapon({ sharpness: [100, 0, 0, 0, 0, 0, 0] }), [])).efr).toBe(100)
  })

  it('gunners use sharpness 1.0', () => {
    // bow 240 display = 200 true; 50% aff x 1.25 => 200 x 1.125 = 225
    const s = computeWeaponStats(weapon({ type: 'bow', attack: 240, affinity: 50, sharpness: null }), [])
    expect(computeEfr(s)).toMatchObject({ sharpnessMultiplier: 1 })
    expect(computeEfr(s).efr).toBeCloseTo(225)
  })

  it('Black Fatalis Blade base EFR', () => {
    // 340 x 1.39 x (1 - 0.3 x 0.25) = 437.155
    const s = computeWeaponStats(weapon({ attack: 1632, affinity: -30 }), [])
    expect(computeEfr(s).efr).toBeCloseTo(437.155, 3)
  })
})

describe('EFE', () => {
  const fire = weapon({ elements: [{ type: 'fire', value: 300, hidden: false }], affinity: 40 })

  it('no Critical Element: affinity ignored', () => {
    // 30 x 1.27 = 38.1
    const [e] = computeEfe(computeWeaponStats(fire, []))
    expect(e!.efe).toBeCloseTo(38.1)
  })

  it('Critical Element on GS (1.5)', () => {
    // 30 x 1.27 x (1 + 0.4 x 0.5) = 45.72
    const [e] = computeEfe(computeWeaponStats(fire, [skillEffect('critical-element', 1)!]))
    expect(e!.efe).toBeCloseTo(45.72)
  })

  it('negative affinity does not reduce element', () => {
    const neg = { ...fire, affinity: -40 }
    const [e] = computeEfe(computeWeaponStats(neg, [skillEffect('critical-element', 1)!]))
    expect(e!.efe).toBeCloseTo(38.1)
  })

  it('element sharpness on blue is 1.0625; statuses and inactive hidden element excluded', () => {
    const w = weapon({
      type: 'dual-blades',
      attack: 280,
      sharpness: [100, 0, 0, 0, 100, 0, 0],
      elements: [
        { type: 'ice', value: 210, hidden: false },
        { type: 'blast', value: 210, hidden: false },
      ],
    })
    const efe = computeEfe(computeWeaponStats(w, []))
    expect(efe).toHaveLength(1)
    expect(efe[0]!.efe).toBeCloseTo(21 * 1.0625)
    const hidden = weapon({ elements: [{ type: 'water', value: 300, hidden: true }] })
    expect(computeEfe(computeWeaponStats(hidden, []))).toEqual([])
  })
})
