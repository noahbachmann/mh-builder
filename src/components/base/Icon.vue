<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { resolveIcon, type IconId } from '../../icons'

const props = withDefaults(defineProps<{ id: IconId; size?: number; label?: string }>(), { size: 20, label: '' })

// fallback chain: icon -> placeholder icon -> CSS box with initials
const source = computed(() => resolveIcon(props.id))
const broken = ref(false)
watch(source, () => (broken.value = false))
const initials = computed(() => (props.label || props.id.split('/').pop() || '?').replace(/[^a-z0-9]/gi, '').slice(0, 2))
</script>

<template>
  <component
    :is="source.component"
    v-if="source?.kind === 'component'"
    class="icon"
    :width="size"
    :height="size"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    :data-icon="id"
  />
  <img
    v-else-if="source?.kind === 'image' && !broken"
    class="icon"
    :src="source.url"
    :width="size"
    :height="size"
    :alt="label"
    loading="lazy"
    :data-icon="id"
    @error="broken = true"
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
