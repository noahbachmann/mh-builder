<script setup lang="ts">
import { computed } from 'vue'
import { db } from '../../data'
import type { WeaponType } from '../../data/types'
import {
  CONDITIONAL_SKILLS,
  CONDITION_CONFLICTS,
  SHARPNESS_COLORS,
  UNMODELLED_DAMAGE_SKILLS,
  skillLevels,
  type DamageRow,
  type HitDamage,
} from '../../engine'
import { WEAPON_TYPE_LABEL, capitalize, fmt } from '../../format'
import { vFocusCell } from '../../input/focus-grid'
import { useCompareStore } from '../../stores/compare'
import { MAX_WEIGHT, useMonsterStore } from '../../stores/monster'
import { useSavedStore } from '../../stores/saved'
import { vSkillInfo } from '../../stores/skill-info'
import ModeChips from './ModeChips.vue'

const store = useMonsterStore()
const compare = useCompareStore()
const saved = useSavedStore()

// focus grid rows: settings first, part rows, then skill condition rows
const ROW = { mode: 0, builds: 1, sharpness: 3, mv: 4, table: 10, skills: 200 } as const

/** every conditional skill in the shown builds, with its level per build (0 = build lacks it) */
const skills = computed(() => {
  const levels = store.builds.map((b) => skillLevels(b.stats.skills))
  return CONDITIONAL_SKILLS.filter((c) => levels.some((l) => l.has(c.skillId))).map((c) => ({
    ...c,
    name: db.skill.get(c.skillId)?.name ?? c.skillId,
    levels: levels.map((l) => l.get(c.skillId) ?? 0),
    note:
      c.skillId === 'weakness-exploit'
        ? 'per part: hitzone ≥ 45 (+ extra on wounded)'
        : CONDITION_CONFLICTS[c.skillId]
          ? `${c.label} (excludes ${CONDITION_CONFLICTS[c.skillId]!.map((id) => db.skill.get(id)?.name ?? id).join(', ')})`
          : c.label,
  }))
})

/** damage skills of the shown builds the calculation leaves out */
const unmodelled = computed(() => {
  const levels = store.builds.map((b) => skillLevels(b.stats.skills))
  return Object.entries(UNMODELLED_DAMAGE_SKILLS)
    .filter(([id]) => levels.some((l) => l.has(id)))
    .map(([id, note]) => ({ id, note, name: db.skill.get(id)?.name ?? id, levels: levels.map((l) => l.get(id) ?? 0) }))
})

/** what the per-hit number leaves out for each weapon type in the shown builds */
const WEAPON_NOTES: Partial<Record<WeaponType, string>> = {
  'great-sword': 'charge level multipliers not included',
  'long-sword': 'Spirit Gauge boosts not included',
  'dual-blades': 'Demon Mode modifiers not included; single hits have low motion values',
  'hunting-horn': 'song buffs not included',
  lance: 'uses the sever hitzone (some sources say Lance uses the better of sever / blunt, unverified)',
  gunlance: 'shelling and Wyvern\'s Fire not included',
  'switch-axe': 'phial boosts in sword mode not included',
  'charge-blade': 'phial explosions and shield charge not included',
  'insect-glaive': 'extract buffs and kinsect damage not included',
  'light-bowgun': "weapon raw only: ammo motion values, ammo element and critical distance not included",
  'heavy-bowgun': "weapon raw only: ammo motion values, ammo element and critical distance not included",
  bow: 'arrow motion values, charge levels, coatings and critical distance not included',
}
const weaponNotes = computed(() => {
  const types = [...new Set(store.builds.flatMap((b) => (b.stats.weapon ? [b.stats.weapon.weapon.type] : [])))]
  return types.flatMap((t) => (WEAPON_NOTES[t] ? [{ type: t, label: WEAPON_TYPE_LABEL[t], note: WEAPON_NOTES[t]! }] : []))
})

