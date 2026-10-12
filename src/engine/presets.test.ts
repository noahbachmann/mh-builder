import { describe, expect, it } from 'vitest'
import { db } from '../data'
import { PRESETS } from '../data/presets'
import { DECO_SLOTS, EQUIP_SLOTS } from './build'
import { computeSkills } from './skills'
import { resolvePreset, type PresetDef } from './presets'

describe('resolvePreset', () => {
  const def: PresetDef = {
    slug: 't',
    name: 'T',
    group: 'iceborne',
    note: '',
    items: { weapon: 'Fatalis Zaggespanon', head: 'Dragonhead β+', chest: 'Dragonhead β+', charm: 'Nope Charm' },
    decorations: { weapon: ['Attack Jewel+ 4', 'Missing Jewel'], head: ['Attack Jewel 1', null, 'Expert Jewel 1'] },
  }

  it('resolves names to ids and places decorations', () => {
    const { build } = resolvePreset(def, db)
    expect(db.weapon.get(build.weapon!)?.name).toBe('Fatalis Zaggespanon')
    expect(db.armor.get(build.head!)?.name).toBe('Dragonhead β+')
    expect(build.decorations.head.map((d) => (d === null ? null : db.decoration.get(d)?.name))).toEqual([
      'Attack Jewel 1',
      null,
      'Expert Jewel 1',
    ])
  })

  it('reports unknown names and armor in the wrong slot, keeps the rest', () => {
    const { build, problems } = resolvePreset(def, db)
    expect(build.chest).toBeNull()
    expect(build.charm).toBeNull()
    expect(build.decorations.weapon[0]).not.toBeNull()
    expect(problems).toEqual([
      'chest: "Dragonhead β+" not found',
      'charm: "Nope Charm" not found',
      'weapon deco 2: "Missing Jewel" not found',
    ])
  })

  it('reports decorations that do not fit', () => {
    const { problems } = resolvePreset(
      { ...def, items: { head: 'Bone Helm' }, decorations: { head: ['Attack Jewel 1'] } },
      db,
    )
    expect(problems).toEqual(['head deco 1: "Attack Jewel 1" does not fit'])
  })
})

describe('PRESETS', () => {
  it('stays at 40 or fewer, with unique slugs and names', () => {
    expect(PRESETS.length).toBeLessThanOrEqual(40)
    expect(new Set(PRESETS.map((p) => p.slug)).size).toBe(PRESETS.length)
    expect(new Set(PRESETS.map((p) => p.name)).size).toBe(PRESETS.length)
  })

  it('has every group', () => {
    expect(new Set(PRESETS.map((p) => p.group))).toEqual(new Set(['iceborne', 'base', 'progression']))
  })

  it.each(PRESETS.map((p) => [p.name, p] as const))('%s resolves completely', (_, p) => {
    const { build, problems } = resolvePreset(p, db)
    expect(problems).toEqual([])
    // every armor piece + weapon equipped; charm optional (early game)
    for (const slot of EQUIP_SLOTS) if (slot !== 'charm') expect(build[slot], slot).not.toBeNull()
    // no deco silently dropped
    for (const slot of DECO_SLOTS) {
      const wanted = (p.decorations?.[slot] ?? []).filter((d) => d !== null).length
      expect(build.decorations[slot].filter((d) => d !== null).length, slot).toBe(wanted)
    }
  })

  it.each(PRESETS.map((p) => [p.name, p] as const))('%s wastes no skill points over the cap', (_, p) => {
    const over = computeSkills(resolvePreset(p, db).build, db).skills.filter((s) => s.points > s.cap)
    expect(over.map((s) => `${s.skill.name} ${s.points}/${s.cap}`)).toEqual([])
  })
})
