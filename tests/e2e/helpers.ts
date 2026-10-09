import { expect, type Page } from '@playwright/test'

// base36 build codes for fixtures (see src/engine/build-codec.ts)
export const id36 = (n: number) => n.toString(36)
export const DEFENDER_GS_1 = 2001
export const DEFENDER_GS_2 = 2002
export const RIMEGUARD_HELM_A = 1297 // slots [3, 2], Divine Blessing 2 + Coalescence 1
export const CHALLENGER_JEWEL = 82 // size 2, Agitator 1

export const slotItem = (page: Page, slot: string) => page.getByTestId(`slot-${slot}`).getByTestId('slot-item')

export async function expectSlot(page: Page, slot: string, name: string) {
  await expect(slotItem(page, slot)).toHaveText(name)
}
