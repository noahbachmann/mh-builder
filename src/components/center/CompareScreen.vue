<script setup lang="ts">
import { computed } from 'vue'
import { db } from '../../data'
import { EQUIP_SLOTS, SHARPNESS_COLORS, type Build, type EquipSlot, type MetricKey, type MetricRow } from '../../engine'
import { SLOT_LABEL, capitalize, elementLabel, fmt, signed } from '../../format'
import { vFocusCell } from '../../input/focus-grid'
import { useBuildStore } from '../../stores/build'
import { useCompareStore } from '../../stores/compare'
import { useUiStore } from '../../stores/ui'
import { vSkillInfo } from '../../stores/skill-info'
import type { ElementOrStatus } from '../../data/types'

const compare = useCompareStore()
const current = useBuildStore()
const ui = useUiStore()

const cols = computed(() => compare.columns)
const cmp = computed(() => compare.comparison)
const groups = [
  { id: 'damage', title: 'Damage output' },
  { id: 'offense', title: 'Weapon' },
  { id: 'defense', title: 'Defense' },
] as const

const itemName = (b: Build, slot: EquipSlot) => {
  const id = b[slot]
  if (id === null) return null
  const item = slot === 'weapon' ? db.weapon.get(id) : slot === 'charm' ? db.charm.get(id) : db.armor.get(id)
  return item ? { name: item.name, rarity: item.rarity } : null
}
const decoNames = (b: Build) =>
  EQUIP_SLOTS.flatMap((s) => (s === 'charm' ? [] : b.decorations[s]))
    .filter((d): d is number => d !== null)
    .map((d) => db.decoration.get(d)?.name ?? '?')

function label(key: MetricKey): { text: string; el?: ElementOrStatus; hint?: string } {
  if (key === 'efr') return { text: 'EFR' }
  if (key === 'efr-potential') return { text: 'EFR, all conditions', hint: 'Situational skills active (Agitator, Weakness Exploit on a weak spot, ...); full-health or low-health skills, whichever is higher; not Critical Draw (draw attacks only)' }
  if (key === 'true-raw') return { text: 'True raw' }
  if (key === 'attack') return { text: 'Attack' }
  if (key === 'affinity') return { text: 'Affinity' }
  if (key === 'crit-multiplier') return { text: 'Crit multiplier' }
  if (key === 'sharpness') return { text: 'Sharpness' }
  if (key === 'defense') return { text: 'Defense' }
  const [kind, el] = key.split('-') as [string, ElementOrStatus]
  if (kind === 'efe') return { text: 'EFE', el }
  if (kind === 'res') return { text: 'res.', el }
  return { text: '', el }
}

const DIGITS: Partial<Record<string, number>> = { efr: 1, 'efr-potential': 1, 'true-raw': 1, 'crit-multiplier': 2 }
const digits = (key: MetricKey) => DIGITS[key] ?? (key.startsWith('efe-') ? 2 : 0)

function value(row: MetricRow, i: number) {
  const v = row.values[i]
  if (v === null || v === undefined) return '—'
  if (row.key === 'sharpness') return capitalize(SHARPNESS_COLORS[v]!)
  if (row.key === 'affinity') return `${fmt(v)}%`
  if (row.key === 'crit-multiplier') return `× ${fmt(v, 2)}`
  return fmt(v, digits(row.key))
}
// delta vs current build, only when both sides have a value
function delta(row: MetricRow, i: number) {
  const d = row.deltas[i]!
  if (i === 0 || d.from === null || d.to === null || d.dir === 'same') return null
  const text = row.key === 'sharpness' ? (d.dir === 'up' ? '▲' : '▼') : `${signed(d.delta, digits(row.key))} ${d.dir === 'up' ? '▲' : '▼'}`
  return { text, dir: d.dir }
}

function load(b: Build) {
  current.load(b)
  ui.close()
}
</script>

