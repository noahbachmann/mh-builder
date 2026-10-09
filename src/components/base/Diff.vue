<script setup lang="ts">
import { computed } from 'vue'
import type { NumberDiff } from '../../engine'
import { fmt } from '../../format'

/** Shows `value`, and when a diff is given, the preview value with an up/down marker. */
const props = withDefaults(
  defineProps<{ value: number | null | undefined; diff?: NumberDiff | null; digits?: number; suffix?: string; invert?: boolean }>(),
  { digits: 0, suffix: '', diff: null, invert: false },
)
const show = computed(() => props.diff && props.diff.dir !== 'same')
const good = computed(() => (props.diff?.dir === 'up') !== props.invert)
const text = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${fmt(n, props.digits)}${props.suffix}`)
</script>

<template>
  <span class="diff num">
    <template v-if="show">
      <span class="faint from">{{ text(value) }}</span>
      <span :class="good ? 'up' : 'down'" class="to" :data-dir="diff!.dir">{{ text(diff!.to) }} {{ diff!.dir === 'up' ? '▲' : '▼' }}</span>
    </template>
    <template v-else>{{ text(diff && diff.to !== null ? diff.to : value) }}</template>
  </span>
</template>

<style scoped>
.diff {
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
  justify-content: flex-end;
}
.from {
  text-decoration: line-through;
  font-size: 12px;
}
.to {
  font-weight: 600;
}
</style>
