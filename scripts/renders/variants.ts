/** Item name -> wiki title variants, and the offline base-item fallback. */

export const GREEK: Record<string, string> = { 'α': 'Alpha', 'β': 'Beta', 'γ': 'Gamma' }
export const VARIANT_ROUNDS = 3

/**
 * Wiki titles to try for an item name. Round 0: exact. Round 1: spelling variants (α -> Alpha,
 * "+" spacing, no "(MR)" / quotes). Round 2: the base item (same model in-game): armor without its
 * α/β/γ suffix, weapons without level numerals, "+" or quoted Kulve/Safi suffix.
 */
export function titleVariants(name: string, round: number): string[] {
  if (round === 0) return [name]
  const plain = name.replace(/\s*\(MR\)$/, '')
  if (round === 1) {
    const greek = plain.replace(/ ([αβγ])(\+?)$/, (_, g: string, plus: string) => ` ${GREEK[g]}${plus ? ' +' : ''}`)
    const variants = [
      plain,
      greek,
      greek.replace(/ \+$/, '+'),
      plain.replace(/\+$/, ' +'),
      plain.replace(/\+$/, ' Plus'),
      plain.replace(/"/g, ''),
    ]
    return [...new Set(variants)].filter((v) => v !== name)
  }
  const base = plain
    .replace(/ [αβγ]\+?$/, '')
    .replace(/\s*"[^"]*"\+?$/, '')
    .replace(/\+$/, '')
    .replace(/ (I|II|III|IV|V)$/, ' I')
  return [...new Set([base, base.replace(/ I$/, '')])].filter((v) => v !== name)
}

/**
 * For items still without a render, reuse the render of an item named like one of their variants
 * (Leather Gloves α -> Leather Gloves): same model in-game. Mutates and returns `map` (id -> file).
 */
export function fillFromBase(items: { id: number; name: string }[], map: Record<string, string>): Record<string, string> {
  const byName = new Map(items.filter((x) => map[x.id]).map((x) => [x.name, map[x.id]!]))
  for (const x of items) {
    if (map[x.id]) continue
    const hit = [...titleVariants(x.name, 1), ...titleVariants(x.name, 2)].find((t) => byName.has(t))
    if (hit) map[x.id] = byName.get(hit)!
  }
  return map
}
