# src/engine — pure TS damage/skill model

No Vue imports. Everything takes a `DataIndex` (`src/data/index.ts`) so tests can pass fixtures.

- `build.ts`: `Build` = ids only (weapon, 5 armor, charm, decos per slot). Immutable helpers `equip` (clears that slot's decos, like in-game) and `setDecoration` (enforces deco size <= slot size).
- `skills.ts`: `computeSkills` sums weapon/armor/charm/deco skills + active set-bonus skills (each grants level 1). "X Secret" skills (`Skill.unlocks`) raise X's cap to `unlockedMaxLevel`. `points` = raw sum, `level` = capped.
- `skill-effects.ts`: hand table skill+level -> modifiers. Raw = TRUE raw, element/status = DISPLAYED. `conditional` effects are skipped unless `includeConditional`. `skill-effects.test.ts` cross-checks every number against the in-game text in `skills.json`; add to `IGNORED` only for text parts we don't model.
- `constants.ts`: every constant with its source. `elementCap()` is UNVERIFIED and returns null (uncapped).
- `weapon-stats.ts`: true raw = base x multipliers + flat; element = base x % + flat. Hidden element needs Free Element. NEB only without active element (bowguns: no elemental ammo). Sharpness stored at Handicraft 5, trimmed from the top.
- `efr.ts`: EFR/EFE with breakdowns. Gunners sharpness 1.0. Element crit only on positive affinity.
- `evaluate.ts`: one call -> `BuildStats` (skills, weapon, efr, efe, defense). `build-diff.ts` diffs two `BuildStats` for hover compare.
- `tree-layout.ts`: band per root, col = depth, DFS rows. `edgePath` makes elbow SVG paths.
- `build-codec.ts`: `1.` + 7 `_`-joined items, base36 ids, `-` decos, `x` empty. Decoder drops invalid parts.
