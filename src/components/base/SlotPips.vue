<script setup lang="ts">
import { computed } from 'vue'
import { db } from '../../data'
import Icon from './Icon.vue'
import { icons } from '../../icons'

const props = defineProps<{ slots: number[]; decorations?: (number | null)[]; names?: boolean }>()
const items = computed(() =>
  props.slots.map((size, i) => {
    const id = props.decorations?.[i] ?? null
    return { size, deco: id !== null ? db.decoration.get(id) : undefined }
  }),
)
</script>

<template>
  <span class="pips" :class="{ names }">
    <span v-for="(s, i) in items" :key="i" class="pip" :title="s.deco ? `${s.deco.name} (size ${s.size} slot)` : `Empty size ${s.size} slot`">
      <Icon :id="s.deco ? icons.decoration(s.deco) : icons.slot(s.size)" :size="16" :label="String(s.size)" />
      <span v-if="names" :class="s.deco ? '' : 'faint'">{{ s.deco?.name ?? `— (${s.size})` }}</span>
    </span>
    <span v-if="!slots.length" class="faint">{{ names ? "None" : "—" }}</span>
  </span>
</template>

<style scoped>
.pips {
  display: inline-flex;
  gap: 3px;
  align-items: center;
}
.pips.names {
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
}
.pip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
</style>
