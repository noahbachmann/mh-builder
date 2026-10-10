<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ url: string; name: string; candidate?: boolean }>()
const broken = ref(false)
watch(() => props.url, () => (broken.value = false))
</script>

<template>
  <figure v-if="!broken" class="render" :class="{ candidate }" :data-testid="candidate ? 'candidate-render' : 'equipped-render'">
    <img :src="url" :alt="name" :title="name" width="160" height="160" decoding="async" @error="broken = true" />
  </figure>
</template>

<style scoped>
.render {
  display: flex;
  justify-content: center;
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
</style>
