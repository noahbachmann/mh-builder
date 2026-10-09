import { expect, test } from '@playwright/test'
import { RIMEGUARD_HELM_A, id36 } from './helpers'

test('slot a decoration with size rules enforced', async ({ page }) => {
  await page.goto(`/?b=1._${id36(RIMEGUARD_HELM_A)}`)
  await page.getByTestId('slot-decorations').click()

  // size-2 slot: only decorations of size <= 2 are offered
  await page.getByTestId('deco-slot-head-1').click()
  await expect(page.getByRole('button', { name: 'Challenger Jewel 2', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Acrobat Jewel 3', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Challenger Jewel 2', exact: true }).click()
  await expect(page.getByTestId('deco-slot-head-1')).toContainText('Challenger Jewel 2')

  // size-3 slot also offers size 3
  await page.getByTestId('deco-slot-head-0').click()
  await expect(page.getByRole('button', { name: 'Acrobat Jewel 3', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Acrobat Jewel 3', exact: true }).click()

  await expect(page.getByTestId('slot-decorations')).toContainText('2 / 2')
  await page.mouse.move(0, 0)
  await page.getByTestId('tab-skills').click()
  await expect(page.getByTestId('skill-agitator')).toHaveAttribute('data-level', '1')
  await expect(page.getByTestId('skill-safe-landing')).toHaveAttribute('data-level', '1')
})
