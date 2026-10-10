/**
 * Downloads item renders (weapons, armor), monster renders + list icons and the icons MHW_Icons_SVG lacks (element, status, stat,
 * slot) from the Fextralife MHW wiki (MediaWiki API), converts them to small webp files.
 *
 * - renders: `public/renders/<file>.webp` (served as plain URLs, many items share one render)
 *   + `src/data/renders.json` (item id -> file). Armor uses the male render.
 * - monsters: render (page infobox) like items, keyed `monster`; list icon (32px icons on the
 *   "Large Monsters" page) -> `src/assets/icons/monster/<slug>.webp`
 * - icons:   `src/assets/icons/<id>.webp` (picked up by `src/icons.ts`)
 *
 * API responses and downloads are cached in `.cache/fextralife/`, so reruns only fetch what's new.
 *
 *   pnpm renders:import            # full run
 *   pnpm renders:import --offline  # only re-apply the base-item fallback to renders.json
 *   pnpm renders:import --monsters # only monster renders + icons
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import sharp from 'sharp'
import type { Armor, Monster, Weapon } from '../../src/data/types.ts'
import { VARIANT_ROUNDS, fillFromBase, titleVariants } from './variants.ts'

const API = 'https://monsterhunterworld.wiki.fextralife.com/api.php'
const UA = 'mh-builder render import (fan-made, non-commercial)'
const ROOT = join(import.meta.dirname, '../..')
const CACHE = join(ROOT, '.cache/fextralife')
const RENDERS = join(ROOT, 'public/renders')
const ICONS = join(ROOT, 'src/assets/icons')
/** render box in px; shown at ~120px, 160 keeps it sharp on most screens */
const RENDER_SIZE = 160
const ICON_SIZE = 48

/** icon id -> wiki file */
const ICON_FILES: Record<string, string> = {
  'element/fire': 'Mhw-fire-damage.png',
  'element/water': 'Mhw-water-elemental-damage.png',
  'element/thunder': 'Mhw-thunder-damage.png',
  'element/ice': 'Mhw-ice-damage.png',
  'element/dragon': 'Mhw-dragon-damage.png',
  'status/poison': 'Poison.png',
  'status/paralysis': 'Paralysis.png',
  'status/sleep': 'Sleep.png',
  'status/blast': 'Blastblight.png',
  'stat/attack': 'Mhw-attack.png',
  'stat/affinity': 'Mhw-affinity.png',
  'stat/defense': 'Mhw-defense_s.png',
  'stat/elderseal': 'Mhw-elderseal.png',
  'slot/size-1': 'Gem_level_1.png',
  'slot/size-2': 'Gem_level_2.png',
  'slot/size-3': 'Gem_level_3.png',
  'slot/size-4': 'Decoration_level_4_mhw_wiki.png',
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const chunks = <T>(list: T[], n: number) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n))

async function get(url: string, attempt = 0): Promise<Response> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (res.ok) return res
  if (attempt < 3 && (res.status === 429 || res.status >= 500)) {
    await sleep(2000 * (attempt + 1))
    return get(url, attempt + 1)
  }
  throw new Error(`${res.status} ${url}`)
}

/** MediaWiki query, cached by params */
async function query(params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...params })
  // full hash: batches differing only mid-string must not share a key
  const key = createHash('sha1').update(qs.toString()).digest('hex')
  const file = join(CACHE, 'api', `${key}.json`)
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))
  const json = await (await get(`${API}?${qs}`)).json()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(json))
  await sleep(300)
  return json
}

const normTitle = (s: string) => s.replace(/_/g, ' ').trim().toLowerCase()
const fileKey = (f: string) => f.replace(/ /g, '_').replace(/^./, (c) => c.toUpperCase())

