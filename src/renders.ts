/**
 * Item and monster renders (weapon / armor / monster pictures) from `pnpm renders:import` (Fextralife wiki).
 * Files live in `public/renders/` and load as plain URLs on demand (~1800 files, not bundled);
 * `src/data/renders.json` maps item ids to file names. Items without a render return null.
 */
import renders from './data/renders.json'

type Kind = 'weapon' | 'armor' | 'monster'
const map: Record<Kind, Record<string, string>> = renders

export function renderUrl(kind: Kind, id: number): string | null {
  const file = map[kind][id]
  return file ? `${import.meta.env.BASE_URL}renders/${file}.webp` : null
}
