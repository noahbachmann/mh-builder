import type { Armor, ArmorSet, Charm, Decoration, GameData, SetBonus, Skill, Weapon } from './types'
import weapons from './weapons.json'
import armor from './armor.json'
import armorSets from './armor-sets.json'
import setBonuses from './set-bonuses.json'
import charms from './charms.json'
import decorations from './decorations.json'
import skills from './skills.json'

export * from './types'

export const gameData: GameData = {
  weapons: weapons as Weapon[],
  armor: armor as Armor[],
  armorSets: armorSets as ArmorSet[],
  setBonuses: setBonuses as SetBonus[],
  charms: charms as Charm[],
  decorations: decorations as Decoration[],
  skills: skills as Skill[],
}

/** id lookups over a dataset; engine functions take this so tests can pass fixtures */
export interface DataIndex {
  data: GameData
  weapon: Map<number, Weapon>
  armor: Map<number, Armor>
  armorSet: Map<string, ArmorSet>
  setBonus: Map<string, SetBonus>
  charm: Map<number, Charm>
  decoration: Map<number, Decoration>
  skill: Map<string, Skill>
}

export function indexData(data: GameData): DataIndex {
  const byId = <K, T extends { id: K }>(list: T[]) => new Map(list.map((x) => [x.id, x]))
  return {
    data,
    weapon: byId(data.weapons),
    armor: byId(data.armor),
    armorSet: byId(data.armorSets),
    setBonus: byId(data.setBonuses),
    charm: byId(data.charms),
    decoration: byId(data.decorations),
    skill: byId(data.skills),
  }
}

export const db: DataIndex = indexData(gameData)
