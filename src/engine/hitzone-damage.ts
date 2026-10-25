/**
 * Damage per hit against a monster's hitzones.
 *
 * hit = raw + element, where
 *   raw     = true raw x raw sharpness x affinity factor x MV/100 x raw HZV/100
 *   element = true element x element sharpness x element affinity factor x elemental HZV/100
 *
 * Affinity includes Weakness Exploit per row (weak spot = raw HZV >= 45 after tenderizing, plus its
 * extra wound bonus on wounded weak spots). Not modelled: rounding, quest/multiplayer defense rate, status,
 * phials/shelling/ammo, per-move element modifiers. Raw and element stay separate so a later DPS
 * mode only needs combo totals: raw/MV x total MV + element x hits, over the combo's seconds.
 */
import type { Build } from './build'
import type { DataIndex } from '../data'
import type { AmmoKey, AmmoSlot, Element, Hitzone, Monster } from '../data/types'
import { ammoDamage, isDamaging, isSustainable, type AmmoDamage } from './ammo'
import { ELEMENT_SHARPNESS, RAW_SHARPNESS, damageType, tenderize } from './constants'
import { elementAffinityFactor, hitAffinity, rawAffinityFactor } from './efr'
import { evaluateBuild, type BuildStats } from './evaluate'
import { skillLevels } from './skills'
import { bestOf } from './build-compare'
import { trueElement, type WeaponStats } from './weapon-stats'

/** Per-part tag; every other hitzone tag is a monster-wide mode. */
export const BROKEN = 'Broken'

const modeTags = (h: Hitzone) => h.tags.filter((t) => t !== BROKEN)

/** Monster-wide modes (Mud, Charged, White, ...) in source order. */
export function monsterModes(m: Monster): string[] {
  return [...new Set(m.hitzones.flatMap(modeTags))]
}

/** Mode to show first: base (null) unless the monster has no base rows (Alatreon). */
export function defaultMode(m: Monster): string | null {
  return m.hitzones.some((h) => modeTags(h).length === 0) ? null : (monsterModes(m)[0] ?? null)
}

export interface ResolvedPart {
  part: string
  /** null: the part only has a broken row and isn't broken */
  hitzone: Hitzone | null
  /** a broken variant exists in this mode */
  breakable: boolean
}

/**
 * Parts visible in `mode`, each with the most specific row whose tags fit: mode variant over base,
 * broken variant when the part is in `broken`. Parts that only exist in another mode are left out.
 */
export function monsterParts(m: Monster, mode: string | null, broken: ReadonlySet<string> = new Set()): ResolvedPart[] {
  const byPart = new Map<string, Hitzone[]>()
  for (const h of m.hitzones) {
    const modes = modeTags(h)
    if (modes.length > 1 || (modes.length === 1 && modes[0] !== mode)) continue
    byPart.set(h.part, [...(byPart.get(h.part) ?? []), h])
  }
  return [...byPart].map(([part, rows]) => {
    const allowed = new Set([mode, broken.has(part) ? BROKEN : null])
    const fits = rows.filter((h) => h.tags.every((t) => allowed.has(t)))
    const hitzone = fits.reduce<Hitzone | null>((best, h) => (!best || h.tags.length > best.tags.length ? h : best), null)
    return { part, hitzone, breakable: rows.some((h) => h.tags.includes(BROKEN)) }
  })
}

export interface HitOptions {
  /** motion value; 100 = a hit worth exactly the weapon's raw */
  mv: number
  /** Iceborne clutch-claw wound */
  wounded: boolean
  /** colour index to use instead of the top one (clamped to the top); ignored for gunners */
  sharpnessIndex?: number | null
}

export interface HitDamage {
  raw: number
  element: number
  total: number
  /** raw HZV used (tenderized when wounded) */
  rawHzv: number
  /** HZV >= 45: Weakness Exploit's weak-spot bonus applies */
  weakSpot: boolean
  /** affinity used, incl. Weakness Exploit, capped */
  affinity: number
}

/**
 * One hit on one hitzone. `stats` must be evaluated without Weakness Exploit's condition
 * (`evaluateForMonster`); its affinity is added here per hitzone from `wexLevel`.
 * Two elements (dual blades) alternate per hit, so their damage is averaged.
 */