/** first infobox image that isn't a placeholder or a stat glyph */
function infoboxImage(wikitext: string): string | null {
  const start = wikitext.indexOf('infobox')
  if (start < 0) return null
  const box = wikitext.slice(start, wikitext.indexOf('|}', start) + 1 || undefined)
  for (const m of box.matchAll(/\[\[File:([^|\]]+)/gi)) {
    const f = m[1]!.trim()
    if (/placeholder|^mhw-|decoration_level|gem_level|rarity|rare-\d/i.test(f)) continue
    return fileKey(f)
  }
  return null
}

/** page title -> infobox image file, for every title that has one */
async function imagesForTitles(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (const batch of chunks(titles, 50)) {
    const j = await query({ titles: batch.join('|'), prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1' })
    // requested title -> final page title
    const final = new Map<string, string>(batch.map((t) => [normTitle(t), normTitle(t)]))
    for (const n of j.query.normalized ?? []) final.set(normTitle(n.from), normTitle(n.to))
    const redirects = new Map<string, string>((j.query.redirects ?? []).map((r: any) => [normTitle(r.from), normTitle(r.to)]))
    const pages = new Map<string, string>()
    for (const p of j.query.pages ?? []) {
      const content = p.revisions?.[0]?.slots?.main?.content
      const img = content ? infoboxImage(content) : null
      if (img) pages.set(normTitle(p.title), img)
    }
    for (const t of batch) {
      let k = final.get(normTitle(t))!
      k = redirects.get(k) ?? k
      const img = pages.get(k)
      if (img) out.set(t, img)
    }
  }
  return out
}

/** wiki file -> thumbnail URL at `width` (original if smaller) */
async function fileUrls(files: string[], width: number): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (const batch of chunks(files, 50)) {
    const j = await query({ titles: batch.map((f) => `File:${f}`).join('|'), prop: 'imageinfo', iiprop: 'url', iiurlwidth: String(width) })
    for (const p of j.query.pages ?? []) {
      const info = p.imageinfo?.[0]
      if (info) out.set(fileKey(p.title.replace(/^File:/, '')), info.thumburl ?? info.url)
    }
  }
  return out
}

async function download(url: string): Promise<Buffer> {
  const file = join(CACHE, 'files', Buffer.from(url).toString('base64url').slice(-120))
  if (existsSync(file)) return readFileSync(file)
  const buf = Buffer.from(await (await get(url)).arrayBuffer())
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, buf)
  // be gentle: the wiki rate-limits (connection resets) on bursts
  await sleep(250)
  return buf
}

const toWebp = (buf: Buffer, size: number) =>
  sharp(buf)
    .trim({ threshold: 1 })
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72, alphaQuality: 80, effort: 6 })
    .toBuffer()

/** runs `fn` over `items` with `n` workers */
async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) await fn(items[i++]!)
  }))
}

/** loose name key: case, `-`, `_`, `'` and spacing ignored (Kulu-Ya-Ku = kulu ya ku) */
const looseKey = (s: string) => s.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * monster name (loose key) -> 32px icon file, from the "Large Monsters" overview. Iceborne icons
 * carry `link=Name`; base-game ones don't, their name comes from the file
 * (`mhw-rathalos_icon.png`, `Great-Jagras-mhw-Icon-small.png`).
 */
async function monsterIconFiles(): Promise<Map<string, string>> {
  const j = await query({ titles: 'Large Monsters', prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1' })
  const content: string = j.query.pages?.[0]?.revisions?.[0]?.slots?.main?.content ?? ''
  const out = new Map<string, string>()
  for (const m of content.matchAll(/\[\[File:([^|\]]+)\|3[0-2]px((?:\|[^|\]]*)*)\]\]/gi)) {
    const file = m[1]!.trim()
    const link = /\|link=([^|\]]+)/.exec(m[2]!)?.[1]
    const name = link ?? file.replace(/\.[a-z]+$/i, '').replace(/^mhwi?-/i, '').replace(/[-_]?(mhw[-_])?icon([-_]small)?$/i, '')
    const key = looseKey(name)
    if (!out.has(key)) out.set(key, fileKey(file))
  }
  return out
}

