<script setup lang="ts">
import { computed } from 'vue'
import type { MonsterReward } from '../../data/types'
import { RANK_LABEL } from '../../format'
import { vFocusCell } from '../../input/focus-grid'
import { LOOT_RANKS, useMonsterStore } from '../../stores/monster'

const store = useMonsterStore()

/** rewards of the chosen rank grouped by condition, in source order */
const groups = computed(() => {
  const out = new Map<string, MonsterReward[]>()
  for (const r of store.monster?.rewards ?? []) {
    if (r.rank !== store.lootRank) continue
    out.set(r.condition, [...(out.get(r.condition) ?? []), r])
  }
  return [...out]
})
const item = (id: number) => store.index?.item.get(id)
</script>

<template>
  <div class="loot" data-testid="monster-loot">
    <nav class="tabs sub" role="tablist" aria-label="Rank">
      <span class="kbd">A</span>
      <button
        v-for="(r, i) in LOOT_RANKS"
        :key="r"
        v-focus-cell="{ region: 'sidebar-subtabs', row: 0, col: i }"
        role="tab"
        class="tab"
        :class="{ 'is-active': store.lootRank === r }"
        :aria-selected="store.lootRank === r"
        :disabled="!store.ranks.includes(r)"
        :data-testid="`loot-rank-${r}`"
        @click="store.lootRank = r"
      >
        {{ RANK_LABEL[r] }}
      </button>
      <span class="kbd">D</span>
    </nav>

    <p v-if="!groups.length" class="note dim">No rewards in this rank.</p>
    <table v-else class="tbl">
      <tbody v-for="[condition, list] in groups" :key="condition" data-testid="loot-group">
        <tr class="cond">
          <th colspan="3">{{ condition }}</th>
        </tr>
        <tr v-for="(r, i) in list" :key="i">
          <td :class="item(r.itemId) ? `r${item(r.itemId)!.rarity}` : ''">{{ item(r.itemId)?.name ?? '?' }}</td>
          <td class="num dim">{{ r.stack > 1 ? `× ${r.stack}` : '' }}</td>
          <td class="num">{{ r.percentage === null ? '—' : `${r.percentage}%` }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.sub {
  align-items: center;
}
.sub .tab {
  flex: 1;
  text-align: center;
}
.sub .tab:disabled {
  opacity: 0.35;
  cursor: default;
}
.tbl {
  border-collapse: collapse;
  font-size: 13px;
  margin: 0 12px 12px;
  width: calc(100% - 24px);
}
.tbl td {
  padding: 2px 6px;
  border-bottom: 1px solid rgba(59, 53, 38, 0.3);
}
.cond th {
  text-align: left;
  padding: 10px 6px 3px;
  color: var(--gold-dim);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.note {
  padding: 8px 12px;
  margin: 0;
}
</style>
