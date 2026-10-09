<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PLACEHOLDER, iconPath, isMissing, markMissing, type IconId } from '../../icons'

const props = withDefaults(defineProps<{ id: IconId; size?: number; label?: string }>(), { size: 20, label: '' })

// fallback chain: real icon -> placeholder.webp -> CSS box with initials
const stage = ref<0 | 1 | 2>(0)
const path = computed(() => iconPath(props.id))
watch(
  path,
  (p) => {
    stage.value = !isMissing(p) ? 0 : !isMissing(PLACEHOLDER) ? 1 : 2
  },
  { immediate: true },
)
const src = computed(() => (stage.value === 0 ? path.value : PLACEHOLDER))
const initials = computed(() => (props.label || props.id.split('/').pop() || '?').replace(/[^a-z0-9]/gi, '').slice(0, 2))

function onError() {
  markMissing(src.value)
  stage.value = stage.value === 0 && !isMissing(PLACEHOLDER) ? 1 : 2
}
</script>

<template>
  <img
    v-if="stage < 2"
    class="icon"
    :src="src"
    :width="size"
    :height="size"
    :alt="label"
    loading="lazy"
    @error="onError"
  />
  <span v-else class="icon icon-fallback" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.42}px` }" :title="label" aria-hidden="true">{{ initials }}</span>
</template>

<style scoped>
.icon {
  flex: none;
  display: inline-block;
  vertical-align: middle;
}
.icon-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-strong);
  border-radius: 3px;
  background: rgba(214, 189, 124, 0.1);
  color: var(--gold-dim);
  text-transform: uppercase;
  font-weight: 700;
  line-height: 1;
}
</style>
