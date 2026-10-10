<script setup lang="ts">
import { computed, ref } from 'vue'
import { icons } from '../../icons'
import { vFocusCell } from '../../input/focus-grid'
import { useMonsterStore } from '../../stores/monster'
import { useUiStore } from '../../stores/ui'
import Icon from '../base/Icon.vue'

const store = useMonsterStore()
const ui = useUiStore()
const query = ref('')

const list = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? store.monsters.filter((m) => m.name.toLowerCase().includes(q) || m.ecology.toLowerCase().includes(q)) : store.monsters
})

// picking from the drawer shows the guide
function select(slug: string) {
  store.select(slug)
  ui.closeDrawer()
}
</script>

<template>
  <section class="panel monster-list" aria-label="Large monsters">
    <header class="panel-head">Large Monsters</header>
    <div class="search-wrap">
      <input v-model="query" class="search" type="search" placeholder="Search (F)" aria-label="Search monsters" data-search data-testid="monster-search" />
    </div>
    <div class="panel-body">
      <p v-if="!store.index" class="dim note">Loading monsters…</p>
      <p v-else-if="!list.length" class="dim note">No monster matches.</p>
      <button
        v-for="(m, i) in list"
        :key="m.id"
        v-focus-cell="{ region: 'monsters', row: i, col: 0 }"
        class="row-btn"
        :class="{ 'is-selected': m.slug === store.slug }"
        :aria-current="m.slug === store.slug ? 'true' : undefined"
        data-testid="monster-item"
        @click="select(m.slug)"
      >
        <Icon :id="icons.monster(m.slug)" :size="28" :label="m.name" />
        <span class="name">{{ m.name }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.monster-list {
  height: 100%;
}
.search-wrap {
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note {
  padding: 8px 12px;
  margin: 0;
}
</style>