const rows = computed(() => store.rows)
const bestPart = computed(() =>
  store.builds.map((_, i) => {
    let best: DamageRow | null = null
    for (const r of rows.value) if (r.hits[i] && (!best || r.hits[i]!.total > best.hits[i]!.total)) best = r
    return best ? { part: best.part, total: best.hits[i]!.total } : null
  }),
)

function hint(h: HitDamage) {
  return `Raw ${fmt(h.raw, 1)} + element ${fmt(h.element, 1)} · raw hitzone ${h.rawHzv}${h.weakSpot ? ' (weak spot)' : ''} · affinity ${fmt(h.affinity)}%`
}

function onMv(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(v) && v > 0) store.mv = Math.min(v, 1000)
}
</script>

<template>
  <div class="damage" data-testid="damage-output">
    <div class="settings">
      <ModeChips region="damage" :row="ROW.mode" />

      <div class="line" role="group" aria-label="Builds">
        <span class="label dim">Builds</span>
        <button
          v-focus-cell="{ region: 'damage', row: ROW.builds, col: 0 }"
          class="chip"
          :class="{ 'is-active': store.includeCurrent }"
          :aria-pressed="store.includeCurrent"
          title="The equipped build"
          data-testid="damage-current"
          @click="store.includeCurrent = !store.includeCurrent"
        >
          Current
        </button>
        <button
          v-for="(b, i) in saved.builds"
          :key="b.id"
          v-focus-cell="{ region: 'damage', row: ROW.builds, col: i + 1 }"
          class="chip"
          :class="{ 'is-active': compare.isSelected(b.id) }"
          :aria-pressed="compare.isSelected(b.id)"
          :disabled="!compare.isSelected(b.id) && compare.isFull"
          data-testid="damage-build"
          @click="compare.toggle(b.id)"
        >
          {{ b.name }}
        </button>
        <span v-if="!saved.builds.length" class="faint hint">Save builds on the Equipment page to compare them here.</span>
      </div>


      <div class="line" role="group" aria-label="Sharpness">
        <span class="label dim">Sharpness</span>
        <button
          v-focus-cell="{ region: 'damage', row: ROW.sharpness, col: 0 }"
          class="chip"
          :class="{ 'is-active': store.sharpness === null }"
          :aria-pressed="store.sharpness === null"
          @click="store.sharpness = null"
        >
          Top
        </button>
        <button
          v-for="(c, i) in SHARPNESS_COLORS"
          :key="c"
          v-focus-cell="{ region: 'damage', row: ROW.sharpness, col: i + 1 }"
          class="chip swatch"
          :class="{ 'is-active': store.sharpness === i }"
          :aria-pressed="store.sharpness === i"
          :aria-label="capitalize(c)"
          :title="`${capitalize(c)} (capped at each weapon's top colour)`"
          :data-testid="`sharpness-${c}`"
          @click="store.sharpness = i"
        >
          <span class="dot" :style="{ background: `var(--sh-${c})` }" />
        </button>
      </div>

      <label class="line">
        <span class="label dim">Motion value</span>
        <input
          v-focus-cell="{ region: 'damage', row: ROW.mv, col: 0 }"
          class="search mv"
          type="number"
          min="1"
          max="1000"
          :value="store.mv"
          data-testid="damage-mv"
          @change="onMv"
        />
        <span class="faint hint">100 = one hit worth the weapon's raw</span>
      </label>
    </div>

    <p v-if="!store.builds.length" class="note dim" data-testid="damage-empty">Pick at least one build.</p>
    <table v-else class="tbl" data-testid="damage-table">
      <thead>
        <tr>
          <th>Part</th>
          <th class="c" title="Wounded (clutch claw tenderize)">Wnd</th>
          <th class="c" title="Part broken">Brk</th>
          <th class="c" title="Weight in the average">Weight</th>
          <th v-for="b in store.builds" :key="b.id" class="num build" :title="b.name" data-testid="damage-column">
            {{ b.id === 'current' ? 'Current' : b.name }}
          </th>
        </tr>
        <tr class="summary">
          <th colspan="4">Weighted average</th>
          <td v-for="(v, i) in store.averages" :key="i" class="num" data-testid="damage-average">{{ v === null ? '—' : fmt(v, 1) }}</td>
        </tr>
        <tr class="summary">
          <th colspan="4">Best part</th>
          <td v-for="(b, i) in bestPart" :key="i" class="num part-name">{{ b?.part ?? '—' }}</td>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, ri) in rows" :key="r.part" :class="{ gone: !r.hitzone }" data-testid="damage-row">
          <th>{{ r.part }}</th>
          <td class="c">
            <button
              v-focus-cell="{ region: 'damage', row: ROW.table + ri, col: 0 }"
              class="tick"
              :class="{ on: r.wounded }"
              :aria-pressed="r.wounded"
              :aria-label="`${r.part} wounded`"
              data-testid="toggle-wounded"
              @click="store.toggleWounded(r.part)"
            >
              ✓
            </button>
          </td>
          <td class="c">
            <button
              v-if="r.breakable"
              v-focus-cell="{ region: 'damage', row: ROW.table + ri, col: 1 }"
              class="tick"
              :class="{ on: r.broken }"
              :aria-pressed="r.broken"
              :aria-label="`${r.part} broken`"
              data-testid="toggle-broken"
              @click="store.toggleBroken(r.part)"
            >
              ✓
            </button>
          </td>
          <td class="c weight">
            <button
              v-focus-cell="{ region: 'damage', row: ROW.table + ri, col: 2 }"
              class="step"
              :disabled="store.weight(r.part) <= 0"
              :aria-label="`${r.part} weight down`"
              data-testid="weight-down"
              @click="store.setWeight(r.part, store.weight(r.part) - 1)"
            >
              −
            </button>
            <span class="num w" :class="{ faint: !store.weight(r.part) }" data-testid="weight">{{ store.weight(r.part) }}</span>
            <button
              v-focus-cell="{ region: 'damage', row: ROW.table + ri, col: 3 }"
              class="step"
              :disabled="store.weight(r.part) >= MAX_WEIGHT"
              :aria-label="`${r.part} weight up`"
              data-testid="weight-up"
              @click="store.setWeight(r.part, store.weight(r.part) + 1)"
            >
              +
            </button>
          </td>
          <td
            v-for="(h, i) in r.hits"
            :key="i"
            class="num"
            :class="{ best: r.best.includes(i), weak: h?.weakSpot }"
            :title="h ? hint(h) : r.hitzone ? 'No weapon' : 'Part only exists when broken'"
            data-testid="damage-cell"
          >
            {{ h ? fmt(h.total, 1) : '—' }}
          </td>
        </tr>
      </tbody>
      <tbody data-testid="damage-skills">
        <tr class="section">
          <th :colspan="4 + store.builds.length">Skill conditions</th>
        </tr>
        <tr v-if="!skills.length">
          <td :colspan="4 + store.builds.length" class="faint">No conditional skills in these builds.</td>
        </tr>
        <tr v-for="(c, i) in skills" :key="c.skillId" data-testid="damage-skill">
          <th>
            <span v-skill-info="{ skillId: c.skillId, level: c.levels.find((l) => l > 0) ?? 0 }">{{ c.name }}</span>
          </th>
          <td class="c">
            <button
              v-focus-cell="{ region: 'damage', row: ROW.skills + i, col: 0 }"
              class="tick"
              :class="{ on: store.conditions.has(c.skillId) }"
              :aria-pressed="store.conditions.has(c.skillId)"
              :aria-label="`${c.name} active`"
              data-testid="toggle-skill"
              @click="store.toggleCondition(c.skillId)"
            >
              ✓
            </button>
          </td>
          <td colspan="2" class="cond dim">{{ c.note }}</td>
          <td v-for="(lv, j) in c.levels" :key="j" class="num" :class="{ faint: !lv }">{{ lv ? `Lv ${lv}` : '—' }}</td>
        </tr>
      </tbody>
      <tbody v-if="unmodelled.length" data-testid="damage-unmodelled">
        <tr class="section">
          <th :colspan="4 + store.builds.length">Not included in the calculation</th>
        </tr>
        <tr v-for="u in unmodelled" :key="u.id" class="unmodelled" data-testid="damage-unmodelled-skill">
          <th>
            <span v-skill-info="{ skillId: u.id, level: u.levels.find((l) => l > 0) ?? 0 }">{{ u.name }}</span>
          </th>
          <td />
          <td colspan="2" class="cond dim">{{ u.note }}</td>
          <td v-for="(lv, j) in u.levels" :key="j" class="num faint">{{ lv ? `Lv ${lv}` : '—' }}</td>
        </tr>
      </tbody>
    </table>

    <ul v-if="weaponNotes.length" class="weapon-notes" data-testid="damage-weapon-notes">
      <li v-for="w in weaponNotes" :key="w.type"><span class="dim">{{ w.label }}:</span> {{ w.note }}</li>
    </ul>

    <p class="note faint">
      Damage per hit at the chosen motion value: raw × sharpness × affinity × MV × hitzone, plus element. Weakness Exploit applies per part
      (raw hitzone ≥ 45 after wounding, plus its extra bonus when such a part is wounded). Wounding sets the raw hitzone to 0.75 × hitzone + 25. Not included: monster
      defense rate, rounding, statuses, weapon-specific mechanics. Elemental hitzones stay the same when wounded. Not DPS: no attack
      timings in the data.
    </p>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.settings :deep(.label),
