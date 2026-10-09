import { expect, test } from '@playwright/test'
import { CHALLENGER_JEWEL, DEFENDER_GS_1, DEFENDER_GS_2, RIMEGUARD_HELM_A, expectSlot, id36 } from './helpers'

const WEAK = `1.${id36(DEFENDER_GS_1)}`
const STRONG = `1.${id36(DEFENDER_GS_2)}_${id36(RIMEGUARD_HELM_A)}-${id36(CHALLENGER_JEWEL)}-x`

async function saveBuild(page: import('@playwright/test').Page, code: string, name: string) {
  await page.goto(`/?b=${code}`)
  await page.getByTestId('save-name').fill(name)
  await page.getByTestId('save').click()
}

test('compare saved builds: stats, skills and damage side by side', async ({ page }) => {
  await saveBuild(page, WEAK, 'Weak')
  await saveBuild(page, STRONG, 'Strong')
  await page.getByTestId('reset').click()

  await page.getByTestId('open-compare').click()
  await expect(page.getByTestId('compare-empty')).toBeVisible()

  // newest first: Strong, Weak
  const toggles = page.getByTestId('compare-toggle')
  await toggles.nth(0).click()
  await toggles.nth(1).click()
  await expect(toggles.nth(0)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('open-compare')).toHaveText('Compare (2)')

  const columns = page.getByTestId('compare-column')
  await expect(columns).toHaveCount(3)
  await expect(columns.nth(0)).toContainText('Current build')
  await expect(columns.nth(1)).toContainText('Strong')
  await expect(columns.nth(2)).toContainText('Weak')

  // empty current build has no EFR; the stronger saved build is best
  const efr = page.getByTestId('compare-efr').locator('td')
  await expect(efr.nth(0)).toHaveText('—')
  await expect(efr.nth(1)).toHaveAttribute('data-best', 'true')
  await expect(efr.nth(2)).not.toHaveAttribute('data-best')
  await expect(page.getByTestId('compare-attack').locator('td')).toHaveText(['—', '816', '624'])

  // Agitator only counts in the "all conditions" row
  const agitator = page.getByTestId('compare-skill-agitator').locator('td')
  await expect(agitator).toHaveText(['—', '1 / 5', '—'])

  // persisted selection survives reload
  await page.reload()
  await page.keyboard.press('c')
  await expect(page.getByTestId('compare-column')).toHaveCount(3)

  // load from the comparison
  await page.getByTestId('compare-load').first().click()
  await expectSlot(page, 'weapon', 'Defender Great Sword II')
  await expectSlot(page, 'head', 'Rimeguard Helm α+')

  await page.getByTestId('open-compare').click()
  await page.getByTestId('compare-remove').last().click()
  await expect(page.getByTestId('compare-column')).toHaveCount(2)
  // current build now equals "Strong": no best marks on EFR
  await expect(page.getByTestId('compare-efr').locator('[data-best]')).toHaveCount(0)
})
