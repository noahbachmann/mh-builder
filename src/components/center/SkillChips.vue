<script setup lang="ts">
import { db, type SkillRef } from '../../data'
import { vSkillInfo } from '../../stores/skill-info'
defineProps<{ skills: SkillRef[] }>()
</script>

<template>
  <span class="chips">
    <span v-for="s in skills" :key="s.skillId" v-skill-info="{ skillId: s.skillId, level: s.level }" class="chip">{{ db.skill.get(s.skillId)?.name }} <b class="num">{{ s.level }}</b></span>
  </span>
</template>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  font-size: 12px;
  color: var(--text-dim);
}
.chip b {
  color: var(--gold);
  font-weight: 600;
}
</style>
