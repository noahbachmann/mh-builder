/**
 * Bowgun ammo: per-ammo damage values, firing traits and damage per shot against a hitzone.
 *
 * Source for every value unless marked GUESS: MoonBunnie & Deathcream "MHWI Weapon Attack Tables"
 * (bit.ly/MHWIWeaponAttackTables), "Bowgun Ammo" tab; the same values for LBG and HBG.
 *
 * shot = per hit: true raw x base raw/100 x affinity factor x ammo skill x raw HZV/100, x hits,
 * plus element. Elemental ammo element (MHWI Damage Formula "Bowgun Ele Ammo"):
 * min(base x elem% + flat, base x 1.57) x element crit x true raw/100 x elemental HZV/100.
 * Assumed: within critical range (1.0x), every spread pellet / cluster bomb hits. Not modelled:
 * rounding, reload / recoil timing (not DPS), mods, status buildup, Special Ammo Boost / Artillery.
 */
import type { DataIndex } from '../data'
import { AMMO_KEYS, type AmmoKey, type AmmoSlot, type Element, type Hitzone, type ReloadSpeed, type Weapon } from '../data/types'
import { AMMO_ELEMENT_CAP, RAPID_FIRE_EXTRA_MULTIPLIER, RAPID_FIRE_EXTRA_ROUNDS, RAW_SHARPNESS, tenderize, type ShotAmmo } from './constants'
import { elementAffinityFactor, hitAffinity, rawAffinityFactor } from './efr'
import type { HitDamage } from './hitzone-damage'
import { trueElement, type WeaponStats } from './weapon-stats'

export type AmmoKind =
  | 'normal'
  | 'pierce'
  | 'spread'
  | 'sticky'
  | 'cluster'
  | 'status'
  | 'elemental'
  | 'slicing'
  | 'wyvern'
  | 'support'

export interface AmmoPart {
  /** base raw per hit ("motion value") */
  raw: number
  /** hits per shot */
  count: number
  /** base element per hit (true value) */
  element?: number
}

export interface AmmoDef {
  key: AmmoKey
  label: string
  kind: AmmoKind
  /** hitzone column; `none` = ignores hitzones (HZV 100) and cannot crit */
  type: 'shot' | 'sever' | 'none'
  parts: AmmoPart[]
  elementType?: Element
  /** element scales with true raw, element skills and the ammo element cap (elemental ammo only) */
  scalingElement?: boolean
}

const one = (raw: number, count = 1, element?: number): AmmoPart[] => [{ raw, count, ...(element ? { element } : {}) }]

// GUESS (no source; real count depends on monster size): pierce 3/4/5 hits, elemental / dragon 3
const PIERCE_HITS = [3, 4, 5] as const
const ELEMENTAL_HITS = 3

const shot = (key: AmmoKey, label: string, kind: AmmoKind, parts: AmmoPart[]): AmmoDef => ({ key, label, kind, type: 'shot', parts })
const elemental = (key: AmmoKey, label: string, elementType: Element, raw: number, element: number): AmmoDef => ({
  key,
  label,
  kind: 'elemental',
  type: 'shot',
  parts: one(raw, ELEMENTAL_HITS, element),
  elementType,
  scalingElement: true,
})
// sticky / cluster / wyvern: no raw type, fixed fire element
const blast = (key: AmmoKey, label: string, kind: AmmoKind, parts: AmmoPart[]): AmmoDef => ({ key, label, kind, type: 'none', parts, elementType: 'fire' })
const support = (key: AmmoKey, label: string): AmmoDef => ({ key, label, kind: 'support', type: 'none', parts: [] })

