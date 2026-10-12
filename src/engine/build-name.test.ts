import { describe, expect, it } from 'vitest'
import { db } from '../data'
import { emptyBuild } from './build'
import { suggestBuildName, topResistances, uniqueName } from './build-name'

const res = (fire = 0, water = 0, thunder = 0, ice = 0, dragon = 0) => ({ fire, water, thunder, ice, dragon })

describe('build names', () => {
  const w = db.data.weapons.find((x) => x.name === 'Defender Great Sword I')!
  const withWeapon = { ...emptyBuild(), weapon: w.id }

  it('highest resistance; ties named together, max 2', () => {
    expect(topResistances(res(3, 1, 0, 2, -4))).toEqual(['fire'])
    expect(topResistances(res(3, 1, 0, 3, -4))).toEqual(['fire', 'ice'])
    expect(topResistances(res(5, 5, 5, 0, 0))).toEqual(['fire', 'water'])
    expect(topResistances(res(0, -1, 0, 0, 0))).toEqual([])
  })

  it('weapon / res', () => {
    expect(suggestBuildName(withWeapon, res(0, 0, 0, 6, 0), db)).toBe('Defender Great Sword I / Ice res')
    expect(suggestBuildName(withWeapon, res(0, 4, 4, 0, 0), db)).toBe('Defender Great Sword I / Water & Thunder res')
    expect(suggestBuildName(withWeapon, res(), db)).toBe('Defender Great Sword I')
    expect(suggestBuildName(emptyBuild(), res(0, 0, 0, 0, 2), db)).toBe('Dragon res')
    expect(suggestBuildName(emptyBuild(), res(), db)).toBeNull()
  })

  it('uniqueName numbers duplicates', () => {
    expect(uniqueName('A', ['B'])).toBe('A')
    expect(uniqueName('A', ['A', 'A (2)'])).toBe('A (3)')
  })
})
