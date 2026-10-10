<script setup lang="ts">
import { computed } from 'vue'
import { defaultMode, monsterModes } from '../../engine'
import { vFocusCell } from '../../input/focus-grid'
import { useMonsterStore } from '../../stores/monster'

/** Monster state picker (Normal / Mud / Charged ...); shared by the field guide and the damage tab. */
const props = withDefaults(defineProps<{ region: string; row?: number }>(), { row: 0 })
const store = useMonsterStore()

const options = computed(() => {
  const m = store.monster
  if (!m) return []
  const modes = monsterModes(m)
  const base = defaultMode(m) === null ? [null] : []
  return [...base, ...modes]
})
</script>

<template>
  <div v-if="options.length > 1" class="mode-chips" role="group" aria-label="Monster state">
    <span class="label dim">State</span>
    <button
      v-for="(o, i) in options"
      :key="o ?? 'normal'"
      v-focus-cell="{ region: props.region, row: props.row, col: i }"
      class="chip"
      :class="{ 'is-active': store.mode === o }"
      :aria-pressed="store.mode === o"
      data-testid="mode-chip"
      @click="store.mode = o"
    >
      {{ o ?? 'Normal' }}
    </button>
  </div>
</template>

<style scoped>
.mode-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.label {
  font-size: 12px;
  margin-right: 4px;
}
</style>
