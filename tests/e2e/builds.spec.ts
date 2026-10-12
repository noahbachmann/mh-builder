import { expect, test } from '@playwright/test'
import { DEFENDER_GS_2, RIMEGUARD_HELM_A, CHALLENGER_JEWEL, id36, expectSlot } from './helpers'

const CODE = `1.${id36(DEFENDER_GS_2)}_${id36(RIMEGUARD_HELM_A)}-x-${id36(CHALLENGER_JEWEL)}`

test('save a build, reload, load it again', async ({ page }) => {
  await page.goto(`/?b=${CODE}`)
  await expectSlot(page, 'head', 'Rimeguard Helm α+')
  await page.getByTestId('save-name').fill('My test build')
  await page.getByTestId('save').click()
  await expect(page.getByTestId('saved-build')).toContainText('My test build')

  await page.getByTestId('reset').click()
  await expectSlot(page, 'head', 'None')
  await page.goto('/')
  await page.reload()
  await expectSlot(page, 'weapon', 'None')
  await expect(page.getByTestId('saved-build')).toContainText('My test build')

  // load asks first; No keeps the current (empty) build
  await page.getByTestId('load-build').click()
  await expect(page.getByTestId('confirm-dialog')).toContainText('Load equipment?')
  await page.getByTestId('confirm-no').click()
  await expectSlot(page, 'weapon', 'None')
  await page.getByTestId('load-build').click()
  await page.getByTestId('confirm-yes').click()
  await expectSlot(page, 'weapon', 'Defender Great Sword II')
  await expectSlot(page, 'head', 'Rimeguard Helm α+')
  await expect(page.getByTestId('slot-decorations')).toContainText('1 / 2')

  await page.getByTestId('delete-build').click()
  await expect(page.getByTestId('saved-build')).toHaveCount(0)
})

test('open a shared build URL and get the same build', async ({ page, browser }) => {
  await page.goto('/')
  await page.getByTestId('slot-head').click()
  await page.getByTestId('armor-search').fill('Rimeguard Helm')
  await page.getByRole('button', { name: 'Rimeguard Helm α+', exact: true }).click()
  await page.getByTestId('slot-charm').click()
  await page.getByTestId('charm-search').fill('Attack Charm')
  await page.locator('[data-charm-id]').first().click()
  const charm = await page.getByTestId('slot-charm').getByTestId('slot-item').textContent()
  await expect(page).toHaveURL(/\?b=1\./)
  const url = page.url()

  // fresh context = another visitor (no shared localStorage)
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  const other = await ctx.newPage()
  await other.goto(url)
  await expectSlot(other, 'head', 'Rimeguard Helm α+')
  await expectSlot(other, 'charm', charm!)
  await ctx.close()
})

test('presets tab: load a preset, compare it, keyboard and remembered tab', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('preset-build')).toHaveCount(0)
  await page.getByTestId('builds-tab-presets').click()
  await expect(page.getByTestId('save-name')).toHaveCount(0)
  const list = page.getByTestId('preset-list')
  await expect(list).toContainText('Iceborne late game')
  await expect(list).toContainText('Base game late game')
  await expect(list).toContainText('Early & mid game')
  const ls = page.getByTestId('preset-build').filter({ hasText: 'IB LS late game' })
  await expect(ls).toContainText('Fatalis Zaggespanon')

  await ls.getByTestId('load-preset').click()
  await expect(page.getByTestId('confirm-dialog')).toContainText('IB LS late game replaces the current build.')
  await page.getByTestId('confirm-yes').click()
  await expectSlot(page, 'weapon', 'Fatalis Zaggespanon')
  await expectSlot(page, 'chest', 'Dragonhide β+')
  await expect(page.getByTestId('slot-decorations')).toContainText('16 / 16')

  // presets go into the comparison like saved builds
  await ls.getByTestId('compare-toggle').click()
  await page.getByTestId('open-compare').click()
  await expect(page.getByTestId('compare-screen')).toContainText('IB LS late game')

  // tab is remembered; keyboard: Enter on a tab, arrow down into the list
  await page.reload()
  await expect(page.getByTestId('preset-list')).toBeVisible()
  await page.getByTestId('builds-tab-saved').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('save-name')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('builds-tab-presets')).toBeFocused()
  await page.keyboard.press('Enter')
  // down keeps the column: lands on the first preset's ⇄
  await page.keyboard.press('ArrowDown')
  await expect(page.getByTestId('preset-build').first().getByTestId('compare-toggle')).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('load-preset').first()).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('confirm-dialog')).toContainText('IB GS late game')
})
