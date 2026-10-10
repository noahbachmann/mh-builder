import type { Weapon } from '../data/types'

export interface TreeNode {
  id: number
  parentId: number | null
  /** rarity column group start + position among same-rarity ancestors */
  col: number
  /** global row across all bands */
  row: number
  band: number
}

export interface TreeBand {
  rootId: number
  /** label shown on the band; the root weapon's name (source has no tree names) */
  label: string
  rowStart: number
  rowCount: number
}

export interface TreeEdge {
  from: number
  to: number
}

/** columns of one rarity; `width` > 1 when a path has several weapons of that rarity in a row */
export interface RarityColumns {
  rarity: number
  col: number
  width: number
}

export interface TreeLayout {
  nodes: TreeNode[]
  rarityCols: RarityColumns[]
  edges: TreeEdge[]
  bands: TreeBand[]
  cols: number
  rows: number
  byId: Map<number, TreeNode>
}

/**
 * Lays out upgrade trees: one horizontal band per root, rows in depth-first order (first child stays
 * on the parent's row, later siblings stack below). Input order is kept for roots and siblings.
 *
 * Columns are grouped by rarity, like the in-game smithy: every rarity gets as many columns as the
 * longest same-rarity run along any path (Buster Sword I -> II are both R1: 2 columns), so a column
 * never mixes rarities. Assumes rarity never drops along an upgrade path (checked by data tests).
 */
export function layoutTrees(weapons: Weapon[]): TreeLayout {
  const ids = new Set(weapons.map((w) => w.id))
  const children = new Map<number, Weapon[]>()
  const roots: Weapon[] = []
  for (const w of weapons) {
    if (w.previousId !== null && ids.has(w.previousId)) {
      const list = children.get(w.previousId) ?? []
      list.push(w)
      children.set(w.previousId, list)
    } else roots.push(w)
  }

  // 0-based position among consecutive same-rarity ancestors
  const runIndex = new Map<number, number>()
  const widths = new Map<number, number>()
  const walk = (w: Weapon, idx: number) => {
    runIndex.set(w.id, idx)
    widths.set(w.rarity, Math.max(widths.get(w.rarity) ?? 0, idx + 1))
    for (const kid of children.get(w.id) ?? []) walk(kid, kid.rarity === w.rarity ? idx + 1 : 0)
  }
  roots.forEach((r) => walk(r, 0))

  const rarityCols: RarityColumns[] = []
  let cols = 0
  for (const rarity of [...widths.keys()].sort((a, b) => a - b)) {
    rarityCols.push({ rarity, col: cols, width: widths.get(rarity)! })
    cols += widths.get(rarity)!
  }
  const startOf = new Map(rarityCols.map((c) => [c.rarity, c.col]))

  const nodes: TreeNode[] = []
  const edges: TreeEdge[] = []
  const bands: TreeBand[] = []
  let row = 0

  roots.forEach((root, band) => {
    const rowStart = row
    let nextRow = row + 1
    const visit = (w: Weapon, r: number, isRoot: boolean) => {
      const col = startOf.get(w.rarity)! + runIndex.get(w.id)!
      nodes.push({ id: w.id, parentId: isRoot ? null : w.previousId, col, row: r, band })
      ;(children.get(w.id) ?? []).forEach((kid, i) => {
        edges.push({ from: w.id, to: kid.id })
        // first child continues the parent's row; later siblings start below everything placed so far
        visit(kid, i === 0 ? r : nextRow++, false)
      })
    }
    visit(root, row, true)
    row = nextRow
    bands.push({ rootId: root.id, label: root.name, rowStart, rowCount: row - rowStart })
  })

  return { nodes, rarityCols, edges, bands, cols, rows: row, byId: new Map(nodes.map((n) => [n.id, n])) }
}

/**
 * SVG path for an edge: horizontal out of the parent, vertical down in the gap right before the child
 * (edges can skip columns, a drop in the middle would cross other nodes), horizontal into the child.
 * `cellW`/`cellH` are the grid pitch, `nodeW` the node box width.
 */
export function edgePath(from: TreeNode, to: TreeNode, cellW: number, cellH: number, nodeW: number): string {
  const x1 = from.col * cellW + nodeW
  const y1 = from.row * cellH + cellH / 2
  const x2 = to.col * cellW
  const y2 = to.row * cellH + cellH / 2
  const mx = x2 - (cellW - nodeW) / 2
  return y1 === y2 ? `M${x1} ${y1}H${x2}` : `M${x1} ${y1}H${mx}V${y2}H${x2}`
}
