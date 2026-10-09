import { describe, expect, it } from 'vitest'
import { db } from '../data'
import { emptyBuild, equip, setDecoration } from './build'
import { decodeBuild, encodeBuild } from './build-codec'

const find = <T extends { name: string }>(list: T[], name: string) => list.find((x) => x.name === name)!

function sampleBuild() {
  const d = db.data
  let b = emptyBuild()
  b = equip(b, 'weapon', find(d.weapons, 'Black Fatalis Blade').id, db)
  for (const slot of ['head', 'chest', 'arms', 'waist', 'legs'] as const) {
    const piece = d.armor.find((a) => a.type === slot && a.rank === 'MR' && a.slots.length >= 2)!
    b = equip(b, slot, piece.id, db)
  }
  b = equip(b, 'charm', d.charms.at(-1)!.id, db)
  const size4 = d.decorations.find((x) => x.size === 4)!
  b = setDecoration(b, 'weapon', 0, size4.id, db)
  b = setDecoration(b, 'weapon', 1, size4.id, db)
  const small = d.decorations.find((x) => x.size === 1)!
  b = setDecoration(b, 'head', 1, small.id, db)
  return b
}

describe('build codec', () => {
  it('round-trips a full build', () => {
    const b = sampleBuild()
    const code = encodeBuild(b)
    expect(code).toMatch(/^1\.[0-9a-z_.x-]+$/)
    expect(decodeBuild(code, db)).toEqual(b)
  })

  it('round-trips an empty build', () => {
    expect(encodeBuild(emptyBuild())).toBe('1.')
    expect(decodeBuild('1.', db)).toEqual(emptyBuild())
  })

  it('round-trips partial builds', () => {
    const b = equip(emptyBuild(), 'legs', db.data.armor.find((a) => a.type === 'legs')!.id, db)
    expect(decodeBuild(encodeBuild(b), db)).toEqual(b)
  })

  it('rejects unknown versions and drops invalid parts', () => {
    expect(decodeBuild('9.abc', db)).toBeNull()
    expect(decodeBuild('garbage', db)).toBeNull()
    const head = db.data.armor.find((a) => a.type === 'head')!
    // head id in chest position is dropped; bad weapon id dropped
    const b = decodeBuild(`1.zzzzzz_${head.id.toString(36)}_${head.id.toString(36)}`, db)!
    expect(b.weapon).toBeNull()
    expect(b.head).toBe(head.id)
    expect(b.chest).toBeNull()
  })

  it('drops decorations that do not fit', () => {
    const w = db.data.weapons.find((x) => x.slots.length === 1 && x.slots[0] === 1)!
    const size4 = db.data.decorations.find((x) => x.size === 4)!
    const b = decodeBuild(`1.${w.id.toString(36)}-${size4.id.toString(36)}`, db)!
    expect(b.weapon).toBe(w.id)
    expect(b.decorations.weapon).toEqual([null])
  })
})