export function hitDamage(stats: WeaponStats, hitzone: Hitzone, wexLevel: number, opts: HitOptions): HitDamage {
  const baseHzv = hitzone[damageType(stats.weapon.type)]
  const rawHzv = opts.wounded ? tenderize(baseHzv) : baseHzv
  const { affinity, weakSpot } = hitAffinity(stats.affinity, rawHzv, wexLevel, opts.wounded)

  const gunner = stats.sharpnessIndex < 0
  const sharp = gunner ? -1 : Math.min(opts.sharpnessIndex ?? stats.sharpnessIndex, stats.sharpnessIndex)
  const rawSharp = gunner ? 1 : RAW_SHARPNESS[sharp]!
  const elemSharp = gunner ? 1 : ELEMENT_SHARPNESS[sharp]!

  const raw = stats.trueRaw * rawSharp * rawAffinityFactor(affinity, stats.critMultiplier) * (opts.mv / 100) * (rawHzv / 100)

  const elements = stats.elements.filter((e) => e.active && !e.isStatus)
  const elemFactor = elementAffinityFactor(affinity, stats.critElementMultiplier)
  const element = elements.length
    ? elements.reduce((sum, e) => sum + trueElement(e.value) * elemSharp * elemFactor * (hitzone[e.type as Element] / 100), 0) /
      elements.length
    : 0

  return { raw, element, total: raw + element, rawHzv, weakSpot, affinity }
}

const WEX = 'weakness-exploit'

/**
 * Evaluates a build for the damage table with the conditional skills in `conditions` (skill ids) on.
 * Weakness Exploit is left to `hitDamage` (per hitzone); switch it via `DamageSettings.weaknessExploit`.
 */
export function evaluateForMonster(build: Build, db: DataIndex, conditions: ReadonlySet<string>): BuildStats {
  return evaluateBuild(build, db, { conditions: new Set([...conditions].filter((c) => c !== WEX)) })
}

export interface DamageSettings {
  mode: string | null
  broken: ReadonlySet<string>
  wounded: ReadonlySet<string>
  mv: number
  sharpnessIndex?: number | null
  /** apply Weakness Exploit per hitzone (default true) */
  weaknessExploit?: boolean
  /** per build: bowgun ammo to fire (`mv` / sharpness ignored); null / missing = weapon raw x MV */
  ammo?: (AmmoSlot | null)[]
}

export interface DamageRow extends ResolvedPart {
  wounded: boolean
  broken: boolean
  /** per build; null without weapon or when the part has no hitzone right now */
  hits: (HitDamage | AmmoDamage | null)[]
  /** indices of the builds with the highest total */
  best: number[]
}

/** One row per visible part, one hit per build (stats from `evaluateForMonster`). */
export function damageTable(m: Monster, builds: (BuildStats | null)[], s: DamageSettings): DamageRow[] {
  const wex = builds.map((b) => (b && s.weaknessExploit !== false ? (skillLevels(b.skills).get(WEX) ?? 0) : 0))
  return monsterParts(m, s.mode, s.broken).map((p) => {
    const wounded = s.wounded.has(p.part)
    const hits = builds.map((b, i) => {
      if (!b?.weapon || !p.hitzone) return null
      const ammo = s.ammo?.[i]
      return ammo
        ? ammoDamage(b.weapon, ammo, p.hitzone, wex[i]!, wounded)
        : hitDamage(b.weapon, p.hitzone, wex[i]!, { mv: s.mv, wounded, sharpnessIndex: s.sharpnessIndex })
    })
    return { ...p, wounded, broken: s.broken.has(p.part), hits, best: bestOf(hits.map((h) => h?.total ?? null)) }
  })
}

/** Weighted average total per build over parts with a hitzone; weight defaults to 1, null if all weights are 0. */
export function weightedAverage(rows: DamageRow[], weights: Readonly<Record<string, number>>, builds: number): (number | null)[] {
  return Array.from({ length: builds }, (_, i) => {
    let sum = 0
    let total = 0
    for (const r of rows) {
      const hit = r.hits[i]
      const w = weights[r.part] ?? 1
      if (!hit || w <= 0) continue
      sum += hit.total * w
      total += w
    }
    return total > 0 ? sum / total : null
  })
}

export interface AmmoChoice {
  slot: AmmoSlot
  /** weighted average damage per shot over the monster's parts */
  average: number | null
  sustainable: boolean
}

/**
 * Every damaging ammo of a bowgun build with its weighted average on `m`: sustainable ammo (normal, pierce, spread,
 * elemental) first, best first; the first entry is the default pick. `slots` from `weaponAmmo`.
 */
export function ammoChoices(
  m: Monster,
  build: BuildStats,
  slots: AmmoSlot[],
  s: DamageSettings,
  weights: Readonly<Record<string, number>>,
): AmmoChoice[] {
  return slots
    .filter((x) => isDamaging(x.ammo))
    .map((slot) => ({
      slot,
      average: weightedAverage(damageTable(m, [build], { ...s, ammo: [slot] }), weights, 1)[0] ?? null,
      sustainable: isSustainable(slot.ammo),
    }))
    .sort((a, b) => Number(b.sustainable) - Number(a.sustainable) || (b.average ?? -1) - (a.average ?? -1))
}

/** The picked ammo if the build's bowgun has it, else the best (first) choice; null for other weapons. */
export function resolveAmmo(choices: AmmoChoice[], pick: AmmoKey | null | undefined): AmmoSlot | null {
  return (pick && choices.find((c) => c.slot.ammo === pick)?.slot) || (choices[0]?.slot ?? null)
}
