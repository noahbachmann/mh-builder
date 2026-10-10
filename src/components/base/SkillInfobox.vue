<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { db } from '../../data'
import { skillUnlockers } from '../../engine'
import { useSkillInfoStore } from '../../stores/skill-info'

const info = useSkillInfoStore()
const box = ref<HTMLElement>()
const pos = ref({ left: 0, top: 0 })
// hidden until measured, else it flashes at the previous spot
const placed = ref(false)

const skill = computed(() => (info.current ? db.skill.get(info.current.skillId) : undefined))
const unlockers = computed(() => (skill.value ? skillUnlockers(skill.value.id, db) : []))
const levels = computed(() =>
  (skill.value?.descriptions ?? []).map((text, i) => ({ level: i + 1, text, secret: i + 1 > skill.value!.maxLevel })),
)

const GAP = 8
const MARGIN = 8

// beside the anchor, on the side with more room; clamped to the viewport
watch(
  () => info.current,
  async (cur) => {
    placed.value = false
    if (!cur) return
    await nextTick()
    if (!box.value) return
    const a = cur.anchor.getBoundingClientRect()
    const w = box.value.offsetWidth
    const h = box.value.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    const roomRight = vw - a.right
    let left = roomRight >= w + GAP || roomRight >= a.left ? a.right + GAP : a.left - GAP - w
    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN))
    const top = Math.max(MARGIN, Math.min(a.top, vh - h - MARGIN))
    pos.value = { left, top }
    placed.value = true
  },
)

// anchor moves away on scroll: close instead of following it
const onScroll = () => info.hide()
// touch: a tap anywhere but the anchor closes it (the anchor's own tap toggles)
const onPointerDown = (e: PointerEvent) => {
  if (e.pointerType !== 'mouse' && info.current && !info.current.anchor.contains(e.target as Node)) info.hide()
}
onMounted(() => {
  window.addEventListener('scroll', onScroll, { capture: true, passive: true })
  window.addEventListener('pointerdown', onPointerDown, { capture: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll, { capture: true })
  window.removeEventListener('pointerdown', onPointerDown, { capture: true })
})
</script>

<template>
  <div
    v-if="skill && info.current"
    ref="box"
    class="skill-infobox"
    role="tooltip"
    data-testid="skill-infobox"
    :style="{ left: `${pos.left}px`, top: `${pos.top}px`, visibility: placed ? 'visible' : 'hidden' }"
  >
    <div class="head">
      <span class="name">{{ skill.name }}</span>
      <span class="num dim">Max Lv {{ skill.maxLevel }}<template v-if="skill.unlockedMaxLevel > skill.maxLevel"> ({{ skill.unlockedMaxLevel }})</template></span>
    </div>
    <p class="desc">{{ skill.description }}</p>
    <ol class="levels">
      <li
        v-for="l in levels"
        :key="l.level"
        :class="{ current: l.level === info.current.level, secret: l.secret }"
        :data-testid="`skill-infobox-level-${l.level}`"
      >
        <span class="lv num">Lv {{ l.level }}</span>
        <span>{{ l.text }}</span>
      </li>
    </ol>
    <div v-for="u in unlockers" :key="u.secret.id" class="unlock">
      <span class="star">★</span> Lv {{ skill.maxLevel + 1 }}–{{ skill.unlockedMaxLevel }} with <b>{{ u.secret.name }}</b><template v-if="u.bonuses.length">: {{ u.bonuses.map((b) => `${b.bonus.name} (${b.required} pcs)`).join(', ') }}</template>
    </div>
  </div>
</template>

<style scoped>
.skill-infobox {
  position: fixed;
  z-index: 50;
  width: min(320px, calc(100vw - 16px));
  max-height: calc(100dvh - 16px);
  overflow: hidden;
  pointer-events: none;
  /* opaque: panel-2 lets sidebar text through */
  background: #18202b;
  border: 1px solid var(--border-strong);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.6);
  font-size: 12px;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  padding: 6px 10px;
  background: var(--panel-head);
  border-bottom: 1px solid var(--border);
}
.name {
  color: var(--gold);
  font-size: 14px;
  font-weight: 600;
}
.desc {
  margin: 0;
  padding: 6px 10px;
  color: var(--text);
}
.levels {
  list-style: none;
  margin: 0;
  padding: 0 0 4px;
}
.levels li {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 6px;
  padding: 3px 10px;
  color: var(--text-dim);
  border-top: 1px solid rgba(59, 53, 38, 0.3);
}
.lv {
  color: var(--gold-dim);
}
.levels li.secret .lv::after {
  content: ' ★';
  color: var(--gold);
}
.levels li.current {
  background: var(--selected);
  color: var(--text);
}
.levels li.current .lv {
  color: var(--gold);
}
.unlock {
  padding: 5px 10px 7px;
  border-top: 1px solid var(--border);
  color: var(--text-dim);
}
.unlock b {
  color: var(--text);
  font-weight: 600;
}
.star {
  color: var(--gold);
}
</style>
