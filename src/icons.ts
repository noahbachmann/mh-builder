/**
 * Icon registry: icon id -> file under `public/icons/`. Real files are added manually by the
 * owner; until then every lookup falls back to `ui/placeholder.webp`, then to a CSS box.
 */
import type { ArmorType, ElementOrStatus, WeaponType } from './data/types'

export type IconId = string

const base = `${import.meta.env.BASE_URL}icons/`

export const icons = {
  weapon: (t: WeaponType): IconId => `weapon/${t}`,
  armor: (t: ArmorType): IconId => `armor/${t}`,
  charm: (): IconId => 'charm',
  element: (t: ElementOrStatus): IconId => (['poison', 'paralysis', 'sleep', 'blast'].includes(t) ? `status/${t}` : `element/${t}`),
  deco: (size: number): IconId => `deco/size-${size}`,
  slot: (size: number | null): IconId => (size ? `slot/size-${size}` : 'slot/empty'),
  rarity: (n: number): IconId => `rarity/${n}`,
  stat: (s: 'attack' | 'affinity' | 'defense' | 'elderseal'): IconId => `stat/${s}`,
  skill: (_id?: string): IconId => 'skill/default',
  placeholder: (): IconId => 'ui/placeholder',
}

export const iconPath = (id: IconId) => `${base}${id}.webp`
export const PLACEHOLDER = iconPath(icons.placeholder())

// remember failures so hundreds of nodes don't each retry a missing file
const missing = new Set<string>()
export const isMissing = (path: string) => missing.has(path)
export const markMissing = (path: string) => missing.add(path)
