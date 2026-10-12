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

  await page.getByTestId('open-overview').click()
  await page.locator('[data-testid="overview-tab"][data-tab="compare"]').click()
  await expect(page.getByTestId('compare-empty')).toBeVisible()

  // "+" opens the Builds list as a picker; newest first: Strong, Weak
  const picker = page.getByTestId('compare-picker')
  await page.getByTestId('compare-add').click()
  await expect(picker.getByTestId('save-name')).toHaveCount(0)
  await picker.getByTestId('pick-build').filter({ hasText: 'Strong' }).click()
  await expect(picker).toHaveCount(0)
  await page.getByTestId('compare-add').click()
  // compared builds stay listed but can't be picked twice
  await expect(picker.getByTestId('pick-build').filter({ hasText: 'Strong' })).toHaveAttribute('aria-disabled', 'true')
  await picker.getByTestId('pick-build').filter({ hasText: 'Weak' }).click()
  await expect(page.locator('[data-testid="overview-tab"][data-tab="compare"]')).toHaveText('Compare2')

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

  await page.keyboard.press('c')
  await page.getByTestId('compare-remove').last().click()
  await expect(page.getByTestId('compare-column')).toHaveCount(2)
  // current build now equals "Strong": no best marks on EFR
  await expect(page.getByTestId('compare-efr').locator('[data-best]')).toHaveCount(0)
})

test('compare picker: presets tab, full at 3, Esc closes it', async ({ page }) => {
  await saveBuild(page, WEAK, 'Weak')
  await page.keyboard.press('c')
  const picker = page.getByTestId('compare-picker')

  await page.getByTestId('compare-add').click()
  // cursor starts on the first pickable build
  await expect(picker.getByTestId('pick-build').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(picker).toHaveCount(0)
  await expect(page.getByTestId('compare-add')).toBeFocused()
  // Esc only closed the picker, not the compare tab
  await expect(page.locator('[data-testid="overview-tab"][data-tab="compare"]')).toHaveClass(/is-active/)

  await page.getByTestId('compare-add').click()
  await picker.getByTestId('builds-tab-presets').click()
  await picker.getByTestId('pick-build').filter({ hasText: 'IB LS late game' }).click()
  await page.getByTestId('compare-add').click()
  await picker.getByTestId('builds-tab-presets').click()
  await picker.getByTestId('pick-build').filter({ hasText: 'IB GS late game' }).click()
  await page.getByTestId('compare-add').click()
  await picker.getByTestId('builds-tab-saved').click()
  await picker.getByTestId('pick-build').filter({ hasText: 'Weak' }).click()
  await expect(page.getByTestId('compare-column')).toHaveCount(4)
  await expect(page.getByTestId('compare-add')).toHaveCount(0)

  // the picker's tab doesn't change the Builds panel's remembered tab
  await expect(page.getByTestId('save-name')).toBeVisible()
})
