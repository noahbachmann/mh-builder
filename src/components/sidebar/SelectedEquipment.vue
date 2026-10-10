<script setup lang="ts">
import { computed } from 'vue'
import { db } from '../../data'
import type { EquipSlot } from '../../engine'
import { SLOT_LABEL } from '../../format'
import { useBuildStore } from '../../stores/build'
import { usePreviewStore } from '../../stores/preview'
import { useUiStore } from '../../stores/ui'
import { renderUrl } from '../../renders'
import EquipmentCard, { type CardItem } from './EquipmentCard.vue'
import ItemRender from './ItemRender.vue'

const build = useBuildStore()
const preview = usePreviewStore()
const ui = useUiStore()

function cardFor(slot: EquipSlot, id: number | null): CardItem | null {
  if (id === null) return null
  if (slot === 'weapon') {
    const item = db.weapon.get(id)
    return item ? { kind: 'weapon', item } : null
  }
  if (slot === 'charm') {
    const item = db.charm.get(id)
    return item ? { kind: 'charm', item } : null
  }
  const item = db.armor.get(id)
  return item ? { kind: 'armor', item } : null
}
const decoCard = (id: number | null): CardItem | null => {
  const item = id === null ? undefined : db.decoration.get(id)
  return item ? { kind: 'deco', item } : null
}

const slot = computed<EquipSlot>(() => preview.candidate?.slot ?? ui.selectedSlot)

const equipped = computed(() => {
  const c = preview.candidate
  if (c?.kind === 'deco') return decoCard(build.build.decorations[c.slot][c.index] ?? null)
  return cardFor(slot.value, build.build[slot.value])
})
const candidate = computed(() => {
  const c = preview.candidate
  if (!c) return undefined
  if (c.kind === 'deco') {
    if (c.id === (build.build.decorations[c.slot][c.index] ?? null)) return undefined
    return decoCard(c.id)
  }
  if (c.id === build.build[c.slot]) return undefined
  return cardFor(c.slot, c.id)
})
const decos = computed(() => (slot.value === 'charm' || preview.candidate?.kind === 'deco' ? undefined : build.build.decorations[slot.value]))
const renderOf = (c: CardItem | null | undefined) => {
  if (!c || (c.kind !== 'weapon' && c.kind !== 'armor')) return null
  const url = renderUrl(c.kind, c.item.id)
  return url ? { url, name: c.item.name } : null
}
const equippedRender = computed(() => renderOf(equipped.value))
const candidateRender = computed(() => renderOf(candidate.value))
const heading = computed(() => (preview.candidate?.kind === 'deco' ? `${SLOT_LABEL[slot.value]} decoration` : SLOT_LABEL[slot.value]))
</script>

<template>
  <div class="selected" data-testid="selected-equipment">
    <div class="section-title">{{ heading }}</div>
    <!-- grid: cards in row 1, each render below its own card in row 2 -->
    <div class="cards" :class="{ two: candidate !== undefined }">
      <EquipmentCard title="Equipped" :card="equipped" :decorations="decos" />
      <EquipmentCard v-if="candidate !== undefined" title="Selected" :card="candidate" :compare="equipped" candidate />
      <ItemRender v-if="equippedRender" v-bind="equippedRender" class="render-1" />
      <ItemRender v-if="candidateRender" v-bind="candidateRender" class="render-2" candidate />
    </div>
  </div>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  padding: 8px;
}
.render-1 {
  grid-row: 2;
  grid-column: 1;
}
.render-2 {
  grid-row: 2;
  grid-column: 2;
}
.cards.two {
  grid-template-columns: 1fr 1fr;
}
</style>
