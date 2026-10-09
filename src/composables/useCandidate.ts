import { usePreviewStore, type Candidate } from '../stores/preview'

/** `v-on` handlers that preview a candidate on hover and on keyboard focus, like the in-game cursor. */
export function useCandidate() {
  const preview = usePreviewStore()
  return (c: Candidate) => ({
    mouseenter: () => preview.show(c),
    mouseleave: () => preview.clear(c),
    focus: () => preview.show(c),
    blur: () => preview.clear(c),
  })
}
