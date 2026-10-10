<script setup lang="ts">
import { computed } from 'vue'
import { ELEMENTS, db, type Armor, type Charm, type Decoration, type SkillRef, type Weapon } from '../../data'
import { applyHandicraft } from '../../engine'
import { icons } from '../../icons'
import { WEAPON_TYPE_LABEL, capitalize, elementLabel, fmt } from '../../format'
import Icon from '../base/Icon.vue'
import SharpnessBar from '../base/SharpnessBar.vue'
import SlotPips from '../base/SlotPips.vue'

export type CardItem =
  | { kind: 'weapon'; item: Weapon }
  | { kind: 'armor'; item: Armor }
  | { kind: 'charm'; item: Charm }
  | { kind: 'deco'; item: Decoration }

const props = defineProps<{
  title: string
  card: CardItem | null
  /** other card; numbers higher/lower than it get colored */
  compare?: CardItem | null
  decorations?: (number | null)[]
  candidate?: boolean
}>()

const num = (c: CardItem | null | undefined, key: string): number | null => {
  if (!c) return null
  const it = c.item as unknown as Record<string, unknown>
  if (key.startsWith('res.')) return c.kind === 'armor' ? c.item.resistances[key.slice(4) as 'fire'] : null
  if (key.startsWith('el.')) {
    if (c.kind !== 'weapon') return null
    return c.item.elements.find((e) => e.type === key.slice(3))?.value ?? null
  }
  if (key === 'slots') return 'slots' in it ? (it.slots as number[]).reduce((a, b) => a + b, 0) : null
  return typeof it[key] === 'number' ? (it[key] as number) : null
}

/** class for a numeric field relative to the compare card */
function cmp(key: string): string {
  if (!props.compare) return ''
  const a = num(props.card, key) ?? 0
  const b = num(props.compare, key) ?? 0
  return a > b ? 'up' : a < b ? 'down' : ''
}
const arrow = (key: string) => (cmp(key) === 'up' ? ' ▲' : cmp(key) === 'down' ? ' ▼' : '')

const skills = computed<SkillRef[]>(() => {
  const c = props.card
  if (!c) return []
  if (c.kind === 'weapon') return c.item.skill ? [c.item.skill] : []
  return c.item.skills
})
const otherSkills = computed(() => {
  const c = props.compare
  if (!c) return null
  const list = c.kind === 'weapon' ? (c.item.skill ? [c.item.skill] : []) : c.item.skills
  return new Map(list.map((s) => [s.skillId, s.level]))
})
const skillClass = (s: SkillRef) => {
  const other = otherSkills.value
  if (!other) return ''
  const o = other.get(s.skillId) ?? 0
  return s.level > o ? 'up' : s.level < o ? 'down' : ''
}

const icon = computed(() => {
  const c = props.card
  if (!c) return icons.placeholder()
  if (c.kind === 'weapon') return icons.weapon(c.item.type, c.item.rarity)
  if (c.kind === 'armor') return icons.armor(c.item.type, c.item.rarity)
  if (c.kind === 'deco') return icons.decoration(c.item)
  return icons.charm(c.item.rarity)
})
const subtitle = computed(() => {
  const c = props.card
  if (!c) return ''
  if (c.kind === 'weapon') return WEAPON_TYPE_LABEL[c.item.type]
  if (c.kind === 'armor') return `${c.item.rank} · ${c.item.setId ? db.armorSet.get(c.item.setId)?.name : 'No set'}`
  if (c.kind === 'deco') return `Size ${c.item.size} decoration`
  return 'Charm'
})
const setBonus = computed(() => {
  const c = props.card
  if (c?.kind !== 'armor' || !c.item.setId) return null
  const bonusId = db.armorSet.get(c.item.setId)?.bonusId
  return bonusId ? db.setBonus.get(bonusId)?.name : null
})
const baseBar = computed(() => {
  const c = props.card
  return c?.kind === 'weapon' && c.item.sharpness ? applyHandicraft(c.item.sharpness, 0, c.item.sharpnessMaxed) : null
})
</script>