const slug = (file: string) => file.replace(/\.[a-z]+$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * Fetches the infobox render for each name (exact title first, then each round of variants for
 * what's still missing) into `public/renders/`; returns name -> written file slug.
 */
async function writeRenders(names: string[]): Promise<{ byName: Map<string, string>; bytes: number }> {
  const byTitle = new Map<string, string>()
  for (let round = 0; round < VARIANT_ROUNDS; round++) {
    const want = new Map<string, string>() // candidate title -> name
    for (const n of names) {
      if (byTitle.has(n)) continue
      for (const t of titleVariants(n, round)) if (!want.has(t)) want.set(t, n)
    }
    if (!want.size) break
    for (const [t, img] of await imagesForTitles([...want.keys()])) {
      const n = want.get(t)!
      if (!byTitle.has(n)) byTitle.set(n, img)
    }
  }
  const files = [...new Set(byTitle.values())]
  const urls = await fileUrls(files, RENDER_SIZE)
  mkdirSync(RENDERS, { recursive: true })
  const written = new Set<string>()
  let bytes = 0
  await pool(files, 2, async (f) => {
    const url = urls.get(f)
    if (!url) return
    try {
      const webp = await toWebp(await download(url), RENDER_SIZE)
      writeFileSync(join(RENDERS, `${slug(f)}.webp`), webp)
      written.add(f)
      bytes += webp.length
    } catch (e) {
      console.warn(`skip ${f}: ${(e as Error).message}`)
    }
  })
  const byName = new Map([...byTitle].filter(([, f]) => written.has(f)).map(([n, f]) => [n, slug(f)]))
  return { byName, bytes }
}

const byId = (list: { id: number; name: string }[], byName: Map<string, string>): Record<string, string> =>
  Object.fromEntries(list.flatMap((x) => (byName.has(x.name) ? [[x.id, byName.get(x.name)!]] : [])))

/** Monster renders (-> `renders.monster`) and list icons (-> `src/assets/icons/monster/<slug>.webp`). */
async function monsterAssets(monsters: Monster[]): Promise<Record<string, string>> {
  const { byName, bytes } = await writeRenders(monsters.map((m) => m.name))
  const map = byId(monsters, byName)
  console.log(`monster renders: ${Object.keys(map).length}/${monsters.length} (${(bytes / 1e6).toFixed(1)} MB)`)

  const iconFiles = await monsterIconFiles()
  const iconUrls = await fileUrls([...new Set(iconFiles.values())], ICON_SIZE)
  const dir = join(ICONS, 'monster')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const noIcon: string[] = []
  for (const m of monsters) {
    const url = iconUrls.get(iconFiles.get(looseKey(m.name)) ?? '')
    if (!url) {
      noIcon.push(m.name)
      continue
    }
    const webp = await sharp(await download(url)).resize(ICON_SIZE, ICON_SIZE, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
    writeFileSync(join(dir, `${m.slug}.webp`), webp)
  }
  console.log(`monster icons: ${monsters.length - noIcon.length}/${monsters.length}${noIcon.length ? ` (missing: ${noIcon.join(', ')})` : ''}`)
  return map
}

async function main() {
  const weapons: Weapon[] = JSON.parse(readFileSync(join(ROOT, 'src/data/weapons.json'), 'utf8'))
  const armor: Armor[] = JSON.parse(readFileSync(join(ROOT, 'src/data/armor.json'), 'utf8'))
  const monsters: Monster[] = JSON.parse(readFileSync(join(ROOT, 'src/data/monsters.json'), 'utf8'))
  const rendersFile = join(ROOT, 'src/data/renders.json')

  // --offline: only re-apply the base-item fallback to the existing renders.json (no network)
  if (process.argv.includes('--offline')) {
    const renders = JSON.parse(readFileSync(rendersFile, 'utf8'))
    fillFromBase(weapons, renders.weapon)
    fillFromBase(armor, renders.armor)
    writeFileSync(rendersFile, JSON.stringify(renders) + '\n')
    console.log(`offline: weapons ${Object.keys(renders.weapon).length}/${weapons.length}, armor ${Object.keys(renders.armor).length}/${armor.length}`)
    return
  }

  // --monsters: only monster renders + icons, item renders stay as they are
  if (process.argv.includes('--monsters')) {
    const renders = JSON.parse(readFileSync(rendersFile, 'utf8'))
    renders.monster = await monsterAssets(monsters)
    writeFileSync(rendersFile, JSON.stringify(renders) + '\n')
    return
  }

  rmSync(RENDERS, { recursive: true, force: true })
  const { byName, bytes } = await writeRenders([...new Set([...weapons, ...armor].map((x) => x.name))])
  const renders = {
    source: 'monsterhunterworld.wiki.fextralife.com',
    weapon: fillFromBase(weapons, byId(weapons, byName)),
    armor: fillFromBase(armor, byId(armor, byName)),
    monster: await monsterAssets(monsters),
  }
  writeFileSync(rendersFile, JSON.stringify(renders) + '\n')
  const missing = [
    ...[...weapons, ...armor].filter((x) => !(String(x.id) in ('rank' in x ? renders.armor : renders.weapon))),
    ...monsters.filter((m) => !(String(m.id) in renders.monster)),
  ]
  writeFileSync(join(CACHE, 'missing.txt'), missing.map((x) => x.name).join('\n'))
  console.log(
    `renders: ${(bytes / 1e6).toFixed(1)} MB, weapons ${Object.keys(renders.weapon).length}/${weapons.length}, armor ${Object.keys(renders.armor).length}/${armor.length} (missing list: .cache/fextralife/missing.txt)`,
  )

  // icons
  const iconUrls = await fileUrls(Object.values(ICON_FILES), ICON_SIZE)
  for (const [id, f] of Object.entries(ICON_FILES)) {
    const url = iconUrls.get(fileKey(f))
    if (!url) throw new Error(`icon file missing on wiki: ${f}`)
    const dest = join(ICONS, `${id}.webp`)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, await sharp(await download(url)).resize(ICON_SIZE, ICON_SIZE, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer())
  }
  console.log(`icons: ${Object.keys(ICON_FILES).length} written to src/assets/icons`)
}

await main()
