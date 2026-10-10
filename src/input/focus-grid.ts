/**
 * Focus grid: every selectable element registers (region, row, col). Arrow keys move to the
 * nearest cell in that direction within the same region. Each region uses a roving tabindex
 * (one cell tabbable), so Tab / Shift+Tab jumps between regions.
 */
import type { Directive } from 'vue'

export interface CellPos {
  region: string
  row: number
  col: number
}

export type Direction = 'up' | 'down' | 'left' | 'right'

const cells = new Map<HTMLElement, CellPos>()
const active = new Map<string, HTMLElement>()

function setActive(region: string, el: HTMLElement) {
  const prev = active.get(region)
  if (prev && prev !== el) prev.tabIndex = -1
  el.tabIndex = 0
  active.set(region, el)
}

function register(el: HTMLElement, pos: CellPos) {
  cells.set(el, pos)
  el.dataset.region = pos.region
  el.dataset.row = String(pos.row)
  el.dataset.col = String(pos.col)
  const cur = active.get(pos.region)
  if (!cur || !cur.isConnected) setActive(pos.region, el)
  else el.tabIndex = -1
}

function unregister(el: HTMLElement) {
  const pos = cells.get(el)
  cells.delete(el)
  if (pos && active.get(pos.region) === el) {
    active.delete(pos.region)
    const next = regionCells(pos.region)[0]
    if (next) setActive(pos.region, next[0])
  }
}

function onFocus(e: FocusEvent) {
  const el = e.currentTarget as HTMLElement
  const pos = cells.get(el)
  if (pos) setActive(pos.region, el)
}

export const vFocusCell: Directive<HTMLElement, CellPos> = {
  mounted(el, { value }) {
    register(el, value)
    el.addEventListener('focus', onFocus)
  },
  updated(el, { value, oldValue }) {
    if (oldValue && oldValue.region !== value.region) unregister(el)
    register(el, value)
  },
  unmounted(el) {
    el.removeEventListener('focus', onFocus)
    unregister(el)
  },
}

/** connected and not inside a closed drawer (`inert`) */
const usable = (el: HTMLElement) => el.isConnected && !el.closest('[inert]')

function regionCells(region: string): [HTMLElement, CellPos][] {
  return [...cells].filter(([el, p]) => p.region === region && usable(el))
}

/**
 * Best cell from `from` in `dir`: primary axis distance first, then cross-axis distance.
 * Left/right prefer any cell on the same row (weapon tree rows are upgrade paths with column gaps).
 */
export function findNeighbor(from: CellPos, dir: Direction, candidates: CellPos[]): CellPos | null {
  let best: CellPos | null = null
  let bestScore = Infinity
  for (const c of candidates) {
    const dr = c.row - from.row
    const dc = c.col - from.col
    let primary: number
    let cross: number
    if (dir === 'up') [primary, cross] = [-dr, Math.abs(dc)]
    else if (dir === 'down') [primary, cross] = [dr, Math.abs(dc)]
    else if (dir === 'left') [primary, cross] = [-dc, Math.abs(dr)]
    else [primary, cross] = [dc, Math.abs(dr)]
    if (primary <= 0) continue
    const sameRowBonus = (dir === 'left' || dir === 'right') && cross !== 0 ? 1e9 : 0
    const score = sameRowBonus + primary * 10_000 + cross
    if (score < bestScore) {
      bestScore = score
      best = c
    }
  }
  return best
}

export function moveFocus(dir: Direction): boolean {
  const el = document.activeElement as HTMLElement | null
  const from = el ? cells.get(el) : undefined
  if (!from) return false
  const list = regionCells(from.region)
  const target = findNeighbor(
    from,
    dir,
    list.map(([, p]) => p),
  )
  if (!target) return false
  const targetEl = list.find(([, p]) => p === target)![0]
  focusCell(targetEl)
  return true
}

export function focusCell(el: HTMLElement) {
  el.focus({ preventScroll: true })
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

/** Focus the remembered cell of a region (or its first cell). */
export function focusRegion(region: string): boolean {
  const el = active.get(region)
  const target = el && usable(el) ? el : regionCells(region)[0]?.[0]
  if (!target) return false
  focusCell(target)
  return true
}

export function currentRegion(): string | null {
  const el = document.activeElement as HTMLElement | null
  return (el && cells.get(el)?.region) ?? null
}
