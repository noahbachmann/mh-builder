/**
 * All damage-model constants in one place. Each value cites its source.
 * Values marked UNVERIFIED have no trusted reference yet and must not be
 * treated as final.
 */
import type { WeaponType } from '../data/types'

/** Displayed attack / true raw. Source: CLAUDE.md table, community-verified (Fextralife "Weapon Damage"). */
export const BLOAT: Record<WeaponType, number> = {
  'great-sword': 4.8,
  'long-sword': 3.3,
  'sword-and-shield': 1.4,
  'dual-blades': 1.4,
  hammer: 5.2,
  'hunting-horn': 4.2,
  lance: 2.3,
  gunlance: 2.3,
  'switch-axe': 3.5,
  'charge-blade': 3.6,
  'insect-glaive': 3.1,
  'light-bowgun': 1.3,
  'heavy-bowgun': 1.5,
  bow: 1.2,
}

/** Displayed element / true element. */
export const ELEMENT_BLOAT = 10

export const SHARPNESS_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'white', 'purple'] as const
export type SharpnessColor = (typeof SHARPNESS_COLORS)[number]

/** Index = SHARPNESS_COLORS index. Source: Fextralife "Sharpness" table (Iceborne; white element 1.15, purple 1.25). */
export const RAW_SHARPNESS = [0.5, 0.75, 1.0, 1.05, 1.2, 1.32, 1.39] as const
export const ELEMENT_SHARPNESS = [0.25, 0.5, 0.75, 1.0, 1.0625, 1.15, 1.25] as const

export const BASE_CRIT_MULTIPLIER = 1.25
/** Critical Boost levels 1..3 (skill text: "increases damage dealt by critical hits to 30/35/40%") */
export const CRIT_BOOST_MULTIPLIER = [1.3, 1.35, 1.4] as const
/** "feeble" hit on negative affinity */
export const NEGATIVE_CRIT_MULTIPLIER = 0.75
export const AFFINITY_CAP = 100

export const GUNNERS: ReadonlySet<WeaponType> = new Set(['light-bowgun', 'heavy-bowgun', 'bow'])

const critElement = (heavy: number, normal: number, lbg: number): Record<WeaponType, number> => ({
  'great-sword': heavy,
  hammer: heavy,
  'hunting-horn': heavy,
  'heavy-bowgun': heavy,
  'long-sword': normal,
  'dual-blades': normal,
  'sword-and-shield': normal,
  'charge-blade': normal,
  'switch-axe': normal,
  lance: normal,
  gunlance: normal,
  'insect-glaive': normal,
  bow: normal,
  'light-bowgun': lbg,
})

/** Elemental crit multiplier with Critical Element (Iceborne). Source: Fextralife "Critical Element". */
export const CRIT_ELEMENT_MULTIPLIER = critElement(1.5, 1.35, 1.25)
/** With True Critical Element (Silver Rathalos Essence 4pc). Source: Fextralife "True Critical Element". */
export const TRUE_CRIT_ELEMENT_MULTIPLIER = critElement(1.7, 1.55, 1.4)

/** Non-elemental Boost raw multiplier on base raw (Iceborne value; base game was 1.10). Source: Fextralife "Non-elemental Boost". */
export const NEB_MULTIPLIER = 1.05

/** Sharpness hits added per Handicraft level; data stores the bar at max (level 5). */
export const HANDICRAFT_PER_LEVEL = 10
export const HANDICRAFT_MAX_LEVEL = 5

/**
 * Element cap: max displayed element after skills for a given base displayed element.
 * UNVERIFIED: no trusted reference found for the Iceborne rule (forum claims range from
 * "no cap" to "1.6x base"). Returns null = uncapped until a source is confirmed.
 */
export function elementCap(_baseDisplayed: number): number | null {
  return null
}

/** Raw hitzone value (after tenderizing) from which Weakness Exploit counts a weak spot. Source: monsterhunterwiki "Weakness Exploit (MHWI)", gamestegy "Hit Zone values". */
export const WEAK_SPOT_HZV = 45

export type DamageType = 'cut' | 'impact' | 'shot'

/** Hitzone column a weapon's main attacks use (shield bashes, phials, shelling etc. not modelled). */
export function damageType(type: WeaponType): DamageType {
  if (type === 'hammer' || type === 'hunting-horn') return 'impact'
  return GUNNERS.has(type) ? 'shot' : 'cut'
}

/**
 * Iceborne wound (clutch claw tenderize): raw hitzone -> floor(0.75 x HZV + 25); elemental hitzones unchanged.
 * Source: tenderized columns on monsterhunterwiki MHWI Nergigante page, all 16 values match
 * (20->40, 25->43, 45->58, 90->92, 10->32, ...).
 */
export function tenderize(hzv: number): number {
  return Math.floor(0.75 * hzv + 25)
}

export type ShotAmmo = 'normal' | 'pierce' | 'spread'

/**
 * Normal / Piercing / Spread-Power Shots Lv1-2 raw multiplier on that bowgun ammo.
 * Source: MoonBunnie & Deathcream "MHWI Damage Formula" (bit.ly/MHWIDamageFormula), "Sources: Attack".
 */
export const AMMO_SHOT_MULTIPLIER: Record<ShotAmmo, readonly number[]> = {
  normal: [1.1, 1.2],
  pierce: [1.1, 1.2],
  spread: [1.1, 1.15],
}

/**
 * LBG Rapid Fire: 2 extra rounds at 0.5x damage (Rapid Fire +1..+3; +4 has 1, not in the data).
 * Source: MoonBunnie & Deathcream "MHWI General Data Sheet" (bit.ly/MHWIGeneralDataSheet), "Light Bowgun".
 */
export const RAPID_FIRE_EXTRA_ROUNDS = 2
export const RAPID_FIRE_EXTRA_MULTIPLIER = 0.5

/** Element cap of bowgun elemental ammo: base ammo element x 1.57. Source: "MHWI Damage Formula", "Sources: Element Dmg". */
export const AMMO_ELEMENT_CAP = 1.57
