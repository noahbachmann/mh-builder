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

  await page.getByTestId('load-build').click()
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
