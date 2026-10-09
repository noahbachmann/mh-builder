<script setup lang="ts">
import { computed } from 'vue'
import { SHARPNESS_COLORS } from '../../engine'
import type { SharpnessBar } from '../../data/types'

const props = defineProps<{
  bar: SharpnessBar
  /** bar at Handicraft 5; extra part is drawn faded */
  full?: SharpnessBar | null
}>()

// MR bars top out at 400 hits; scale everything to that
const MAX = 400
const segments = computed(() => {
  const full = props.full ?? props.bar
  return SHARPNESS_COLORS.map((color, i) => ({
    color,
    current: props.bar[i]!,
    extra: Math.max(0, full[i]! - props.bar[i]!),
  }))
})
const label = computed(() =>
  segments.value
    .filter((s) => s.current)
    .map((s) => `${s.color} ${s.current}`)
    .join(', '),
)
</script>

<template>
  <div class="sharpness" role="img" :aria-label="`Sharpness: ${label}`" :title="label">
    <template v-for="s in segments" :key="s.color">
      <span v-if="s.current" class="seg" :style="{ width: `${(s.current / MAX) * 100}%`, background: `var(--sh-${s.color})` }" />
    </template>
    <template v-for="s in segments" :key="`x-${s.color}`">
      <span v-if="s.extra" class="seg extra" :style="{ width: `${(s.extra / MAX) * 100}%`, background: `var(--sh-${s.color})` }" />
    </template>
  </div>
</template>

<style scoped>
.sharpness {
  display: flex;
  height: 10px;
  width: 100%;
  min-width: 120px;
  background: #050505;
  border: 1px solid #2c2a24;
  padding: 1px;
}
.seg {
  height: 100%;
}
.extra {
  opacity: 0.28;
}
</style>
