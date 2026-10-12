import type { DataIndex } from '../data'
import { DECO_SLOTS, EQUIP_SLOTS, emptyBuild, equip, setDecoration, type Build, type DecoSlot, type EquipSlot } from './build'

export type PresetGroup = 'iceborne' | 'base' | 'progression'

/**
 * Hand-written preset build. Items by name (names are unique per data file), so the list stays
 * readable and survives id changes; `resolvePreset` turns it into a `Build`.
 */
export interface PresetDef {
  /** slug, unique; the preset's id is `preset:<slug>` */
  slug: string
  /** short descriptive name, e.g. "IB LS late game" */
  name: string
  group: PresetGroup
  /** key skills / armor, shown under the name */
  note: string
  items: Partial<Record<EquipSlot, string>>
  /** decoration names per slot index, null = empty */
  decorations?: Partial<Record<DecoSlot, (string | null)[]>>
}

export const PRESET_PREFIX = 'preset:'

export interface ResolvedPreset {
  build: Build
  /** names not found, wrong slot type or decorations that don't fit (empty when the preset is valid) */
  problems: string[]
}

/** Builds a preset by name lookup; anything that doesn't resolve is skipped and listed in `problems`. */
export function resolvePreset(def: PresetDef, db: DataIndex): ResolvedPreset {
  const problems: string[] = []
  const byName = <T extends { name: string }>(list: T[], name: string) => list.find((x) => x.name === name)
  let build = emptyBuild()

  for (const slot of EQUIP_SLOTS) {
    const name = def.items[slot]
    if (!name) continue
    const item =
      slot === 'weapon'
        ? byName(db.data.weapons, name)
        : slot === 'charm'
          ? byName(db.data.charms, name)
          : db.data.armor.find((a) => a.name === name && a.type === slot)
    if (!item) problems.push(`${slot}: "${name}" not found`)
    else build = equip(build, slot, item.id, db)
  }

  for (const slot of DECO_SLOTS) {
    def.decorations?.[slot]?.forEach((name, i) => {
      if (name === null) return
      const deco = byName(db.data.decorations, name)
      if (!deco) return problems.push(`${slot} deco ${i + 1}: "${name}" not found`)
      const next = setDecoration(build, slot, i, deco.id, db)
      if (next === build) problems.push(`${slot} deco ${i + 1}: "${name}" does not fit`)
      build = next
    })
  }
  return { build, problems }
}
