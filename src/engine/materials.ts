import type { DataIndex, Material } from '../data'
import type { CraftingIndex } from '../data/crafting'
import { EQUIP_SLOTS, type Build, type EquipSlot } from './build'

export interface CraftStep {
  weaponId: number
  mode: 'create' | 'upgrade'
  materials: Material[]
}

/**
 * Steps to get a weapon from nothing, root first: walks back through `previousId` until a weapon
 * that can be forged directly. null if the chain hits a weapon without a recipe (Kulve / Safi).
 */
export function weaponCraftPath(id: number, db: DataIndex, crafting: CraftingIndex): CraftStep[] | null {
  const steps: CraftStep[] = []
  const seen = new Set<number>()
  for (let cur: number | null = id; cur !== null && !seen.has(cur); ) {
    seen.add(cur)
    const r = crafting.weapon.get(cur)
    if (r?.create) return [{ weaponId: cur, mode: 'create', materials: r.create }, ...steps]
    const prev: number | null = db.weapon.get(cur)?.previousId ?? null
    if (!r?.upgrade || prev === null) return null
    steps.unshift({ weaponId: cur, mode: 'upgrade', materials: r.upgrade })
    cur = prev
  }
  return null
}

/** total materials for the item in `slot` from scratch; null = no recipe in the data */
export function itemMaterials(slot: EquipSlot, id: number, db: DataIndex, crafting: CraftingIndex): Material[] | null {
  if (slot === 'weapon') {
    const path = weaponCraftPath(id, db, crafting)
    return path ? sumMaterials(path.map((s) => s.materials)) : null
  }
  return (slot === 'charm' ? crafting.charm : crafting.armor).get(id)?.create ?? null
}

export function sumMaterials(lists: Material[][]): Material[] {
  const total = new Map<number, number>()
  for (const list of lists) for (const m of list) total.set(m.itemId, (total.get(m.itemId) ?? 0) + m.qty)
  return [...total].map(([itemId, qty]) => ({ itemId, qty }))
}

export interface MaterialLine extends Material {
  /** slots needing this item with their share of `qty` */
  sources: { slot: EquipSlot; qty: number }[]
}

export interface BuildMaterials {
  lines: MaterialLine[]
  /** equipped items without crafting data */
  missing: EquipSlot[]
}

/** Every material the build needs (weapon from scratch), summed per item: rarest first, then by name. */
export function buildMaterials(build: Build, db: DataIndex, crafting: CraftingIndex): BuildMaterials {
  const lines = new Map<number, MaterialLine>()
  const missing: EquipSlot[] = []
  for (const slot of EQUIP_SLOTS) {
    const id = build[slot]
    if (id === null) continue
    const mats = itemMaterials(slot, id, db, crafting)
    if (!mats) {
      missing.push(slot)
      continue
    }
    for (const m of mats) {
      const line = lines.get(m.itemId) ?? { itemId: m.itemId, qty: 0, sources: [] }
      line.qty += m.qty
      line.sources.push({ slot, qty: m.qty })
      lines.set(m.itemId, line)
    }
  }
  const item = (id: number) => crafting.item.get(id)
  const sorted = [...lines.values()].sort(
    (a, b) =>
      (item(b.itemId)?.rarity ?? 0) - (item(a.itemId)?.rarity ?? 0) ||
      (item(a.itemId)?.name ?? '').localeCompare(item(b.itemId)?.name ?? ''),
  )
  return { lines: sorted, missing }
}
