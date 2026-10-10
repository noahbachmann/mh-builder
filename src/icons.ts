/**
 * Icon registry: icon id -> icon source under `src/assets/icons/`.
 *
 * - `<id>.vue`: SVG components (MHW_Icons_SVG, MIT, imported once; `ui/*` hand-written). Lazy-loaded,
 *   bundled into one `icons` chunk (vite.config.ts) and rendered inline.
 * - `<id>.webp`: raster icons (element, status, stat, slot from `pnpm renders:import`), imported as URLs.
 *
 * Ids without a file fall back to `ui/placeholder`, then to a CSS box with initials (see `Icon.vue`).
 */
import { defineAsyncComponent, type Component } from 'vue'
import { db } from './data'
import type { ArmorType, Decoration, ElementOrStatus, WeaponType } from './data/types'

export type IconId = string

export const icons = {
  weapon: (t: WeaponType, rarity = 1): IconId => `weapon/${t}/${rarity}`,
  armor: (t: ArmorType, rarity = 1): IconId => `armor/${t}/${rarity}`,
  charm: (rarity = 1): IconId => `charm/${rarity}`,
  element: (t: ElementOrStatus): IconId => (['poison', 'paralysis', 'sleep', 'blast'].includes(t) ? `status/${t}` : `element/${t}`),
  /** `color`: kebab-case skill icon color (`dark-beige`) */
  deco: (size: number, color = 'white'): IconId => `deco/${color}/size-${size}`,
  /** colored like in-game: by the icon color of the jewel's first skill */
  decoration: (d: Decoration): IconId => icons.deco(d.size, decoColor(d)),
  slot: (size: number | null): IconId => (size ? `slot/size-${size}` : 'slot/empty'),
  rarity: (n: number): IconId => `rarity/${n}`,
  monster: (slug: string): IconId => `monster/${slug}`,
  stat: (s: 'attack' | 'affinity' | 'defense' | 'elderseal'): IconId => `stat/${s}`,
  skill: (_id?: string): IconId => 'skill/default',
  placeholder: (): IconId => 'ui/placeholder',
  ui: (name: 'save' | 'trash'): IconId => `ui/${name}`,
}

const kebab = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
function decoColor(d: Decoration): string | undefined {
  const color = db.skill.get(d.skills[0]?.skillId ?? '')?.iconColor
  return color ? kebab(color) : undefined
}

export type IconSource = { kind: 'component'; component: Component } | { kind: 'image'; url: string }

const ROOT = './assets/icons/'
const idOf = (path: string) => path.slice(ROOT.length).replace(/\.(vue|webp)$/, '')

const sources = new Map<IconId, IconSource>()
const svgs = import.meta.glob<Component>('./assets/icons/**/*.vue', { import: 'default' })
for (const [path, load] of Object.entries(svgs))
  sources.set(idOf(path), { kind: 'component', component: defineAsyncComponent(load) })
const images = import.meta.glob<string>('./assets/icons/**/*.webp', { eager: true, query: '?url', import: 'default' })
for (const [path, url] of Object.entries(images)) sources.set(idOf(path), { kind: 'image', url })

/** Icon for `id`, else the placeholder icon, else null (caller draws initials). */
export const resolveIcon = (id: IconId): IconSource | null => sources.get(id) ?? sources.get(icons.placeholder()) ?? null
