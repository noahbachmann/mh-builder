<script setup lang="ts">
import { computed } from 'vue'
import type { SetBonusStatus, SkillTotal } from '../../engine'
import { db } from '../../data'
import { useBuildStore } from '../../stores/build'
import { usePreviewStore } from '../../stores/preview'

const build = useBuildStore()
const preview = usePreviewStore()

interface Row {
  id: string
  name: string
  from: number
  to: number
  cap: number
  over: number
  secret: boolean
}

const rows = computed<Row[]>(() => {
  const cur = new Map(build.stats.skills.skills.map((s) => [s.skill.id, s]))
  const next = preview.stats ? new Map(preview.stats.skills.skills.map((s) => [s.skill.id, s])) : cur
  const ids = new Set([...cur.keys(), ...next.keys()])
  return [...ids]
    .map((id) => {
      const a = cur.get(id)
      const b = next.get(id)
      const ref = (b ?? a) as SkillTotal
      return {
        id,
        name: ref.skill.name,
        from: a?.level ?? 0,
        to: b?.level ?? 0,
        cap: Math.max(a?.cap ?? 0, b?.cap ?? 0),
        over: Math.max(0, (b ?? a)!.points - ref.cap),
        secret: ref.secretActive,
      }
    })
    .sort((x, y) => y.to - x.to || y.from - x.from || x.name.localeCompare(y.name))
})

const pips = (r: Row) =>
  Array.from({ length: r.cap }, (_, i) =>
    i < Math.min(r.from, r.to) ? 'on' : i < r.to ? 'gain' : i < r.from ? 'lose' : 'off',
  )

const bonuses = computed(() => {
  const cur = new Map(build.stats.skills.setBonuses.map((b) => [b.bonus.id, b]))
  const next = preview.stats ? new Map(preview.stats.skills.setBonuses.map((b) => [b.bonus.id, b])) : cur
  return [...new Set([...cur.keys(), ...next.keys()])].map((id) => {
    const a = cur.get(id)
    const b = next.get(id)
    const ref = (b ?? a) as SetBonusStatus
    return {
      id,
      name: ref.bonus.name,
      from: a?.pieces ?? 0,
      to: b?.pieces ?? 0,
      ranks: ref.bonus.ranks.map((r) => ({
        name: db.skill.get(r.skillId)?.name ?? r.skillId,
        required: r.required,
        from: (a?.pieces ?? 0) >= r.required,
        to: (b?.pieces ?? 0) >= r.required,
      })),
    }
  })
})
</script>

<template>
  <div class="overall-skills" data-testid="overall-skills">
    <div class="section-title">Skills</div>
    <p v-if="!rows.length" class="faint empty">No skills yet.</p>
    <ul class="skills">
      <li
        v-for="r in rows"
        :key="r.id"
        class="skill"
        :class="{ gained: r.to > r.from, lost: r.to < r.from, removed: r.to === 0 }"
        :data-testid="`skill-${r.id}`"
        :data-level="r.to"
      >
        <span class="nm">
          {{ r.name }}
          <span v-if="r.secret" class="secret" title="Max level raised by a secret skill">★</span>
        </span>
        <span class="pips" :aria-label="`Level ${r.to} of ${r.cap}`">
          <span v-for="(p, i) in pips(r)" :key="i" class="pip" :class="p" />
        </span>
        <span class="lv num">
          <template v-if="r.to !== r.from"><span class="faint">{{ r.from }}→</span></template>{{ r.to }}/{{ r.cap }}
        </span>
        <span v-if="r.over" class="over num" title="Points above the cap">+{{ r.over }}</span>
      </li>
    </ul>

    <template v-if="bonuses.length">
      <div class="section-title">Set bonuses</div>
      <ul class="bonuses">
        <li v-for="b in bonuses" :key="b.id" class="bonus" :data-testid="`bonus-${b.id}`">
          <div class="bonus-head">
            <span>{{ b.name }}</span>
            <span class="num dim"><template v-if="b.to !== b.from">{{ b.from }}→</template>{{ b.to }} pcs</span>
          </div>
          <div v-for="r in b.ranks" :key="r.name" class="rank" :class="{ active: r.to, gained: r.to && !r.from, lost: r.from && !r.to }">
            <span class="num req">{{ r.required }}</span> {{ r.name }}
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.empty {
  padding: 8px 12px;
  margin: 0;
}
.skills,
.bonuses {
  list-style: none;
  margin: 0;
  padding: 2px 0;
}
.skill {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 48px 22px;
  gap: 8px;
  align-items: center;
  padding: 4px 12px;
  font-size: 13px;
  border-bottom: 1px solid rgba(59, 53, 38, 0.3);
}
.nm {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.skill.gained .nm {
  color: var(--up);
}
.skill.lost .nm {
  color: var(--down);
}
.skill.removed .nm {
  text-decoration: line-through;
}
.secret {
  color: var(--gold);
  font-size: 11px;
}
.pips {
  display: flex;
  gap: 2px;
}
.pip {
  width: 9px;
  height: 9px;
  transform: rotate(45deg) scale(0.8);
  border: 1px solid #4a4433;
  background: #14120d;
}
.pip.on {
  background: var(--gold);
  border-color: var(--gold);
}
.pip.gain {
  background: var(--up);
  border-color: var(--up);
}
.pip.lose {
  background: transparent;
  border-color: var(--down);
}
.lv {
  text-align: right;
  font-size: 12px;
}
.over {
  color: var(--warn);
  font-size: 11px;
}
.bonus {
  padding: 6px 12px;
  border-bottom: 1px solid rgba(59, 53, 38, 0.3);
  font-size: 13px;
}
.bonus-head {
  display: flex;
  justify-content: space-between;
  color: var(--gold);
}
.rank {
  color: var(--text-faint);
  padding-left: 4px;
}
.rank.active {
  color: var(--text);
}
.rank.gained {
  color: var(--up);
}
.rank.lost {
  color: var(--down);
  text-decoration: line-through;
}
.req {
  display: inline-block;
  width: 18px;
  color: var(--gold-dim);
}
</style>
