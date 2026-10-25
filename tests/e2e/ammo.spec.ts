import { expect, test } from '@playwright/test'
import { BLACK_ACTINULA, DEFENDER_GS_1, id36 } from './helpers'

const LBG = `1.${id36(BLACK_ACTINULA)}`

test('selected equipment lists bowgun ammo in in-game order, Rapid Fire marked', async ({ page }) => {
  await page.goto(`/?b=${LBG}`)
  await page.getByTestId('slot-weapon').click()
  await page.getByTestId('tab-equipment').click()
  const rows = page.getByTestId('equipped-card').getByTestId('card-ammo-row')
  await expect(rows.first()).toContainText('Normal 1')
  const water = rows.filter({ hasText: 'Water' })
  await expect(water).toContainText('Rapid Fire')
  await expect(water.getByTestId('card-ammo-rapid')).toHaveAttribute('data-rounds', '3')
  await expect(rows.filter({ hasText: 'Sticky 1' }).getByTestId('card-ammo-rapid')).toHaveCount(0)
})

test('melee weapons have no ammo list or ammo section', async ({ page }) => {
  await page.goto(`/?b=1.${id36(DEFENDER_GS_1)}`)
  await page.getByTestId('slot-weapon').click()
  await page.getByTestId('tab-equipment').click()
  await expect(page.getByTestId('equipped-card').getByTestId('card-ammo')).toHaveCount(0)
  await page.goto(`/?view=monsters&m=rathalos&b=1.${id36(DEFENDER_GS_1)}`)
  await page.getByTestId('mtab-damage').click()
  await expect(page.getByTestId('damage-table')).toBeVisible()
  await expect(page.getByTestId('damage-ammo')).toHaveCount(0)
})

test('damage output fires the best ammo by default; another ammo can be picked', async ({ page }) => {
  await page.goto(`/?view=monsters&m=rathalos&b=${LBG}`)
  await page.getByTestId('mtab-damage').click()
  const auto = page.getByTestId('ammo-auto')
  await expect(auto).toHaveAttribute('aria-pressed', 'true')
  await expect(auto).toContainText('Best · Water')
  await expect(page.getByTestId('damage-weapon-notes')).toContainText('per shot of the chosen ammo')
  await expect(page.getByTestId('damage-weapon-notes')).not.toContainText('not included')

  const avg = page.getByTestId('damage-average').first()
  const best = await avg.textContent()
  // best ammo only in the Best chip
  await expect(page.getByTestId('ammo-chip').filter({ hasText: 'Water' })).toHaveCount(0)
  const normal3 = page.getByTestId('ammo-chip').filter({ hasText: 'Normal 3' })
  await normal3.click()
  await expect(normal3).toHaveAttribute('aria-pressed', 'true')
  await expect(auto).toHaveAttribute('aria-pressed', 'false')
  await expect(avg).not.toHaveText(best!)
  await expect(page.getByTestId('damage-cell').first()).toHaveAttribute('title', /^Normal 3: 1 hit/)

  // keyboard: Enter on the Best chip goes back
  await auto.focus()
  await page.keyboard.press('Enter')
  await expect(auto).toHaveAttribute('aria-pressed', 'true')
  await expect(avg).toHaveText(best!)
})
