<script setup lang="ts">
import { computed } from 'vue'
import { MONSTER_STAR_KEYS, type MonsterStarKey } from '../../data/types'
import { capitalize } from '../../format'
import { useMonsterStore } from '../../stores/monster'

const store = useMonsterStore()
const m = computed(() => store.monster!)

const forms = computed(() => [
  { title: 'Normal', stars: m.value.weaknesses },
  ...m.value.altWeaknesses.map((a) => ({ title: capitalize(a.description), stars: a.stars })),
])
const starOf = (s: Partial<Record<MonsterStarKey, number>>, k: MonsterStarKey) => s[k] ?? null
const cls = (k: MonsterStarKey) => (k === 'stun' ? '' : `el-${k}`)

/** break data, or (missing for most Iceborne monsters) parts named in break / sever reward conditions */
const fromRewards = computed(() => {
  const out = new Map<string, { part: string; sever: boolean }>()
  for (const r of m.value.rewards) {
    const b = /^(?:Wound|Break) (.+)$/.exec(r.condition)?.[1]
    if (b && !out.has(b)) out.set(b, { part: b, sever: false })
    const s = /^(.+) Carve$/.exec(r.condition)?.[1]
    if (s && !['Body', 'Head Shell', 'Gold Plating', 'Horn'].includes(s)) out.set(`${s} (sever)`, { part: s, sever: true })
  }
  return [...out.values()]
})
</script>

<template>
  <div class="info" data-testid="monster-info">
    <div class="section-title">Weaknesses</div>
    <table class="tbl weak" data-testid="weaknesses">
      <thead>
        <tr>
          <th />
          <th v-for="f in forms" :key="f.title" class="form">{{ f.title }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="k in MONSTER_STAR_KEYS" :key="k">
          <th :class="cls(k)">{{ capitalize(k) }}</th>
          <td v-for="f in forms" :key="f.title" class="stars" :data-stars="starOf(f.stars, k) ?? undefined">
            <template v-if="starOf(f.stars, k) === null"><span class="faint">same</span></template>
            <template v-else-if="starOf(f.stars, k) === 0"><span class="faint">✕</span></template>
            <template v-else>
              <span class="on">{{ '★'.repeat(starOf(f.stars, k)!) }}</span><span class="off">{{ '★'.repeat(3 - starOf(f.stars, k)!) }}</span>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">Parts: flinch / break / sever damage</div>
    <table v-if="m.parts.length" class="tbl parts" data-testid="monster-parts">
      <thead>
        <tr>
          <th>Part</th>
          <th class="num" title="Damage to flinch">Flinch</th>
          <th class="num" title="Damage to break">Break</th>
          <th class="num" title="Damage to sever">Sever</th>
          <th title="Kinsect extract">Extract</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in m.parts" :key="p.name">
          <th>{{ p.name }}</th>
          <td class="num">{{ p.flinch || '—' }}</td>
          <td class="num" :class="{ yes: p.break }">{{ p.break || '—' }}</td>
          <td class="num" :class="{ yes: p.sever }">{{ p.sever || '—' }}</td>
          <td><span v-if="p.extract" class="extract" :class="`x-${p.extract}`" />{{ p.extract ? capitalize(p.extract) : '—' }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="note faint">No break thresholds in the data for this monster.</p>
    <template v-if="fromRewards.length">
      <div class="section-title">Break / sever rewards</div>
      <ul class="plain" :data-testid="m.parts.length ? 'monster-break-rewards' : 'monster-parts'">
        <li v-for="p in fromRewards" :key="`${p.part}-${p.sever}`">{{ p.part }} <span class="dim">{{ p.sever ? 'severable' : 'breakable' }}</span></li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.tbl {
  border-collapse: collapse;
  font-size: 13px;
  margin: 2px 12px 6px;
  width: calc(100% - 24px);
}
.tbl th,
.tbl td {
  padding: 3px 6px;
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
}
.tbl .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.form {
  text-transform: none;
}
.stars {
  letter-spacing: 1px;
  white-space: nowrap;
}
.on {
  color: var(--gold);
}
.off {
  color: rgba(214, 189, 124, 0.18);
}
.yes {
  color: var(--text);
}
.extract {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
.x-red { background: #e04a3c; }
.x-white { background: #f2f2f2; }
.x-orange { background: #e8902a; }
.x-green { background: #6cc13a; }
.plain {
  margin: 4px 0;
  padding: 0 12px 0 28px;
  font-size: 13px;
}
.note {
  font-size: 12px;
  padding: 4px 12px;
  margin: 0;
}
</style>
