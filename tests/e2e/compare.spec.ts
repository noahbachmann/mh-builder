import { expect, test } from '@playwright/test'
import { DEFENDER_GS_1, id36 } from './helpers'

test('hover opens the compare window with up/down values; leaving closes it', async ({ page }) => {
  await page.goto(`/?b=1.${id36(DEFENDER_GS_1)}`)
  await page.getByTestId('slot-weapon').click()
  await page.getByTestId('tab-equipment').click()
  const candidate = page.getByRole('button', { name: 'Defender Great Sword II', exact: true })
  await candidate.hover()

  const card = page.getByTestId('compare-card')
  await expect(card).toBeVisible()
  await expect(card.getByTestId('card-name')).toHaveText('Defender Great Sword II')
  await expect(card.getByTestId('card-attack')).toHaveText(/816/)
  await expect(card.getByTestId('card-attack')).toHaveClass(/up/)
  await expect(page.getByTestId('equipped-card').getByTestId('card-name')).toHaveText('Defender Great Sword I')

  // overall stats show the build diff while hovering
  await page.keyboard.press('q')
  await page.keyboard.press('q')
  await expect(page.getByTestId('tab-stats')).toHaveClass(/is-active/)
  await candidate.hover()
  await expect(page.getByTestId('stat-attack').locator('[data-dir="up"]')).toHaveText(/816/)

  // weaker candidate shows down
  await page.getByRole('button', { name: 'Buster Sword I', exact: true }).hover()
  await expect(page.getByTestId('stat-attack').locator('[data-dir="down"]')).toHaveText(/384/)

  // hover ends -> back to equipped values (blur the focused node too)
  await page.mouse.move(0, 0)
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('preview-banner')).toHaveCount(0)
  await expect(page.getByTestId('stat-attack')).toHaveText('624')
})
