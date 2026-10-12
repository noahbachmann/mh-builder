import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { db } from '../data'
import { shareUrlFor, useBuildStore } from './build'
import { MAX_COMPARED, useCompareStore } from './compare'
import { usePreviewStore } from './preview'
import { useSavedStore } from './saved'
import { useUiStore } from './ui'

const gs1 = db.data.weapons.find((w) => w.name === 'Defender Great Sword I')!
const gs2 = db.data.weapons.find((w) => w.name === 'Defender Great Sword II')!

beforeEach(() => {
  localStorage.clear()
  history.replaceState(null, '', '/')
  setActivePinia(createPinia())
})

describe('build store', () => {
  it('derives stats and mirrors the build into the URL', async () => {
    const s = useBuildStore()
    s.equip('weapon', gs1.id)
    expect(s.stats.weapon?.attack).toBe(624)
    await nextTick()
    expect(location.search).toBe(`?b=${s.code}`)
    s.reset()
    await nextTick()
    expect(location.search).toBe('')
  })

  it('loads a build from the URL on start', () => {
    history.replaceState(null, '', `/?b=1.${gs2.id.toString(36)}`)
    expect(useBuildStore().build.weapon).toBe(gs2.id)
  })

  it('share links open only the given build', () => {
    history.replaceState(null, '', '/?view=monsters&m=rathalos&b=old')
    const url = new URL(shareUrlFor('1.abc'))
    expect(url.pathname).toBe('/')
    expect([...url.searchParams]).toEqual([['b', '1.abc']])
  })
})

describe('preview store', () => {
  it('previews a candidate without changing the build', () => {
    const b = useBuildStore()
    const p = usePreviewStore()
    b.equip('weapon', gs1.id)
    p.show({ kind: 'equip', slot: 'weapon', id: gs2.id })
    expect(p.stats?.weapon?.attack).toBe(816)
    expect(p.diff?.attack).toMatchObject({ dir: 'up', delta: 192 })
    expect(b.build.weapon).toBe(gs1.id)
  })

  it('clear(c) only clears the matching candidate', () => {
    const p = usePreviewStore()
    const a = { kind: 'equip', slot: 'weapon', id: gs1.id } as const
    const c = { kind: 'equip', slot: 'weapon', id: gs2.id } as const
    p.show(c)
    p.clear(a)
    expect(p.candidate).toEqual(c)
    p.clear(c)
    expect(p.candidate).toBeNull()
  })

  it('a pinned (tapped) candidate survives blur / hover of others until replaced or cleared', () => {
    const p = usePreviewStore()
    const a = { kind: 'equip', slot: 'weapon', id: gs1.id } as const
    const c = { kind: 'equip', slot: 'weapon', id: gs2.id } as const
    p.show(c, { pinned: true })
    p.clear(c)
    expect(p.candidate).toEqual(c)
    p.show(a)
    expect(p.candidate).toEqual(c)
    // focus of the same item keeps the pin
    p.show(c)
    expect(p.pinned).toBe(true)
    p.show(a, { pinned: true })
    expect(p.isCandidate(a)).toBe(true)
    p.clear()
    expect(p.candidate).toBeNull()
    expect(p.pinned).toBe(false)
  })
})

describe('saved store', () => {
  it('persists to localStorage', () => {
    const s = useSavedStore()
    const b = s.save('  Mine ', '1.abc')
    expect(b.name).toBe('Mine')
    setActivePinia(createPinia())
    const again = useSavedStore()
    expect(again.builds.map((x) => x.code)).toEqual(['1.abc'])
    again.rename(b.id, 'Renamed')
    again.overwrite(b.id, '1.def')
    expect(again.builds[0]).toMatchObject({ name: 'Renamed', code: '1.def' })
    again.remove(b.id)
    expect(JSON.parse(localStorage.getItem('mhw-builder.saved')!)).toEqual([])
  })

  it('survives corrupt storage', () => {
    localStorage.setItem('mhw-builder.saved', '{not json')
    expect(useSavedStore().builds).toEqual([])
  })

  it('finds saved builds and presets by id; presets are not saved builds', () => {
    const s = useSavedStore()
    const b = s.save('Mine', '1.abc')
    const preset = s.presets.find((p) => p.name === 'IB LS late game')!
    expect(preset.id).toBe('preset:ib-ls-late')
    expect(s.find(preset.id)).toEqual(preset)
    expect(s.find(b.id)?.name).toBe('Mine')
    expect(s.find('preset:nope')).toBeUndefined()
    expect(s.builds.map((x) => x.id)).toEqual([b.id])
  })
})

describe('ui store', () => {
  it('cycles sidebar tabs and opens screens per slot', () => {
    const ui = useUiStore()
    ui.cycleTab(-1)
    expect(ui.tab).toBe('equipment')
    ui.cycleTab(1)
    expect(ui.tab).toBe('stats')
    ui.openSlot('charm')
    expect(ui.screen).toBe('charm')
    ui.openSlot('legs')
    expect(ui.screen).toBe('armor')
    expect(ui.selectedSlot).toBe('legs')
  })

  it('opens the overview on a sub-tab, keeps the last one, cycles sub-tabs', () => {
    const ui = useUiStore()
    ui.openSlot('weapon')
    ui.drawer = 'left'
    ui.openOverview('materials')
    expect([ui.screen, ui.overviewTab, ui.drawer]).toEqual(['overview', 'materials', null])
    ui.openSlot('head')
    ui.openOverview()
    expect(ui.overviewTab).toBe('materials')
    ui.cycleOverviewTab(1)
    expect(ui.overviewTab).toBe('summary')
    ui.cycleOverviewTab(-1)
    expect(ui.overviewTab).toBe('materials')
  })
})

describe('compare store', () => {
  const code = (id: number) => `1.${id.toString(36)}`

  it('current build is the first column, then selected saved builds', async () => {
    const saved = useSavedStore()
    const a = saved.save('A', code(gs1.id))
    const b = saved.save('B', code(gs2.id))
    const c = useCompareStore()
    c.toggle(b.id)
    c.toggle(a.id)
    expect(c.columns.map((x) => x.name)).toEqual(['Current build', 'B', 'A'])
    expect(c.columns[2]!.stats.weapon?.attack).toBe(624)
    expect(c.comparison.metrics.find((m) => m.key === 'attack')!.values).toEqual([null, 816, 624])

    c.toggle(b.id)
    expect(c.selected).toEqual([a.id])
    await nextTick()
    expect(JSON.parse(localStorage.getItem('mhw-builder.compare')!)).toEqual([a.id])
  })

  it(`caps at ${MAX_COMPARED} and drops deleted builds`, async () => {
    const saved = useSavedStore()
    const ids = [1, 2, 3, 4].map((i) => saved.save(`B${i}`, code(gs1.id)).id)
    const c = useCompareStore()
    ids.forEach((id) => c.toggle(id))
    expect(c.selected).toHaveLength(MAX_COMPARED)
    expect(c.isFull).toBe(true)
    saved.remove(ids[0]!)
    await nextTick()
    expect(c.selected).toEqual(ids.slice(1, 3))
  })

  it('compares presets and keeps them when saved builds change', async () => {
    const saved = useSavedStore()
    const preset = saved.presets[0]!
    const c = useCompareStore()
    c.toggle(preset.id)
    expect(c.columns.map((x) => x.name)).toEqual(['Current build', preset.name])
    expect(c.columns[1]!.stats.weapon).not.toBeNull()
    saved.save('Other', code(gs1.id))
    await nextTick()
    expect(c.selected).toEqual([preset.id])
  })
})
