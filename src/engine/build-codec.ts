import type { DataIndex } from '../data'
import { DECO_SLOTS, EQUIP_SLOTS, emptyBuild, equip, setDecoration, type Build } from './build'

/**
 * Build <-> URL-safe string.
 * Format v1: `1.` + 7 items (weapon, head, chest, arms, waist, legs, charm) joined by `_`.
 * Item = base36 id, then `-deco` per slot (`x` = empty). Empty item = ''.
 * Example: `1.2bx-a-x_1d____` (weapon 2bx with deco a in slot 1).
 */
export const CODEC_VERSION = '1'

const enc = (n: number) => n.toString(36)
const dec = (s: string): number | null => {
  if (!/^[0-9a-z]+$/.test(s)) return null
  const n = Number.parseInt(s, 36)
  return Number.isSafeInteger(n) ? n : null
}

export function encodeBuild(build: Build): string {
  const items = EQUIP_SLOTS.map((slot) => {
    const id = build[slot]
    if (id === null) return ''
    if (slot === 'charm') return enc(id)
    const decos = build.decorations[slot]
    // trim trailing empties
    let last = decos.length - 1
    while (last >= 0 && decos[last] === null) last--
    return [enc(id), ...decos.slice(0, last + 1).map((d) => (d === null ? 'x' : enc(d)))].join('-')
  })
  // trim trailing empty items
  while (items.length && items[items.length - 1] === '') items.pop()
  return `${CODEC_VERSION}.${items.join('_')}`
}

/**
 * Decodes a build string. Unknown ids, wrong slot types and decorations that do not fit are
 * dropped, so a damaged link still loads what it can. Returns null for unknown versions.
 */
export function decodeBuild(code: string, db: DataIndex): Build | null {
  const dot = code.indexOf('.')
  if (dot < 0 || code.slice(0, dot) !== CODEC_VERSION) return null
  const items = code.slice(dot + 1).split('_')
  let build = emptyBuild()
  EQUIP_SLOTS.forEach((slot, i) => {
    const item = items[i]
    if (!item) return
    const [idPart, ...decoParts] = item.split('-')
    const id = dec(idPart ?? '')
    if (id === null) return
    const valid =
      slot === 'weapon' ? db.weapon.has(id) : slot === 'charm' ? db.charm.has(id) : db.armor.get(id)?.type === slot
    if (!valid) return
    build = equip(build, slot, id, db)
    if (slot === 'charm' || !(DECO_SLOTS as readonly string[]).includes(slot)) return
    decoParts.forEach((d, idx) => {
      const decoId = d === 'x' ? null : dec(d)
      if (decoId !== null) build = setDecoration(build, slot as (typeof DECO_SLOTS)[number], idx, decoId, db)
    })
  })
  return build
}
