import type { ArmorType, DataIndex } from '../data'

export const EQUIP_SLOTS = ['weapon', 'head', 'chest', 'arms', 'waist', 'legs', 'charm'] as const
export type EquipSlot = (typeof EQUIP_SLOTS)[number]
/** equipment slots that can hold decorations */
export const DECO_SLOTS = ['weapon', 'head', 'chest', 'arms', 'waist', 'legs'] as const
export type DecoSlot = (typeof DECO_SLOTS)[number]

/** A build is just ids; everything else is derived. */
export interface Build {
  weapon: number | null
  head: number | null
  chest: number | null
  arms: number | null
  waist: number | null
  legs: number | null
  charm: number | null
  /** per equipment item, decoration id per slot index (null = empty) */
  decorations: Record<DecoSlot, (number | null)[]>
}

export function emptyBuild(): Build {
  return {
    weapon: null,
    head: null,
    chest: null,
    arms: null,
    waist: null,
    legs: null,
    charm: null,
    decorations: { weapon: [], head: [], chest: [], arms: [], waist: [], legs: [] },
  }
}

export function cloneBuild(b: Build): Build {
  return {
    ...b,
    decorations: Object.fromEntries(DECO_SLOTS.map((s) => [s, [...b.decorations[s]]])) as Build['decorations'],
  }
}

export function isArmorSlot(slot: EquipSlot): slot is ArmorType {
  return slot !== 'weapon' && slot !== 'charm'
}

/** Slot sizes of whatever is equipped in `slot`. */
export function slotSizes(build: Build, slot: DecoSlot, db: DataIndex): number[] {
  const id = build[slot]
  if (id === null) return []
  return (slot === 'weapon' ? db.weapon.get(id)?.slots : db.armor.get(id)?.slots) ?? []
}

/** Returns a new build with `id` equipped in `slot`; decorations of that slot are cleared like in-game. */
export function equip(build: Build, slot: EquipSlot, id: number | null, db: DataIndex): Build {
  const next = cloneBuild(build)
  next[slot] = id
  if (slot !== 'charm') next.decorations[slot] = slotSizes(next, slot, db).map(() => null)
  return next
}

export function canSlot(decoSize: number, slotSize: number): boolean {
  return decoSize <= slotSize
}

/** Returns a new build with the decoration placed, or the same build if it does not fit. */
export function setDecoration(
  build: Build,
  slot: DecoSlot,
  index: number,
  decoId: number | null,
  db: DataIndex,
): Build {
  const sizes = slotSizes(build, slot, db)
  if (index < 0 || index >= sizes.length) return build
  if (decoId !== null) {
    const deco = db.decoration.get(decoId)
    if (!deco || !canSlot(deco.size, sizes[index]!)) return build
  }
  const next = cloneBuild(build)
  const decos = sizes.map((_, i) => next.decorations[slot][i] ?? null)
  decos[index] = decoId
  next.decorations[slot] = decos
  return next
}