<template>
  <article class="card" :class="{ candidate }" :data-testid="candidate ? 'compare-card' : 'equipped-card'">
    <header class="card-head">
      <span class="tag">{{ title }}</span>
    </header>
    <div v-if="!card" class="faint none">Nothing equipped</div>
    <template v-else>
      <div class="ident">
        <Icon :id="icon" :size="30" />
        <div>
          <div class="nm" :class="`r${card.item.rarity}`" data-testid="card-name">{{ card.item.name }}</div>
          <div class="sub faint">{{ subtitle }} · <span :class="`r${card.item.rarity}`">Rarity {{ card.item.rarity }}</span></div>
        </div>
      </div>

      <dl v-if="card.kind === 'weapon'" class="stat-list">
        <dt>Attack</dt>
        <dd :class="cmp('attack')" data-testid="card-attack">{{ fmt(card.item.attack) }}{{ arrow('attack') }}</dd>
        <dt>Affinity</dt>
        <dd :class="cmp('affinity')">{{ card.item.affinity }}%{{ arrow('affinity') }}</dd>
        <template v-for="e in card.item.elements" :key="e.type">
          <dt :class="`el-${e.type}`">{{ elementLabel(e.type) }}</dt>
          <dd :class="cmp(`el.${e.type}`)">{{ e.hidden ? `(${e.value})` : e.value }}{{ arrow(`el.${e.type}`) }}</dd>
        </template>
        <template v-if="card.item.elderseal">
          <dt>Elderseal</dt>
          <dd>{{ capitalize(card.item.elderseal) }}</dd>
        </template>
        <template v-if="card.item.defense">
          <dt>Defense</dt>
          <dd :class="cmp('defense')">+{{ card.item.defense }}{{ arrow('defense') }}</dd>
        </template>
        <template v-if="card.item.phial">
          <dt>Phial</dt>
          <dd>{{ capitalize(card.item.phial) }} {{ card.item.phialPower ?? '' }}</dd>
        </template>
        <template v-if="card.item.shelling">
          <dt>Shelling</dt>
          <dd>{{ capitalize(card.item.shelling) }} {{ card.item.shellingLevel }}</dd>
        </template>
        <template v-if="card.item.kinsectBonus">
          <dt>Kinsect</dt>
          <dd>{{ capitalize(card.item.kinsectBonus.replace('_', ' / ')) }}</dd>
        </template>
        <template v-if="card.item.notes">
          <dt>Notes</dt>
          <dd>{{ card.item.notes }}</dd>
        </template>
        <template v-if="card.item.coatings?.length">
          <dt>Coatings</dt>
          <dd class="wrap">{{ card.item.coatings.map(capitalize).join(', ') }}</dd>
        </template>
        <template v-if="card.item.deviation">
          <dt>Deviation</dt>
          <dd>{{ capitalize(card.item.deviation) }}</dd>
        </template>
        <template v-if="card.item.specialAmmo">
          <dt>Special ammo</dt>
          <dd>{{ card.item.specialAmmo }}</dd>
        </template>
      </dl>
      <div v-if="baseBar" class="bar"><SharpnessBar :bar="baseBar" :full="card.kind === 'weapon' ? card.item.sharpness : null" /></div>

      <dl v-if="card.kind === 'armor'" class="stat-list">
        <dt>Defense</dt>
        <dd :class="cmp('defense')" data-testid="card-defense">{{ card.item.defense }}{{ arrow('defense') }}</dd>
        <template v-for="el in ELEMENTS" :key="el">
          <dt :class="`el-${el}`">{{ elementLabel(el) }}</dt>
          <dd :class="cmp(`res.${el}`)">{{ card.item.resistances[el] }}{{ arrow(`res.${el}`) }}</dd>
        </template>
      </dl>

      <template v-if="card.kind === 'weapon' || card.kind === 'armor'">
        <div class="label" :class="cmp('slots')">Slots{{ arrow('slots') }}</div>
        <div class="slots"><SlotPips :slots="card.item.slots" :decorations="decorations" names /></div>
      </template>

      <div class="label">Skills</div>
      <ul class="skills">
        <li v-for="s in skills" :key="s.skillId" :class="skillClass(s)">
          {{ db.skill.get(s.skillId)?.name }} <b class="num">Lv {{ s.level }}</b>
        </li>
        <li v-if="card.kind === 'weapon' && card.item.setBonusId" class="faint">Set piece: {{ db.setBonus.get(card.item.setBonusId)?.name }}</li>
        <li v-if="!skills.length && !(card.kind === 'weapon' && card.item.setBonusId)" class="faint">—</li>
      </ul>
      <template v-if="setBonus">
        <div class="label">Set bonus</div>
        <div class="setb">{{ setBonus }}</div>
      </template>
    </template>
  </article>
</template>

<style scoped>
.card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-width: 0;
  font-size: 13px;
  padding-bottom: 8px;
}
.card.candidate {
  border-color: var(--gold-dim);
}
.card-head {
  padding: 4px 8px;
  border-bottom: 1px solid var(--border);
}
.tag {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold-dim);
}
.none {
  padding: 12px 8px;
}
.ident {
  display: flex;
  gap: 8px;
  padding: 8px;
  align-items: center;
}
.nm {
  font-weight: 600;
}
.sub {
  font-size: 11px;
}
.card .stat-list {
  padding: 2px 8px;
}
.wrap {
  white-space: normal;
}
.bar {
  padding: 4px 8px;
}
.label {
  font-size: 11px;
  color: var(--gold-dim);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 8px 2px;
}
.slots {
  padding: 0 8px;
}
.skills {
  list-style: none;
  margin: 0;
  padding: 0 8px;
}
.skills b {
  color: var(--gold);
  font-weight: 600;
}
.skills .up b,
.skills .up {
  color: var(--up);
}
.skills .down b,
.skills .down {
  color: var(--down);
}
.setb {
  padding: 0 8px;
}
</style>