const DEFS: AmmoDef[] = [
  shot('normal1', 'Normal 1', 'normal', one(10)),
  shot('normal2', 'Normal 2', 'normal', one(20)),
  shot('normal3', 'Normal 3', 'normal', one(34)),
  shot('pierce1', 'Pierce 1', 'pierce', one(7, PIERCE_HITS[0])),
  shot('pierce2', 'Pierce 2', 'pierce', one(7, PIERCE_HITS[1])),
  shot('pierce3', 'Pierce 3', 'pierce', one(9, PIERCE_HITS[2])),
  shot('spread1', 'Spread 1', 'spread', one(6, 3)),
  shot('spread2', 'Spread 2', 'spread', one(7, 5)),
  shot('spread3', 'Spread 3', 'spread', one(8, 7)),
  blast('sticky1', 'Sticky 1', 'sticky', one(12, 1, 3)),
  blast('sticky2', 'Sticky 2', 'sticky', one(17, 1, 5)),
  blast('sticky3', 'Sticky 3', 'sticky', one(24, 1, 5)),
  blast('cluster1', 'Cluster 1', 'cluster', one(17, 3, 5)),
  blast('cluster2', 'Cluster 2', 'cluster', one(20, 4, 8)),
  blast('cluster3', 'Cluster 3', 'cluster', one(26, 5, 10)),
  support('recover1', 'Recover 1'),
  support('recover2', 'Recover 2'),
  shot('poison1', 'Poison 1', 'status', one(1)),
  shot('poison2', 'Poison 2', 'status', one(1)),
  shot('paralysis1', 'Paralysis 1', 'status', one(1)),
  shot('paralysis2', 'Paralysis 2', 'status', one(1)),
  shot('sleep1', 'Sleep 1', 'status', one(1)),
  shot('sleep2', 'Sleep 2', 'status', one(1)),
  shot('exhaust1', 'Exhaust 1', 'status', one(1)),
  shot('exhaust2', 'Exhaust 2', 'status', one(1)),
  elemental('flaming', 'Flaming', 'fire', 8, 22),
  elemental('water', 'Water', 'water', 8, 22),
  elemental('freeze', 'Freeze', 'ice', 8, 22),
  elemental('thunder', 'Thunder', 'thunder', 8, 22),
  elemental('dragon', 'Dragon', 'dragon', 2, 18),
  { key: 'slicing', label: 'Slicing', kind: 'slicing', type: 'sever', parts: one(6, 5) },
  // GUESS: one secondary hit
  blast('wyvern', 'Wyvern', 'wyvern', [
    { raw: 70, count: 1, element: 40 },
    { raw: 19, count: 1, element: 20 },
  ]),
  support('demon', 'Demon'),
  support('armor', 'Armor'),
  support('tranq', 'Tranq'),
]

export const AMMO: Readonly<Record<AmmoKey, AmmoDef>> = Object.fromEntries(DEFS.map((d) => [d.key, d])) as Record<AmmoKey, AmmoDef>

/** Loadable ammo of a bowgun (empty for other weapons). */
export function weaponAmmo(weapon: Weapon | null | undefined, db: DataIndex): AmmoSlot[] {
  return (weapon?.ammoConfig && db.ammoConfig.get(weapon.ammoConfig)?.slots) || []
}

/** Craftable without limit: the pool for the default ("best") pick. */
export const SUSTAINABLE_KINDS: ReadonlySet<AmmoKind> = new Set(['normal', 'pierce', 'spread', 'elemental'])
export const isSustainable = (key: AmmoKey) => SUSTAINABLE_KINDS.has(AMMO[key].kind)
export const isDamaging = (key: AmmoKey) => AMMO[key].kind !== 'support'

const SHOT_SKILL: Partial<Record<AmmoKind, ShotAmmo>> = { normal: 'normal', pierce: 'pierce', spread: 'spread' }
// slicing: "Calculated with Green sharpness"
const GREEN = RAW_SHARPNESS[3]

/** Rounds fired per shot: 1, Rapid Fire adds 2 (+4: 1). */
export const rapidRounds = (slot: AmmoSlot) => 1 + (slot.rapid ? (RAPID_FIRE_EXTRA_ROUNDS[slot.recoil ?? 0] ?? 2) : 0)

/** Rounds per shot as a damage factor: extra Rapid Fire rounds at half damage. */
export const rapidFactor = (slot: AmmoSlot) => 1 + (rapidRounds(slot) - 1) * RAPID_FIRE_EXTRA_MULTIPLIER

export interface AmmoDamage extends HitDamage {
  ammo: AmmoKey
  /** hits per shot, incl. Rapid Fire rounds */
  hits: number
}

/**
 * Damage of one shot (one ammo used) on one hitzone. `stats` from `evaluateForMonster` (Weakness Exploit
 * applied here per hitzone from `wexLevel`, like `hitDamage`).
 */
