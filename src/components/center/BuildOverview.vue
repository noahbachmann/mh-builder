<script setup lang="ts">
import { computed } from 'vue'
import { db } from '../../data'
import { EQUIP_SLOTS, SHARPNESS_COLORS, UNMODELLED_DAMAGE_SKILLS, skillEffect } from '../../engine'
import { SLOT_LABEL, capitalize, elementLabel, fmt } from '../../format'
import { vFocusCell } from '../../input/focus-grid'
import { useBuildStore } from '../../stores/build'
import { useUiStore } from '../../stores/ui'
import { vSkillInfo } from '../../stores/skill-info'

const build = useBuildStore()
const ui = useUiStore()
const stats = computed(() => build.stats)

const equipment = computed(() =>
  EQUIP_SLOTS.map((slot) => {
    const id = build.build[slot]
    const item =
      id === null ? null : slot === 'weapon' ? db.weapon.get(id) : slot === 'charm' ? db.charm.get(id) : db.armor.get(id)
    const decos =
      slot === 'charm'
        ? []
        : build.build.decorations[slot].map((d) => (d === null ? null : (db.decoration.get(d)?.name ?? null)))
    return { slot, item, decos }
  }),
)

const conditional = computed(() =>
  stats.value.skills.skills
    .map((s) => ({ s, e: skillEffect(s.skill.id, s.level) }))
    .filter((x) => x.e?.conditional)
    .map((x) => ({ name: x.s.skill.name, level: x.s.level, when: x.e!.conditional! })),
)

const unmodelled = computed(() =>
  stats.value.skills.skills
    .filter((s) => s.skill.id in UNMODELLED_DAMAGE_SKILLS)
    .map((s) => ({ name: s.skill.name, level: s.level, why: UNMODELLED_DAMAGE_SKILLS[s.skill.id]! })),
)

const sharpName = computed(() => {
  const i = stats.value.weapon?.sharpnessIndex ?? -1
  return i < 0 ? 'None (gunner)' : capitalize(SHARPNESS_COLORS[i]!)
})
</script>

