import type { CraftingData, Item, Recipe } from './types'

/** recipe / item lookups; engine takes this so tests can pass fixtures */
export interface CraftingIndex {
  data: CraftingData
  weapon: Map<number, Recipe>
  armor: Map<number, Recipe>
  charm: Map<number, Recipe>
  item: Map<number, Item>
}

export function indexCrafting(data: CraftingData): CraftingIndex {
  const of = (kind: Recipe['kind']) => new Map(data.recipes.filter((r) => r.kind === kind).map((r) => [r.id, r]))
  return {
    data,
    weapon: of('weapon'),
    armor: of('armor'),
    charm: of('charm'),
    item: new Map(data.items.map((i) => [i.id, i])),
  }
}

let loading: Promise<CraftingIndex> | null = null

/** Loads recipes + items on first use (shares the items chunk with the monster data). */
export function loadCrafting(): Promise<CraftingIndex> {
  loading ??= Promise.all([import('./crafting.json'), import('./items.json')]).then(([r, i]) =>
    indexCrafting({ recipes: r.default as Recipe[], items: i.default as Item[] }),
  )
  return loading
}
