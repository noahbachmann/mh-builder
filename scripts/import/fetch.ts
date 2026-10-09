import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

// pinned so regenerated data is reproducible; bump deliberately
export const SOURCE_REPO = 'gatheringhallstudios/MHWorldData'
export const SOURCE_COMMIT = 'be7362213d7d1e30b794e3b58d3f87712035658d'

/** Downloads + extracts the pinned source into `cacheDir`, returns path to `source_data/`. */
export function fetchSource(cacheDir: string): string {
  const dir = join(cacheDir, `MHWorldData-${SOURCE_COMMIT}`)
  const sourceData = join(dir, 'source_data')
  if (existsSync(sourceData)) return sourceData
  mkdirSync(cacheDir, { recursive: true })
  const tarball = join(cacheDir, `${SOURCE_COMMIT}.tar.gz`)
  const url = `https://codeload.github.com/${SOURCE_REPO}/tar.gz/${SOURCE_COMMIT}`
  console.log(`downloading ${url}`)
  execFileSync('curl', ['-sSfL', '-o', tarball, url], { stdio: 'inherit' })
  execFileSync('tar', ['-xzf', tarball, '-C', cacheDir, `MHWorldData-${SOURCE_COMMIT}/source_data`], {
    stdio: 'inherit',
  })
  rmSync(tarball)
  return sourceData
}
