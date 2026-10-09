<script setup lang="ts">
import { ref } from 'vue'
import { useBuildStore } from '../../stores/build'
import { useSavedStore } from '../../stores/saved'
import { vFocusCell } from '../../input/focus-grid'

const build = useBuildStore()
const saved = useSavedStore()
const name = ref('')
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
          <span class="saved-name">{{ b.name }}</span>
          <span class="faint date">{{ date(b.savedAt) }}</span>
        </button>
        <button v-focus-cell="{ region: 'builds', row: i + 2, col: 1 }" class="mini" title="Overwrite with current build" @click="saved.overwrite(b.id, build.code)">⟳</button>
        <button v-focus-cell="{ region: 'builds', row: i + 2, col: 2 }" class="mini" title="Delete" data-testid="delete-build" @click="saved.remove(b.id)">✕</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.actions {
  margin-left: auto;
  display: flex;
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
.mini:focus-visible {
  color: var(--gold);
}
</style>
