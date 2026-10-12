<script setup lang="ts">
import { useBuildStore } from '../../stores/build'
import { computed, ref } from 'vue'
import { db } from '../../data'
import { decodeBuild, evaluateBuild, suggestBuildName, uniqueName } from '../../engine'
import { fmt } from '../../format'
import { useCompareStore } from '../../stores/compare'
import { useSavedStore, type NamedBuild, type PresetBuild } from '../../stores/saved'
import type { PresetGroup } from '../../engine'
import { useUiStore } from '../../stores/ui'
import { focusCell, vFocusCell } from '../../input/focus-grid'
import { icons } from '../../icons'
import ConfirmDialog from '../base/ConfirmDialog.vue'
import Icon from '../base/Icon.vue'

const build = useBuildStore()
const saved = useSavedStore()
const compare = useCompareStore()
const ui = useUiStore()
const name = ref('')

// weapon + EFR so saved builds are easy to tell apart
function summarize(b: NamedBuild): string {
  const build = decodeBuild(b.code, db)
  const w = build?.weapon != null ? db.weapon.get(build.weapon) : undefined
  const efr = build && w ? evaluateBuild(build, db).efr?.efr : undefined
  return w ? `${efr !== undefined ? `EFR ${fmt(efr, 1)} · ` : ''}${w.name}` : 'No weapon'
}
const summaries = computed(() => new Map(saved.builds.map((b) => [b.id, summarize(b)])))
// presets never change: evaluate once
const presetSummaries = new Map(saved.presets.map((b) => [b.id, summarize(b)]))

type Tab = 'saved' | 'presets'
const TAB_KEY = 'mhw-builder.builds-tab'
function readTab(): Tab {
  try {
    return localStorage.getItem(TAB_KEY) === 'presets' ? 'presets' : 'saved'
  } catch {
    return 'saved'
  }
}
const tab = ref<Tab>(readTab())
function setTab(t: Tab) {
  tab.value = t
  try {
    localStorage.setItem(TAB_KEY, t)
  } catch {
    // storage disabled: per session only
  }
}

const GROUP_LABEL: Record<PresetGroup, string> = {
  iceborne: 'Iceborne late game',
  base: 'Base game late game',
  progression: 'Early & mid game',
}
// focus rows run on across group headers
const presetGroups = computed(() => {
  let row = 2
  return (Object.keys(GROUP_LABEL) as PresetGroup[]).map((group) => ({
    group,
    label: GROUP_LABEL[group],
    items: saved.presets.filter((p) => p.group === group).map((p): PresetBuild & { row: number } => ({ ...p, row: row++ })),
  }))
})
const copied = ref(false)

// empty name: "<weapon> / <best elemental res>", numbered if taken
const suggestedName = computed(() =>
  uniqueName(
    suggestBuildName(build.build, build.stats.defense.resistances, db) ?? `Build ${saved.builds.length + 1}`,
    saved.builds.map((b) => b.name),
  ),
)

