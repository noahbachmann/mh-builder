import type { ElementOrStatus, Rank, WeaponType } from './data/types'
import type { EquipSlot } from './engine/build'

export const WEAPON_TYPE_LABEL: Record<WeaponType, string> = {
  'great-sword': 'Great Sword',
  'long-sword': 'Long Sword',
  'sword-and-shield': 'Sword & Shield',
  'dual-blades': 'Dual Blades',
  hammer: 'Hammer',
  'hunting-horn': 'Hunting Horn',
  lance: 'Lance',
  gunlance: 'Gunlance',
  'switch-axe': 'Switch Axe',
  'charge-blade': 'Charge Blade',
  'insect-glaive': 'Insect Glaive',
  'light-bowgun': 'Light Bowgun',
  'heavy-bowgun': 'Heavy Bowgun',
  bow: 'Bow',
}

export const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: 'Weapon',
  head: 'Head',
  chest: 'Chest',
  arms: 'Arms',
  waist: 'Waist',
  legs: 'Legs',
  charm: 'Charm',
}

export const RANK_LABEL: Record<Rank, string> = { LR: 'Low Rank', HR: 'High Rank', MR: 'Master Rank' }

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export const elementLabel = (t: ElementOrStatus) => capitalize(t)

export const fmt = (n: number, digits = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
export const signed = (n: number, digits = 0) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${fmt(Math.abs(n), digits)}`
export const pct = (n: number) => `${n > 0 ? '+' : ''}${fmt(n)}%`
