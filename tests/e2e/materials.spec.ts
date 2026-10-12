import { expect, test } from '@playwright/test'
import { DEFENDER_GS_2, RIMEGUARD_HELM_A, id36 } from './helpers'

const CODE = `1.${id36(DEFENDER_GS_2)}_${id36(RIMEGUARD_HELM_A)}`

test('saving without a name names the build after weapon and best resistance', async ({ page }) => {
  await page.goto(`/?b=${CODE}`)
  // Rimeguard Helm α+: ice 4 is the highest resistance
  await expect(page.getByTestId('save-name')).toHaveAttribute('placeholder', 'Defender Great Sword II / Ice res')
  await page.getByTestId('save').click()
  await page.getByTestId('save').click()
  await expect(page.getByTestId('saved-build').first()).toContainText('Defender Great Sword II / Ice res (2)')
  await expect(page.getByTestId('saved-build').nth(1)).toContainText('Defender Great Sword II / Ice res')
})

test('selected equipment shows forge / upgrade materials', async ({ page }) => {
  await page.goto(`/?b=${CODE}`)
  await page.getByTestId('slot-weapon').click()
  await page.getByTestId('tab-equipment').click()
  const mats = page.getByTestId('equipped-card').getByTestId('card-materials')
  await expect(mats).toContainText('Upgrade from Defender Great Sword I')
  await expect(mats).toContainText('Anjanath Scale')
})

test('materials checklist: M opens it, checks persist per build', async ({ page }) => {
  await page.goto(`/?b=${CODE}`)
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('m')
  const screen = page.getByTestId('materials-screen')
  await expect(screen).toBeVisible()
  // weapon from scratch: Defender I (Iron Ore) + upgrade (Anjanath Scale); helm: Velkhana parts
  await expect(screen).toContainText('Iron Ore')
  await expect(screen).toContainText('Anjanath Scale')
  await expect(screen).toContainText('Velkhana Cortex')
  await expect(screen).toContainText('forge Defender Great Sword I, then 1 upgrade')
  const lines = page.getByTestId('material-line')
  const total = await lines.count()
  await expect(page.getByTestId('materials-progress')).toContainText(`0 / ${total}`)

  const iron = lines.filter({ hasText: 'Iron Ore' })
  await iron.click()
  await expect(iron).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByTestId('materials-progress')).toContainText(`1 / ${total}`)

  await page.reload()
  await page.getByTestId('open-materials').click()
  await expect(page.getByTestId('material-line').filter({ hasText: 'Iron Ore' })).toHaveAttribute('aria-checked', 'true')

  // saving keeps the checks; the saved build gets its own tab (A / D)
  await page.getByTestId('save-name').fill('Ice set')
  await page.getByTestId('save').click()
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('d')
  await expect(page.getByTestId('materials-target').filter({ hasText: 'Ice set' })).toHaveClass(/is-active/)
  await expect(page.getByTestId('materials-progress')).toContainText(`1 / ${total}`)

  // a different current build has its own (empty) checklist
  await page.getByTestId('reset').click()
  await page.keyboard.press('a')
  await expect(page.getByTestId('materials-target').first()).toHaveClass(/is-active/)
  await expect(page.getByText('Nothing to craft')).toBeVisible()
  await page.getByTestId('materials-target').filter({ hasText: 'Ice set' }).click()
  await page.getByTestId('materials-reset').click()
  await expect(page.getByTestId('materials-progress')).toContainText(`0 / ${total}`)
})
