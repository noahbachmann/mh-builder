import { describe, expect, it } from 'vitest'
import { db } from '../data'
import type { AmmoSlot, Hitzone, Monster } from '../data/types'
import { AMMO, ammoDamage, ammoTraits, listAmmo, rapidFactor, rapidRounds, weaponAmmo } from './ammo'
import { ammoChoices, damageTable, resolveAmmo, type DamageSettings } from './hitzone-damage'
import type { BuildStats } from './evaluate'
import type { SkillEffect } from './skill-effects'
import { weapon } from './test-fixtures'
import { computeWeaponStats } from './weapon-stats'

// MHWI Damage Formula "Example: Bowgun Ele Ammo": 362 true raw HBG, Critical Boost 3, training pole (shot 80, water 30)
const pole = (over: Partial<Hitzone> = {}): Hitzone => ({
  part: 'Pole',
  tags: [],
  cut: 80,
  impact: 80,
  shot: 80,
  fire: 30,
  water: 30,
  thunder: 30,
  ice: 30,
  dragon: 30,
  ko: 0,
  ...over,
})
const hbg = (effects: SkillEffect[] = [], affinity = 0) =>
  computeWeaponStats(weapon({ type: 'heavy-bowgun', attack: 543, affinity, sharpness: null }), effects)
const slot = (ammo: AmmoSlot['ammo'], over: Partial<AmmoSlot> = {}): AmmoSlot => ({ ammo, clip: 3, ...over })
const CB3: SkillEffect = { critMultiplier: 1.4 }

describe('ammoDamage', () => {
  it('water ammo raw per hit = 8 x 362% x crit x HZV (sheet: 40.544 x 80%)', () => {
    const d = ammoDamage(hbg([CB3], 100), slot('water'), pole(), 0, false)
    expect(d.hits).toBe(3) // GUESS: elemental ammo hits 3 times
    expect(d.raw / 3).toBeCloseTo(40.544 * 0.8)
  })

  it('elemental ammo element scales with true raw; element skills capped at base x 1.57', () => {
    const wa6: SkillEffect = { element: 'water', elementMul: 1.2, elementFlat: 100 }
    const capped = ammoDamage(hbg([wa6]), slot('water'), pole(), 0, false)
    expect(capped.element / 3).toBeCloseTo(22 * 1.57 * 3.62 * 0.3) // 22 x 1.2 + 10 = 36.4 > 34.54
    const wa1: SkillEffect = { element: 'water', elementMul: 1, elementFlat: 30 }
    expect(ammoDamage(hbg([wa1]), slot('water'), pole(), 0, false).element / 3).toBeCloseTo(25 * 3.62 * 0.3)
  })

  it('element crit applies to elemental ammo on positive affinity', () => {
    const plain = ammoDamage(hbg([], 100), slot('water'), pole(), 0, false)
    const ce = ammoDamage(hbg([{ critElement: 'normal' }], 100), slot('water'), pole(), 0, false)
    expect(ce.element / plain.element).toBeCloseTo(1.5) // HBG Critical Element
  })

  it('Rapid Fire doubles one shot (2 extra rounds at 0.5x)', () => {
    const single = ammoDamage(hbg(), slot('normal2'), pole(), 0, false)
    const rapid = ammoDamage(hbg(), slot('normal2', { rapid: true }), pole(), 0, false)
    expect(rapidFactor(slot('normal2', { rapid: true }))).toBe(2)
    expect(rapid.total).toBeCloseTo(single.total * 2)
    expect(rapid.hits).toBe(3)
  })

  it('Rapid Fire rounds per level: +1..+3 fire 3, +4 fires 2', () => {
    expect([1, 2, 3, 4].map((recoil) => rapidRounds(slot('normal2', { rapid: true, recoil })))).toEqual([3, 3, 3, 2])
    expect(rapidFactor(slot('normal2', { rapid: true, recoil: 4 }))).toBe(1.5)
    expect(rapidRounds(slot('normal2', { recoil: 2 }))).toBe(1)
  })

  it('spread fires 7 pellets, pierce hits 3 / 4 / 5 times', () => {
    expect(ammoDamage(hbg(), slot('spread3'), pole(), 0, false).raw).toBeCloseTo(8 * 7 * 3.62 * 0.8)
    expect([AMMO.pierce1, AMMO.pierce2, AMMO.pierce3].map((d) => d.parts[0]!.count)).toEqual([3, 4, 5])
  })

  it('sticky ignores hitzones and affinity, adds fixed fire', () => {
    const d = ammoDamage(hbg([CB3], 100), slot('sticky3'), pole({ shot: 10, fire: 20 }), 3, false)
    expect(d.raw).toBeCloseTo(24 * 3.62)
    expect(d.element).toBeCloseTo(5 * 0.2)
    expect(d.weakSpot).toBe(false)
  })

  it('slicing uses the sever hitzone and green sharpness', () => {
    const d = ammoDamage(hbg(), slot('slicing'), pole({ cut: 50, shot: 10 }), 0, false)
    expect(d.raw).toBeCloseTo(6 * 5 * 3.62 * 1.05 * 0.5)
  })

  it('Normal Shots boosts normal ammo only', () => {
    const ns2: SkillEffect = { ammo: 'normal', ammoMul: 1.2 }
    expect(ammoDamage(hbg([ns2]), slot('normal3'), pole(), 0, false).raw).toBeCloseTo(34 * 3.62 * 0.8 * 1.2)
    expect(ammoDamage(hbg([ns2]), slot('pierce1'), pole(), 0, false).raw).toBeCloseTo(7 * 3 * 3.62 * 0.8)
  })

  it('Weakness Exploit applies on shot weak spots, tenderized when wounded', () => {
    const d = ammoDamage(hbg([CB3]), slot('normal2'), pole({ shot: 40 }), 3, true)
    expect(d.rawHzv).toBe(55) // floor(0.75 x 40 + 25)
    expect(d.affinity).toBe(50) // 30 + 20 wound bonus
  })
})

