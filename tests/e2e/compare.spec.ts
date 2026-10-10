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

test('passing over other slots on the way to a candidate keeps the selected slot and its card', async ({ page }) => {
  await page.goto(`/?b=1.${id36(DEFENDER_GS_1)}`)
  await page.getByTestId('slot-weapon').click()
  await page.getByTestId('tab-equipment').click()
  // mouse path crosses the empty chest slot before reaching the tree
  await page.getByTestId('slot-chest').hover()
  await expect(page.getByTestId('slot-chest')).not.toHaveClass(/is-selected/)
  await expect(page.getByTestId('slot-weapon')).toHaveClass(/is-selected/)
  await page.getByRole('button', { name: 'Defender Great Sword II', exact: true }).hover()
  await expect(page.getByTestId('compare-card')).toBeVisible()
  // renders sit side by side, each below its own card
  await expect(page.getByTestId('candidate-render')).toBeVisible()
  const box = (id: string) => page.getByTestId(id).boundingBox().then((b) => b!)
  const [eq, cand, eqCard, candCard] = await Promise.all(['equipped-render', 'candidate-render', 'equipped-card', 'compare-card'].map(box))
  expect(cand.y).toBe(eq.y)
  expect(cand.x).toBeGreaterThan(eq.x)
  expect(eq.y).toBeGreaterThanOrEqual(eqCard.y + eqCard.height)
  expect(cand.x).toBeCloseTo(candCard.x, 0)

  await page.mouse.move(0, 0)
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('compare-card')).toHaveCount(0)
  await expect(page.getByTestId('candidate-render')).toHaveCount(0)
  await expect(page.getByTestId('equipped-card').getByTestId('card-name')).toHaveText('Defender Great Sword I')
})
