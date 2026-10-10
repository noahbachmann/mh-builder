/**
 * Normalized data types. Generated JSON in this folder conforms to these;
 * the app never sees the raw source format.
 */

export const WEAPON_TYPES = [
  'great-sword',
  'long-sword',
  'sword-and-shield',
  'dual-blades',
  'hammer',
  'hunting-horn',
  'lance',
  'gunlance',
  'switch-axe',
  'charge-blade',
  'insect-glaive',
  'light-bowgun',
  'heavy-bowgun',
  'bow',
] as const
export type WeaponType = (typeof WEAPON_TYPES)[number]

export const ELEMENTS = ['fire', 'water', 'thunder', 'ice', 'dragon'] as const
export type Element = (typeof ELEMENTS)[number]
export const STATUSES = ['poison', 'paralysis', 'sleep', 'blast'] as const
export type Status = (typeof STATUSES)[number]
export type ElementOrStatus = Element | Status

export const ARMOR_TYPES = ['head', 'chest', 'arms', 'waist', 'legs'] as const
export type ArmorType = (typeof ARMOR_TYPES)[number]

export type Rank = 'LR' | 'HR' | 'MR'
export type Elderseal = 'low' | 'average' | 'high'

export interface SkillRef {
  skillId: string
  level: number
}

export interface WeaponElement {
  type: ElementOrStatus
  /** displayed value (true value x 10) */
  value: number
  hidden: boolean
}

/** Sharpness bar lengths in hits: red, orange, yellow, green, blue, white, purple. */
export type SharpnessBar = [number, number, number, number, number, number, number]

export interface Weapon {
  id: number
  name: string
  type: WeaponType
  previousId: number | null
  rarity: number
  /** displayed (bloated) attack */
  attack: number
  affinity: number
  defense: number
  elements: WeaponElement[]
  elderseal: Elderseal | null
  slots: number[]
  /** bar at Handicraft 5; null for gunners */
  sharpness: SharpnessBar | null
  /** true if bar is already full at Handicraft 0 */
  sharpnessMaxed: boolean
  skill: SkillRef | null
  /** weapon counts as one piece toward this set bonus (Kulve Taroth MR weapons) */
  setBonusId: string | null
  /** Kulve Taroth / Safi'jiiva weapons, reserved for the later "Special" tab */
  special: 'kulve' | 'safi' | null
  phial?: string
  phialPower?: number
  shelling?: string
  shellingLevel?: number
  kinsectBonus?: string
  /** hunting horn notes, e.g. "PGC" */
  notes?: string
  /** bow coatings that can be used */
  coatings?: string[]
  /** bowguns: true if any elemental/dragon ammo usable (blocks Non-elemental Boost) */
  elementalAmmo?: boolean
  deviation?: string
  specialAmmo?: string
}

export interface ElementalResistances {
  fire: number
  water: number
  thunder: number
  ice: number
  dragon: number
}

export interface Armor {
  id: number
  name: string
  type: ArmorType
  rank: Rank
  rarity: number
  /** max defense (augmented max for MR) */
  defense: number
  resistances: ElementalResistances
  slots: number[]
  skills: SkillRef[]
  setId: string | null
}

export interface ArmorSet {
  id: string
  name: string
  rank: Rank
  pieceIds: number[]
  bonusId: string | null
}

export interface SetBonusRank {
  skillId: string
  required: number
}

export interface SetBonus {
  id: string
  name: string
  ranks: SetBonusRank[]
}

export interface Charm {
  id: number
  name: string
  rarity: number
  skills: SkillRef[]
}

export interface Decoration {
  id: number
  name: string
  size: number
  rarity: number
  skills: SkillRef[]
}

export interface Skill {
  id: string
  name: string
  /** max level without secret unlock */
  maxLevel: number
  /** max level with secret unlock (== maxLevel if none) */
  unlockedMaxLevel: number
  /** for "X Secret" skills: id of skill whose cap they raise */
  unlocks: string | null
  /** general description (what the skill does, all levels) */
  description: string
  /** description per level, index 0 = level 1 */
  descriptions: string[]
  iconColor: string | null
}

export interface GameData {
  weapons: Weapon[]
  armor: Armor[]
  armorSets: ArmorSet[]
  setBonuses: SetBonus[]
  charms: Charm[]
  decorations: Decoration[]
  skills: Skill[]
}
