/**
 * Item renders (weapon / armor pictures) from `pnpm renders:import` (Fextralife wiki).
 * Files live in `public/renders/` and load as plain URLs on demand (~1800 files, not bundled);
 * `src/data/renders.json` maps item ids to file names. Items without a render return null.
 */
import renders from './data/renders.json'

const map: Record<'weapon' | 'armor', Record<string, string>> = renders

export function renderUrl(kind: 'weapon' | 'armor', id: number): string | null {
  const file = map[kind][id]
  return file ? `${import.meta.env.BASE_URL}renders/${file}.webp` : null
}
