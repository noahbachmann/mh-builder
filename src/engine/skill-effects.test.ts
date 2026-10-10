import { describe, expect, it } from 'vitest'
import { db } from '../data'
import { CONDITIONS, SKILL_EFFECTS, WEAK_SPOT_CONDITION, activeEffects, skillEffect, type SkillEffect } from './skill-effects'

const pct = (m: number | undefined) => (m === undefined ? [] : [Math.round((m - 1) * 100)])

/** Every number the effect encodes, in the units the in-game text uses. */
function effectNumbers(e: SkillEffect): number[] {
  return [
    e.rawFlat,
    e.affinity,
    e.woundAffinity,
    ...pct(e.rawMul),
    ...pct(e.critMultiplier),
    e.elementFlat,
    ...pct(e.elementMul),
    e.statusFlat,
    ...pct(e.statusMul),
    e.handicraft !== undefined ? e.handicraft * 10 : undefined,
    e.freeElement !== undefined ? Math.round(e.freeElement * 100) : undefined,
    e.defenseFlat,
    ...pct(e.defenseMul),
    ...Object.values(e.resistances ?? {}),
  ].filter((n): n is number => n !== undefined)
}

// numbers in the text that describe parts we intentionally do not model
const IGNORED: Record<string, number[]> = {
  'latent-power': [30, 50], // stamina depletion
  'free-elem-ammo-up': [],
}

describe('skill effects table', () => {
  for (const [id, levels] of Object.entries(SKILL_EFFECTS)) {
    describe(id, () => {
      const skill = db.skill.get(id)

      it('exists in data with one entry per level', () => {
        expect(skill, id).toBeDefined()
        expect(levels).toHaveLength(skill!.unlockedMaxLevel)
      })

      levels.forEach((effect, i) => {
        it(`level ${i + 1} matches in-game text`, () => {
          const text = skill!.descriptions[i]!
          const inText = [...text.matchAll(/(\d+)%?/g)].map((m) => Number(m[1]))
          const ignored = IGNORED[id] ?? []
          const modeled = effectNumbers(effect)
          for (const n of inText) {
            if (ignored.includes(n)) continue
            expect(modeled, `"${text}" -> ${n}`).toContain(n)
          }
        })
      })
    })
  }

  it('Attack Boost 4+ adds 5% affinity', () => {
    expect(skillEffect('attack-boost', 3)).toEqual({ rawFlat: 9 })
    expect(skillEffect('attack-boost', 4)).toEqual({ rawFlat: 12, affinity: 5 })
  })

  it('Critical Boost sets crit multiplier', () => {
    expect(skillEffect('critical-boost', 3)?.critMultiplier).toBe(1.4)
  })

  it('element attack L6 is +20% and +100', () => {
    expect(skillEffect('fire-attack', 6)).toEqual({ element: 'fire', elementMul: 1.2, elementFlat: 100 })
  })

  it('clamps over-max level and ignores unknown skills', () => {
    expect(skillEffect('critical-eye', 99)?.affinity).toBe(40)
    expect(skillEffect('nope', 1)).toBeNull()
    expect(skillEffect('critical-eye', 0)).toBeNull()
  })

  it('conditional effects are excluded unless requested', () => {
    const levels = new Map([
      ['agitator', 5],
      ['critical-eye', 1],
    ])
    expect(activeEffects(levels)).toHaveLength(1)
    expect(activeEffects(levels, { includeConditional: true })).toHaveLength(2)
  })

  it('applies only the chosen conditions', () => {
    const levels = new Map([
      ['agitator', 1],
      ['peak-performance', 1],
    ])
    expect(activeEffects(levels, { conditions: new Set(['Monster enraged']) })).toEqual([skillEffect('agitator', 1)])
    expect(activeEffects(levels, { conditions: new Set() })).toEqual([])
  })

  it('lists every condition with its skills', () => {
    expect(CONDITIONS.find((c) => c.label === 'Monster enraged')?.skillIds).toEqual(['agitator'])
    expect(CONDITIONS.find((c) => c.label === WEAK_SPOT_CONDITION)?.skillIds).toEqual(['weakness-exploit'])
  })
})
