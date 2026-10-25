import type { PresetDef } from '../engine/presets'

/**
 * Seeded builds for the Builds panel's "Presets" tab: Iceborne and base game late-game builds plus
 * early / mid-game progression builds. Hand-written by item name; `presets.test.ts` checks every
 * name resolves and every decoration fits. Keep the list at 40 or fewer.
 * Name scheme: `<IB|Base> <weapon> <stage>[ (<flavour>)]`.
 */

// Iceborne raw core: Fatalis 3 (Inheritance) + Raging Brachy 2 (Agitator Secret), 13 size-4 slots
const IB_RAW_ARMOR = {
  head: 'Brachydium Helm β+',
  chest: 'Dragonhide β+',
  arms: 'Brachydium Braces β+',
  waist: 'Dragonbarbs β+',
  legs: 'Dragonfeet β+',
  charm: 'Challenger Charm V',
} as const
// Agitator 7 / WEX 3 / CE 7 / CB 3 / Attack 7 / Handicraft 4 / Peak 3 / Evade Window 5
const IB_RAW_DECOS = {
  weapon: ['Attack Jewel+ 4', 'Attack Jewel+ 4'],
  head: ['Tenderizer/Evasion Jewel 4', 'Critical/Vitality Jewel 4', 'Expert Jewel 1'],
  chest: ['Critical/Vitality Jewel 4', 'Critical/Vitality Jewel 4', 'Expert Jewel+ 4'],
  arms: ['Expert Jewel+ 4', 'Attack Jewel+ 4'],
  waist: ['Refresh/Attack Jewel 4', 'Handicraft Jewel+ 4', 'Handicraft Jewel+ 4'],
  legs: ['Flawless/Evasion Jewel 4', 'Flawless/Evasion Jewel 4', 'Flawless Jewel 2'],
}
// gunners: ammo skills instead of Handicraft, Capacity on the weapon
const IB_GUN_DECOS = {
  ...IB_RAW_DECOS,
  weapon: ['Attack Jewel+ 4', 'Magazine Jewel 2'],
  waist: ['Refresh/Attack Jewel 4', 'Forceshot Jewel 3', 'Pierce Jewel 3'],
  legs: ['Spread Jewel 3', 'Flawless/Evasion Jewel 4', 'Flawless Jewel 2'],
}
// Artillery 3 for GL / CB: one jewel+ on the weapon, one in the head's size-1 slot
const IB_SHELL_DECOS = {
  ...IB_RAW_DECOS,
  weapon: ['Artillery Jewel+ 4', 'Attack Jewel+ 4'],
  head: ['Tenderizer/Evasion Jewel 4', 'Critical/Vitality Jewel 4', 'Artillery Jewel 1'],
}

// Iceborne element: Silver Sol 4 (True Critical Element) + Fatalis legs
const IB_ELEM_ARMOR = {
  head: 'Silver Solhelm β+',
  chest: 'Silver Solmail β+',
  arms: 'Silver Solbraces β+',
  waist: 'Silver Solcoil β+',
  legs: 'Dragonfeet β+',
} as const
// Silver Sol already gives Crit Boost 3; element 6 = charm 5 + one jewel
const ibElemDecos = (elem: string) => ({
  weapon: ['Challenger Jewel 2', 'Challenger Jewel 2'],
  head: ['Expert Jewel+ 4', `${elem} Jewel 1`],
  chest: ['Expert Jewel+ 4'],
  arms: ['Tenderizer/Vitality Jewel 4', 'Tenderizer Jewel 2'],
  waist: ['Expert Jewel+ 4', 'Expert Jewel 1'],
  legs: ['Tenderizer/Vitality Jewel 4', 'Challenger Jewel+ 4', 'Attack Jewel+ 4'],
})

// base game raw core: Teostra 3 (Master's Touch) + Drachen chest / legs, size 1-3 jewels only
const BASE_RAW_ARMOR = {
  head: 'Kaiser Crown γ',
  chest: 'Drachen Mail α',
  arms: 'Kaiser Vambraces γ',
  waist: 'Kaiser Coil γ',
  legs: 'Drachen Greaves α',
  charm: 'Exploiter Charm III',
} as const
const BASE_RAW_DECOS = {
  head: ['Critical Jewel 2', 'Attack Jewel 1'],
  chest: ['Handicraft Jewel 3'],
  arms: ['Handicraft Jewel 3'],
  waist: ['Attack Jewel 1', 'Attack Jewel 1'],
  legs: ['Attack Jewel 1'],
}

