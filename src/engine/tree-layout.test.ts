import { describe, expect, it } from 'vitest'
import { db, WEAPON_TYPES } from '../data'
import { weapon } from './test-fixtures'
import { edgePath, layoutTrees } from './tree-layout'

//  A - B - C
//       \- D - E
//  A2 (second root)
const w = (id: number, previousId: number | null, name = `W${id}`) => weapon({ id, previousId, name })
const sample = [w(1, null, 'A'), w(2, 1), w(3, 2), w(4, 2), w(5, 4), w(6, null, 'A2'), w(7, 1)]

describe('layoutTrees', () => {
  const layout = layoutTrees(sample)
  const pos = (id: number) => {
    const n = layout.byId.get(id)!
    return [n.col, n.row]
  }

  it('single rarity: column = depth, first child shares the parent row, siblings stack depth-first', () => {
    expect(pos(1)).toEqual([0, 0])
    expect(pos(2)).toEqual([1, 0])
    expect(pos(3)).toEqual([2, 0])
    expect(pos(4)).toEqual([2, 1])
    expect(pos(5)).toEqual([3, 1])
    expect(pos(7)).toEqual([1, 2])
    expect(pos(6)).toEqual([0, 3])
  })

  it('one band per root', () => {
    expect(layout.bands).toEqual([
      { rootId: 1, label: 'A', rowStart: 0, rowCount: 3 },
      { rootId: 6, label: 'A2', rowStart: 3, rowCount: 1 },
    ])
    expect(layout.rows).toBe(4)
    expect(layout.cols).toBe(4)
  })

  it('edges parent -> child', () => {
    expect(layout.edges).toHaveLength(5)
    expect(layout.edges).toContainEqual({ from: 4, to: 5 })
  })

  it('no two nodes share a cell for any real weapon type', () => {
    for (const type of WEAPON_TYPES) {
      const l = layoutTrees(db.data.weapons.filter((x) => x.type === type && !x.special))
      const cells = new Set(l.nodes.map((n) => `${n.col}:${n.row}`))
      expect(cells.size, type).toBe(l.nodes.length)
      for (const e of l.edges) {
        const a = l.byId.get(e.from)!
        const b = l.byId.get(e.to)!
        expect(b.col).toBeGreaterThan(a.col)
        expect(b.row).toBeGreaterThanOrEqual(a.row)
      }
      // a column never mixes rarities
      const rarityAt = new Map<number, number>()
      for (const n of l.nodes) {
        const r = db.weapon.get(n.id)!.rarity
        expect(rarityAt.get(n.col) ?? r, `${type} col ${n.col}`).toBe(r)
        rarityAt.set(n.col, r)
      }
    }
  })

  it('groups columns by rarity, wide where a path repeats a rarity', () => {
    //  R1 a - R1 b - R3 c
    //       \- R2 d - R3 e
    const r = (id: number, previousId: number | null, rarity: number) => weapon({ id, previousId, rarity })
    const l = layoutTrees([r(1, null, 1), r(2, 1, 1), r(3, 2, 3), r(4, 1, 2), r(5, 4, 3)])
    expect(l.rarityCols).toEqual([
      { rarity: 1, col: 0, width: 2 },
      { rarity: 2, col: 2, width: 1 },
      { rarity: 3, col: 3, width: 1 },
    ])
    const col = (id: number) => l.byId.get(id)!.col
    expect([col(1), col(2), col(4), col(3), col(5)]).toEqual([0, 1, 2, 3, 3])
    expect(l.cols).toBe(4)
  })

  it('edgePath: straight line on same row, elbow otherwise', () => {
    const a = layout.byId.get(2)!
    expect(edgePath(a, layout.byId.get(3)!, 100, 40, 80)).toBe('M180 20H200')
    expect(edgePath(a, layout.byId.get(4)!, 100, 40, 80)).toBe('M180 20H190V60H200')
  })
})