function save() {
  saved.save(name.value.trim() || suggestedName.value, build.code)
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


// loading replaces the current build: ask first, like the in-game "Load equipment?" prompt
const pendingLoad = ref<{ name: string; code: string; el: HTMLElement | null } | null>(null)
function askLoad(b: { name: string; code: string }, e: Event) {
  pendingLoad.value = { name: b.name, code: b.code, el: e.currentTarget as HTMLElement | null }
}
function closeLoad(load: boolean) {
  const p = pendingLoad.value
  pendingLoad.value = null
  if (!p) return
  if (load) {
    build.loadCode(p.code)
    ui.closeDrawer()
  }
  if (p.el?.isConnected) focusCell(p.el)
}
</script>

<template>
  <section class="panel builds" aria-label="Saved builds">
    <header class="panel-head">
      Builds
      <span class="actions">
        <button v-focus-cell="{ region: 'builds', row: 0, col: 0 }" class="btn" data-testid="open-compare" @click="ui.openCompare()">Compare<template v-if="compare.selected.length"> ({{ compare.selected.length }})</template></button>
        <button v-focus-cell="{ region: 'builds', row: 0, col: 1 }" class="btn" data-testid="open-materials" @click="ui.openMaterials()">Materials</button>
        <button v-focus-cell="{ region: 'builds', row: 0, col: 2 }" class="btn" data-testid="share" @click="share">{{ copied ? 'Copied!' : 'Share link' }}</button>
        <button v-focus-cell="{ region: 'builds', row: 0, col: 3 }" class="btn" data-testid="reset" @click="build.reset()">Clear</button>
      </span>
    </header>
    <nav class="tabs" role="tablist" aria-label="Build lists">
      <button
        v-focus-cell="{ region: 'builds', row: 1, col: 0 }"
        class="tab"
        role="tab"
        :class="{ 'is-active': tab === 'saved' }"
        :aria-selected="tab === 'saved'"
        data-testid="builds-tab-saved"
        @click="setTab('saved')"
      >
        Saved<span v-if="saved.builds.length" class="faint num"> {{ saved.builds.length }}</span>
      </button>
      <button
        v-focus-cell="{ region: 'builds', row: 1, col: 1 }"
        class="tab"
        role="tab"
        :class="{ 'is-active': tab === 'presets' }"
        :aria-selected="tab === 'presets'"
        data-testid="builds-tab-presets"
        @click="setTab('presets')"
      >
        Presets
      </button>
    </nav>
    <div v-if="tab === 'presets'" class="panel-body" data-testid="preset-list">
      <section v-for="g in presetGroups" :key="g.group" :aria-label="g.label">
        <h3 class="group-head dim">{{ g.label }}</h3>
        <div v-for="b in g.items" :key="b.id" class="saved" data-testid="preset-build">
          <button
            v-focus-cell="{ region: 'builds', row: b.row, col: 0 }"
            class="row-btn load"
            :title="`Load ${b.name}\n${b.note}\n${presetSummaries.get(b.id)}`"
            data-testid="load-preset"
            @click="askLoad(b, $event)"
          >
            <span class="saved-text">
              <span class="saved-name">{{ b.name }}</span>
              <span class="faint sub">{{ b.note }}</span>
              <span class="faint sub">{{ presetSummaries.get(b.id) }}</span>
            </span>
          </button>
          <button
            v-focus-cell="{ region: 'builds', row: b.row, col: 1 }"
            class="mini"
            :class="{ on: compare.isSelected(b.id) }"
            :aria-pressed="compare.isSelected(b.id)"
            :disabled="!compare.isSelected(b.id) && compare.isFull"
            :title="compare.isSelected(b.id) ? 'Remove from comparison' : compare.isFull ? 'Comparing 3 builds already' : 'Add to comparison'"
            data-testid="compare-toggle"
            @click="compare.toggle(b.id)"
          >⇄</button>
        </div>
      </section>
    </div>
    <form v-if="tab === 'saved'" class="save" @submit.prevent="save">
      <input v-model="name" class="search" :placeholder="suggestedName" aria-label="Build name" data-testid="save-name" />
      <button v-focus-cell="{ region: 'builds', row: 2, col: 1 }" class="btn" type="submit" data-testid="save">Save</button>
    </form>
    <div v-if="tab === 'saved'" class="panel-body">
      <p v-if="!saved.builds.length" class="faint empty">No saved builds. Builds are stored in this browser only.</p>
      <div v-for="(b, i) in saved.builds" :key="b.id" class="saved" data-testid="saved-build">
        <button
          v-focus-cell="{ region: 'builds', row: i + 3, col: 0 }"
          class="row-btn load"
          :title="`Load ${b.name}`"
          data-testid="load-build"
          @click="askLoad(b, $event)"
        >
          <span class="saved-text">
            <span class="saved-name">{{ b.name }}</span>
            <span class="faint sub">{{ summaries.get(b.id) }}</span>
          </span>
        </button>
        <button
          v-focus-cell="{ region: 'builds', row: i + 3, col: 1 }"
          class="mini"
          :class="{ on: compare.isSelected(b.id) }"
          :aria-pressed="compare.isSelected(b.id)"
          :disabled="!compare.isSelected(b.id) && compare.isFull"
          :title="compare.isSelected(b.id) ? 'Remove from comparison' : compare.isFull ? 'Comparing 3 builds already' : 'Add to comparison'"
          data-testid="compare-toggle"
          @click="compare.toggle(b.id)"
        >⇄</button>
        <button
          v-focus-cell="{ region: 'builds', row: i + 3, col: 2 }"
          class="mini"
          title="Save current build here (overwrite)"
          aria-label="Save current build here"
          data-testid="overwrite-build"
          @click="saved.overwrite(b.id, build.code)"
        >
          <Icon :id="icons.ui('save')" :size="15" />
        </button>
        <button
          v-focus-cell="{ region: 'builds', row: i + 3, col: 3 }"
          class="mini"
          title="Delete"
          aria-label="Delete build"
          data-testid="delete-build"
          @click="saved.remove(b.id)"
        >
          <Icon :id="icons.ui('trash')" :size="15" />
        </button>
      </div>
    </div>
    <ConfirmDialog
      :open="pendingLoad !== null"
      message="Load equipment?"
      :detail="pendingLoad ? `${pendingLoad.name} replaces the current build.` : ''"
      @confirm="closeLoad(true)"
      @cancel="closeLoad(false)"
    />
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
.group-head {
  margin: 0;
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
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
.mini {
  display: inline-flex;
  align-items: center;
  padding: 4px 7px;
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
