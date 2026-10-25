import { join } from 'node:path'
import { readCsv, type Row } from './csv.ts'
import type {
  AmmoConfig,
  AmmoSlot,
  Armor,
  ArmorSet,
  ArmorType,
  Charm,
  Decoration,
  Elderseal,
  ElementOrStatus,
  GameData,
  Hitzone,
  Item,
  Material,
  Monster,
  MonsterData,
  MonsterPart,
  MonsterReward,
  Rank,
  Recipe,
  Stars,
  SetBonus,
  SharpnessBar,
  Skill,
  SkillRef,
  Weapon,
  WeaponElement,
  WeaponType,
  ReloadSpeed,
} from '../../src/data/types.ts'
import { AMMO_KEYS, MONSTER_STAR_KEYS } from '../../src/data/types.ts'

export function slug(name: string): string {
  return name
    .toLowerCase()
    // α/β/γ distinguish armor sets; keep them or ids collide
    .replace(/α/g, ' alpha ')
    .replace(/β/g, ' beta ')
    .replace(/γ/g, ' gamma ')
    .replace(/\+/g, ' plus ')
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

/** hitzone suffixes that name a sub-part, not a state (Zorah exhaust organs, Shara head casing) */
const PART_SUFFIXES = new Set(['Top', 'Bottom', 'Crater', 'Head', 'Central', 'Rear'])
/** base-game "wounded" rows are the part's broken state (Vaal chest, Nergigante horn, ...) */
const TAG_ALIAS: Record<string, string | null> = { Wounded: 'Broken', 'After Wounded': 'Broken', 'Before Wounded': null }
const AILMENT_KEYS = [
  'roar', 'wind', 'tremor', 'defense_down', 'fireblight', 'waterblight', 'thunderblight', 'iceblight',
  'dragonblight', 'blastblight', 'regional', 'poison', 'sleep', 'paralysis', 'bleed', 'stun', 'mud', 'effluvia',
]

/** `Head (Broken+SCritical)` -> part Head, tags [Broken, SCritical] */
export function parseHitzoneName(name: string): { part: string; tags: string[] } {
  const m = /^(.*) \(([^)]*)\)$/.exec(name)
  if (!m || PART_SUFFIXES.has(m[2]!)) return { part: name, tags: [] }
  const tags = m[2]!
    .split('+')
    .map((t) => (t in TAG_ALIAS ? TAG_ALIAS[t]! : t))
    .filter((t): t is string => t !== null)
  return { part: m[1]!, tags }
}

function rankFromRarity(rarity: number): Rank {
  if (rarity <= 4) return 'LR'
  if (rarity <= 8) return 'HR'
  return 'MR'
}

export interface NormalizeResult {
  data: GameData & MonsterData & { crafting: Recipe[] }
  warnings: string[]
}

