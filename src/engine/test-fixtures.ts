import type { Weapon } from '../data/types'

/** Weapon fixture with sane defaults; override what the test cares about. */
export function weapon(over: Partial<Weapon> = {}): Weapon {
  return {
    id: 1,
    name: 'Test Weapon',
    type: 'great-sword',
    previousId: null,
    rarity: 12,
    attack: 960, // 200 true raw on GS
    affinity: 0,
    defense: 0,
    elements: [],
    elderseal: null,
    slots: [],
    sharpness: [50, 50, 50, 50, 50, 50, 100],
    sharpnessMaxed: false,
    skill: null,
    setBonusId: null,
    special: null,
    ...over,
  }
}
