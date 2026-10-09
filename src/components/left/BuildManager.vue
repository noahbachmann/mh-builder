<script setup lang="ts">
import { useBuildStore } from '../../stores/build'
import { computed, ref } from 'vue'
import { db } from '../../data'
import { decodeBuild, evaluateBuild } from '../../engine'
import { fmt } from '../../format'
import { useCompareStore } from '../../stores/compare'
import { useSavedStore } from '../../stores/saved'
import { useUiStore } from '../../stores/ui'
import { vFocusCell } from '../../input/focus-grid'

const build = useBuildStore()
const saved = useSavedStore()
const compare = useCompareStore()
const ui = useUiStore()
const name = ref('')

// weapon + EFR so saved builds are easy to tell apart
const summaries = computed(
  () =>
    new Map(
      saved.builds.map((b) => {
        const build = decodeBuild(b.code, db)
        const w = build?.weapon != null ? db.weapon.get(build.weapon) : undefined
        const efr = build && w ? evaluateBuild(build, db).efr?.efr : undefined
        return [b.id, w ? `${efr !== undefined ? `EFR ${fmt(efr, 1)} · ` : ''}${w.name}` : 'No weapon']
      }),
    ),
)
const copied = ref(false)

function save() {
  saved.save(name.value || `Build ${saved.builds.length + 1}`, build.code)
  name.value = ''
}

async function share() {
  try {
    await navigator.clipboard.writeText(build.shareUrl)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // clipboard blocked (insecure origin): show the link so it can be copied by hand
    prompt('Copy this link', build.shareUrl)
  }
}

const date = (t: number) => new Date(t).toLocaleDateString()
</script>

<template>
  <section class="panel builds" aria-label="Saved builds">
    <header class="panel-head">
      Builds
      <span class="actions">
        <button v-focus-cell="{ region: 'builds', row: 0, col: 0 }" class="btn" data-testid="open-compare" @click="ui.screen = 'compare'">Compare<template v-if="compare.selected.length"> ({{ compare.selected.length }})</template></button>
        <button v-focus-cell="{ region: 'builds', row: 0, col: 1 }" class="btn" data-testid="share" @click="share">{{ copied ? 'Copied!' : 'Share link' }}</button>
        <button v-focus-cell="{ region: 'builds', row: 0, col: 2 }" class="btn" data-testid="reset" @click="build.reset()">Clear</button>
      </span>
    </header>
    <form class="save" @submit.prevent="save">
      <input v-model="name" class="search" placeholder="Build name" aria-label="Build name" data-testid="save-name" />
      <button v-focus-cell="{ region: 'builds', row: 1, col: 1 }" class="btn" type="submit" data-testid="save">Save</button>
    </form>
    <div class="panel-body">
      <p v-if="!saved.builds.length" class="faint empty">No saved builds. Builds are stored in this browser only.</p>
      <div v-for="(b, i) in saved.builds" :key="b.id" class="saved" data-testid="saved-build">
        <button
          v-focus-cell="{ region: 'builds', row: i + 2, col: 0 }"
          class="row-btn load"
          :title="`Load ${b.name}`"
          data-testid="load-build"
          @click="build.loadCode(b.code)"
        >
          <span class="saved-text">
            <span class="saved-name">{{ b.name }}</span>
            <span class="faint sub">{{ summaries.get(b.id) }}</span>
          </span>
          <span class="faint date">{{ date(b.savedAt) }}</span>
        </button>
        <button
          v-focus-cell="{ region: 'builds', row: i + 2, col: 1 }"
          class="mini"
          :class="{ on: compare.isSelected(b.id) }"
          :aria-pressed="compare.isSelected(b.id)"
          :disabled="!compare.isSelected(b.id) && compare.isFull"
          :title="compare.isSelected(b.id) ? 'Remove from comparison' : compare.isFull ? 'Comparing 3 builds already' : 'Add to comparison'"
          data-testid="compare-toggle"
          @click="compare.toggle(b.id)"
        >⇄</button>
        <button v-focus-cell="{ region: 'builds', row: i + 2, col: 2 }" class="mini" title="Overwrite with current build" @click="saved.overwrite(b.id, build.code)">⟳</button>
        <button v-focus-cell="{ region: 'builds', row: i + 2, col: 3 }" class="mini" title="Delete" data-testid="delete-build" @click="saved.remove(b.id)">✕</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.builds .panel-head {
  flex-wrap: wrap;
  row-gap: 4px;
}
.actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  text-transform: none;
  letter-spacing: 0;
}
.save {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-bottom: 1px solid var(--border);
}
.empty {
  padding: 8px 12px;
  margin: 0;
  font-size: 12px;
}
.saved {
  display: flex;
  align-items: center;
}
.load {
  flex: 1;
  min-width: 0;
  min-height: 28px;
}
.saved-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  text-align: left;
}
.sub {
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.saved-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.date {
  margin-left: auto;
  font-size: 11px;
}
.mini {
  padding: 4px 8px;
  color: var(--text-dim);
}
.mini:hover,
.mini:focus-visible,
.mini.on {
  color: var(--gold);
}
.mini:disabled {
  opacity: 0.35;
}
</style>