describe('ammo traits', () => {
  it('buffs and debuffs', () => {
    expect(ammoTraits(slot('normal2', { rapid: true, recoil: 2, reload: 'fast' }))).toEqual({ buffs: ['rapid', 'fast-reload'], debuffs: [] })
    expect(ammoTraits(slot('normal1', { autoReload: true, reload: 'normal' })).buffs).toEqual(['auto-reload'])
    expect(ammoTraits(slot('sticky3', { recoil: 4, reload: 'very slow' })).debuffs).toEqual(['high-recoil', 'very-slow-reload'])
    // rapid fire recoil column is the Rapid Fire level, not recoil
    expect(ammoTraits(slot('spread1', { rapid: true, recoil: 4 })).debuffs).toEqual([])
  })

  it('listAmmo: in-game order, support ammo without damage', () => {
    const list = listAmmo(hbg(), [slot('recover1'), slot('water'), slot('pierce3'), slot('normal1'), slot('sticky1')])
    expect(list.map((r) => r.slot.ammo)).toEqual(['normal1', 'pierce3', 'sticky1', 'recover1', 'water'])
    expect(list.find((r) => r.slot.ammo === 'recover1')!.damage).toBe(0)
    expect(list[0]!.damage).toBeCloseTo(10 * 3.62 * 0.45)
  })
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
const build = (weapon = hbg()): BuildStats => ({ weapon, skills: { skills: [], setBonuses: [] }, efr: null, efe: [], defense: {} }) as unknown as BuildStats
const settings: DamageSettings = { mode: null, broken: new Set(), wounded: new Set(), mv: 100 }
const slots = [slot('normal2'), slot('water'), slot('sticky3'), slot('recover1')]

describe('ammoChoices', () => {
  it('sustainable ammo first, best first; support ammo left out', () => {
    const weakToWater = monster([pole({ shot: 40, water: 30 })])
    const choices = ammoChoices(weakToWater, build(), slots, settings, {})
    expect(choices.map((c) => c.slot.ammo)).toEqual(['water', 'normal2', 'sticky3'])
    expect(choices[2]!.sustainable).toBe(false)
  })

  it('normal beats elemental when the element does nothing', () => {
    const choices = ammoChoices(monster([pole({ shot: 80, water: 0 })]), build(), [slot('water'), slot('normal3')], settings, {})
    expect(choices[0]!.slot.ammo).toBe('normal3')
  })

  it('resolveAmmo keeps an available pick, else falls back to the best', () => {
    const choices = ammoChoices(monster([pole()]), build(), slots, settings, {})
    expect(resolveAmmo(choices, 'sticky3')?.ammo).toBe('sticky3')
    expect(resolveAmmo(choices, 'pierce3')?.ammo).toBe(choices[0]!.slot.ammo)
    expect(resolveAmmo([], null)).toBeNull()
  })

  it('damageTable fires the given ammo instead of MV', () => {
    const m = monster([pole()])
    const [row] = damageTable(m, [build()], { ...settings, mv: 999, ammo: [slot('normal3')] })
    expect(row!.hits[0]!.total).toBeCloseTo(34 * 3.62 * 0.8)
  })
})

describe('weaponAmmo', () => {
  it('every bowgun has loadable ammo; others none', () => {
    const bowguns = db.data.weapons.filter((w) => w.type === 'light-bowgun' || w.type === 'heavy-bowgun')
    expect(bowguns.filter((w) => weaponAmmo(w, db).length === 0).map((w) => w.name)).toEqual([])
    expect(weaponAmmo(db.data.weapons.find((w) => w.type === 'great-sword'), db)).toEqual([])
  })

  it('every source ammo key has a definition', () => {
    const keys = new Set(db.data.ammoConfigs.flatMap((c) => c.slots.map((s) => s.ammo)))
    expect([...keys].filter((k) => !AMMO[k])).toEqual([])
    expect(db.data.ammoConfigs.every((c) => c.slots.every((s) => s.clip >= 1))).toBe(true)
  })
})
