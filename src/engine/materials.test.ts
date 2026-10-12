import { describe, expect, it } from 'vitest'
import { db, indexData, type Item, type Recipe } from '../data'
import { indexCrafting } from '../data/crafting'
import crafting from '../data/crafting.json'
import items from '../data/items.json'
import { emptyBuild, equip } from './build'
import { buildMaterials, itemMaterials, weaponCraftPath } from './materials'
import { weapon } from './test-fixtures'

const item = (id: number, rarity: number, name: string): Item => ({ id, name, rarity, category: 'material', iconName: null, iconColor: null })

// tree: 1 (create) -> 2 (upgrade only) -> 3 (create or upgrade) -> 4 (upgrade only); 9 has no recipe
const fx = indexData({
  ...db.data,
  weapons: [
    weapon({ id: 1 }),
    weapon({ id: 2, previousId: 1 }),
    weapon({ id: 3, previousId: 2 }),
    weapon({ id: 4, previousId: 3 }),
    weapon({ id: 9 }),
  ],
})
const recipes: Recipe[] = [
  { kind: 'weapon', id: 1, create: [{ itemId: 100, qty: 1 }], upgrade: null },
  { kind: 'weapon', id: 2, create: null, upgrade: [{ itemId: 100, qty: 2 }, { itemId: 101, qty: 1 }] },
  { kind: 'weapon', id: 3, create: [{ itemId: 102, qty: 5 }], upgrade: [{ itemId: 101, qty: 3 }] },
  { kind: 'weapon', id: 4, create: null, upgrade: [{ itemId: 103, qty: 1 }] },
  { kind: 'armor', id: 50, create: [{ itemId: 100, qty: 4 }], upgrade: null },
]
const cx = indexCrafting({ recipes, items: [item(100, 1, 'Iron Ore'), item(101, 4, 'Bone'), item(102, 6, 'Gem'), item(103, 6, 'Claw')] })

describe('weaponCraftPath', () => {
  it('upgrade-only weapons walk back to the first one that can be forged', () => {
    expect(weaponCraftPath(2, fx, cx)!.map((s) => [s.weaponId, s.mode])).toEqual([
      [1, 'create'],
      [2, 'upgrade'],
    ])
  })
  it('a weapon with its own Create recipe is forged directly (cheaper than the path)', () => {
    expect(weaponCraftPath(3, fx, cx)!.map((s) => s.weaponId)).toEqual([3])
    expect(weaponCraftPath(4, fx, cx)!.map((s) => [s.weaponId, s.mode])).toEqual([
      [3, 'create'],
      [4, 'upgrade'],
    ])
  })
  it('null without recipe', () => {
    expect(weaponCraftPath(9, fx, cx)).toBeNull()
  })
  it('itemMaterials sums the path', () => {
    expect(itemMaterials('weapon', 2, fx, cx)).toEqual([
      { itemId: 100, qty: 3 },
      { itemId: 101, qty: 1 },
    ])
  })
})

describe('buildMaterials', () => {
  it('sums per item over all pieces, rarest first, lists sources and items without data', () => {
    const b = { ...emptyBuild(), weapon: 2, head: 50, legs: 50, charm: 7 }
    const { lines, missing } = buildMaterials(b, fx, cx)
    expect(lines).toEqual([
      { itemId: 101, qty: 1, sources: [{ slot: 'weapon', qty: 1 }] },
      {
        itemId: 100,
        qty: 11,
        sources: [
          { slot: 'weapon', qty: 3 },
          { slot: 'head', qty: 4 },
          { slot: 'legs', qty: 4 },
        ],
      },
    ])
    expect(missing).toEqual(['charm'])
  })
  it('empty build needs nothing', () => {
    expect(buildMaterials(emptyBuild(), fx, cx)).toEqual({ lines: [], missing: [] })
  })
})

describe('real data', () => {
  const real = indexCrafting({ recipes: crafting as Recipe[], items: items as Item[] })

  it('every recipe item exists and quantities are positive', () => {
    for (const r of real.data.recipes)
      for (const m of [...(r.create ?? []), ...(r.upgrade ?? [])]) {
        expect(real.item.has(m.itemId), `${r.kind} ${r.id}`).toBe(true)
        expect(m.qty, `${r.kind} ${r.id}`).toBeGreaterThan(0)
      }
  })
  it('every non-special weapon can be crafted from scratch, every armor piece has a recipe', () => {
    expect(db.data.weapons.filter((w) => !w.special && !weaponCraftPath(w.id, db, real)).map((w) => w.name)).toEqual([])
    expect(db.data.armor.filter((a) => !real.armor.has(a.id)).map((a) => a.name)).toEqual([])
  })
  it('Defender Great Sword II = I (Iron Ore x1) + upgrade (Anjanath Scale x1)', () => {
    const w = db.data.weapons.find((x) => x.name === 'Defender Great Sword II')!
    const names = itemMaterials('weapon', w.id, db, real)!.map((m) => [real.item.get(m.itemId)!.name, m.qty])
    expect(names).toEqual([
      ['Iron Ore', 1],
      ['Anjanath Scale', 1],
    ])
  })
  it('charms sum their whole upgrade chain', () => {
    const c = db.data.charms.find((x) => x.name === 'Poison Charm III')
    expect(c).toBeDefined()
    const sac = itemMaterials('charm', c!.id, db, real)!.find((m) => real.item.get(m.itemId)!.name === 'Pukei-Pukei Sac')
    expect(sac?.qty).toBe(1)
  })
  it('a full build adds every piece', () => {
    let b = emptyBuild()
    const leather = db.data.armor.find((a) => a.name === 'Leather Headgear')!
    b = equip(b, 'head', leather.id, db)
    expect(buildMaterials(b, db, real).lines.map((l) => [real.item.get(l.itemId)!.name, l.qty])).toEqual([['Iron Ore', 2]])
  })
})
