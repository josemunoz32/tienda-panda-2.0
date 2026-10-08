using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace PandaStoreLauncher.Helpers
{
    public static class DenuvoGamesHelper
    {
        // Set of known Steam AppIDs for Denuvo titles
        private static readonly HashSet<string> DenuvoAppIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            // Black Myth: Wukong
            "2358720",
            // Mortal Kombat 1
            "1971870",
            // Persona 3 Reload
            "2161700",
            // Street Fighter 6
            "1364780",
            // Demon Slayer Hinokami
            "1497640",
            // Demon Slayer Sweep the Board
            "2850870",
            // Persona 5 Royal
            "1687950",
            // Maneater
            "629760",
            // SONIC X SHADOW GENERATIONS
            "2513280",
            // Planet Coaster 2
            "2688950",
            // Monster Hunter Wilds
            "2246340",
            // Hogwarts Legacy
            "990080",
            // Undisputed
            "1451190",
            // Atomic Heart
            "668580",
            // Sonic Frontiers
            "1237320",
            // Dead Space
            "1693980",
            // Sniper Elite 5
            "1029690",
            // Planet Zoo
            "703080",
            // Middle-earth: Shadow of War
            "356190",
            // Total War: WARHAMMER III
            "1142710",
            // The Bus
            "241040",
            // FAR: Changing Tides
            "1570010",
            // Construction Simulator
            "1273400",
            // Sniper Elite 4
            "312660",
            // Persona 4 Golden
            "1113000",
            // Sonic Forces
            "637100",
            // Suicide Squad: Kill the Justice League
            "315210",
            // Sonic Origins Plus
            "1794960",
            // Sword Art Online: Fatal Bullet
            "626690",
            // Planet Coaster
            "493340",
            // Metaphor: ReFantazio
            "2620600",
            // Persona 5 Strikers
            "1382330",
            // Dragon's Dogma 2
            "2054970",
            // Sonic Superstars
            "2022670",
            // Shin Megami Tensei III Nocturne HD Remaster
            "1413480",
            // Fernbus Simulator
            "427100",
            // Like a Dragon Gaiden: The Man Who Erased His Name
            "2375550",
            // Yakuza: Like a Dragon
            "1235140",
            // Total War: THREE KINGDOMS
            "779340",
            // Total War: WARHAMMER II
            "594570",
            // Marvel's Midnight Suns
            "368260",
            // Persona 3 Portable
            "1809700",
            // Like a Dragon: Infinite Wealth
            "2072450",
            // Persona 4 Arena Ultimax
            "1602010",
            // Lost Judgment
            "2058190",
            // Total War: WARHAMMER
            "364360",
            // Like a Dragon: Ishin!
            "1805480",
            // Valkyria Chronicles 4 Complete Edition
            "790820",
            // Judgment
            "2058180",
            // Persona 5 Tactica
            "2029850",
            // Sniper Elite: Resistance
            "2574040",
            // Soul Hackers 2
            "1777620",
            // Warhammer Age of Sigmar: Realms of Ruin
            "1844380",
            // Hatsune Miku: Project DIVA Mega Mix+
            "1761390",
            // Total War: PHARAOH
            "1937780",
            // Total War: PHARAOH DYNASTIES
            "2401850",
            // Lost in Random
            "1462570",
            // Warhammer 40,000: Chaos Gate - Daemonhunters
            "1670810",
            // Sid Meier's Civilization VII
            "2358720",
            // Ubisoft VIP Games
            "66088",   // Assassin's Creed Black Flag Resynced
            "1081",    // Assassin's Creed Shadows
            "2018810", // Assassin's Creed Mirage
            "4740",    // Avatar: Frontiers of Pandora (Ubisoft ID)
            "2840770", // Avatar: Frontiers of Pandora (Steam ID)
            "5266",    // Far Cry 6 (Ubisoft ID)
            "2369390", // Far Cry 6 (Steam ID)
            "6145",    // Prince of Persia The Lost Crown (Ubisoft ID)
            "2751000", // Prince of Persia The Lost Crown (Steam ID)
            "17903",   // Star Wars Outlaws (Ubisoft ID)
            "2842040", // Star Wars Outlaws (Steam ID)
            "2698940", // The Crew Motorfest
            "1771",    // Tom Clancy's Ghost Recon Wildlands
            // EA VIP Games
            "2669320",  // EA SPORTS FC 25 (Steam ID)
            "2195250",  // EA SPORTS FC 24
            "16425677", // EA SPORTS FC 26
            "16425884", // EA SPORTS FC 27
            "2488620",  // F1 24
            "2582560",  // EA SPORTS Madden NFL 25
            "16425751", // EA SPORTS Madden NFL 26
            "16425629", // EA SPORTS PGA TOUR
            "1849250",  // EA SPORTS WRC
            "1774580",  // STAR WARS Jedi: Survivor
            "198188",   // Lost in Random (EA)
            "1035208",  // Need for Speed Payback
            "196787",   // Need for Speed Unbound (EA ID)
            "1846380"   // Need for Speed Unbound (Steam ID)
        };

        // Normalized keywords/titles from user's 100 Denuvo games list
        private static readonly string[] DenuvoGameKeywords = new string[]
        {
            "crimson desert",
            "resident evil requiem",
            "pragmata",
            "007 first light",
            "black myth: wukong",
            "black myth wukong",
            "f1 25",
            "f1® 25",
            "lego batman",
            "black flag r",
            "mortal kombat 1",
            "persona 3 reload",
            "stellar blade",
            "street fighter 6",
            "street fighter™ 6",
            "demon slayer",
            "wwe 2k26",
            "monster hunter stories 3",
            "onimusha",
            "persona 5 royal",
            "assassin's creed shadows",
            "assassins creed shadows",
            "maneater",
            "football manager 26",
            "echoes of aincrad",
            "ea sports fc 26",
            "fc 26",
            "fifa 26",
            "ea sports fc 27",
            "fc 27",
            "fifa 27",
            "sonic x shadow generations",
            "planet coaster 2",
            "jurassic world evolution 3",
            "monster hunter wilds",
            "hogwarts legacy",
            "undisputed",
            "mafia: the old country",
            "mafia the old country",
            "atomic heart",
            "sonic frontiers",
            "avatar: frontiers of pandora",
            "avatar frontiers of pandora",
            "adventures of elliot",
            "nba 2k26",
            "dead space",
            "sonic racing: crossworlds",
            "sonic racing crossworlds",
            "sniper elite 5",
            "planet zoo",
            "middle-earth: shadow of war",
            "shadow of war",
            "borderlands 4",
            "total war: warhammer iii",
            "total war: warhammer 3",
            "total war warhammer iii",
            "hello kitty island adventure",
            "far cry 6",
            "the bus",
            "far: changing tides",
            "far changing tides",
            "construction simulator",
            "sniper elite 4",
            "star wars outlaws",
            "ghost recon wildlands",
            "persona 4 golden",
            "sonic forces",
            "life is strange: reunion",
            "life is strange reunion",
            "suicide squad: kill the justice league",
            "suicide squad kill the justice league",
            "sonic origins plus",
            "sonic origins",
            "anno 117",
            "prince of persia the lost crown",
            "sword art online: fatal bullet",
            "sword art online fatal bullet",
            "pirate yakuza",
            "planet coaster",
            "need for speed unbound",
            "nfs unbound",
            "metaphor: refantazio",
            "metaphor refantazio",
            "persona 5 strikers",
            "yakuza kiwami 3",
            "code vein ii",
            "code vein 2",
            "dragon's dogma 2",
            "dragons dogma 2",
            "sonic superstars",
            "shin megami tensei iii",
            "madden nfl 26",
            "fernbus simulator",
            "the man who erased his name",
            "yakuza: like a dragon",
            "yakuza like a dragon",
            "total war: three kingdoms",
            "total war three kingdoms",
            "two point museum",
            "total war: warhammer ii",
            "total war: warhammer 2",
            "total war warhammer ii",
            "marvel's midnight suns",
            "marvels midnight suns",
            "persona 3 portable",
            "like a dragon: infinite wealth",
            "like a dragon infinite wealth",
            "persona 4 arena ultimax",
            "lost judgment",
            "raidou remastered",
            "civilization vii",
            "civilization 7",
            "total war: warhammer",
            "total war warhammer",
            "like a dragon: ishin",
            "like a dragon ishin",
            "valkyria chronicles 4",
            "atomfall",
            "shinobi: art of vengeance",
            "shinobi art of vengeance",
            "judgment",
            "need for speed payback",
            "nfs payback",
            "persona 5 tactica",
            "sniper elite: resistance",
            "sniper elite resistance",
            "soul hackers 2",
            "realms of ruin",
            "pga tour",
            "project diva mega mix",
            "total war: pharaoh",
            "total war pharaoh",
            "total war: pharaoh dynasties",
            "total war pharaoh dynasties",
            "lost in random",
            "star force legacy collection",
            "chaos gate - daemonhunters",
            "chaos gate daemonhunters"
        };

        /// <summary>
        /// Normalizes text by removing accents, special characters and extra spaces.
        /// </summary>
        private static string Normalize(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;

            string normalizedString = input.Normalize(NormalizationForm.FormD);
            var stringBuilder = new StringBuilder();

            foreach (var c in normalizedString)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    if (char.IsLetterOrDigit(c) || char.IsWhiteSpace(c))
                    {
                        stringBuilder.Append(char.ToLowerInvariant(c));
                    }
                    else
                    {
                        stringBuilder.Append(' ');
                    }
                }
            }

            return string.Join(" ", stringBuilder.ToString().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries));
        }

        /// <summary>
        /// Checks if a game is a Denuvo protected title by AppID or game title.
        /// </summary>
        public static bool IsDenuvoGame(string? appId, string? gameName, string? steamFolder = null)
        {
            if (!string.IsNullOrWhiteSpace(appId) && DenuvoAppIds.Contains(appId.Trim()))
            {
                return true;
            }

            string normName = Normalize(gameName ?? string.Empty);
            string normFolder = Normalize(steamFolder ?? string.Empty);

            if (string.IsNullOrEmpty(normName) && string.IsNullOrEmpty(normFolder)) return false;

            foreach (var kw in DenuvoGameKeywords)
            {
                string normKw = Normalize(kw);
                if (!string.IsNullOrEmpty(normName) && normName.Contains(normKw)) return true;
                if (!string.IsNullOrEmpty(normFolder) && normFolder.Contains(normKw)) return true;
            }

            return false;
        }

        /// <summary>
        /// Checks if a game is a VIP title (Denuvo / Ubisoft / EA) requiring PandaStoreActivator.
        /// </summary>
        public static bool IsVipGame(string? appId, string? gameName, string? steamFolder = null)
        {
            return IsDenuvoGame(appId, gameName, steamFolder);
        }
    }
}
