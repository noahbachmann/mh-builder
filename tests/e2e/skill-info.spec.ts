import { expect, test } from '@playwright/test'
import { RIMEGUARD_HELM_A, id36 } from './helpers'

test('hovering a skill shows its infobox with every level', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('slot-head').click()
  await page.getByTestId('armor-search').fill('Rimeguard Helm')
  await page.getByRole('button', { name: 'Rimeguard Helm α+', exact: true }).click()
  await page.mouse.move(0, 0)
  await page.getByTestId('tab-skills').click()

  const name = page.getByTestId('skill-divine-blessing').locator('[data-skill-info]')
  await expect(name).toHaveCSS('cursor', 'help')
  await name.hover()
  const box = page.getByTestId('skill-infobox')
  await expect(box).toBeVisible()
  await expect(box).toContainText('Divine Blessing')
  await expect(box.locator('li')).toHaveCount(5)
  await expect(page.getByTestId('skill-infobox-level-2')).toHaveClass(/current/)

  await page.mouse.move(0, 0)
  await expect(box).toHaveCount(0)
})

test('picker skill chips show secret unlocks', async ({ page }) => {
  await page.goto(`/?b=1._${id36(RIMEGUARD_HELM_A)}`)
  await page.getByTestId('slot-decorations').click()
  await page.getByTestId('deco-slot-head-1').click()
  await page.getByTestId('deco-search').fill('Challenger')
  await page.getByRole('button', { name: 'Challenger Jewel 2', exact: true }).locator('[data-skill-info="agitator"]').hover()
  const box = page.getByTestId('skill-infobox')
  await expect(box.locator('li')).toHaveCount(7)
  await expect(box).toContainText('Agitator Secret')
  await expect(page.getByTestId('skill-infobox-level-1')).toHaveClass(/current/)
})
