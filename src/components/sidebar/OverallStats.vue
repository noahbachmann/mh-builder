<script setup lang="ts">
import { computed } from 'vue'
import { ELEMENTS, type ElementOrStatus } from '../../data/types'
import { icons } from '../../icons'
import { capitalize, elementLabel } from '../../format'
import { SHARPNESS_COLORS } from '../../engine'
import { useBuildStore } from '../../stores/build'
import { usePreviewStore } from '../../stores/preview'
import Diff from '../base/Diff.vue'
import Icon from '../base/Icon.vue'
import SharpnessBar from '../base/SharpnessBar.vue'

const build = useBuildStore()
const preview = usePreviewStore()
const s = computed(() => build.stats)
const p = computed(() => preview.stats)
const d = computed(() => preview.diff)

const elementTypes = computed(() => {
  const set = new Set<ElementOrStatus>()
  for (const st of [s.value, p.value]) for (const e of st?.weapon?.elements ?? []) set.add(e.type)
  return [...set]
})
const elementOf = (t: ElementOrStatus) => s.value.weapon?.elements.find((e) => e.type === t)
const efeTypes = computed(() => [...new Set([...s.value.efe, ...(p.value?.efe ?? [])].map((e) => e.type))])

const sharpChanged = computed(
  () => p.value?.weapon && JSON.stringify(p.value.weapon.sharpness) !== JSON.stringify(s.value.weapon?.sharpness),
)
const sharpLabel = (i: number | undefined) => (i === undefined || i < 0 ? '—' : capitalize(SHARPNESS_COLORS[i]!))
</script>

<template>
  <div class="overall-stats" data-testid="overall-stats">
    <div class="section-title">Attack</div>
    <dl class="stat-list">
      <dt><Icon :id="icons.stat('attack')" :size="16" /> Attack</dt>
      <dd data-testid="stat-attack"><Diff :value="s.weapon?.attack" :diff="d?.attack" /></dd>
      <dt><Icon :id="icons.stat('affinity')" :size="16" /> Affinity</dt>
      <dd data-testid="stat-affinity"><Diff :value="s.weapon?.affinity" :diff="d?.affinity" suffix="%" /></dd>
      <template v-for="t in elementTypes" :key="t">
        <dt>
          <Icon :id="icons.element(t)" :size="16" />
          <span :class="`el-${t}`">{{ elementLabel(t) }}</span>
          <span v-if="elementOf(t)?.hidden && !elementOf(t)?.active" class="faint">(hidden)</span>
        </dt>
        <dd :data-testid="`stat-element-${t}`">
          <Diff :value="elementOf(t)?.active ? elementOf(t)!.value : elementOf(t)?.hidden ? null : undefined" :diff="d?.elements[t]" />
        </dd>
      </template>
      <dt v-if="!elementTypes.length">Element</dt>
      <dd v-if="!elementTypes.length" class="faint">—</dd>
      <dt><Icon :id="icons.stat('elderseal')" :size="16" /> Elderseal</dt>
      <dd>{{ capitalize((p?.weapon ?? s.weapon)?.weapon.elderseal ?? '—') }}</dd>
    </dl>

    <div class="sharp">
      <div class="sharp-row">
        <span class="dim">Sharpness</span>
        <span class="num">{{ sharpLabel(s.weapon?.sharpnessIndex) }}<template v-if="s.weapon?.handicraft"> · Handicraft {{ s.weapon.handicraft }}</template></span>
      </div>
      <SharpnessBar v-if="s.weapon?.sharpness" :bar="s.weapon.sharpness" :full="s.weapon.weapon.sharpness" />
      <template v-if="sharpChanged && p?.weapon?.sharpness">
        <div class="sharp-row">
          <span class="dim">→</span>
          <span :class="d?.sharpnessIndex.dir === 'up' ? 'up' : d?.sharpnessIndex.dir === 'down' ? 'down' : ''">{{ sharpLabel(p.weapon.sharpnessIndex) }}</span>
        </div>
        <SharpnessBar :bar="p.weapon.sharpness" :full="p.weapon.weapon.sharpness" />
      </template>
      <span v-if="!s.weapon?.sharpness && !sharpChanged" class="faint">—</span>
    </div>

    <div class="section-title">Effective damage</div>
    <dl class="stat-list">
      <dt>EFR</dt>
      <dd data-testid="stat-efr"><Diff :value="s.efr?.efr" :diff="d?.efr" :digits="1" /></dd>
      <template v-for="t in efeTypes" :key="t">
        <dt>EFE <span :class="`el-${t}`">{{ elementLabel(t) }}</span></dt>
        <dd><Diff :value="s.efe.find((e) => e.type === t)?.efe" :diff="d?.efe[t]" :digits="2" /></dd>
      </template>
    </dl>

    <div class="section-title">Defense</div>
    <dl class="stat-list">
      <dt><Icon :id="icons.stat('defense')" :size="16" /> Defense</dt>
      <dd data-testid="stat-defense"><Diff :value="s.defense.defense" :diff="d?.defense" /></dd>
      <template v-for="el in ELEMENTS" :key="el">
        <dt><Icon :id="icons.element(el)" :size="16" /> <span :class="`el-${el}`">{{ elementLabel(el) }} res.</span></dt>
        <dd><Diff :value="s.defense.resistances[el]" :diff="d?.resistances[el]" /></dd>
      </template>
    </dl>
  </div>
</template>

<style scoped>
.sharp {
  padding: 4px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sharp-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}
</style>