// base game element: Rathalos 2 (Critical Element) + Teostra arms / Odogaron waist; element 6 = charm 5 + one jewel
const baseElemBuild = (elem: string) => ({
  armor: {
    head: 'Rathalos Helm β',
    chest: 'Rathalos Mail β',
    arms: 'Kaiser Vambraces γ',
    waist: 'Odogaron Coil β',
    legs: 'Drachen Greaves α',
  },
  decos: {
    head: [`${elem} Jewel 1`],
    chest: ['Expert Jewel 1'],
    arms: ['Critical Jewel 2'],
    waist: ['Tenderizer Jewel 2'],
    legs: ['Critical Jewel 2'],
  },
})

const baseIce = baseElemBuild('Frost')

export const PRESETS: PresetDef[] = [
  // ── Iceborne late game ──
  {
    slug: 'ib-gs-late',
    name: 'GS IB late game',
    group: 'iceborne',
    note: 'Fatalis + Raging Brachy, Agitator / WEX / Crit Boost',
    items: { weapon: 'Black Fatalis Blade', ...IB_RAW_ARMOR },
    decorations: IB_RAW_DECOS,
  },
  {
    slug: 'ib-ls-late',
    name: 'LS IB late game',
    group: 'iceborne',
    note: 'Fatalis + Raging Brachy, Agitator / WEX / Crit Boost',
    items: { weapon: 'Fatalis Zaggespanon', ...IB_RAW_ARMOR },
    decorations: IB_RAW_DECOS,
  },
  {
    slug: 'ib-sns-late',
    name: 'SnS IB late game',
    group: 'iceborne',
    note: 'Fatalis + Raging Brachy, Agitator / WEX / Crit Boost',
    items: { weapon: 'True Fatalis Sword', ...IB_RAW_ARMOR },
    decorations: IB_RAW_DECOS,
  },
  {
    slug: 'ib-db-late-element',
    name: 'DB IB late game (element)',
    group: 'iceborne',
    note: 'Alatreon blades, Silver Sol True Crit Element, Dragon Attack',
    items: { weapon: 'Alatreon Madness', ...IB_ELEM_ARMOR, charm: 'Wyrmsbane Charm V' },
    decorations: ibElemDecos('Dragon'),
  },
  {
    slug: 'ib-hammer-late',
    name: 'Hammer IB late game',
    group: 'iceborne',
    note: 'Fatalis + Raging Brachy, Agitator / WEX / Crit Boost',
    items: { weapon: 'Fatalis Demolisher', ...IB_RAW_ARMOR },
    decorations: IB_RAW_DECOS,
  },
  {
    slug: 'ib-hh-late',
    name: 'HH IB late game',
    group: 'iceborne',
    note: 'Fatalis + Raging Brachy, Agitator / WEX / Crit Boost',
    items: { weapon: 'Fatalis Menace Wailer', ...IB_RAW_ARMOR },
    decorations: IB_RAW_DECOS,
  },
  {
    slug: 'ib-lance-late',
    name: 'Lance IB late game',
    group: 'iceborne',
    note: 'Fatalis + Raging Brachy, Guard / Guard Up / Offensive Guard',
    items: { weapon: 'True Fatalis Lance', ...IB_RAW_ARMOR },
    decorations: {
      ...IB_RAW_DECOS,
      weapon: ['Ironwall Jewel+ 4', 'Guardian/Attack Jewel 4'],
      legs: ['Ironwall Jewel+ 4', 'Guardian/Evasion Jewel 4', 'Shield Jewel 2'],
    },
  },
  {
    slug: 'ib-gl-late',
    name: 'GL IB late game',
    group: 'iceborne',
    note: 'Fatalis + Raging Brachy, Artillery, Agitator / Crit Boost',
    items: { weapon: 'True Fatalis Gunlance', ...IB_RAW_ARMOR },
    decorations: { ...IB_SHELL_DECOS, legs: ['Ironwall Jewel+ 4', 'Shield Jewel 2', 'Flawless Jewel 2'] },
  },
  {
    slug: 'ib-sa-late',
    name: 'SA IB late game',
    group: 'iceborne',
    note: 'Fatalis + Raging Brachy, Agitator / WEX / Crit Boost',
    items: { weapon: 'True Fatalis End', ...IB_RAW_ARMOR },
    decorations: IB_RAW_DECOS,
  },
  {
    slug: 'ib-cb-late',
    name: 'CB IB late game',
    group: 'iceborne',
    note: 'Fatalis + Raging Brachy, Artillery, Agitator / Crit Boost',
    items: { weapon: 'True Fatalis Charger', ...IB_RAW_ARMOR },
    decorations: IB_SHELL_DECOS,
  },
  {
    slug: 'ib-ig-late',
    name: 'IG IB late game',
    group: 'iceborne',
    note: 'Fatalis + Raging Brachy, Agitator / WEX / Crit Boost',
    items: { weapon: 'True Fatalis Dyaus', ...IB_RAW_ARMOR },
    decorations: IB_RAW_DECOS,
  },
  {
    slug: 'ib-lbg-late',
    name: 'LBG IB late game',
    group: 'iceborne',
    note: 'Fatalis + Raging Brachy, ammo-up skills, Agitator / Crit Boost',
    items: { weapon: 'Fatalis Depths', ...IB_RAW_ARMOR },
    decorations: IB_GUN_DECOS,
  },
  {
    slug: 'ib-hbg-late',
    name: 'HBG IB late game',
    group: 'iceborne',
    note: 'Fatalis + Raging Brachy, ammo-up skills, Agitator / Crit Boost',
    items: { weapon: 'Vor Buster', ...IB_RAW_ARMOR },
    decorations: IB_GUN_DECOS,
  },
  {
    slug: 'ib-bow-late-element',
    name: 'Bow IB late game (element)',
    group: 'iceborne',
    note: 'Alatreon bow, Silver Sol True Crit Element, Dragon Attack',
    items: { weapon: 'Alatreon Commandment', ...IB_ELEM_ARMOR, charm: 'Wyrmsbane Charm V' },
    decorations: ibElemDecos('Dragon'),
  },

  // ── Base game late game ──
  {
    slug: 'base-gs-late',
    name: 'GS base late game',
    group: 'base',
    note: "Teostra Master's Touch + Drachen, Crit Eye / WEX / Attack",
    items: { weapon: 'Purgation\'s Atrocity', ...BASE_RAW_ARMOR },
    decorations: { weapon: ['Attack Jewel 1'], ...BASE_RAW_DECOS },
  },
  {
    slug: 'base-ls-late',
    name: 'LS base late game',
    group: 'base',
    note: "Teostra Master's Touch + Drachen, Crit Eye / WEX / Attack",
    items: { weapon: "Extermination's Edge", ...BASE_RAW_ARMOR },
    decorations: { weapon: ['Attack Jewel 1'], ...BASE_RAW_DECOS },
  },
  {
    slug: 'base-hammer-late',
    name: 'Hammer base late game',
    group: 'base',
    note: "Teostra Master's Touch + Drachen, Crit Eye / WEX / Attack",
    items: { weapon: "Obliteration's Footfall", ...BASE_RAW_ARMOR },
    decorations: { weapon: ['Attack Jewel 1'], ...BASE_RAW_DECOS },
  },
  {
    slug: 'base-lance-late',
    name: 'Lance base late game',
    group: 'base',
    note: "Teostra Master's Touch + Drachen, Guard, Crit Eye / WEX",
    items: { weapon: "Perdition's Hand", ...BASE_RAW_ARMOR },
    decorations: { weapon: ['Ironwall Jewel 1'], ...BASE_RAW_DECOS, waist: ['Ironwall Jewel 1', 'Ironwall Jewel 1'] },
  },
  {
    slug: 'base-cb-late',
    name: 'CB base late game',
    group: 'base',
    note: "Teostra Master's Touch + Drachen, Artillery, Crit Eye / WEX",
    items: { weapon: "Devastation's Thorns", ...BASE_RAW_ARMOR },
    decorations: { weapon: ['Artillery Jewel 1'], ...BASE_RAW_DECOS, waist: ['Artillery Jewel 1', 'Artillery Jewel 1'] },
  },
  {
    slug: 'base-hbg-late',
    name: 'HBG base late game',
    group: 'base',
    note: 'Teostra + Drachen, Normal Shots, Crit Eye / WEX / Attack',
    items: { weapon: "Destruction's Fusillade", ...BASE_RAW_ARMOR },
    decorations: { weapon: ['Attack Jewel 1'], ...BASE_RAW_DECOS, chest: ['Forceshot Jewel 3'], arms: ['Pierce Jewel 3'] },
  },
  {
    slug: 'base-db-late-element',
    name: 'DB base late game (element)',
    group: 'base',
    note: 'Fire and Ice, Rathalos Critical Element, Ice Attack',
    items: { weapon: 'Fire and Ice', ...baseIce.armor, charm: 'Frost Charm V' },
    decorations: { weapon: ['Expert Jewel 1'], ...baseIce.decos },
  },
  {
    slug: 'base-bow-late-element',
    name: 'Bow base late game (element)',
    group: 'base',
    note: 'Legiana bow, Rathalos Critical Element, Ice Attack',
    items: { weapon: 'Legia Snowfletcher', ...baseIce.armor, charm: 'Frost Charm V' },
    decorations: baseIce.decos,
  },

  // ── Early / mid game ──
  {
    slug: 'base-ls-lr-early',
    name: 'LS base early game (LR)',
    group: 'progression',
    note: 'Low Rank bone gear, Attack / Crit Eye',
    items: {
      weapon: 'Hard Bone Shotel II',
      head: 'Bone Helm',
      chest: 'Bone Mail',
      arms: 'Bone Vambraces',
      waist: 'Kulu Coil',
      legs: 'Kulu Greaves',
    },
  },
  {
    slug: 'base-gs-hr-early',
    name: 'GS base early game (HR)',
    group: 'progression',
    note: 'Rathalos / Odogaron mix, Attack / WEX / Crit Eye',
    items: {
      weapon: 'Jagras Hacker III',
      head: 'Rathalos Helm β',
      chest: 'Rathalos Mail β',
      arms: 'Legiana Vambraces β',
      waist: 'Odogaron Coil β',
      legs: 'Rathalos Greaves β',
    },
    decorations: {
      weapon: ['Attack Jewel 1', 'Attack Jewel 1'],
      head: ['Attack Jewel 1'],
      chest: ['Expert Jewel 1'],
      arms: ['Expert Jewel 1'],
      waist: ['Tenderizer Jewel 2'],
      legs: ['Expert Jewel 1'],
    },
  },
  {
    slug: 'base-hammer-hr-mid',
    name: 'Hammer base mid game (HR)',
    group: 'progression',
    note: 'Nergigante / Rathalos mix, Agitator / Attack / WEX',
    items: {
      weapon: 'Grandrock II',
      head: 'Nergigante Helm β',
      chest: 'Rathalos Mail β',
      arms: 'Nergigante Vambraces β',
      waist: 'Odogaron Coil β',
      legs: 'Nergigante Greaves β',
    },
    decorations: {
      weapon: ['Challenger Jewel 2'],
      head: ['Attack Jewel 1', 'Attack Jewel 1'],
      chest: ['Attack Jewel 1'],
      arms: ['Expert Jewel 1'],
      waist: ['Tenderizer Jewel 2'],
      legs: ['Challenger Jewel 2'],
    },
  },
  {
    slug: 'ib-ls-mr-early',
    name: 'LS IB early game (MR)',
    group: 'progression',
    note: 'Tigrex / Banbaro / Fulgur mix, Attack / WEX',
    items: {
      weapon: 'Gnashing Fulgur II',
      head: 'Tigrex Helm β+',
      chest: 'Tigrex Mail β+',
      arms: 'Banbaro Vambraces β+',
      waist: 'Fulgur Coil β+',
      legs: 'Fulgur Greaves β+',
    },
    decorations: {
      weapon: ['Expert Jewel 1'],
      head: ['Attack Jewel 1'],
      chest: ['Tenderizer Jewel 2', 'Expert Jewel 1'],
      arms: ['Attack Jewel 1'],
      waist: ['Tenderizer Jewel 2', 'Expert Jewel 1'],
      legs: ['Attack Jewel 1', 'Expert Jewel 1'],
    },
  },
  {
    slug: 'ib-bow-mr-early',
    name: 'Bow IB early game (MR)',
    group: 'progression',
    note: 'Nargacuga set, Evade Window / Water Attack',
    items: {
      weapon: 'Hidden Bow+',
      head: 'Nargacuga Helm β+',
      chest: 'Nargacuga Mail β+',
      arms: 'Nargacuga Braces β+',
      waist: 'Nargacuga Faulds β+',
      legs: 'Nargacuga Greaves β+',
      charm: 'Flood Charm V',
    },
    decorations: {
      weapon: ['Expert Jewel 1'],
      head: ['Expert Jewel 1', 'Stream Jewel 1'],
      chest: ['Expert Jewel 1'],
      arms: ['Expert Jewel 1'],
      waist: ['Tenderizer Jewel 2'],
      legs: ['Expert Jewel 1', 'Expert Jewel 1'],
    },
  },
  {
    slug: 'ib-gs-mr-mid',
    name: 'GS IB mid game (MR)',
    group: 'progression',
    note: 'Brachydios 3 (Agitator Secret) + Garuga, Agitator / WEX / Crit Eye',
    items: {
      weapon: 'Tigrex Great Sword',
      head: 'Brachydios Helm β+',
      chest: 'Brachydios Mail β+',
      arms: 'Brachydios Braces β+',
      waist: 'Garuga Tassets β+',
      legs: 'Garuga Greaves β+',
      charm: 'Exploiter Charm III',
    },
    decorations: {
      head: ['Attack Jewel+ 4', 'Expert Jewel 1'],
      chest: ['Challenger Jewel+ 4'],
      arms: ['Expert Jewel+ 4'],
      waist: ['Attack Jewel+ 4', 'Critical Jewel 2'],
      legs: ['Expert Jewel+ 4', 'Critical Jewel 2', 'Critical Jewel 2'],
    },
  },
  {
    slug: 'ib-db-mr-mid-element',
    name: 'DB IB mid game (element)',
    group: 'progression',
    note: 'Velkhana 4 (Critical Element) + Garuga, Ice Attack',
    items: {
      weapon: 'Bergel Vetra',
      head: 'Rimeguard Helm β+',
      chest: 'Rimeguard Mail β+',
      arms: 'Rimeguard Vambraces β+',
      waist: 'Rimeguard Coil β+',
      legs: 'Garuga Greaves β+',
      charm: 'Frost Charm V',
    },
    decorations: {
      head: ['Expert Jewel+ 4', 'Critical Jewel 2'],
      chest: ['Expert Jewel+ 4', 'Frost Jewel 1'],
      arms: ['Tenderizer/Vitality Jewel 4'],
      waist: ['Attack Jewel+ 4', 'Expert Jewel 1'],
      legs: ['Tenderizer/Vitality Jewel 4', 'Critical Jewel 2', 'Critical Jewel 2'],
    },
  },
  {
    slug: 'ib-cb-mr-mid',
    name: 'CB IB mid game (MR)',
    group: 'progression',
    note: 'Glavenus 3 (Max Might Secret) + Garuga, Artillery / Crit Eye',
    items: {
      weapon: 'Glavenus Bardred',
      head: 'Glavenus Helm β+',
      chest: 'Glavenus Mail β+',
      arms: 'Glavenus Braces β+',
      waist: 'Garuga Tassets β+',
      legs: 'Garuga Greaves β+',
      charm: 'Artillery Charm III',
    },
    decorations: {
      weapon: ['Expert Jewel 1'],
      head: ['Expert Jewel+ 4'],
      chest: ['Expert Jewel+ 4'],
      arms: ['Mighty Jewel 2'],
      waist: ['Attack Jewel+ 4', 'Critical Jewel 2'],
      legs: ['Attack Jewel+ 4', 'Critical Jewel 2', 'Critical Jewel 2'],
    },
  },
  {
    slug: 'ib-lbg-mr-mid',
    name: 'LBG IB mid game (MR)',
    group: 'progression',
    note: "Rath Soul 3 (Mind's Eye / Ballistics) + Garuga, Crit Eye / Crit Boost",
    items: {
      weapon: 'Blackwing Bowgun II',
      head: 'Rath Soul Helm β+',
      chest: 'Rath Soul Mail β+',
      arms: 'Rath Soul Braces β+',
      waist: 'Garuga Tassets β+',
      legs: 'Garuga Greaves β+',
      charm: 'Attack Charm V',
    },
    decorations: {
      weapon: ['Forceshot Jewel 3'],
      head: ['Expert Jewel+ 4'],
      chest: ['Expert Jewel+ 4', 'Vitality Jewel 1'],
      arms: ['Tenderizer/Vitality Jewel 4', 'Expert Jewel 1'],
      waist: ['Attack Jewel+ 4', 'Pierce Jewel 3'],
      legs: ['Tenderizer/Vitality Jewel 4', 'Critical Jewel 2', 'Critical Jewel 2'],
    },
  },
]