/** source reward condition names -> in-game wording */
const CONDITION_ALIAS: Record<string, string> = {
  // bronze investigation reward box, not a quest reward
  'Hunt (Bronze)': 'Investigation (Bronze)',
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
  const skillDesc = new Map(csv('skills/skill_base_translations.csv').map((r) => [r.name_en!, r.description_en ?? '']))
  const skills: Skill[] = csv('skills/skill_base.csv').map((r) => {
    const descriptions = descByName.get(r.name_en!) ?? []
    const secret = int(r.secret)
    return {
      id: slug(r.name_en!),
      name: r.name_en!,
      maxLevel: descriptions.length - secret,
      unlockedMaxLevel: descriptions.length,
      unlocks: r.unlocks ? slug(r.unlocks) : null,
      description: skillDesc.get(r.name_en!) ?? '',
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
        w.ammoConfig = r.ammo_config
      } else warnings.push(`weapon ${r.name_en}: unknown ammo config "${r.ammo_config}"`)
    }
    return w
  })

  // only configs some weapon uses
  const usedConfigs = new Set(weapons.flatMap((w) => (w.ammoConfig ? [w.ammoConfig] : [])))
  const ammoConfigs: AmmoConfig[] = [...ammo.values()]
    .filter((a) => usedConfigs.has(a.key!))
    .map((a) => ({
      id: a.key!,
      slots: AMMO_KEYS.flatMap((k): AmmoSlot[] => {
        const clip = int(a[`${k}_clip`])
        if (clip <= 0) return []
        const s: AmmoSlot = { ammo: k, clip }
        if (bool(a[`${k}_rapid`])) s.rapid = true
        const recoil = a[`${k}_recoil`]
        if (recoil === '-1') s.autoReload = true
        else if (recoil) s.recoil = int(recoil)
        if (a[`${k}_reload`]) s.reload = a[`${k}_reload`] as ReloadSpeed
        return [s]
      }),
    }))

  // --- items (only those monster rewards and recipes use)
  const itemRows = new Map(csv('items/item_base.csv').map((r) => [r.name_en!, r]))
  const items = new Map<number, Item>()
  const itemId = (name: string, context: string): number | null => {
    const r = itemRows.get(name)
    if (!r) {
      warnings.push(`${context}: unknown item "${name}" dropped`)
      return null
    }
    const id = int(r.id)
    if (!items.has(id))
      items.set(id, {
        id,
        name,
        category: r.category!,
        rarity: int(r.rarity),
        iconName: r.icon_name || null,
        iconColor: r.icon_color || null,
      })
    return id
  }

  // --- monsters (large only); every file but monster_base joins on the English name
  const byMonster = <T>(rows: Row[], key: string, map: (r: Row) => T | null) => {
    const out = new Map<string, T[]>()
    for (const r of rows) {
      const v = map(r)
      if (v === null) continue
      const list = out.get(r[key]!) ?? []
      list.push(v)
      out.set(r[key]!, list)
    }
    return out
  }
  const monsterDesc = new Map(csv('monsters/monster_base_translations.csv').map((r) => [r.name_en!, r.description_en ?? '']))
  const hitzones = byMonster(csv('monsters/monster_hitzones.csv'), 'base_name_en', (r): Hitzone => ({
    ...parseHitzoneName(r.hitzone_en!),
    cut: int(r.cut),
    impact: int(r.impact),
    shot: int(r.shot),
    fire: int(r.fire),
    water: int(r.water),
    thunder: int(r.thunder),
    ice: int(r.ice),
    dragon: int(r.dragon),
    ko: int(r.ko),
  }))
  const parts = byMonster(csv('monsters/monster_breaks.csv'), 'base_name_en', (r): MonsterPart => ({
    name: r.part_en!,
    flinch: int(r.flinch),
    break: int(r.wound),
    sever: int(r.sever),
    extract: r.extract || null,
  }))
  const weaknessRows = byMonster(csv('monsters/monster_weaknesses.csv'), 'name_en', (r) => r)
  const ailments = new Map(csv('monsters/monster_ailments.csv').map((r) => [r.base_name_en!, r]))
  const rewardRows = byMonster(csv('monsters/monster_rewards.csv'), 'base_name_en', (r) => r)
  const stars = (r: Row) =>
    Object.fromEntries(MONSTER_STAR_KEYS.filter((k) => r[k] !== '').map((k) => [k, int(r[k])])) as Partial<Stars>

  const monsters: Monster[] = csv('monsters/monster_base.csv')
    .filter((r) => r.size === 'large')
    .map((r) => {
      const name = r.name_en!
      const ctx = `monster ${name}`
      const weak = weaknessRows.get(name) ?? []
      const normal = weak.find((w) => w.form === 'normal')
      if (!normal) warnings.push(`${ctx}: no weaknesses`)
      const ail = ailments.get(name)
      const rewards = (rewardRows.get(name) ?? []).flatMap((w): MonsterReward[] => {
        const id = itemId(w.item_en!, ctx)
        if (id === null) return []
        const rank = w.rank as Rank
        return [{ rank, condition: CONDITION_ALIAS[w.condition_en!] ?? w.condition_en!, itemId: id, stack: int(w.stack), percentage: w.percentage ? int(w.percentage) : null }]
      })
      if (!hitzones.has(name)) warnings.push(`${ctx}: no hitzones`)
      return {
        id: int(r.id),
        slug: slug(name),
        name,
        ecology: r.ecology_en ?? '',
        description: monsterDesc.get(name) ?? '',
        traps: { pitfall: bool(r.pitfall_trap), shock: bool(r.shock_trap), vine: bool(r.vine_trap) },
        weaknesses: { ...Object.fromEntries(MONSTER_STAR_KEYS.map((k) => [k, 0])), ...(normal ? stars(normal) : {}) } as Stars,
        altWeaknesses: weak
          .filter((w) => w.form === 'alt')
          .map((w) => ({ description: w.alt_description ?? '', stars: stars(w) })),
        ailments: ail
          ? AILMENT_KEYS.filter((k) => ail[k]).map((k) => ({ id: k, strength: ail[k] === 'TRUE' ? null : ail[k]! }))
          : [],
        hitzones: hitzones.get(name) ?? [],
        parts: parts.get(name) ?? [],
        rewards,
      }
    })

  // --- crafting recipes
  const materials = (r: Row, ctx: string): Material[] =>
    [1, 2, 3, 4].flatMap((n) => {
      const name = r[`item${n}_name`]
      if (!name) return []
      const id = itemId(name, ctx)
      return id === null ? [] : [{ itemId: id, qty: int(r[`item${n}_qty`]) }]
    })
  const recipes: Recipe[] = []
  const weaponCraft = new Map<string, { create: Material[] | null; upgrade: Material[] | null }>()
  for (const r of csv('weapons/weapon_craft.csv')) {
    const e = weaponCraft.get(r.base_name_en!) ?? { create: null, upgrade: null }
    e[r.type === 'Create' ? 'create' : 'upgrade'] = materials(r, `weapon craft ${r.base_name_en}`)
    weaponCraft.set(r.base_name_en!, e)
  }
  for (const w of weapons) {
    const c = weaponCraft.get(w.name)
    if (c) recipes.push({ kind: 'weapon', id: w.id, ...c })
  }
  const armorCraft = new Map(csv('armors/armor_craft_ext.csv').map((r) => [r.base_name_en!, r]))
  for (const a of armor) {
    const r = armorCraft.get(a.name)
    if (r) recipes.push({ kind: 'armor', id: a.id, create: materials(r, `armor craft ${a.name}`), upgrade: null })
  }
  // charms: sum Create + every Upgrade along the chain up to the stored max level
  const charmCraft = new Map(csv('charms/charm_craft.csv').map((r) => [r.base_name_en!, r]))
  const charmPrev = new Map(charmRows.map((r) => [r.name_en!, r.previous_en || null]))
  for (const c of charms) {
    const total = new Map<number, number>()
    for (let name: string | null = c.name; name; name = charmPrev.get(name) ?? null) {
      const r = charmCraft.get(name)
      // 5 charms have no craft rows in the source (Adamantine, Razor Sharp, ...): shown as "no data"
      if (!r) continue
      for (const m of materials(r, `charm craft ${name}`)) total.set(m.itemId, (total.get(m.itemId) ?? 0) + m.qty)
    }
    if (total.size)
      recipes.push({ kind: 'charm', id: c.id, create: [...total].map(([itemId, qty]) => ({ itemId, qty })), upgrade: null })
  }

  return {
    data: {
      weapons,
      armor,
      armorSets,
      setBonuses,
      charms,
      decorations,
      skills,
      ammoConfigs,
      monsters,
      items: [...items.values()].sort((a, b) => a.id - b.id),
      crafting: recipes,
    },
    warnings,
  }
}
