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
