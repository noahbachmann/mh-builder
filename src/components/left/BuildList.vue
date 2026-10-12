<script setup lang="ts">
import { computed, ref } from 'vue'
import { db } from '../../data'
import { suggestBuildName, uniqueName, type PresetGroup } from '../../engine'
import { focusCell, vFocusCell } from '../../input/focus-grid'
import { icons } from '../../icons'
import { shareUrlFor, useBuildStore } from '../../stores/build'
import { useCompareStore } from '../../stores/compare'
import { useSavedStore, type NamedBuild, type PresetBuild } from '../../stores/saved'
import { useUiStore } from '../../stores/ui'
import ConfirmDialog from '../base/ConfirmDialog.vue'
import Icon from '../base/Icon.vue'
import { GROUP_LABEL, presetSummaries, summarize } from './build-summary'

/**
 * Saved / Presets build lists. `manage` (Builds panel): save form, load, share link, overwrite, delete.
 * `pick` (comparison "+"): a row click emits `pick`; builds already compared can't be picked again.
 */
const props = defineProps<{ mode: 'manage' | 'pick'; region: string }>()
const emit = defineEmits<{ pick: [id: string] }>()

const build = useBuildStore()
const saved = useSavedStore()
const compare = useCompareStore()
const ui = useUiStore()
const name = ref('')
const manage = computed(() => props.mode === 'manage')

const summaries = computed(() => new Map(saved.builds.map((b) => [b.id, summarize(b)])))

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
  // the picker starts on the panel's tab but doesn't change it
  if (!manage.value) return
  try {
    localStorage.setItem(TAB_KEY, t)
  } catch {
    // storage disabled: per session only
  }
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

const copied = ref<string | null>(null)
async function share(b: NamedBuild) {
  const url = shareUrlFor(b.code)
  try {
    await navigator.clipboard.writeText(url)
    copied.value = b.id
    setTimeout(() => copied.value === b.id && (copied.value = null), 1500)
  } catch {
    // clipboard blocked (insecure origin): show the link so it can be copied by hand
    prompt('Copy this link', url)
  }
}

// loading replaces the current build: ask first, like the in-game "Load equipment?" prompt
const pendingLoad = ref<{ name: string; code: string; el: HTMLElement | null } | null>(null)
function activate(b: NamedBuild, e: Event) {
  if (!manage.value) {
    if (!compare.isSelected(b.id)) emit('pick', b.id)
    return
  }
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

const rowTitle = (b: NamedBuild, extra = '') =>
  manage.value ? `Load ${b.name}${extra}` : compare.isSelected(b.id) ? `${b.name} is compared already` : `Compare ${b.name}${extra}`
</script>

<template>
  <div class="build-list" :class="`is-${mode}`">
    <nav class="tabs" role="tablist" aria-label="Build lists">
      <button
        v-focus-cell="{ region, row: 1, col: 0 }"
        class="tab"
        role="tab"
        :class="{ 'is-active': tab === 'saved' }"
        :aria-selected="tab === 'saved'"
        data-testid="builds-tab-saved"
        @click="setTab('saved')"
      >
        Saved<span v-if="saved.builds.length" class="faint num count">{{ saved.builds.length }}</span>
      </button>
      <button
        v-focus-cell="{ region, row: 1, col: 1 }"
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
            v-focus-cell="{ region, row: b.row, col: 0 }"
            class="row-btn load"
            :class="{ on: !manage && compare.isSelected(b.id) }"
            :aria-disabled="!manage && compare.isSelected(b.id) ? true : undefined"
            :title="`${rowTitle(b)}\n${b.note}\n${presetSummaries.get(b.id)}`"
            :data-testid="manage ? 'load-preset' : 'pick-build'"
            @click="activate(b, $event)"
          >
            <span class="saved-text">
              <span class="saved-name">{{ b.name }}</span>
              <span class="faint sub">{{ b.note }}</span>
              <span class="faint sub">{{ presetSummaries.get(b.id) }}</span>
            </span>
            <span v-if="!manage && compare.isSelected(b.id)" class="check" aria-hidden="true">✓</span>
          </button>
          <button
            v-if="manage"
            v-focus-cell="{ region, row: b.row, col: 1 }"
            class="mini"
            :class="{ on: copied === b.id }"
            title="Copy share link"
            data-testid="share-build"
            @click="share(b)"
          >{{ copied === b.id ? 'Copied!' : 'Link' }}</button>
        </div>
      </section>
    </div>
    <form v-if="manage && tab === 'saved'" class="save" @submit.prevent="save">
      <input v-model="name" class="search" :placeholder="suggestedName" aria-label="Build name" data-testid="save-name" />
      <button v-focus-cell="{ region, row: 2, col: 1 }" class="btn" type="submit" data-testid="save">Save</button>
    </form>
    <div v-if="tab === 'saved'" class="panel-body">
      <p v-if="!saved.builds.length" class="faint empty">No saved builds. Builds are stored in this browser only.</p>
      <div v-for="(b, i) in saved.builds" :key="b.id" class="saved" data-testid="saved-build">
        <button
          v-focus-cell="{ region, row: i + 3, col: 0 }"
          class="row-btn load"
          :class="{ on: !manage && compare.isSelected(b.id) }"
          :aria-disabled="!manage && compare.isSelected(b.id) ? true : undefined"
          :title="rowTitle(b)"
          :data-testid="manage ? 'load-build' : 'pick-build'"
          @click="activate(b, $event)"
        >
          <span class="saved-text">
            <span class="saved-name">{{ b.name }}</span>
            <span class="faint sub">{{ summaries.get(b.id) }}</span>
          </span>
          <span v-if="!manage && compare.isSelected(b.id)" class="check" aria-hidden="true">✓</span>
        </button>
        <template v-if="manage">
          <button
            v-focus-cell="{ region, row: i + 3, col: 1 }"
            class="mini"
            :class="{ on: copied === b.id }"
            title="Copy share link"
            data-testid="share-build"
            @click="share(b)"
          >{{ copied === b.id ? 'Copied!' : 'Link' }}</button>
          <button
            v-focus-cell="{ region, row: i + 3, col: 2 }"
            class="mini"
            title="Save current build here (overwrite)"
            aria-label="Save current build here"
            data-testid="overwrite-build"
            @click="saved.overwrite(b.id, build.code)"
          >
            <Icon :id="icons.ui('save')" :size="15" />
          </button>
          <button
            v-focus-cell="{ region, row: i + 3, col: 3 }"
            class="mini"
            title="Delete"
            aria-label="Delete build"
            data-testid="delete-build"
            @click="saved.remove(b.id)"
          >
            <Icon :id="icons.ui('trash')" :size="15" />
          </button>
        </template>
      </div>
    </div>
    <ConfirmDialog
      v-if="manage"
      :open="pendingLoad !== null"
      message="Load equipment?"
      :detail="pendingLoad ? `${pendingLoad.name} replaces the current build.` : ''"
      @confirm="closeLoad(true)"
      @cancel="closeLoad(false)"
    />
  </div>
</template>

<style scoped>
.build-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.count {
  margin-left: 5px;
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
  display: flex;
  align-items: center;
  gap: 8px;
}
.load[aria-disabled='true'] {
  cursor: default;
}
.check {
  margin-left: auto;
  color: var(--gold);
}
.saved-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  text-align: left;
}
.load.on .saved-name {
  color: var(--gold);
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
  font-size: 12px;
  color: var(--text-dim);
}
.mini:hover,
.mini:focus-visible,
.mini.on {
  color: var(--gold);
}
</style>
