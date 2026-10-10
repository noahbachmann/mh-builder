# MHW Equipment Builder

A fan-made build simulator for **Monster Hunter: World + Iceborne**. It recreates the in-game Equipment change menu and adds live skill totals, weapon stats, EFR/EFE and a hover compare window.

Fan-made and non-commercial. Not affiliated with Capcom.

## Features

- Pick a weapon from the smithy-style upgrade tree for any of the 14 weapon types, or search for it.
- Armor from all ranks at max defense (MR armor at augmented max), charms at their highest level, and decorations including size-4 jewels.
- Skill totals with level caps, set bonuses and secret skills.
- Weapon stats with Handicraft sharpness, EFR and EFE, plus a step-by-step breakdown.
- Hover an item, or move the keyboard cursor onto it, to see the change it would make in every sidebar tab.
- Builds can be saved in your browser, and every build is encoded in the URL so you can share it.
- Full keyboard control. Press `?` in the app to see all shortcuts.

## Development

```sh
pnpm install
pnpm dev          # Vite dev server
pnpm test         # Vitest (engine, data validation, stores)
pnpm test:e2e     # Playwright (first time: pnpm exec playwright install chromium)
pnpm build        # static site in dist/ (relative base, works on any host or subpath)
pnpm data:import  # regenerate src/data/ from the pinned MHWorldData commit
```

## Data

Game data comes from [MHWorldData](https://github.com/gatheringhallstudios/MHWorldData) by Gathering Hall Studios (MIT). `scripts/import` normalizes it into `src/data/*.json`, and that JSON is committed. The app makes no network calls at runtime.

## Icons

Weapon, armor, charm and decoration icons come from [MHW_Icons_SVG](https://github.com/OthelloRhin/MHW_Icons_SVG) by Thibault "Othello" Benoit (MIT, see `src/assets/icons/LICENSE-MHW_Icons_SVG`), stored as Vue components in `src/assets/icons/`.

Item renders (weapon and armor pictures) and the element, status, stat and slot icons come from the [Monster Hunter World Wiki](https://monsterhunterworld.wiki.fextralife.com/) on Fextralife. `pnpm renders:import` downloads them as small webp files (`public/renders/`, `src/assets/icons/`). All game images © Capcom.
