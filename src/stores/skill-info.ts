import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { Directive } from 'vue'

export interface SkillInfoTarget {
  skillId: string
  /** level to highlight (0 = none) */
  level: number
}

/** Skill under the mouse (or tapped); `SkillInfobox` renders it next to `anchor`. */
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

function onEnter(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  const el = e.currentTarget as El
  if (el._skillInfo) useSkillInfoStore().show(el._skillInfo, el)
}
function onLeave(e: PointerEvent) {
  if (e.pointerType === 'mouse') useSkillInfoStore().hide(e.currentTarget as El)
}
/** touch has no hover: tap toggles; `SkillInfobox` closes it on a tap elsewhere */
function onTap(e: PointerEvent) {
  if (e.pointerType === 'mouse') return
  const el = e.currentTarget as El
  const info = useSkillInfoStore()
  if (info.current?.anchor === el) info.hide()
  else if (el._skillInfo) info.show(el._skillInfo, el)
}

/** `v-skill-info="{ skillId, level }"`: hovering (tapping on touch) shows the skill infobox, cursor becomes `help`. */
export const vSkillInfo: Directive<El, SkillInfoTarget> = {
  mounted(el, { value }) {
    el._skillInfo = value
    el.classList.add('has-skill-info')
    el.dataset.skillInfo = value.skillId
    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('pointerup', onTap)
  },
  updated(el, { value }) {
    el._skillInfo = value
    el.dataset.skillInfo = value.skillId
    const cur = useSkillInfoStore().current
    if (cur?.anchor === el && (cur.skillId !== value.skillId || cur.level !== value.level)) useSkillInfoStore().show(value, el)
  },
  unmounted(el) {
    el.removeEventListener('pointerenter', onEnter)
    el.removeEventListener('pointerleave', onLeave)
    el.removeEventListener('pointerup', onTap)
    useSkillInfoStore().hide(el)
  },
}
