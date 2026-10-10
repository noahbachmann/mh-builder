import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { Directive } from 'vue'

export interface SkillInfoTarget {
  skillId: string
  /** level to highlight (0 = none) */
  level: number
}

/** Skill under the mouse; `SkillInfobox` renders it next to `anchor`. */
export const useSkillInfoStore = defineStore('skillInfo', () => {
  const current = shallowRef<(SkillInfoTarget & { anchor: HTMLElement }) | null>(null)

  function show(target: SkillInfoTarget, anchor: HTMLElement) {
    current.value = { ...target, anchor }
  }

  /** with `anchor`: only if that element owns the box (leave events can arrive after the next enter) */
  function hide(anchor?: HTMLElement) {
    if (!anchor || current.value?.anchor === anchor) current.value = null
  }

  return { current, show, hide }
})

type El = HTMLElement & { _skillInfo?: SkillInfoTarget }

function onEnter(e: Event) {
  const el = e.currentTarget as El
  if (el._skillInfo) useSkillInfoStore().show(el._skillInfo, el)
}
function onLeave(e: Event) {
  useSkillInfoStore().hide(e.currentTarget as El)
}

/** `v-skill-info="{ skillId, level }"`: hovering shows the skill infobox, cursor becomes `help`. */
export const vSkillInfo: Directive<El, SkillInfoTarget> = {
  mounted(el, { value }) {
    el._skillInfo = value
    el.classList.add('has-skill-info')
    el.dataset.skillInfo = value.skillId
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
  },
  updated(el, { value }) {
    el._skillInfo = value
    el.dataset.skillInfo = value.skillId
    const cur = useSkillInfoStore().current
    if (cur?.anchor === el && (cur.skillId !== value.skillId || cur.level !== value.level)) useSkillInfoStore().show(value, el)
  },
  unmounted(el) {
    el.removeEventListener('mouseenter', onEnter)
    el.removeEventListener('mouseleave', onLeave)
    useSkillInfoStore().hide(el)
  },
}
