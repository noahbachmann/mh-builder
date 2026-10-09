import type { Weapon } from '../data/types'

export interface TreeNode {
  id: number
  parentId: number | null
  /** depth in upgrade path */
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

export interface TreeLayout {
  nodes: TreeNode[]
  edges: TreeEdge[]
  bands: TreeBand[]
  cols: number
  rows: number
  byId: Map<number, TreeNode>
}

/**
 * Lays out upgrade trees: one horizontal band per root, column = depth,
 * rows in depth-first order (first child stays on the parent's row, later siblings stack below).
 * Input order is kept for roots and siblings.
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

  const nodes: TreeNode[] = []
  const edges: TreeEdge[] = []
  const bands: TreeBand[] = []
  let row = 0
  let cols = 0

  roots.forEach((root, band) => {
    const rowStart = row
    let nextRow = row + 1
    const visit = (w: Weapon, col: number, r: number) => {
      nodes.push({ id: w.id, parentId: col === 0 ? null : w.previousId, col, row: r, band })
      cols = Math.max(cols, col + 1)
      ;(children.get(w.id) ?? []).forEach((kid, i) => {
        edges.push({ from: w.id, to: kid.id })
        // first child continues the parent's row; later siblings start below everything placed so far
        visit(kid, col + 1, i === 0 ? r : nextRow++)
      })
    }
    visit(root, 0, row)
    row = nextRow
    bands.push({ rootId: root.id, label: root.name, rowStart, rowCount: row - rowStart })
  })

  return { nodes, edges, bands, cols, rows: row, byId: new Map(nodes.map((n) => [n.id, n])) }
}

/**
 * SVG path for an edge: horizontal out of the parent, vertical down at the gap, horizontal into the child.
 * `cellW`/`cellH` are the grid pitch, `nodeW` the node box width.
 */
export function edgePath(from: TreeNode, to: TreeNode, cellW: number, cellH: number, nodeW: number): string {
  const x1 = from.col * cellW + nodeW
  const y1 = from.row * cellH + cellH / 2
  const x2 = to.col * cellW
  const y2 = to.row * cellH + cellH / 2
  const mx = (x1 + x2) / 2
  return y1 === y2 ? `M${x1} ${y1}H${x2}` : `M${x1} ${y1}H${mx}V${y2}H${x2}`
}
