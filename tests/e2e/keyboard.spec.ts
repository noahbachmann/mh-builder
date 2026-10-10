import { expect, test } from '@playwright/test'

test('complete a full build using keyboard only', async ({ page }) => {
  await page.goto('/')
  await page.locator('body').click({ position: { x: 5, y: 5 } })

  // weapon: first node of the Great Sword tree, then move right to its upgrade
  await page.keyboard.press('1')
  await expect(page.getByRole('button', { name: 'Defender Great Sword I', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('slot-weapon').getByTestId('slot-item')).toHaveText('Defender Great Sword II')

  // armor 2-6 + charm 7: first item of each list (cursor starts on the first entry)
  for (const [key, slot] of [
    ['2', 'head'],
    ['3', 'chest'],
    ['4', 'arms'],
    ['5', 'waist'],
    ['6', 'legs'],
    ['7', 'charm'],
  ] as const) {
    await page.keyboard.press(key)
    await expect(page.locator('.row-btn[data-armor-id], .row-btn[data-charm-id]').first()).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId(`slot-${slot}`).getByTestId('slot-item')).not.toHaveText('None')
  }

  // sidebar tabs via Q/E
  await page.keyboard.press('e')
  await expect(page.getByTestId('tab-skills')).toHaveClass(/is-active/)
  await page.keyboard.press('q')
  await expect(page.getByTestId('tab-stats')).toHaveClass(/is-active/)

  // armor rank sub-tabs via A / D
  await page.keyboard.press('2')
  await page.keyboard.press('d')
  await expect(page.getByTestId('rank-all')).toHaveClass(/is-active/)
  await page.keyboard.press('a')
  await expect(page.getByTestId('rank-MR')).toHaveClass(/is-active/)

  // search: F focuses the search box, Esc leaves it
  await page.keyboard.press('f')
  await expect(page.getByTestId('armor-search')).toBeFocused()
  await page.keyboard.press('Escape')

  // decorations: 8, Enter on first slot, Down to first decoration, Enter
  await page.keyboard.press('8')
  await expect(page.locator('[data-deco-slot]').first()).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('slot-decorations')).toContainText(/^.*1 \/ \d+ slots filled/)

  // Esc back to the slot list
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('slot-weapon')).toBeVisible()
  await expect(page.locator('[data-region="slots"]:focus')).toHaveCount(1)
  await expect(page).toHaveURL(/\?b=1\./)
})

test('monsters page using keyboard only', async ({ page }) => {
  await page.goto('/?b=1.1jm')
  await page.locator('body').click({ position: { x: 5, y: 5 } })

  // S -> monster list, arrows + Enter pick the second monster
  await page.keyboard.press('s')
  await expect(page.getByTestId('monster-item').first()).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('monster-name')).toHaveText('Kulu-Ya-Ku')

  // E -> Damage Output, Tab into its controls, Enter toggles the first part's wound
  await page.keyboard.press('e')
  await expect(page.getByTestId('mtab-damage')).toHaveAttribute('aria-selected', 'true')
  await page.getByTestId('toggle-wounded').first().focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('toggle-wounded').first()).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(page.getByTestId('toggle-wounded').nth(1)).toBeFocused()

  // F focuses the monster search, Esc leaves it, S goes back
  await page.keyboard.press('f')
  await expect(page.getByTestId('monster-search')).toBeFocused()
  await page.keyboard.press('Escape')
  await page.keyboard.press('s')
  await expect(page.getByTestId('view-equipment')).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('[data-region="slots"]:focus')).toHaveCount(1)
})