.label {
  font-size: 12px;
  min-width: 78px;
}
.line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.hint {
  font-size: 11px;
  margin-left: 4px;
}
.swatch {
  padding: 2px 6px;
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  vertical-align: middle;
}
.mv {
  width: 72px;
  padding: 2px 6px;
}
.tbl {
  border-collapse: collapse;
  font-size: 12px;
  margin: 4px 8px 0;
  width: calc(100% - 16px);
}
.tbl th,
.tbl td {
  padding: 2px 4px;
  border-bottom: 1px solid rgba(59, 53, 38, 0.35);
  text-align: left;
}
.tbl thead th {
  color: var(--gold-dim);
  font-size: 11px;
  font-weight: 600;
}
.tbl tbody th {
  font-weight: 400;
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.build {
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.summary th {
  color: var(--text-dim) !important;
  font-weight: 400 !important;
}
.summary td {
  color: var(--text);
  font-weight: 600;
}
.part-name {
  font-weight: 400 !important;
  font-size: 11px;
  color: var(--text-dim) !important;
}
.c {
  text-align: center !important;
}
.num {
  text-align: right !important;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
/* mark always rendered (transparent when off): an empty button changes the row height */
.tick {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  width: 18px;
  height: 18px;
  border: 1px solid var(--border-strong);
  border-radius: 3px;
  font-size: 12px;
  line-height: 1;
  color: transparent;
}
.tick.on {
  background: var(--gold);
  color: #1b1710;
}
.weight {
  white-space: nowrap;
}
.step {
  width: 16px;
  text-align: center;
  color: var(--text-dim);
}
.step:hover:not(:disabled),
.step:focus-visible {
  color: var(--gold);
}
.step:disabled {
  opacity: 0.3;
  cursor: default;
}
.w {
  display: inline-block;
  min-width: 16px;
  text-align: center;
}
.weak {
  text-decoration: underline dotted var(--gold-dim);
  text-underline-offset: 3px;
}
.best {
  color: var(--gold);
  font-weight: 600;
}
tr.gone th,
tr.gone td {
  color: var(--text-faint);
}
.section th {
  padding-top: 12px;
  color: var(--gold-dim) !important;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.cond {
  font-size: 11px;
  white-space: nowrap;
}
.unmodelled th {
  color: var(--text-dim);
}
.weapon-notes {
  margin: 8px 12px 0;
  padding: 0 0 0 16px;
  font-size: 11px;
  color: var(--warn);
}
.note {
  font-size: 11px;
  padding: 8px 12px 12px;
  margin: 0;
}
</style>
