import { expect, test, type Page } from '@playwright/test'
import { DEFENDER_GS_1, DEFENDER_GS_2, id36 } from './helpers'

const GS2 = `1.${id36(DEFENDER_GS_2)}`
const cells = (page: Page, part: string) => page.getByTestId('damage-row').filter({ hasText: part }).getByTestId('damage-cell')

test('M opens the Monsters page; field guide, info and loot', async ({ page }) => {
  await page.goto('/')
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('m')
  await expect(page.getByTestId('view-monsters')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('monster-item').first()).toBeFocused()

  await page.getByTestId('monster-search').fill('rathal')
  await page.getByTestId('monster-item').filter({ hasText: /^Rathalos$/ }).click()
  await expect(page.getByTestId('monster-name')).toHaveText('Rathalos')
  await expect(page).toHaveURL(/view=monsters&m=rathalos/)
  await expect(page.getByTestId('physiology').locator('tbody tr').first().locator('td').filter({ hasText: /\d/ }).first()).toHaveText('65')
  await expect(page.getByTestId('physiology').locator('tbody tr').first().locator('td.weak')).toHaveText(['65', '70', '60'])

  // info: weaknesses + breakable parts
  await expect(page.getByTestId('weaknesses').locator('tr', { hasText: 'Dragon' }).locator('td')).toHaveAttribute('data-stars', '3')
  await expect(page.getByTestId('monster-parts')).toContainText('Tail')

  // loot: Q/E to the Loot tab, A/D through the ranks
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('q')
  await expect(page.getByTestId('mtab-loot')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('loot-rank-MR')).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('a')
  await expect(page.getByTestId('loot-rank-HR')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('monster-loot')).toContainText('Rathalos Scale+')

  // equipment shortcut goes back
  await page.keyboard.press('1')
  await expect(page.getByTestId('view-equipment')).toHaveAttribute('aria-current', 'page')
  await expect(page).not.toHaveURL(/view=monsters/)
})

test('damage output: builds, wounded, state, motion value, weights', async ({ page }) => {
  // one saved build next to the current one
  await page.goto(`/?b=1.${id36(DEFENDER_GS_1)}`)
  await page.getByTestId('save-name').fill('Weak')
  await page.getByTestId('save').click()

  await page.goto(`/?view=monsters&m=barroth&b=${GS2}`)
  await expect(page.getByTestId('monster-name')).toHaveText('Barroth')
  await page.getByTestId('mtab-damage').click()
  await expect(page.getByTestId('damage-column')).toHaveCount(1)
  await page.getByTestId('damage-build').filter({ hasText: 'Weak' }).click()
  await expect(page.getByTestId('damage-column')).toHaveCount(2)

  // current (GS II) beats the saved GS I everywhere
  const forearms = cells(page, 'Forearms')
  await expect(forearms.nth(0)).toHaveClass(/best/)
  const base = Number(await forearms.nth(0).textContent())

  // wounding a part raises its hitzone
  const tail = cells(page, 'Tail').nth(0)
  const tailBase = Number(await tail.textContent())
  await page.getByTestId('damage-row').filter({ hasText: 'Tail' }).getByTestId('toggle-wounded').click()
  await expect.poll(async () => Number(await tail.textContent())).toBeGreaterThan(tailBase)

  // mud state: forearms 80 -> 35 cut
  await page.getByTestId('damage-output').getByTestId('mode-chip').filter({ hasText: 'Mud' }).click()
  await expect.poll(async () => Number(await forearms.nth(0).textContent())).toBeLessThan(base)
  await page.getByTestId('damage-output').getByTestId('mode-chip').filter({ hasText: 'Normal' }).click()

  // motion value scales raw
  await page.getByTestId('damage-mv').fill('50')
  await page.getByTestId('damage-mv').press('Enter')
  await expect.poll(async () => Number(await forearms.nth(0).textContent())).toBeCloseTo(base / 2, 0)

  // weights move the average: only forearms counted -> average = forearms
  const avg = page.getByTestId('damage-average').nth(0)
  for (const row of await page.getByTestId('damage-row').all()) {
    if ((await row.locator('th').textContent()) === 'Forearms') continue
    await row.getByTestId('weight-down').click()
  }
  await expect(avg).toHaveText((await forearms.nth(0).textContent())!)
})

test('deep link restores monster, page and build', async ({ page }) => {
  await page.goto(`/?view=monsters&m=nergigante&b=${GS2}`)
  await expect(page.getByTestId('monster-name')).toHaveText('Nergigante')
  await page.getByTestId('mtab-damage').click()
  await expect(cells(page, 'Head').first()).not.toHaveText('—')
  // switching back keeps the build
  await page.getByTestId('view-equipment').click()
  await expect(page.getByTestId('slot-weapon').getByTestId('slot-item')).toHaveText('Defender Great Sword II')
})
