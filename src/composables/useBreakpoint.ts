import { computed, ref } from 'vue'

/**
 * Layout breakpoints (min widths, px). CSS media queries in `App.vue` use the same numbers.
 *   < tablet  phone: left + right sidebars are drawers
 *   < lg      tablet: left is a drawer, right sidebar always visible
 *   < xl      lg: three columns, narrower sidebars
 */
export const BREAKPOINTS = { tablet: 768, lg: 1024, xl: 1400 } as const

const width = ref(typeof window === 'undefined' ? BREAKPOINTS.xl : window.innerWidth)
let installed = false

/** Reactive breakpoint flags; one shared `resize` listener. */
export function useBreakpoint() {
  if (!installed && typeof window !== 'undefined') {
    installed = true
    window.addEventListener('resize', () => (width.value = window.innerWidth), { passive: true })
  }
  return {
    width,
    /** slot / monster list is a drawer */
    leftDrawer: computed(() => width.value < BREAKPOINTS.lg),
    /** sidebar is a drawer */
    rightDrawer: computed(() => width.value < BREAKPOINTS.tablet),
  }
}
