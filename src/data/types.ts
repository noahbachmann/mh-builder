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
  /** bowguns: `AmmoConfig.id` (configs are shared by many bowguns) */
  ammoConfig?: string
}

/** Bowgun ammo types in source (in-game list) order. */
export const AMMO_KEYS = [
  'normal1', 'normal2', 'normal3', 'pierce1', 'pierce2', 'pierce3', 'spread1', 'spread2', 'spread3',
  'sticky1', 'sticky2', 'sticky3', 'cluster1', 'cluster2', 'cluster3', 'recover1', 'recover2',
  'poison1', 'poison2', 'paralysis1', 'paralysis2', 'sleep1', 'sleep2', 'exhaust1', 'exhaust2',
  'flaming', 'water', 'freeze', 'thunder', 'dragon', 'slicing', 'wyvern', 'demon', 'armor', 'tranq',
] as const
export type AmmoKey = (typeof AMMO_KEYS)[number]
export type ReloadSpeed = 'fast' | 'normal' | 'slow' | 'very slow'

/** One loadable ammo of a bowgun. */
export interface AmmoSlot {
  ammo: AmmoKey
  /** capacity per load */
  clip: number
  /** LBG Rapid Fire (`recoil` then is the Rapid Fire level) */
  rapid?: true
  /** fires and reloads by itself (source recoil -1) */
  autoReload?: true
  /** recoil level 1-4, lower is better; missing for auto-reload and wyvern ammo */
  recoil?: number
  reload?: ReloadSpeed
}

export interface AmmoConfig {
  id: string
  /** usable ammo only (capacity > 0), in AMMO_KEYS order */
  slots: AmmoSlot[]
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
  ammoConfigs: AmmoConfig[]
}

export const MONSTER_STAR_KEYS = [...ELEMENTS, ...STATUSES, 'stun'] as const
export type MonsterStarKey = (typeof MONSTER_STAR_KEYS)[number]
/** field guide weakness stars, 0-3 */
export type Stars = Record<MonsterStarKey, number>

export interface Hitzone {
  part: string
  /**
   * Variant tags parsed from the source suffix, e.g. `Head (Mud)` -> ['Mud'], `(Broken+SCritical)` ->
   * ['Broken', 'SCritical']. 'Broken' is per part; any other tag is a monster-wide mode.
   */
  tags: string[]
  cut: number
  impact: number
  shot: number
  fire: number
  water: number
  thunder: number
  ice: number
  dragon: number
  ko: number
}

export interface MonsterPart {
  name: string
  flinch: number
  /** break threshold (source column `wound`), 0 = not breakable */
  break: number
  /** sever threshold, 0 = not severable */
  sever: number
  /** kinsect extract color */
  extract: string | null
}

export interface MonsterAilment {
  /** source column, e.g. 'roar', 'fireblight' */
  id: string
  /** 'small' | 'large' | 'extreme' for roar / wind / tremor */
  strength: string | null
}

export interface MonsterReward {
  rank: Rank
  condition: string
  itemId: number
  stack: number
  /** null where the source has none (Kulve Taroth gold plating) */
  percentage: number | null
}

export interface Monster {
  id: number
  /** URL id */
  slug: string
  name: string
  ecology: string
  description: string
  traps: { pitfall: boolean; shock: boolean; vine: boolean }
  weaknesses: Stars
  /** alternate forms (mud, charged, ...); statuses missing = same as normal */
  altWeaknesses: { description: string; stars: Partial<Stars> }[]
  ailments: MonsterAilment[]
  hitzones: Hitzone[]
  /** from break data; empty when the source has none (most Iceborne monsters) */
  parts: MonsterPart[]
  rewards: MonsterReward[]
}

export interface Item {
  id: number
  name: string
  category: string
  rarity: number
  iconName: string | null
  iconColor: string | null
}

export interface Material {
  itemId: number
  qty: number
}

/**
 * Crafting cost of one item. Weapons: `create` = forge directly (null if it can only be upgraded),
 * `upgrade` = from `previousId`. Armor: `create` only. Charms: `create` = the whole upgrade chain
 * summed (only the max level is stored).
 */
export interface Recipe {
  kind: 'weapon' | 'armor' | 'charm'
  id: number
  create: Material[] | null
  upgrade: Material[] | null
}

/** Crafting data: lazy-loaded (see `src/data/crafting.ts`), not part of `GameData`. */
export interface CraftingData {
  recipes: Recipe[]
  /** reward + material items (shared with `MonsterData`) */
  items: Item[]
}

/** Monster page data: lazy-loaded (see `src/data/monsters.ts`), not part of `GameData`. */
export interface MonsterData {
  monsters: Monster[]
  /** items referenced by monster rewards or recipes */
  items: Item[]
}
