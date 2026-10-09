import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fetchSource, SOURCE_COMMIT, SOURCE_REPO } from './fetch.ts'
import { normalize } from './normalize.ts'

const root = resolve(import.meta.dirname, '../..')
const outDir = join(root, 'src/data')

// one record per line: readable diffs without bloating the file
function stringify(list: unknown[]): string {
  return `[\n${list.map((x) => JSON.stringify(x)).join(',\n')}\n]\n`
}

const src = fetchSource(join(root, '.cache'))
const { data, warnings } = normalize(src)
mkdirSync(outDir, { recursive: true })
for (const [name, list] of Object.entries(data)) {
  const file = join(outDir, `${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}.json`)
  writeFileSync(file, stringify(list as unknown[]))
  console.log(`${file}: ${(list as unknown[]).length}`)
}
writeFileSync(
  join(outDir, 'source.json'),
  `${JSON.stringify({ repo: SOURCE_REPO, commit: SOURCE_COMMIT, license: 'MIT' }, null, 2)}\n`,
)
for (const w of warnings) console.warn(`warn: ${w}`)
