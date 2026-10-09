# scripts/import — data pipeline

`pnpm data:import` -> `index.ts`: `fetch.ts` downloads MHWorldData at a pinned commit into `.cache/` (gitignored), `normalize.ts` maps CSVs (`source_data/`) to `src/data/types.ts`, writes `src/data/*.json` (one record per line) + `source.json`. Warnings print for dropped refs; the run should print none.

Gotchas:
- Sharpness CSV is stored at Handicraft 5 (`maxed` = Handicraft does nothing).
- MR armor uses `defense_augment_max`, others `defense_max`.
- Charms: only last of each `previous_en` chain.
- Kulve MR weapons list "Kulve Taroth Essence" (a set bonus) as their skill -> `Weapon.setBonusId`.
- `category` Kulve/Safi -> `Weapon.special` (excluded from trees until the Special tab).
- Skill ids are `slug(name)`; secret skills: `skill_base.secret` = levels gated, `unlocks` = target skill.
