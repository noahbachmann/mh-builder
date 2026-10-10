import { describe, expect, it } from 'vitest'
import { MONSTER_STAR_KEYS, type Item, type Monster } from './types'
import { indexMonsters } from './monsters'
import monsters from './monsters.json'
import items from './items.json'

const md = indexMonsters({ monsters: monsters as Monster[], items: items as Item[] })
const all = md.data.monsters
const byName = (name: string) => all.find((m) => m.name === name)!

describe('monster data', () => {
  it('has the 71 large monsters with unique ids and slugs', () => {
    expect(all).toHaveLength(71)
    expect(md.monster.size).toBe(all.length)
    expect(md.bySlug.size).toBe(all.length)
    expect(new Set(md.data.items.map((i) => i.id)).size).toBe(md.data.items.length)
  })

  it('every monster has hitzones and rewards', () => {
    expect(all.filter((m) => !m.hitzones.length).map((m) => m.name)).toEqual([])
    expect(all.filter((m) => !m.rewards.length).map((m) => m.name)).toEqual([])
  })

  it('every reward item exists', () => {
    expect(all.flatMap((m) => m.rewards).filter((r) => !md.item.has(r.itemId))).toEqual([])
  })

  it('weakness stars are 0 to 3', () => {
    for (const m of all)
      for (const s of [m.weaknesses, ...m.altWeaknesses.map((a) => a.stars)])
        for (const k of MONSTER_STAR_KEYS) if (s[k] !== undefined) expect(s[k], `${m.name} ${k}`).toBeGreaterThanOrEqual(0)
    const max = all.flatMap((m) => Object.values(m.weaknesses))
    expect(Math.max(...max)).toBeLessThanOrEqual(3)
  })

  it('hitzone values are in range and part/tag pairs unique', () => {
    for (const m of all) {
      const keys = m.hitzones.map((h) => `${h.part}|${[...h.tags].sort().join('+')}`)
      expect(new Set(keys).size, m.name).toBe(keys.length)
      for (const h of m.hitzones)
        for (const v of [h.cut, h.impact, h.shot, h.fire, h.water, h.thunder, h.ice, h.dragon])
          expect(v >= 0 && v <= 100, `${m.name} ${h.part}`).toBe(true)
    }
  })

  it('reward ranks and percentages are valid', () => {
    const rewards = all.flatMap((m) => m.rewards)
    expect(rewards.every((r) => ['LR', 'HR', 'MR'].includes(r.rank))).toBe(true)
    expect(rewards.every((r) => (r.percentage === null || (r.percentage > 0 && r.percentage <= 100)) && r.stack >= 1)).toBe(true)
  })

  it('Rathalos head is 65 / 70 / 60', () => {
    const head = byName('Rathalos').hitzones.find((h) => h.part === 'Head' && !h.tags.length)!
    expect([head.cut, head.impact, head.shot]).toEqual([65, 70, 60])
  })

  it('parses hitzone states into tags', () => {
    expect(byName('Barroth').hitzones.filter((h) => h.tags.includes('Mud'))).toHaveLength(6)
    // base-game "Wounded" rows are the broken state
    expect(byName('Nergigante').hitzones.find((h) => h.part === 'Horn' && h.tags[0] === 'Broken')?.cut).toBe(35)
    expect(byName("Safi'jiiva").hitzones.some((h) => h.tags.includes('Broken') && h.tags.includes('SCritical'))).toBe(true)
    // sub-part suffixes stay in the part name
    expect(byName('Zorah Magdaros').hitzones.some((h) => h.part === 'Exhaust Organ (Crater)')).toBe(true)
  })

  it('keeps alternate weakness forms', () => {
    expect(byName('Alatreon').altWeaknesses.map((a) => a.description)).toEqual(['ice active', 'dragon active'])
    expect(byName('Barroth').altWeaknesses[0]).toMatchObject({ description: 'when covered in mud', stars: { water: 3 } })
  })
})
