import { expect, test } from '@playwright/test'
import { expectSlot } from './helpers'

test('equip a weapon from the tree and see the stats update', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('slot-weapon').click()
  await page.getByTestId('type-long-sword').click()
  await page.getByTestId('type-great-sword').click()
  await page.getByRole('button', { name: 'Defender Great Sword II', exact: true }).click()

  await expectSlot(page, 'weapon', 'Defender Great Sword II')
  await page.mouse.move(0, 0)
  await page.getByTestId('tab-stats').click()
  await expect(page.getByTestId('stat-attack')).toHaveText('816')
  await expect(page.getByTestId('stat-element-blast')).toHaveText('270')
  await expect(page.getByTestId('stat-efr')).not.toHaveText('—')
})

test('weapon search jumps to and highlights a weapon in another type', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('slot-weapon').click()
  await page.getByTestId('weapon-search').fill('Iron Grace III')
  await page.getByTestId('weapon-search').press('Enter')
  const node = page.getByRole('button', { name: 'Iron Grace III', exact: true })
  await expect(node).toBeFocused()
  await expect(node).toHaveClass(/highlight/)
  await expect(page.getByTestId('type-long-sword')).toHaveClass(/is-active/)
})

test('tree columns are grouped by rarity and nodes show element icons', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('slot-weapon').click()
  const left = async (name: string) => (await page.getByRole('button', { name, exact: true }).boundingBox())!.x
  // Buster Sword III (R2) and Defender Great Sword II (R3) sit in different rarity columns
  expect(await left('Defender Great Sword II')).toBeGreaterThan(await left('Buster Sword III'))
  await expect(page.locator('.rarity-col').first()).toHaveText('Rarity 1')
  await expect(page.getByRole('button', { name: 'Defender Great Sword I', exact: true }).getByTestId('node-elements').locator('[data-icon]')).toHaveAttribute('data-icon', 'status/blast')
})
