# src/components — UI (display only, math lives in src/engine)

- `App.vue` (in `src/`) is the 3-column grid: `left/` (SlotList, BuildManager), center screen chosen by `ui.screen`, `sidebar/`.
- `center/`: `WeaponTree` (type tabs, bands, SVG edges from `engine/tree-layout`, search), `ArmorPicker` (rank tabs), `CharmPicker`, `DecorationScreen` (slot column + deco list filtered by size), `BuildOverview` (default screen: equipment, EFR/EFE breakdown, skill descriptions), `CompareScreen` (current build + up to 3 saved builds side by side, from `stores/compare.ts`).
- `left/BuildManager`: saved builds (`stores/saved.ts`, localStorage codec strings), ⇄ toggles a build into the comparison (ids persisted under `mhw-builder.compare`).
- `sidebar/`: `Sidebar` tabs -> `OverallStats`, `OverallSkills`, `SelectedEquipment` (two `EquipmentCard`s while previewing).
- `base/`: `Icon` (registry id -> webp, falls back to placeholder then CSS initials), `SharpnessBar` (CSS), `SlotPips`, `Diff` (value + preview with ▲/▼).

Patterns:
- Every selectable element: `v-focus-cell="{ region, row, col }"` (`src/input/focus-grid.ts`). Regions: `slots`, `builds`, `center`, `center-tabs`, `deco-slots`, `sidebar-tabs`.
- Candidates use `v-on="candidate({...})"` from `composables/useCandidate.ts`: hover and focus both set `preview.candidate`; the sidebar reads `preview.stats` / `preview.diff`.
- Pickers focus the equipped item (or the first item) on mount, like the in-game cursor.
- `data-testid`s are used by `tests/e2e`; keep them when refactoring.
