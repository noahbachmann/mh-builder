import { describe, expect, it } from 'vitest'
import { db } from '../data'
import { canSlot, emptyBuild, equip, setDecoration } from './build'

describe('build model', () => {
  const w = db.data.weapons.find((x) => x.slots.length === 2 && x.slots[0] === 4 && x.slots[1] === 1)!
  const size4 = db.data.decorations.find((x) => x.size === 4)!
  const size1 = db.data.decorations.find((x) => x.size === 1)!

  it('equipping creates empty decoration slots matching the item', () => {
    expect(equip(emptyBuild(), 'weapon', w.id, db).decorations.weapon).toEqual([null, null])
  })

  it('decorations must fit: size <= slot size', () => {
    expect(canSlot(1, 4)).toBe(true)
    expect(canSlot(4, 1)).toBe(false)
    let b = equip(emptyBuild(), 'weapon', w.id, db)
    b = setDecoration(b, 'weapon', 1, size4.id, db)
    expect(b.decorations.weapon).toEqual([null, null])
    b = setDecoration(b, 'weapon', 0, size4.id, db)
    b = setDecoration(b, 'weapon', 1, size1.id, db)
    expect(b.decorations.weapon).toEqual([size4.id, size1.id])
  })

  it('changing equipment clears its decorations; builds are immutable', () => {
    const a = setDecoration(equip(emptyBuild(), 'weapon', w.id, db), 'weapon', 0, size4.id, db)
    const b = equip(a, 'weapon', w.id, db)
    expect(b.decorations.weapon).toEqual([null, null])
    expect(a.decorations.weapon).toEqual([size4.id, null])
  })

  it('out-of-range slot index is ignored', () => {
    const a = equip(emptyBuild(), 'weapon', w.id, db)
    expect(setDecoration(a, 'weapon', 5, size1.id, db)).toBe(a)
  })
})
