import { usePreviewStore, type Candidate } from '../stores/preview'

/** touch / pen interaction in progress, and whether its target was already the pinned preview */
let tap: { armed: boolean } | null = null

/**
 * `v-on` handlers for a candidate item: mouse hover and keyboard focus preview it, like the in-game
 * cursor; click / Enter calls `pick` (equip). Touch has no hover: the first tap pins the preview,
 * a second tap on the same item picks it.
 */
export function useCandidate() {
  const preview = usePreviewStore()
  return (c: Candidate, pick: () => void) => ({
    pointerenter: (e: PointerEvent) => e.pointerType === 'mouse' && preview.show(c),
    pointerleave: (e: PointerEvent) => e.pointerType === 'mouse' && preview.clear(c),
    pointerdown: (e: PointerEvent) => {
      // read before the tap's focus event shows it
      tap = e.pointerType === 'mouse' ? null : { armed: preview.isPinned(c) }
    },
    // touch turned into a scroll: no click follows
    pointercancel: () => (tap = null),
    focus: () => preview.show(c),
    blur: () => preview.clear(c),
    click: () => {
      const t = tap
      tap = null
      if (t && !t.armed) {
        preview.show(c, { pinned: true })
        return
      }
      pick()
      if (t) preview.clear()
    },
  })
}