<template>
  <section class="panel overview" aria-label="Build overview">
    <header class="panel-head">Build Overview</header>
    <div class="panel-body body">
      <div v-if="!build.build.weapon && !equipment.some((e) => e.item)" class="intro">
        <p>Pick a slot on the left to start. Hover or move the cursor over an item to compare it, and click or press Enter to equip it.</p>
        <p class="dim">
          Shortcuts: <span class="kbd">1</span>–<span class="kbd">7</span> open slots, <span class="kbd">8</span> decorations,
          <span class="kbd">Q</span>/<span class="kbd">E</span> sidebar tabs, <span class="kbd">?</span> all shortcuts.
        </p>
      </div>

      <div class="section-title">Equipment</div>
      <table class="equip">
        <tbody>
          <tr v-for="(e, i) in equipment" :key="e.slot">
            <th>
              <button v-focus-cell="{ region: 'center', row: i, col: 0 }" class="link" @click="ui.openSlot(e.slot)">{{ SLOT_LABEL[e.slot] }}</button>
            </th>
            <td :class="e.item ? `r${e.item.rarity}` : 'faint'">{{ e.item?.name ?? '—' }}</td>
            <td>
              <div class="decos">
                <span v-for="(d, j) in e.decos" :key="j" :class="d ? '' : 'faint'">{{ d ?? 'empty' }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <template v-if="stats.weapon && stats.efr">
        <div class="section-title">Damage breakdown</div>
        <div class="breakdown">
          <div class="calc">
            <h4>EFR <span class="num">{{ fmt(stats.efr.efr, 1) }}</span></h4>
            <dl class="stat-list">
              <dt>True raw</dt>
              <dd>{{ fmt(stats.efr.trueRaw, 1) }} <span class="faint">({{ fmt(stats.weapon.attack) }} / {{ stats.weapon.bloat }})</span></dd>
              <dt>Sharpness</dt>
              <dd>{{ sharpName }} × {{ stats.efr.sharpnessMultiplier }}</dd>
              <dt>Affinity</dt>
              <dd>{{ fmt(stats.efr.affinity) }}%</dd>
              <dt>Crit multiplier</dt>
              <dd>× {{ stats.efr.critMultiplier }}</dd>
              <dt>Affinity factor</dt>
              <dd>× {{ fmt(stats.efr.affinityFactor, 3) }}</dd>
              <template v-if="stats.weapon.nonElementalBoost">
                <dt>Non-elemental Boost</dt>
                <dd>active</dd>
              </template>
            </dl>
          </div>
          <div v-for="e in stats.efe" :key="e.type" class="calc">
            <h4>EFE <span :class="`el-${e.type}`">{{ elementLabel(e.type) }}</span> <span class="num">{{ fmt(e.efe, 2) }}</span></h4>
            <dl class="stat-list">
              <dt>True element</dt>
              <dd>{{ fmt(e.trueElement, 1) }}</dd>
              <dt>Sharpness</dt>
              <dd>× {{ e.sharpnessMultiplier }}</dd>
              <dt>Elemental crit</dt>
              <dd>× {{ e.critElementMultiplier }}</dd>
              <dt>Affinity factor</dt>
              <dd>× {{ fmt(e.affinityFactor, 3) }}</dd>
            </dl>
          </div>
        </div>
        <p class="note faint">
          EFR = true raw × sharpness × (1 + affinity × (crit − 1)). EFE uses the elemental crit multiplier only with Critical Element.
          The element cap is not applied yet (no verified Iceborne rule).
        </p>
        <div v-if="conditional.length" class="note">
          <span class="dim">Not included (situational):</span>
          <span v-for="c in conditional" :key="c.name" class="cond">{{ c.name }} {{ c.level }} <span class="faint">— {{ c.when }}</span></span>
        </div>
        <div v-if="unmodelled.length" class="note" data-testid="overview-unmodelled">
          <span class="dim">Not calculated:</span>
          <span v-for="u in unmodelled" :key="u.name" class="cond">{{ u.name }} {{ u.level }} <span class="faint">— {{ u.why }}</span></span>
        </div>
      </template>

      <template v-if="stats.skills.skills.length">
        <div class="section-title">Active skills</div>
        <dl class="skills">
          <template v-for="s in stats.skills.skills" :key="s.skill.id">
            <dt>
              <span v-skill-info="{ skillId: s.skill.id, level: s.level }">{{ s.skill.name }}</span> <span class="num gold">Lv {{ s.level }}</span>
              <span v-if="s.points > s.cap" class="warn num" title="Points above the cap are wasted">(+{{ s.points - s.cap }} over cap)</span>
            </dt>
            <dd class="dim">{{ s.skill.descriptions[s.level - 1] }}</dd>
          </template>
        </dl>
      </template>
    </div>
  </section>
</template>

<style scoped>
.overview {
  height: 100%;
}
.body {
  padding-bottom: 16px;
}
.intro {
  padding: 12px 16px 0;
}
.intro p {
  margin: 0 0 8px;
}
.equip {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.equip th {
  width: 80px;
  text-align: left;
  font-weight: 400;
  padding: 4px 12px;
}
.equip td {
  padding: 4px 8px;
  border-bottom: 1px solid rgba(59, 53, 38, 0.35);
}
.link {
  color: var(--text-dim);
}
.link:hover,
.link:focus-visible {
  color: var(--gold);
}
.decos {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  font-size: 12px;
}
.breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px 0;
}
.calc {
  flex: 1 1 240px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.calc h4 {
  margin: 0;
  padding: 6px 12px;
  font-size: 14px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--border);
}
.calc h4 .num {
  margin-left: auto;
  color: var(--gold);
}
.note {
  font-size: 12px;
  padding: 6px 12px 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}
.skills {
  margin: 0;
  padding: 4px 12px;
}
.skills dt {
  padding-top: 8px;
}
.skills dd {
  margin: 2px 0 0;
  font-size: 13px;
}
.gold {
  color: var(--gold);
}
.warn {
  color: var(--warn);
  font-size: 12px;
}
</style>
