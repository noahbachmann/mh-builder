import { expect, test } from '@playwright/test'
import { expectSlot } from './helpers'

test('equip armor and see skill totals update', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('slot-head').click()
  await page.getByTestId('armor-search').fill('Rimeguard Helm')
  await page.getByRole('button', { name: 'Rimeguard Helm α+', exact: true }).click()
  await expectSlot(page, 'head', 'Rimeguard Helm α+')

  await page.mouse.move(0, 0)
  await page.getByTestId('tab-skills').click()
  await expect(page.getByTestId('skill-divine-blessing')).toHaveAttribute('data-level', '2')
  await expect(page.getByTestId('skill-coalescence')).toHaveAttribute('data-level', '1')
  await expect(page.getByTestId('bonus-velkhana-divinity')).toBeVisible()

  // second set piece adds its skills and counts toward the set bonus
  await page.getByTestId('slot-chest').click()
  await page.getByTestId('armor-search').fill('Rimeguard Mail α+')
  await page.getByRole('button', { name: 'Rimeguard Mail α+', exact: true }).click()
  await page.mouse.move(0, 0)
  await expect(page.getByTestId('skill-quick-sheath')).toHaveAttribute('data-level', '2')
  await expect(page.getByTestId('skill-divine-blessing')).toHaveAttribute('data-level', '2')
  await expect(page.getByTestId('bonus-velkhana-divinity')).toContainText('2 pcs')
})

test('rank tabs filter the list', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('slot-head').click()
  await page.getByTestId('rank-LR').click()
  await expect(page.getByRole('button', { name: 'Leather Headgear', exact: true })).toBeVisible()
  await page.getByTestId('rank-MR').click()
  await expect(page.getByRole('button', { name: 'Leather Headgear', exact: true })).toHaveCount(0)
})

test('slot list rows keep their height with or without decoration slots', async ({ page }) => {
  await page.goto('/')
  const h = async () => (await page.getByTestId('slot-head').boundingBox())!.height
  const empty = await h()
  await page.getByTestId('slot-head').click()
  await page.getByTestId('armor-search').fill('Rimeguard Helm')
  await page.getByRole('button', { name: 'Rimeguard Helm α+', exact: true }).click()
  expect(await h()).toBe(empty)
})
