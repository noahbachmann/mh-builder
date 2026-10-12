# scripts/import — data pipeline

`pnpm data:import` -> `index.ts`: `fetch.ts` downloads MHWorldData at a pinned commit into `.cache/` (gitignored), `normalize.ts` maps CSVs (`source_data/`) to `src/data/types.ts`, writes `src/data/*.json` (one record per line) + `source.json`. Warnings print for dropped refs; the run should print none.

Gotchas:
- Sharpness CSV is stored at Handicraft 5 (`maxed` = Handicraft does nothing).
- MR armor uses `defense_augment_max`, others `defense_max`.
- Charms: only last of each `previous_en` chain.
- Kulve MR weapons list "Kulve Taroth Essence" (a set bonus) as their skill -> `Weapon.setBonusId`.
- `category` Kulve/Safi -> `Weapon.special` (excluded from trees until the Special tab).
- Skill ids are `slug(name)`; secret skills: `skill_base.secret` = levels gated, `unlocks` = target skill.
- Monsters: only `size=large` (71). Every monster CSV except `monster_base` joins on the English name; rewards join items by name too. Output `monsters.json` + `items.json` (reward + recipe items) is `MonsterData`, lazy-loaded by `src/data/monsters.ts`, not in `GameData`/`db`.
- Hitzone names carry state suffixes -> `Hitzone.tags` (`parseHitzoneName`): `(Broken)` per part, others are monster-wide modes (Mud, Charged, White, Fire, ...), `+` combines (`Broken+SCritical`). Base-game `(Wounded)`/`(After Wounded)` = broken state -> `Broken`; `(Before Wounded)` = base. Sub-part suffixes (Zorah exhaust organs, Shara head casing Top/Bottom) stay in the part name. Alatreon has no base rows (Fire/Ice/Dragon only); some parts exist only in one mode (Kulve `Forelimbs (Exposed)`).
- `monster_breaks.wound` is the break threshold. Break data is missing for 35 (mostly Iceborne) monsters; `ko` column = stun hitzone.
- Two Kulve Taroth reward rows have no percentage -> `null`. Reward conditions go through `CONDITION_ALIAS` (`Hunt (Bronze)` is the bronze investigation box -> `Investigation (Bronze)`).
- Crafting -> `crafting.json` (`Recipe[]`, lazy via `src/data/crafting.ts`): `weapon_craft.csv` Create / Upgrade rows per weapon (Kulve / Safi have none), `armor_craft_ext.csv` (no upgrade materials in the source), `charm_craft.csv` summed over the `previous_en` chain to the stored max level (5 charms have no rows, skipped silently). Materials join items by name; `items.json` holds every reward or recipe item.
