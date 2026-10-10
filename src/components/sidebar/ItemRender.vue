<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ url: string; title: string; name: string; rarity: number; candidate?: boolean }>()
const broken = ref(false)
watch(() => props.url, () => (broken.value = false))
</script>

<template>
  <figure v-if="!broken" class="render" :class="{ candidate }" :data-testid="candidate ? 'candidate-render' : 'equipped-render'">
    <img :src="url" :alt="name" width="160" height="160" decoding="async" @error="broken = true" />
    <figcaption>
      <span class="tag">{{ title }}</span>
      <span :class="`r${rarity}`">{{ name }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.render {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.render.candidate {
  border-color: var(--gold-dim);
}
img {
  width: 120px;
  height: 120px;
  object-fit: contain;
  flex: none;
}
figcaption {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: 13px;
}
.tag {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold-dim);
}
</style>
