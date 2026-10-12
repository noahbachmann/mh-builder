<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { db, type Material } from '../../data'
import { useCraftingStore } from '../../stores/crafting'
import type { CardItem } from './EquipmentCard.vue'

const props = defineProps<{ card: CardItem }>()
const crafting = useCraftingStore()
onMounted(() => void crafting.ensureLoaded())

/** labelled material lists of the card's item; null = no data */
const groups = computed<{ label: string; list: Material[] }[] | null>(() => {
  const idx = crafting.index
  const c = props.card
  if (!idx) return []
  if (c.kind === 'weapon') {
    const r = idx.weapon.get(c.item.id)
    if (!r) return null
    const prev = c.item.previousId === null ? undefined : db.weapon.get(c.item.previousId)
    return [
      ...(r.create ? [{ label: 'Forge', list: r.create }] : []),
      ...(r.upgrade ? [{ label: prev ? `Upgrade from ${prev.name}` : 'Upgrade', list: r.upgrade }] : []),
    ]
  }
  if (c.kind === 'armor') {
    const r = idx.armor.get(c.item.id)
    return r?.create ? [{ label: 'Forge', list: r.create }] : null
  }
  if (c.kind === 'charm') {
    const r = idx.charm.get(c.item.id)
    return r?.create ? [{ label: 'Forge, all levels', list: r.create }] : null
  }
  return []
})
const item = (id: number) => crafting.index?.item.get(id)
</script>

<template>
  <div class="mats" data-testid="card-materials">
    <div class="label">Materials</div>
    <p v-if="!crafting.index" class="faint pad">Loading…</p>
    <p v-else-if="groups === null" class="faint pad">No crafting data</p>
    <div v-for="g in groups ?? []" :key="g.label" class="group">
      <div class="faint sub">{{ g.label }}</div>
      <ul>
        <li v-for="m in g.list" :key="m.itemId">
          <span :class="`r${item(m.itemId)?.rarity ?? 1}`">{{ item(m.itemId)?.name ?? '?' }}</span>
          <span class="num qty">× {{ m.qty }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.label {
  font-size: 11px;
  color: var(--gold-dim);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 8px 2px;
}
.pad,
.group {
  padding: 0 8px;
  margin: 0;
}
.sub {
  font-size: 11px;
  margin-top: 2px;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.qty {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
</style>