<template>
  <section class="panel compare" aria-label="Compare builds" data-testid="compare-screen">
    <header class="panel-head">
      Compare builds
      <button v-focus-cell="{ region: 'center-tabs', row: 0, col: 0 }" class="btn close" @click="ui.close()">Close <span class="kbd">Esc</span></button>
    </header>
    <div class="panel-body body">
      <p v-if="cols.length < 2" class="empty dim" data-testid="compare-empty">
        Pick saved builds or presets to compare with the ⇄ button in the Builds list (up to 3). The current build is always the first column.
      </p>

      <table v-else class="grid">
        <thead>
          <tr>
            <th class="corner" />
            <th v-for="(c, i) in cols" :key="c.id" class="col-head" data-testid="compare-column">
              <div class="col-name" :class="{ current: c.id === 'current' }">{{ c.name }}</div>
              <div v-if="c.id !== 'current'" class="col-actions">
                <button v-focus-cell="{ region: 'center', row: 0, col: i * 2 }" class="mini" data-testid="compare-load" @click="load(c.build)">Load</button>
                <button v-focus-cell="{ region: 'center', row: 0, col: i * 2 + 1 }" class="mini" title="Remove from comparison" data-testid="compare-remove" @click="compare.remove(c.id)">✕</button>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr class="section"><th :colspan="cols.length + 1">Equipment</th></tr>
          <tr v-for="slot in EQUIP_SLOTS" :key="slot">
            <th>{{ SLOT_LABEL[slot] }}</th>
            <td v-for="c in cols" :key="c.id" :class="itemName(c.build, slot) ? `r${itemName(c.build, slot)!.rarity}` : 'faint'">
              {{ itemName(c.build, slot)?.name ?? '—' }}
            </td>
          </tr>
          <tr>
            <th>Decorations</th>
            <td v-for="c in cols" :key="c.id" class="decos">
              <span v-for="(d, j) in decoNames(c.build)" :key="j">{{ d }}</span>
              <span v-if="!decoNames(c.build).length" class="faint">—</span>
            </td>
          </tr>
        </tbody>

        <tbody v-for="g in groups" :key="g.id">
          <tr class="section"><th :colspan="cols.length + 1">{{ g.title }}</th></tr>
          <tr v-for="row in cmp.metrics.filter((m) => m.group === g.id)" :key="row.key" :data-testid="`compare-${row.key}`">
            <th :title="label(row.key).hint">
              <template v-if="row.key.startsWith('res-')">
                <span :class="`el-${label(row.key).el}`">{{ elementLabel(label(row.key).el!) }}</span> res.
              </template>
              <template v-else>
                {{ label(row.key).text }}
                <span v-if="label(row.key).el" :class="`el-${label(row.key).el}`">{{ elementLabel(label(row.key).el!) }}</span>
              </template>
            </th>
            <td v-for="(_, i) in cols" :key="i" class="num" :class="{ best: row.best.includes(i) }" :data-best="row.best.includes(i) || undefined">
              {{ value(row, i) }}
              <span v-if="delta(row, i)" class="delta" :class="delta(row, i)!.dir">{{ delta(row, i)!.text }}</span>
            </td>
          </tr>
        </tbody>

        <tbody v-if="cmp.skills.length">
          <tr class="section"><th :colspan="cols.length + 1">Skills</th></tr>
          <tr v-for="s in cmp.skills" :key="s.skill.id" :data-testid="`compare-skill-${s.skill.id}`">
            <th><span v-skill-info="{ skillId: s.skill.id, level: s.levels[0] ?? 0 }">{{ s.skill.name }}</span></th>
            <td v-for="(lv, i) in s.levels" :key="i" class="num" :class="{ faint: !lv, maxed: lv && lv >= s.caps[i]! }">
              {{ lv ? `${lv} / ${s.caps[i]}` : '—' }}
            </td>
          </tr>
        </tbody>

        <tbody v-if="cmp.setBonuses.length">
          <tr class="section"><th :colspan="cols.length + 1">Set bonuses</th></tr>
          <tr v-for="b in cmp.setBonuses" :key="b.bonus.id">
            <th>{{ b.bonus.name }}</th>
            <td v-for="(p, i) in b.pieces" :key="i" class="num" :class="{ faint: !b.active[i] }">
              {{ p ? `${p} pc · ${b.active[i]} / ${b.bonus.ranks.length}` : '—' }}
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="cols.length >= 2" class="note faint">
        Gold = best value. Deltas are against the current build. "EFR, all conditions" counts situational skills as active (Peak Performance or Heroics / Resentment, whichever is higher; not Critical Draw).
      </p>
    </div>
  </section>
</template>

<style scoped>
.compare {
  height: 100%;
}
.close {
  margin-left: auto;
  text-transform: none;
  letter-spacing: 0;
}
.body {
  overflow: auto;
  padding-bottom: 16px;
}
.empty {
  padding: 12px 16px;
  margin: 0;
}
.grid {
  border-collapse: collapse;
  font-size: 13px;
  min-width: 100%;
}
.grid th,
.grid td {
  padding: 4px 10px;
  border-bottom: 1px solid rgba(59, 53, 38, 0.35);
  text-align: left;
  vertical-align: top;
}
.grid tbody th {
  font-weight: 400;
  color: var(--text-dim);
  white-space: nowrap;
  position: sticky;
  left: 0;
  background: var(--panel);
}
.corner {
  position: sticky;
  left: 0;
  background: var(--panel);
}
.col-head {
  min-width: 150px;
  font-weight: 600;
}
.col-name {
  color: var(--text);
}
.col-name.current {
  color: var(--gold);
}
.col-actions {
  display: flex;
  gap: 2px;
  margin-top: 2px;
}
.mini {
  padding: 2px 6px;
  font-size: 12px;
  color: var(--text-dim);
}
.mini:hover,
.mini:focus-visible {
  color: var(--gold);
}
.section th {
  padding-top: 12px;
  color: var(--gold-dim) !important;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.best {
  color: var(--gold);
  font-weight: 600;
}
.maxed {
  color: var(--gold);
}
.delta {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 400;
}
.decos span {
  display: block;
  font-size: 12px;
}
.note {
  font-size: 12px;
  padding: 8px 12px 0;
  margin: 0;
}
</style>
