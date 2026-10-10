/**
 * Downloads item renders (weapons, armor) and the icons MHW_Icons_SVG lacks (element, status, stat,
 * slot) from the Fextralife MHW wiki (MediaWiki API), converts them to small webp files.
 *
 * - renders: `public/renders/<file>.webp` (served as plain URLs, many items share one render)
 *   + `src/data/renders.json` (item id -> file). Armor uses the male render.
 * - icons:   `src/assets/icons/<id>.webp` (picked up by `src/icons.ts`)
 *
 * API responses and downloads are cached in `.cache/fextralife/`, so reruns only fetch what's new.
 *
 *   pnpm renders:import            # full run
 *   pnpm renders:import --offline  # only re-apply the base-item fallback to renders.json
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import sharp from 'sharp'
import type { Armor, Weapon } from '../../src/data/types.ts'
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
  const key = Buffer.from(qs.toString()).toString('base64url').slice(-120)
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

const slug = (file: string) => file.replace(/\.[a-z]+$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function main() {
  const weapons: Weapon[] = JSON.parse(readFileSync(join(ROOT, 'src/data/weapons.json'), 'utf8'))
  const armor: Armor[] = JSON.parse(readFileSync(join(ROOT, 'src/data/armor.json'), 'utf8'))

  // --offline: only re-apply the base-item fallback to the existing renders.json (no network)
  if (process.argv.includes('--offline')) {
    const file = join(ROOT, 'src/data/renders.json')
    const renders = JSON.parse(readFileSync(file, 'utf8'))
    fillFromBase(weapons, renders.weapon)
    fillFromBase(armor, renders.armor)
    writeFileSync(file, JSON.stringify(renders) + '\n')
    console.log(`offline: weapons ${Object.keys(renders.weapon).length}/${weapons.length}, armor ${Object.keys(renders.armor).length}/${armor.length}`)
    return
  }

  // renders
  // name -> image: exact title first, then each round of variants for what's still missing
  const names = [...new Set([...weapons, ...armor].map((x) => x.name))]
  const byName = new Map<string, string>()
  for (let round = 0; round < VARIANT_ROUNDS; round++) {
    const want = new Map<string, string>() // candidate title -> item name
    for (const n of names) {
      if (byName.has(n)) continue
      for (const t of titleVariants(n, round)) if (!want.has(t)) want.set(t, n)
    }
    if (!want.size) break
    for (const [t, img] of await imagesForTitles([...want.keys()])) {
      const n = want.get(t)!
      if (!byName.has(n)) byName.set(n, img)
    }
  }
  const byTitle = byName
  const files = [...new Set(byTitle.values())]
  const urls = await fileUrls(files, RENDER_SIZE)

  rmSync(RENDERS, { recursive: true, force: true })
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

  const map = (list: { id: number; name: string }[]) =>
    Object.fromEntries(list.flatMap((x) => {
      const f = byTitle.get(x.name)
      return f && written.has(f) ? [[x.id, slug(f)]] : []
    }))
  const renders = {
    source: 'monsterhunterworld.wiki.fextralife.com',
    weapon: fillFromBase(weapons, map(weapons)),
    armor: fillFromBase(armor, map(armor)),
  }
  writeFileSync(join(ROOT, 'src/data/renders.json'), JSON.stringify(renders) + '\n')
  const missing = [...weapons, ...armor].filter((x) => !(String(x.id) in ('rank' in x ? renders.armor : renders.weapon)))
  writeFileSync(join(CACHE, 'missing.txt'), missing.map((x) => x.name).join('\n'))
  console.log(
    `renders: ${written.size} files (${(bytes / 1e6).toFixed(1)} MB), weapons ${Object.keys(renders.weapon).length}/${weapons.length}, armor ${Object.keys(renders.armor).length}/${armor.length} (missing list: .cache/fextralife/missing.txt)`,
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
