import { join } from 'node:path'
import { readCsv, type Row } from './csv.ts'
import type {
  Armor,
  ArmorSet,
  ArmorType,
  Charm,
  Decoration,
  Elderseal,
  ElementOrStatus,
  GameData,
  Rank,
  SetBonus,
  SharpnessBar,
  Skill,
  SkillRef,
  Weapon,
  WeaponElement,
  WeaponType,
} from '../../src/data/types.ts'

export function slug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const int = (s: string | undefined): number => (s ? Number.parseInt(s, 10) : 0)
const bool = (s: string | undefined): boolean => s?.toUpperCase() === 'TRUE'

const GUNNERS = new Set<WeaponType>(['light-bowgun', 'heavy-bowgun', 'bow'])
const ELEMENTAL_AMMO = ['flaming', 'water', 'freeze', 'thunder', 'dragon']
const COATINGS = ['close', 'power', 'paralysis', 'poison', 'sleep', 'blast']

function rankFromRarity(rarity: number): Rank {
  if (rarity <= 4) return 'LR'
  if (rarity <= 8) return 'HR'
  return 'MR'
}

export interface NormalizeResult {
  data: GameData
  warnings: string[]
}

/** Converts MHWorldData `source_data/` CSVs into our normalized types. */
export function normalize(src: string): NormalizeResult {
  const warnings: string[] = []
  const csv = (p: string) => readCsv(join(src, p))

  // --- skills
  const levelRows = csv('skills/skill_levels.csv')
  const descByName = new Map<string, string[]>()
  for (const r of levelRows) {
    const list = descByName.get(r.base_name_en!) ?? []
    list[int(r.level) - 1] = r.description_en!
    descByName.set(r.base_name_en!, list)
  }
  const skills: Skill[] = csv('skills/skill_base.csv').map((r) => {
    const descriptions = descByName.get(r.name_en!) ?? []
    const secret = int(r.secret)
    return {
      id: slug(r.name_en!),
      name: r.name_en!,
      maxLevel: descriptions.length - secret,
      unlockedMaxLevel: descriptions.length,
      unlocks: r.unlocks ? slug(r.unlocks) : null,
      descriptions,
      iconColor: r.icon_color || null,
    }
  })
  const skillIds = new Set(skills.map((s) => s.id))

  const skillRefs = (r: Row, context: string): SkillRef[] => {
    const refs: SkillRef[] = []
    for (const n of [1, 2]) {
      const name = r[`skill${n}_name`]
      if (!name) continue
      const id = slug(name)
      if (!skillIds.has(id)) {
        warnings.push(`${context}: unknown skill "${name}" dropped`)
        continue
      }
      refs.push({ skillId: id, level: int(r[`skill${n}_level`]) || 1 })
    }
    return refs
  }

  // --- set bonuses
  const setBonuses: SetBonus[] = csv('armors/armorset_bonus_base.csv').map((r) => ({
    id: slug(r.name_en!),
    name: r.name_en!,
    ranks: [1, 2]
      .filter((n) => r[`skill${n}_name`])
      .map((n) => ({ skillId: slug(r[`skill${n}_name`]!), required: int(r[`skill${n}_required`]) })),
  }))

  const setBonusIds = new Set(setBonuses.map((b) => b.id))

  // --- armor
  const setRows = csv('armors/armorset_base.csv')
  const setByPiece = new Map<string, Row>()
  for (const s of setRows)
    for (const t of ['head', 'chest', 'arms', 'waist', 'legs']) if (s[t]) setByPiece.set(s[t]!, s)
  const armorSkills = new Map(csv('armors/armor_skills_ext.csv').map((r) => [r.base_name_en!, r]))

  const armor: Armor[] = csv('armors/armor_base.csv').map((r) => {
    const rarity = int(r.rarity)
    const set = setByPiece.get(r.name_en!)
    const rank = (set?.rank as Rank | undefined) ?? rankFromRarity(rarity)
    const sk = armorSkills.get(r.name_en!)
    return {
      id: int(r.id),
      name: r.name_en!,
      type: r.type as ArmorType,
      rank,
      rarity,
      defense: rank === 'MR' ? int(r.defense_augment_max) : int(r.defense_max),
      resistances: {
        fire: int(r.defense_fire),
        water: int(r.defense_water),
        thunder: int(r.defense_thunder),
        ice: int(r.defense_ice),
        dragon: int(r.defense_dragon),
      },
      slots: [r.slot_1, r.slot_2, r.slot_3].map(int).filter((s) => s > 0),
      skills: sk ? skillRefs(sk, `armor ${r.name_en}`) : [],
      setId: set ? slug(set.name_en!) : null,
    }
  })
  const armorIdByName = new Map(armor.map((a) => [a.name, a.id]))
  const armorSets: ArmorSet[] = setRows.map((s) => ({
    id: slug(s.name_en!),
    name: s.name_en!,
    rank: s.rank as Rank,
    pieceIds: ['head', 'chest', 'arms', 'waist', 'legs']
      .map((t) => s[t] && armorIdByName.get(s[t]!))
      .filter((id): id is number => typeof id === 'number'),
    bonusId: s.bonus ? slug(s.bonus) : null,
  }))

  // --- charms: keep only the last of each upgrade chain
  const charmRows = csv('charms/charm_base.csv')
  const upgraded = new Set(charmRows.map((r) => r.previous_en).filter(Boolean))
  const charms: Charm[] = charmRows
    .filter((r) => !upgraded.has(r.name_en))
    .map((r) => ({
      id: int(r.id),
      name: r.name_en!,
      rarity: int(r.rarity),
      skills: skillRefs(r, `charm ${r.name_en}`),
    }))

  // --- decorations
  const decorations: Decoration[] = csv('decorations/decoration_base.csv').map((r) => ({
    id: int(r.id),
    name: r.name_en!,
    size: int(r.slot),
    rarity: int(r.rarity),
    skills: skillRefs(r, `decoration ${r.name_en}`),
  }))

  // --- weapons
  const weaponRows = csv('weapons/weapon_base.csv')
  const weaponIdByName = new Map(weaponRows.map((r) => [r.name_en!, int(r.id)]))
  const sharpness = new Map(csv('weapons/weapon_sharpness.csv').map((r) => [r.base_name_en!, r]))
  const bowExt = new Map(csv('weapons/weapon_bow_ext.csv').map((r) => [r.base_name_en!, r]))
  const ammo = new Map(csv('weapons/weapon_ammo.csv').map((r) => [r.key!, r]))

  const weapons: Weapon[] = weaponRows.map((r) => {
    const type = r.weapon_type as WeaponType
    const elements: WeaponElement[] = []
    for (const n of [1, 2]) {
      const t = r[`element${n}`]
      if (t)
        elements.push({
          type: t.toLowerCase() as ElementOrStatus,
          value: int(r[`element${n}_attack`]),
          hidden: bool(r.element_hidden),
        })
    }
    let previousId: number | null = null
    if (r.previous_en) {
      previousId = weaponIdByName.get(r.previous_en) ?? null
      if (previousId === null) warnings.push(`weapon ${r.name_en}: unknown previous "${r.previous_en}"`)
    }
    const sh = sharpness.get(r.name_en!)
    // Kulve MR weapons list a set bonus as their "skill": counts as one set piece
    const bonusId = r.skill && setBonusIds.has(slug(r.skill)) ? slug(r.skill) : null
    const skill =
      r.skill && !bonusId ? skillRefs({ skill1_name: r.skill, skill1_level: '1' }, `weapon ${r.name_en}`)[0] : undefined
    const w: Weapon = {
      id: int(r.id),
      name: r.name_en!,
      type,
      previousId,
      rarity: int(r.rarity),
      attack: int(r.attack),
      affinity: int(r.affinity),
      defense: int(r.defense),
      elements,
      elderseal: (r.elderseal as Elderseal) || null,
      slots: [r.slot_1, r.slot_2, r.slot_3].map(int).filter((s) => s > 0),
      sharpness: sh
        ? ([sh.red, sh.orange, sh.yellow, sh.green, sh.blue, sh.white, sh.purple].map(int) as SharpnessBar)
        : null,
      sharpnessMaxed: sh ? bool(sh.maxed) : false,
      skill: skill ?? null,
      setBonusId: bonusId,
      special: r.category === 'Kulve' ? 'kulve' : r.category === 'Safi' ? 'safi' : null,
    }
    if (!GUNNERS.has(type) && !sh) warnings.push(`weapon ${r.name_en}: no sharpness`)
    if (r.phial) {
      w.phial = r.phial
      if (r.phial_power) w.phialPower = int(r.phial_power)
    }
    if (r.shelling) {
      w.shelling = r.shelling
      w.shellingLevel = int(r.shelling_level)
    }
    if (r.kinsect_bonus) w.kinsectBonus = r.kinsect_bonus
    if (r.notes) w.notes = r.notes
    const bow = bowExt.get(r.name_en!)
    if (bow) w.coatings = COATINGS.filter((c) => bool(bow[c]))
    if (r.ammo_config) {
      const a = ammo.get(r.ammo_config)
      if (a) {
        w.elementalAmmo = ELEMENTAL_AMMO.some((k) => int(a[`${k}_clip`]) > 0)
        w.deviation = a.deviation
        if (a.special) w.specialAmmo = a.special
      } else warnings.push(`weapon ${r.name_en}: unknown ammo config "${r.ammo_config}"`)
    }
    return w
  })

  return { data: { weapons, armor, armorSets, setBonuses, charms, decorations, skills }, warnings }
}
