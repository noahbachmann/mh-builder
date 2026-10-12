import { db } from '../../data'
import { decodeBuild, evaluateBuild, type PresetGroup } from '../../engine'
import { fmt } from '../../format'
import { PRESET_BUILDS, type NamedBuild } from '../../stores/saved'

/** weapon + EFR so listed builds are easy to tell apart */
export function summarize(b: NamedBuild): string {
  const build = decodeBuild(b.code, db)
  const w = build?.weapon != null ? db.weapon.get(build.weapon) : undefined
  const efr = build && w ? evaluateBuild(build, db).efr?.efr : undefined
  return w ? `${efr !== undefined ? `EFR ${fmt(efr, 1)} · ` : ''}${w.name}` : 'No weapon'
}

// presets never change: evaluated once, shared by every list
export const presetSummaries = new Map(PRESET_BUILDS.map((b) => [b.id, summarize(b)]))

export const GROUP_LABEL: Record<PresetGroup, string> = {
  iceborne: 'Iceborne late game',
  base: 'Base game late game',
  progression: 'Early & mid game',
}
