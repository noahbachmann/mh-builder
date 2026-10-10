import { describe, expect, it } from 'vitest'
import { findNeighbor } from './focus-grid'

const c = (row: number, col: number) => ({ region: 'r', row, col })

describe('findNeighbor', () => {
  const grid = [c(0, 0), c(0, 1), c(0, 2), c(1, 2), c(1, 3), c(3, 1)]

  it('moves along the row', () => {
    expect(findNeighbor(c(0, 0), 'right', grid)).toEqual(c(0, 1))
    expect(findNeighbor(c(0, 1), 'left', grid)).toEqual(c(0, 0))
  })

  it('prefers nearest in the primary axis, then the closest column', () => {
    expect(findNeighbor(c(0, 2), 'down', grid)).toEqual(c(1, 2))
    expect(findNeighbor(c(1, 2), 'down', grid)).toEqual(c(3, 1))
    // tree case: right from (0,2) with no same-row neighbour goes to child on the next row
    expect(findNeighbor(c(0, 2), 'right', grid)).toEqual(c(1, 3))
  })

  it('left/right stay on the row across column gaps', () => {
    const tree = [c(0, 0), c(0, 4), c(1, 1), c(5, 1)]
    expect(findNeighbor(c(0, 0), 'right', tree)).toEqual(c(0, 4))
    expect(findNeighbor(c(0, 4), 'left', tree)).toEqual(c(0, 0))
    // no cell on the row: nearest column wins
    expect(findNeighbor(c(1, 1), 'right', [...tree, c(2, 2)])).toEqual(c(2, 2))
  })

  it('returns null at the edge', () => {
    expect(findNeighbor(c(0, 0), 'up', grid)).toBeNull()
    expect(findNeighbor(c(0, 0), 'left', grid)).toBeNull()
  })
})
