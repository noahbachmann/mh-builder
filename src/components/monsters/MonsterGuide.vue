<script setup lang="ts">
import { computed } from 'vue'
import { ELEMENTS, type Hitzone, type MonsterAilment } from '../../data/types'
import { WEAK_SPOT_HZV, monsterParts } from '../../engine'
import { capitalize, elementLabel } from '../../format'
import { renderUrl } from '../../renders'
import { useMonsterStore } from '../../stores/monster'
import ModeChips from './ModeChips.vue'

const store = useMonsterStore()
const m = computed(() => store.monster)
const render = computed(() => (m.value ? renderUrl('monster', m.value.id) : null))

/** visible parts in the current mode, broken variant as an extra row */
const rows = computed(() => {
  const mon = m.value
  if (!mon) return []
  return monsterParts(mon, store.mode).flatMap((p) => {
    const out: { part: string; broken: boolean; hz: Hitzone | null }[] = [{ part: p.part, broken: false, hz: p.hitzone }]
    if (p.breakable) {
      const b = monsterParts(mon, store.mode, new Set([p.part])).find((x) => x.part === p.part)
      out.push({ part: p.part, broken: true, hz: b?.hitzone ?? null })
    }
    return out
  })
})

const RAW = ['cut', 'impact', 'shot'] as const

const AILMENT_LABEL: Record<string, string> = {
  roar: 'Roar',
  wind: 'Wind pressure',
  tremor: 'Tremor',
  defense_down: 'Defense down',
  regional: 'Regional ailment',
  mud: 'Muddy',
  effluvia: 'Effluvium',
}
const ailmentLabel = (a: MonsterAilment) =>
  `${AILMENT_LABEL[a.id] ?? capitalize(a.id)}${a.strength ? ` (${a.strength})` : ''}`

const traps = computed(() =>
  m.value
    ? [
        { id: 'pitfall', label: 'Pitfall trap', ok: m.value.traps.pitfall },
        { id: 'shock', label: 'Shock trap', ok: m.value.traps.shock },
        { id: 'vine', label: 'Vine trap', ok: m.value.traps.vine },
      ]
    : [],
)
</script>

<template>
  <section class="panel guide" aria-label="Monster field guide" data-testid="monster-guide">
    <header class="panel-head">Field Guide</header>
    <div v-if="!m" class="panel-body"><p class="dim note">{{ store.index ? 'Pick a monster.' : 'Loading…' }}</p></div>
    <div v-else class="panel-body body">
      <div class="intro">
        <img v-if="render" class="render" :src="render" :alt="m.name" loading="lazy" />
        <div class="text">
          <h2 data-testid="monster-name">{{ m.name }}</h2>
          <div class="ecology dim">{{ m.ecology }}</div>
          <p v-if="m.description" class="desc">{{ m.description }}</p>
          <ul class="chips traps">
            <li v-for="t in traps" :key="t.id" :class="t.ok ? 'ok' : 'no'">{{ t.ok ? '✓' : '✗' }} {{ t.label }}</li>
          </ul>
        </div>
      </div>

      <div class="section-title">Physiology</div>
      <ModeChips class="modes" region="center" />
      <table class="hz" data-testid="physiology">
        <thead>
          <tr>
            <th>Part</th>
            <th v-for="k in RAW" :key="k" class="num">{{ capitalize(k) }}</th>
            <th v-for="e in ELEMENTS" :key="e" class="num" :class="`el-${e}`">{{ elementLabel(e) }}</th>
            <th class="num">Stun</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="`${r.part}-${r.broken}`" :class="{ broken: r.broken }">
            <th>{{ r.broken ? 'broken' : r.part }}</th>
            <template v-if="r.hz">
              <td v-for="k in RAW" :key="k" class="num" :class="{ weak: r.hz[k] >= WEAK_SPOT_HZV }">{{ r.hz[k] }}</td>
              <td v-for="e in ELEMENTS" :key="e" class="num" :class="r.hz[e] >= 20 ? `el-${e} strong` : 'dim'">{{ r.hz[e] }}</td>
              <td class="num dim">{{ r.hz.ko }}</td>
            </template>
            <td v-else :colspan="RAW.length + ELEMENTS.length + 1" class="faint">only in another state</td>
          </tr>
        </tbody>
      </table>
      <p class="note faint">Gold = weak spot (≥ {{ WEAK_SPOT_HZV }}, Weakness Exploit applies). Colored = elemental hitzone ≥ 20.</p>

      <template v-if="m.ailments.length">
        <div class="section-title">Inflicts</div>
        <ul class="chips" data-testid="monster-ailments">
          <li v-for="a in m.ailments" :key="a.id">{{ ailmentLabel(a) }}</li>
        </ul>
      </template>
    </div>
  </section>
</template>

<style scoped>
.guide {
  height: 100%;
}
.body {
  padding-bottom: 16px;
}
.note {
  font-size: 12px;
  padding: 6px 12px 0;
  margin: 0;
}
.intro {
  display: flex;
  gap: 16px;
  padding: 12px;
}
.render {
  width: 160px;
  height: 160px;
  object-fit: contain;
  flex: none;
}
h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--gold);
}
.ecology {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.desc {
  margin: 8px 0;
  max-width: 70ch;
}
.chips {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 6px 12px;
}
.chips li {
  font-size: 12px;
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.25);
}
.traps {
  padding: 0;
}
.traps .ok {
  color: var(--up);
}
.traps .no {
  color: var(--text-faint);
}
.modes {
  padding: 6px 12px 2px;
}
.hz {
  border-collapse: collapse;
  font-size: 13px;
  margin: 4px 12px 0;
}
.hz th,
.hz td {
  padding: 3px 8px;
  border-bottom: 1px solid rgba(59, 53, 38, 0.35);
  text-align: left;
}
.hz thead th {
  color: var(--gold-dim);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.hz .num {
  text-align: right;
}
.hz tbody th {
  font-weight: 400;
  white-space: nowrap;
}
.hz tr.broken th {
  padding-left: 20px;
  color: var(--text-dim);
  font-style: italic;
}
.weak {
  color: var(--gold);
  font-weight: 600;
}
.strong {
  font-weight: 600;
}
</style>
