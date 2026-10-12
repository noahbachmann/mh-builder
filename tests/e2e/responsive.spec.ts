import { expect, test, type Page } from '@playwright/test'
import { slotItem } from './helpers'

const noPageOverflow = async (page: Page, what: string) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth), what).toBeLessThanOrEqual(page.viewportSize()!.width)

test.describe('phone (touch)', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true })

  test('slot drawer, tap previews, second tap equips, info drawer shows the result', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('slot-head')).toBeHidden()
    await page.getByTestId('toggle-left').tap()
    await page.getByTestId('slot-head').tap()
    // picking a slot closes the drawer and shows the picker
    await expect(page.getByTestId('slot-head')).toBeHidden()
    const item = page.locator('.row-btn[data-armor-id]').first()
    const name = (await item.getAttribute('aria-label'))!

    await item.tap()
    await expect(item).toHaveClass(/is-previewing/)
    await expect(slotItem(page, 'head')).toHaveText('None')
    await expect(page.getByTestId('toggle-right')).toHaveClass(/has-preview/)

    await item.tap()
    await expect(slotItem(page, 'head')).toHaveText(name)
    await expect(page.getByTestId('toggle-right')).not.toHaveClass(/has-preview/)

    await page.getByTestId('toggle-right').tap()
    await page.getByTestId('tab-equipment').tap()
    await expect(page.getByTestId('selected-equipment')).toContainText(name)
    // full-width drawer: the header button closes it
    await page.getByTestId('toggle-right').tap()
    await expect(page.getByTestId('selected-equipment')).toBeHidden()
  })

  test('monster list drawer and monster info drawer', async ({ page }) => {
    await page.goto('/?view=monsters')
    await page.getByTestId('toggle-left').tap()
    await page.getByTestId('monster-item').filter({ hasText: 'Nergigante' }).first().tap()
    await expect(page.getByTestId('monster-item').first()).toBeHidden()
    await expect(page.getByTestId('monster-name')).toHaveText('Nergigante')
    await page.getByTestId('toggle-right').tap()
    await page.getByTestId('mtab-damage').tap()
    await expect(page.getByTestId('mtab-damage')).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('mtab-damage')).toBeInViewport()
  })
})

test.describe('340px', () => {
  test.use({ viewport: { width: 340, height: 700 } })

  test('no horizontal page overflow on any screen', async ({ page }) => {
    await page.goto('/')
    await page.locator('body').click({ position: { x: 5, y: 690 } })
    await noPageOverflow(page, 'overview')
    for (const [key, what] of [
      ['1', 'weapon tree'],
      ['2', 'armor'],
      ['7', 'charm'],
      ['8', 'decorations'],
      ['c', 'compare'],
      ['m', 'materials'],
    ] as const) {
      await page.keyboard.press(key)
      await noPageOverflow(page, what)
    }
    await page.keyboard.press('c')
    await page.getByTestId('compare-add').click()
    await noPageOverflow(page, 'compare picker')
    await page.keyboard.press('Escape')
    await page.getByTestId('toggle-left').click()
    await noPageOverflow(page, 'slot drawer')
    // Esc closes the drawer
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('slot-weapon')).toBeHidden()
    await page.getByTestId('toggle-right').click()
    for (const t of ['stats', 'skills', 'equipment']) {
      await page.getByTestId(`tab-${t}`).click()
      await noPageOverflow(page, `sidebar ${t}`)
    }

    await page.goto('/?view=monsters&m=nergigante')
    await expect(page.getByTestId('monster-name')).toHaveText('Nergigante')
    await noPageOverflow(page, 'field guide')
    await page.getByTestId('toggle-right').click()
    for (const t of ['info', 'damage', 'loot']) {
      await page.getByTestId(`mtab-${t}`).click()
      await noPageOverflow(page, `monster ${t}`)
    }
  })
})

test.describe('tablet (touch)', () => {
  test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true })

  test('sidebar always visible, slots in a drawer, tap previews in the sidebar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('tab-stats')).toBeVisible()
    await expect(page.getByTestId('toggle-right')).toHaveCount(0)
    await page.getByTestId('toggle-left').tap()
    await page.getByTestId('slot-weapon').tap()
    const node = page.locator('[data-weapon-id]').nth(1)
    await node.tap()
    await expect(page.getByTestId('preview-banner')).toContainText('tap the item again')
    await expect(slotItem(page, 'weapon')).toHaveText('None')
    await node.tap()
    await expect(slotItem(page, 'weapon')).toHaveText((await node.getAttribute('aria-label'))!)
  })
})

test.describe('lg', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('three columns, no drawers', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('toggle-left')).toHaveCount(0)
    await expect(page.getByTestId('toggle-right')).toHaveCount(0)
    await expect(page.getByTestId('slot-weapon')).toBeVisible()
    await expect(page.getByTestId('tab-stats')).toBeVisible()
  })
})