export function ammoDamage(stats: WeaponStats, slot: AmmoSlot, hitzone: Hitzone, wexLevel: number, wounded: boolean): AmmoDamage {
  const def = AMMO[slot.ammo]
  const canCrit = def.type !== 'none'
  const baseHzv = def.type === 'none' ? 100 : hitzone[def.type === 'sever' ? 'cut' : 'shot']
  const rawHzv = def.type !== 'none' && wounded ? tenderize(baseHzv) : baseHzv
  const { affinity, weakSpot } = canCrit ? hitAffinity(stats.affinity, rawHzv, wexLevel, wounded) : { affinity: 0, weakSpot: false }

  const skill = SHOT_SKILL[def.kind]
  const shotMul = (skill && stats.ammo?.shotMul[skill]) || 1
  const sharp = def.type === 'sever' ? GREEN : 1
  const rawFactor = (stats.trueRaw / 100) * (canCrit ? rawAffinityFactor(affinity, stats.critMultiplier) : 1) * shotMul * sharp * (rawHzv / 100)

  const elemHzv = def.elementType ? hitzone[def.elementType] / 100 : 0
  const rapid = rapidFactor(slot)
  let raw = 0
  let element = 0
  let hits = 0
  for (const p of def.parts) {
    raw += p.raw * p.count * rawFactor
    hits += p.count
    if (!p.element || !def.elementType) continue
    if (def.scalingElement) {
      const mods = stats.ammo?.element[def.elementType] ?? { mul: 1, flat: 0 }
      const value = Math.min(p.element * mods.mul + trueElement(mods.flat), p.element * AMMO_ELEMENT_CAP)
      element += value * elementAffinityFactor(affinity, stats.critElementMultiplier) * (stats.trueRaw / 100) * elemHzv * p.count
    } else element += p.element * elemHzv * p.count
  }
  raw *= rapid
  element *= rapid
  return {
    ammo: slot.ammo,
    hits: hits * rapidRounds(slot),
    raw,
    element,
    total: raw + element,
    rawHzv,
    weakSpot,
    affinity,
  }
}

export type AmmoTrait = 'rapid' | 'auto-reload' | 'low-recoil' | 'fast-reload' | 'high-recoil' | 'very-slow-reload'

export const TRAIT_LABEL: Record<AmmoTrait, string> = {
  rapid: 'Rapid Fire',
  'auto-reload': 'Auto-reload',
  'low-recoil': 'Low recoil',
  'fast-reload': 'Fast reload',
  'high-recoil': 'High recoil',
  'very-slow-reload': 'Very slow reload',
}

/** Firing traits: buffs (Rapid Fire, auto-reload, recoil 1, fast reload) and debuffs (recoil 4, very slow reload). */
export function ammoTraits(slot: AmmoSlot): { buffs: AmmoTrait[]; debuffs: AmmoTrait[] } {
  const buffs: AmmoTrait[] = []
  const debuffs: AmmoTrait[] = []
  if (slot.rapid) buffs.push('rapid')
  if (slot.autoReload) buffs.push('auto-reload')
  // on Rapid Fire ammo the recoil column is the Rapid Fire level
  if (!slot.rapid && slot.recoil === 1) buffs.push('low-recoil')
  if (!slot.rapid && slot.recoil !== undefined && slot.recoil >= 4) debuffs.push('high-recoil')
  if (slot.reload === 'fast') buffs.push('fast-reload')
  if (slot.reload === 'very slow') debuffs.push('very-slow-reload')
  return { buffs, debuffs }
}

export const RELOAD_LABEL: Record<ReloadSpeed, string> = { fast: 'Fast', normal: 'Normal', slow: 'Slow', 'very slow': 'Very slow' }

/** Typical hitzone for ranking ammo without a monster: shot / sever 45 (weak spot), element 20. */
export const REFERENCE_HITZONE: Hitzone = {
  part: 'Reference',
  tags: [],
  cut: 45,
  impact: 45,
  shot: 45,
  fire: 20,
  water: 20,
  thunder: 20,
  ice: 20,
  dragon: 20,
  ko: 0,
}

export interface ListedAmmo {
  slot: AmmoSlot
  def: AmmoDef
  /** damage per shot on `REFERENCE_HITZONE` */
  damage: number
}

/** Sidebar list: in-game (`AMMO_KEYS`) order, with damage per shot on the reference hitzone. */
export function listAmmo(stats: WeaponStats, slots: AmmoSlot[]): ListedAmmo[] {
  return slots
    .map((slot) => ({
      slot,
      def: AMMO[slot.ammo],
      damage: isDamaging(slot.ammo) ? ammoDamage(stats, slot, REFERENCE_HITZONE, 0, false).total : 0,
    }))
    .sort((a, b) => AMMO_KEYS.indexOf(a.slot.ammo) - AMMO_KEYS.indexOf(b.slot.ammo))
}
