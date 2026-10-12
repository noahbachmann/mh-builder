import { ELEMENTS, type DataIndex, type Element, type ElementalResistances } from '../data'
import type { Build } from './build'

const ELEMENT_NAME: Record<Element, string> = { fire: 'Fire', water: 'Water', thunder: 'Thunder', ice: 'Ice', dragon: 'Dragon' }

/**
 * Elements with the highest resistance (ties included, max 2, in element order); empty if the best
 * is <= 0 (nothing worth naming).
 */
export function topResistances(res: ElementalResistances): Element[] {
  const best = Math.max(...ELEMENTS.map((e) => res[e]))
  if (best <= 0) return []
  return ELEMENTS.filter((e) => res[e] === best).slice(0, 2)
}

/** `<weapon> / <best res>`, e.g. "Safi's Shattersplitter / Fire & Ice res"; null when there's nothing to name. */
export function suggestBuildName(build: Build, resistances: ElementalResistances, db: DataIndex): string | null {
  const weapon = build.weapon === null ? undefined : db.weapon.get(build.weapon)
  const res = topResistances(resistances)
  const resPart = res.length ? `${res.map((e) => ELEMENT_NAME[e]).join(' & ')} res` : null
  const parts = [weapon?.name, resPart].filter((p): p is string => !!p)
  return parts.length ? parts.join(' / ') : null
}

/** appends " (2)", " (3)", ... while `name` is taken */
export function uniqueName(name: string, taken: Iterable<string>): string {
  const set = new Set(taken)
  if (!set.has(name)) return name
  let n = 2
  while (set.has(`${name} (${n})`)) n++
  return `${name} (${n})`
}
