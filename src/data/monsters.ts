import type { Item, Monster, MonsterData } from './types'

/** id / slug lookups over the monster data; engine and stores take this so tests can pass fixtures */
export interface MonsterIndex {
  data: MonsterData
  monster: Map<number, Monster>
  bySlug: Map<string, Monster>
  item: Map<number, Item>
}

export function indexMonsters(data: MonsterData): MonsterIndex {
  return {
    data,
    monster: new Map(data.monsters.map((m) => [m.id, m])),
    bySlug: new Map(data.monsters.map((m) => [m.slug, m])),
    item: new Map(data.items.map((i) => [i.id, i])),
  }
}

let loading: Promise<MonsterIndex> | null = null

/** Loads monsters + items (~700 kB raw) on first use. */
export function loadMonsters(): Promise<MonsterIndex> {
  loading ??= Promise.all([import('./monsters.json'), import('./items.json')]).then(([m, i]) =>
    indexMonsters({ monsters: m.default as Monster[], items: i.default as Item[] }),
  )
  return loading
}
