import { describe, expect, it } from 'vitest'
import { db } from './data'
import { icons, resolveIcon } from './icons'

describe('icon registry', () => {
  it('every weapon, armor piece and charm has an icon in its rarity color', () => {
    for (const w of db.data.weapons) expect(resolveIcon(icons.weapon(w.type, w.rarity))?.kind, w.name).toBe('component')
    for (const a of db.data.armor) expect(resolveIcon(icons.armor(a.type, a.rarity))?.kind, a.name).toBe('component')
    for (const c of db.data.charms) expect(resolveIcon(icons.charm(c.rarity))?.kind, c.name).toBe('component')
  })

  it('every decoration gets an icon colored by its skill', () => {
    for (const d of db.data.decorations) expect(resolveIcon(icons.decoration(d))?.kind, d.name).toBe('component')
    const attack = db.data.decorations.find((d) => d.skills[0]!.skillId === 'attack-boost')!
    expect(icons.decoration(attack)).toMatch(/^deco\/[a-z-]+\/size-\d$/)
    expect(icons.decoration(attack)).not.toBe(icons.deco(attack.size))
  })

  it('unknown ids resolve to null without a placeholder file', () => {
    expect(resolveIcon('nope/missing')).toBeNull()
  })
})
