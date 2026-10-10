# src/components — UI (display only, math lives in src/engine)

- `App.vue` (in `src/`) is the 3-column grid: `left/` (SlotList, BuildManager), center screen chosen by `ui.screen`, `sidebar/`.
- `center/`: `WeaponTree` (type tabs, bands, SVG edges from `engine/tree-layout`, search), `ArmorPicker` (rank tabs), `CharmPicker`, `DecorationScreen` (slot column + deco list filtered by size), `BuildOverview` (default screen: equipment, EFR/EFE breakdown, skill descriptions), `CompareScreen` (current build + up to 3 saved builds side by side, from `stores/compare.ts`).
- `left/SlotList`: `is-selected` = `ui.selectedSlot`, changed only by opening a slot (hover/focus must not change it: crossing rows on the way to the center swapped the Selected Equipment tab to an empty slot). Pip line keeps its height without slots.
- `left/BuildManager`: saved builds (`stores/saved.ts`, localStorage codec strings), ⇄ toggles a build into the comparison (ids persisted under `mhw-builder.compare`). Load goes through `base/ConfirmDialog` ("Load equipment?"); save icon = overwrite, trash = delete.
- `sidebar/`: `Sidebar` tabs -> `OverallStats`, `OverallSkills`, `SelectedEquipment` (two `EquipmentCard`s while previewing, then `ItemRender`s stacked below: equipped, hovered under it; URLs from `src/renders.ts`).
- `center/WeaponTree`: rarity header + column shading from `layout.rarityCols`; element/status icons per node (2 overlap).
- `base/`: `Icon` (registry id -> inline SVG component from `src/assets/icons` or webp; falls back to placeholder then CSS initials), `SharpnessBar` (CSS), `SlotPips`, `Diff` (value + preview with ▲/▼), `ConfirmDialog` (native modal `<dialog>`, keys don't reach global shortcuts).

Patterns:
- Every selectable element: `v-focus-cell="{ region, row, col }"` (`src/input/focus-grid.ts`). Regions: `slots`, `builds`, `center`, `center-tabs`, `deco-slots`, `sidebar-tabs`.
- Candidates use `v-on="candidate({...})"` from `composables/useCandidate.ts`: hover and focus both set `preview.candidate`; the sidebar reads `preview.stats` / `preview.diff`.
- Pickers focus the equipped item (or the first item) on mount, like the in-game cursor.
- `data-testid`s are used by `tests/e2e`; keep them when refactoring.
