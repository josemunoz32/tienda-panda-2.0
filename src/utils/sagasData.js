// Centralized Sagas & Bundles Data for PandaStore
// Includes base promo price, full games list, optional VIP extras, and real official Steam game photos.

export const STEAM_SAGAS = [
  {
    "key": "promo-saga-resident-evil",
    "name": "Saga Resident Evil Colección",
    "priceCLP": 8990,
    "games": [
      "Resident Evil 2 Remake",
      "Resident Evil 3 Remake",
      "Resident Evil 4 Remake",
      "Resident Evil 7 Biohazard",
      "Resident Evil Village"
    ],
    "vipExtras": [
      {
        "id": "re-requiem",
        "name": "Resident Evil Requiem",
        "priceCLP": 8000
      }
    ],
    "image": "/promos/promo_resident_evil.jpg"
  },
  {
    "key": "promo-saga-farcry",
    "name": "Saga Far Cry Colección",
    "priceCLP": 7990,
    "games": [
      "Far Cry 3",
      "Far Cry 4",
      "Far Cry 5",
      "Far Cry New Dawn",
      "Far Cry Primal"
    ],
    "vipExtras": [
      {
        "id": "farcry-6",
        "name": "Far Cry 6",
        "priceCLP": 8000
      }
    ],
    "image": "/promos/promo_farcry.jpg"
  },
  {
    "key": "promo-saga-hollow-knight",
    "name": "Saga Metroidvania & Joyas Indie",
    "priceCLP": 6990,
    "games": [
      "Hollow Knight",
      "Ori and the Blind Forest",
      "Ori and the Will of the Wisps",
      "Blasphemous",
      "Dead Cells"
    ],
    "vipExtras": [],
    "image": "/promos/promo_hollow_knight.jpg"
  },
  {
    "key": "promo-saga-tomb-raider",
    "name": "Trilogía Tomb Raider Definitiva",
    "priceCLP": 6990,
    "games": [
      "Tomb Raider (2013)",
      "Rise of the Tomb Raider",
      "Shadow of the Tomb Raider: Definitive Edition"
    ],
    "vipExtras": [],
    "image": "/promos/promo_tomb_raider.jpg"
  },
  {
    "key": "promo-saga-batman-arkham",
    "name": "Saga Batman Arkham Colección",
    "priceCLP": 7990,
    "games": [
      "Batman: Arkham Asylum GOTY",
      "Batman: Arkham City GOTY",
      "Batman: Arkham Knight",
      "Batman: Arkham Origins"
    ],
    "vipExtras": [],
    "image": "/promos/promo_batman_arkham.jpg"
  },
  {
    "key": "promo-saga-souls-elden",
    "name": "Saga Souls & Elden Ring",
    "priceCLP": 7990,
    "games": [
      "Elden Ring",
      "Dark Souls Remastered",
      "Dark Souls II: Scholar of the First Sin",
      "Dark Souls III"
    ],
    "vipExtras": [],
    "image": "/promos/promo_souls_elden.jpg"
  },
  {
    "key": "promo-saga-outlast",
    "name": "Saga Outlast - Terror Psicológico",
    "priceCLP": 5990,
    "games": [
      "Outlast",
      "Outlast: Whistleblower DLC",
      "Outlast 2"
    ],
    "vipExtras": [],
    "image": "/promos/promo_outlast.jpg"
  },
  {
    "key": "promo-saga-god-of-war",
    "name": "Saga God of War Nórdico",
    "priceCLP": 8990,
    "games": [
      "God of War (2018)",
      "God of War Ragnarök"
    ],
    "vipExtras": [],
    "image": "/promos/promo_god_of_war.jpg"
  },
  {
    "key": "promo-saga-age-empires",
    "name": "Saga Age of Empires Definitive",
    "priceCLP": 7990,
    "games": [
      "Age of Empires I Definitive",
      "Age of Empires II: Definitive Edition",
      "Age of Empires III Definitive",
      "Age of Empires IV",
      "Age of Mythology: Retold"
    ],
    "vipExtras": [],
    "image": "/promos/promo_age_empires.jpg"
  },
  {
    "key": "promo-saga-metal-gear",
    "name": "Saga Metal Gear Solid",
    "priceCLP": 7990,
    "games": [
      "METAL GEAR SOLID 1",
      "METAL GEAR SOLID 2: Sons of Liberty",
      "METAL GEAR SOLID 3: Snake Eater",
      "METAL GEAR SOLID V: GROUND ZEROES",
      "METAL GEAR RISING: REVENGEANCE"
    ],
    "vipExtras": [],
    "image": "/promos/promo_metal_gear.jpg"
  },
  {
    "key": "promo-coop-parejas",
    "name": "Pack Cooperativo & Parejas",
    "priceCLP": 6990,
    "games": [
      "It Takes Two",
      "A Way Out",
      "Cuphead",
      "Overcooked! All You Can Eat"
    ],
    "vipExtras": [],
    "image": "/promos/promo_coop_parejas.jpg"
  },
  {
    "key": "promo-saga-assassins-creed",
    "name": "Saga Assassin’s Creed Completo",
    "priceCLP": 12990,
    "games": [
      "Assassin's Creed Director's Cut",
      "Assassin's Creed II",
      "Assassin's Creed Brotherhood",
      "Assassin's Creed Revelations",
      "Assassin's Creed III Remastered",
      "Assassin's Creed IV Black Flag",
      "Assassin's Creed Rogue",
      "Assassin's Creed Unity",
      "Assassin's Creed Syndicate",
      "Assassin's Creed Origins / Odyssey"
    ],
    "vipExtras": [
      {
        "id": "ac-shadows",
        "name": "Assassin's Creed Shadows",
        "priceCLP": 8000
      },
      {
        "id": "ac-black-flag-resynced",
        "name": "Black Flag Resynced",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/582160/header.jpg"
  },
  {
    "key": "promo-saga-yakuza",
    "name": "Saga Yakuza: Historia de Kiryu",
    "priceCLP": 14990,
    "games": [
      "Yakuza 0",
      "Yakuza Kiwami",
      "Yakuza Kiwami 2",
      "Yakuza 3 Remastered",
      "Yakuza 4 Remastered",
      "Yakuza 5 Remastered",
      "Yakuza 6: The Song of Life",
      "Yakuza: Dead Souls",
      "Yakuza Kenzan!",
      "Yakuza Black Panther 1",
      "Yakuza Black Panther 2"
    ],
    "vipExtras": [
      {
        "id": "yakuza-lad",
        "name": "Like a Dragon",
        "priceCLP": 8000
      },
      {
        "id": "yakuza-gaiden",
        "name": "Gaiden",
        "priceCLP": 8000
      },
      {
        "id": "yakuza-ishin",
        "name": "Like a Dragon: Ishin!",
        "priceCLP": 8000
      },
      {
        "id": "yakuza-infinite-wealth",
        "name": "Infinite Wealth",
        "priceCLP": 8000
      },
      {
        "id": "yakuza-pirate",
        "name": "Pirate Yakuza in Hawaii",
        "priceCLP": 8000
      },
      {
        "id": "judgment",
        "name": "Judgment",
        "priceCLP": 8000
      },
      {
        "id": "lost-judgment",
        "name": "Lost Judgment",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/638970/header.jpg"
  },
  {
    "key": "promo-saga-sonic",
    "name": "Saga Sonic Universo",
    "priceCLP": 9990,
    "games": [
      "Sonic Generations",
      "Sonic Mania",
      "Sonic Forces",
      "Sonic Colors: Ultimate",
      "Sonic Lost World",
      "Sonic Adventure DX",
      "Sonic Adventure 2",
      "Team Sonic Racing"
    ],
    "vipExtras": [
      {
        "id": "sonic-frontiers",
        "name": "Sonic Frontiers",
        "priceCLP": 8000
      },
      {
        "id": "sonic-superstars",
        "name": "Sonic Superstars",
        "priceCLP": 8000
      },
      {
        "id": "sonic-x-shadow",
        "name": "Sonic X Shadow Generations",
        "priceCLP": 8000
      },
      {
        "id": "sonic-crossworlds",
        "name": "Sonic CrossWorlds",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1237320/header.jpg"
  },
  {
    "key": "promo-saga-monster-hunter",
    "name": "Saga Monster Hunter",
    "priceCLP": 7990,
    "games": [
      "Monster Hunter: World",
      "Monster Hunter World: Iceborne DLC",
      "Monster Hunter Rise",
      "Monster Hunter Rise: Sunbreak DLC",
      "Monster Hunter Stories",
      "Monster Hunter Stories 2: Wings of Ruin"
    ],
    "vipExtras": [
      {
        "id": "mh-wilds",
        "name": "Monster Hunter Wilds",
        "priceCLP": 8000
      },
      {
        "id": "mh-stories-3",
        "name": "Monster Hunter Stories 3",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/582010/header.jpg"
  },
  {
    "key": "promo-saga-star-wars",
    "name": "Saga Star Wars Aventura",
    "priceCLP": 9990,
    "games": [
      "Star Wars Jedi: Fallen Order",
      "Star Wars Jedi: Survivor",
      "Star Wars Battlefront II",
      "Star Wars Squadrons",
      "Knights of the Old Republic (KOTOR)",
      "KOTOR II: The Sith Lords",
      "The Force Unleashed Ultimate Sith",
      "The Force Unleashed II"
    ],
    "vipExtras": [
      {
        "id": "sw-outlaws",
        "name": "Star Wars Outlaws",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1172380/header.jpg"
  },
  {
    "key": "promo-saga-borderlands",
    "name": "Saga Borderlands",
    "priceCLP": 5990,
    "games": [
      "Borderlands Game of the Year Enhanced",
      "Borderlands 2",
      "Borderlands: The Pre-Sequel",
      "Borderlands 3"
    ],
    "vipExtras": [
      {
        "id": "borderlands-4",
        "name": "Borderlands 4",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/397540/header.jpg"
  },
  {
    "key": "promo-saga-mafia",
    "name": "Saga Mafia",
    "priceCLP": 4990,
    "games": [
      "Mafia: Definitive Edition",
      "Mafia II: Definitive Edition",
      "Mafia III: Definitive Edition"
    ],
    "vipExtras": [
      {
        "id": "mafia-old-country",
        "name": "Mafia: The Old Country",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1030840/header.jpg"
  },
  {
    "key": "promo-saga-civilization",
    "name": "Saga Civilization",
    "priceCLP": 7990,
    "games": [
      "Sid Meier's Civilization III Complete",
      "Sid Meier's Civilization IV Complete",
      "Sid Meier's Civilization V Complete",
      "Sid Meier's Civilization VI Anthology",
      "Civilization Beyond Earth",
      "Civilization Revolution"
    ],
    "vipExtras": [
      {
        "id": "civ-7",
        "name": "Civilization VII",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/289070/header.jpg"
  },
  {
    "key": "promo-saga-nfs",
    "name": "Saga Need for Speed",
    "priceCLP": 7990,
    "games": [
      "Need for Speed: Most Wanted",
      "Need for Speed: Rivals",
      "Need for Speed: Hot Pursuit Remastered",
      "Need for Speed: Heat",
      "Need for Speed: Shift 2 Unleashed",
      "Need for Speed: The Run"
    ],
    "vipExtras": [
      {
        "id": "nfs-payback",
        "name": "NFS Payback",
        "priceCLP": 8000
      },
      {
        "id": "nfs-unbound",
        "name": "NFS Unbound",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1222680/header.jpg"
  },
  {
    "key": "promo-saga-mortal-kombat",
    "name": "Saga Mortal Kombat",
    "priceCLP": 5990,
    "games": [
      "Mortal Kombat Arcade Kollection",
      "Mortal Kombat Komplete Edition",
      "Mortal Kombat X",
      "Mortal Kombat 11 Ultimate"
    ],
    "vipExtras": [
      {
        "id": "mk-1",
        "name": "Mortal Kombat 1",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/976310/header.jpg"
  },
  {
    "key": "promo-saga-sniper-elite",
    "name": "Saga Sniper Elite",
    "priceCLP": 4990,
    "games": [
      "Sniper Elite V2 Remastered",
      "Sniper Elite 3",
      "Sniper Elite 4"
    ],
    "vipExtras": [
      {
        "id": "se-4",
        "name": "Sniper Elite 4 Deluxe",
        "priceCLP": 8000
      },
      {
        "id": "se-5",
        "name": "Sniper Elite 5",
        "priceCLP": 8000
      },
      {
        "id": "se-resistance",
        "name": "Sniper Elite Resistance",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/312660/header.jpg"
  },
  {
    "key": "promo-saga-life-is-strange",
    "name": "Saga Life is Strange",
    "priceCLP": 5990,
    "games": [
      "Life is Strange Remastered",
      "Life is Strange: Before the Storm",
      "Life is Strange 2",
      "Life is Strange: True Colors"
    ],
    "vipExtras": [
      {
        "id": "lis-reunion",
        "name": "Life is Strange: Reunion",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1265920/header.jpg"
  },
  {
    "key": "promo-saga-tierra-media",
    "name": "Saga Tierra Media",
    "priceCLP": 4990,
    "games": [
      "Middle-earth: Shadow of Mordor GOTY",
      "LEGO The Lord of the Rings",
      "LEGO The Hobbit"
    ],
    "vipExtras": [
      {
        "id": "shadow-of-war",
        "name": "Middle-earth: Shadow of War",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/241930/header.jpg"
  },
  {
    "key": "promo-saga-dragon-ball",
    "name": "Saga Dragon Ball",
    "priceCLP": 5990,
    "games": [
      "Dragon Ball Xenoverse",
      "Dragon Ball Xenoverse 2",
      "Dragon Ball Z: Kakarot",
      "Dragon Ball FighterZ"
    ],
    "vipExtras": [
      {
        "id": "db-sparking-zero",
        "name": "Dragon Ball: Sparking! ZERO",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/851850/header.jpg"
  },
  {
    "key": "promo-saga-prince-of-persia",
    "name": "Saga Prince of Persia",
    "priceCLP": 5990,
    "games": [
      "Prince of Persia: The Sands of Time",
      "Prince of Persia: Warrior Within",
      "Prince of Persia: The Two Thrones",
      "Prince of Persia: The Forgotten Sands"
    ],
    "vipExtras": [
      {
        "id": "pop-lost-crown",
        "name": "Prince of Persia: The Lost Crown",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/19800/header.jpg"
  },
  {
    "key": "promo-saga-dead-space",
    "name": "Saga Dead Space",
    "priceCLP": 4990,
    "games": [
      "Dead Space (2008)",
      "Dead Space 2",
      "Dead Space 3"
    ],
    "vipExtras": [
      {
        "id": "dead-space-remake",
        "name": "Dead Space Remake",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1693980/header.jpg"
  },
  {
    "key": "promo-saga-bioshock",
    "name": "Saga BioShock",
    "priceCLP": 4990,
    "games": [
      "BioShock Remastered",
      "BioShock 2 Remastered",
      "BioShock Infinite"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/8870/header.jpg"
  },
  {
    "key": "promo-saga-metro",
    "name": "Saga Metro",
    "priceCLP": 4990,
    "games": [
      "Metro 2033 Redux",
      "Metro: Last Light Redux",
      "Metro Exodus"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/412020/header.jpg"
  },
  {
    "key": "promo-saga-dishonored",
    "name": "Saga Dishonored",
    "priceCLP": 4990,
    "games": [
      "Dishonored Definitive Edition",
      "Dishonored 2",
      "Dishonored: Death of the Outsider"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/403640/header.jpg"
  },
  {
    "key": "promo-saga-wolfenstein",
    "name": "Saga Wolfenstein",
    "priceCLP": 5990,
    "games": [
      "Wolfenstein: The New Order",
      "Wolfenstein: The Old Blood",
      "Wolfenstein II: The New Colossus",
      "Wolfenstein: Youngblood"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/612880/header.jpg"
  },
  {
    "key": "promo-saga-just-cause",
    "name": "Saga Just Cause",
    "priceCLP": 5990,
    "games": [
      "Just Cause 1",
      "Just Cause 2",
      "Just Cause 3",
      "Just Cause 4"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/225540/header.jpg"
  },
  {
    "key": "promo-saga-darksiders",
    "name": "Saga Darksiders",
    "priceCLP": 5990,
    "games": [
      "Darksiders Warmastered Edition",
      "Darksiders II Deathinitive Edition",
      "Darksiders III",
      "Darksiders Genesis"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/606280/header.jpg"
  },
  {
    "key": "promo-saga-the-witcher",
    "name": "Saga The Witcher",
    "priceCLP": 4990,
    "games": [
      "The Witcher: Enhanced Edition",
      "The Witcher 2: Assassins of Kings",
      "The Witcher 3: Wild Hunt GOTY"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/header.jpg"
  },
  {
    "key": "promo-saga-fallout",
    "name": "Saga Fallout",
    "priceCLP": 6990,
    "games": [
      "Fallout 1: A Post Nuclear Role Playing Game",
      "Fallout 2: A Post Nuclear Role Playing Game",
      "Fallout 3: Game of the Year Edition",
      "Fallout: New Vegas Ultimate Edition",
      "Fallout 4: Game of the Year Edition"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/377160/header.jpg"
  },
  {
    "key": "promo-saga-elder-scrolls",
    "name": "Saga The Elder Scrolls",
    "priceCLP": 5990,
    "games": [
      "The Elder Scrolls III: Morrowind GOTY",
      "The Elder Scrolls IV: Oblivion GOTY",
      "The Elder Scrolls V: Skyrim Special Edition",
      "The Elder Scrolls Online"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/489830/header.jpg"
  },
  {
    "key": "promo-saga-doom",
    "name": "Saga Doom",
    "priceCLP": 5990,
    "games": [
      "Ultimate DOOM",
      "DOOM II",
      "DOOM (2016)",
      "DOOM Eternal"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/782330/header.jpg"
  },
  {
    "key": "promo-saga-halo",
    "name": "Saga Halo",
    "priceCLP": 7990,
    "games": [
      "Halo: Combat Evolved Anniversary",
      "Halo 2: Anniversary",
      "Halo 3",
      "Halo 3: ODST",
      "Halo 4",
      "Halo: Reach"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/976730/header.jpg"
  },
  {
    "key": "promo-saga-gears-of-war",
    "name": "Saga Gears of War",
    "priceCLP": 4990,
    "games": [
      "Gears of War: Ultimate Edition",
      "Gears of War 4",
      "Gears 5"
    ],
    "vipExtras": [
      {
        "id": "gears-reloaded",
        "name": "Gears Reloaded",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1097840/header.jpg"
  },
  {
    "key": "promo-saga-hitman",
    "name": "Saga Hitman",
    "priceCLP": 6990,
    "games": [
      "Hitman: Codename 47",
      "Hitman 2: Silent Assassin",
      "Hitman: Contracts",
      "Hitman: Blood Money",
      "Hitman: Absolution"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1659040/header.jpg"
  },
  {
    "key": "promo-saga-naruto",
    "name": "Saga Naruto Ultimate Ninja Storm",
    "priceCLP": 7990,
    "games": [
      "Naruto Ultimate Ninja STORM",
      "Naruto Ultimate Ninja STORM 2",
      "Naruto Ultimate Ninja STORM 3 Full Burst",
      "Naruto Ultimate Ninja STORM 4 Road to Boruto",
      "Naruto X Boruto Ultimate Ninja STORM Connections"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/349040/header.jpg"
  },
  {
    "key": "promo-saga-one-piece",
    "name": "Saga One Piece",
    "priceCLP": 4990,
    "games": [
      "One Piece Pirate Warriors 3",
      "One Piece Pirate Warriors 4",
      "One Piece World Seeker"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1089090/header.jpg"
  },
  {
    "key": "promo-saga-lego-marvel",
    "name": "Saga LEGO Marvel",
    "priceCLP": 5990,
    "games": [
      "LEGO Marvel Super Heroes",
      "LEGO Marvel Super Heroes 2",
      "LEGO Marvel's Avengers",
      "LEGO Spider-Man"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/647830/header.jpg"
  },
  {
    "key": "promo-saga-lego-batman",
    "name": "Saga LEGO Batman",
    "priceCLP": 4990,
    "games": [
      "LEGO Batman: The Videogame",
      "LEGO Batman 2: DC Super Heroes",
      "LEGO Batman 3: Beyond Gotham"
    ],
    "vipExtras": [
      {
        "id": "legacy-dark-knight",
        "name": "Legacy of the Dark Knight",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/313690/header.jpg"
  },
  {
    "key": "promo-saga-walking-dead",
    "name": "Saga The Walking Dead Telltale",
    "priceCLP": 6990,
    "games": [
      "The Walking Dead: Season 1",
      "The Walking Dead: Season 2",
      "The Walking Dead: A New Frontier",
      "The Walking Dead: The Final Season",
      "The Walking Dead: Michonne"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/866820/header.jpg"
  },
  {
    "key": "promo-saga-dying-light",
    "name": "Saga Dying Light",
    "priceCLP": 4990,
    "games": [
      "Dying Light: Enhanced Edition",
      "Dying Light 2 Stay Human",
      "Dying Light: Bad Blood"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/239140/header.jpg"
  },
  {
    "key": "promo-saga-plague-tale",
    "name": "Saga A Plague Tale",
    "priceCLP": 3990,
    "games": [
      "A Plague Tale: Innocence",
      "A Plague Tale: Requiem"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1182900/header.jpg"
  },
  {
    "key": "promo-saga-nier",
    "name": "Saga NieR",
    "priceCLP": 3990,
    "games": [
      "NieR:Automata",
      "NieR Replicant ver.1.22474487139..."
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/524220/header.jpg"
  },
  {
    "key": "promo-saga-portal",
    "name": "Saga Portal",
    "priceCLP": 3990,
    "games": [
      "Portal",
      "Portal 2"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/620/header.jpg"
  },
  {
    "key": "promo-saga-left-4-dead",
    "name": "Saga Left 4 Dead",
    "priceCLP": 3990,
    "games": [
      "Left 4 Dead",
      "Left 4 Dead 2"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/550/header.jpg"
  },
  {
    "key": "promo-saga-subnautica",
    "name": "Saga Subnautica",
    "priceCLP": 4990,
    "games": [
      "Subnautica",
      "Subnautica: Below Zero"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/264710/header.jpg"
  },
  {
    "key": "promo-saga-south-park",
    "name": "Saga South Park",
    "priceCLP": 4990,
    "games": [
      "South Park: The Stick of Truth",
      "South Park: The Fractured But Whole",
      "South Park: Snow Day!"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/213670/header.jpg"
  },
  {
    "key": "promo-saga-kingdom-come",
    "name": "Saga Kingdom Come",
    "priceCLP": 3990,
    "games": [
      "Kingdom Come: Deliverance Royal Edition",
      "Kingdom Come: Deliverance II"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/379430/header.jpg"
  },
  {
    "key": "promo-saga-watch-dogs",
    "name": "Saga Watch Dogs",
    "priceCLP": 4990,
    "games": [
      "Watch Dogs",
      "Watch Dogs 2",
      "Watch Dogs Legion"
    ],
    "vipExtras": [],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/447040/header.jpg"
  },
  {
    "key": "promo-saga-ghost-recon",
    "name": "Saga Ghost Recon",
    "priceCLP": 4990,
    "games": [
      "Ghost Recon Advanced Warfighter",
      "Ghost Recon Advanced Warfighter 2",
      "Ghost Recon Future Soldier"
    ],
    "vipExtras": [
      {
        "id": "ghost-recon-wildlands",
        "name": "Ghost Recon Wildlands",
        "priceCLP": 8000
      }
    ],
    "image": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/460930/header.jpg"
  }
];
