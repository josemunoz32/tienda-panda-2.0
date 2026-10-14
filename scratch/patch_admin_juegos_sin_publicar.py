import re

path = r"c:\Users\Usuario\proyectopandastore20\src\pages\Admin\AdminJuegosSinPublicar.js"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update lucide-react imports: add EyeOff, Flame, Trophy, RotateCcw
old_imports = """  ChevronRight,
  Eye,
  Check,
  Trash2
} from "lucide-react";"""

new_imports = """  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  Trophy,
  RotateCcw,
  Check,
  Trash2
} from "lucide-react";"""

if old_imports in content:
    content = content.replace(old_imports, new_imports, 1)
    print("Updated lucide-react imports")

# 2. Add SWITCH_GENRES and update getSwitchGenre, isPopularSwitchTitle, and isBestSellerSwitchTitle
genres_and_helpers = """const SWITCH_GENRES = [
  { id: "todos", label: "🌐 Todos los géneros", icon: "🌐" },
  { id: "carreras", label: "🏎️ Carreras", icon: "🏎️" },
  { id: "pelea", label: "🥊 Lucha / Pelea", icon: "🥊" },
  { id: "accion", label: "⚔️ Acción", icon: "⚔️" },
  { id: "aventura", label: "🗺️ Aventura", icon: "🗺️" },
  { id: "plataformas", label: "🍄 Plataformas", icon: "🍄" },
  { id: "rpg", label: "🧙‍♂️ RPG", icon: "🧙‍♂️" },
  { id: "deportes", label: "⚽ Deportes", icon: "⚽" },
  { id: "simulacion", label: "🚜 Simulación", icon: "🚜" },
  { id: "estrategia", label: "🧠 Estrategia", icon: "🧠" },
  { id: "terror", label: "👻 Terror", icon: "👻" },
  { id: "infantil", label: "🎈 Infantil / Familiar", icon: "🎈" }
];

function getSwitchGenre(title) {
  const name = String(title || "").toLowerCase();
  // 1. Carreras
  if (/(mario kart|crash team|hot wheels|need for speed|grid|racing|racer|f1|cars|asphalt|burnout|wrc|moto|rally|fast rmx|gear\.club|chocobo gp|wreckfest)/.test(name)) return "carreras";
  // 2. Pelea / Lucha
  if (/(street fighter|mortal kombat|dragon ball|naruto|tekken|guilty gear|smash|brawlhalla|fight|fighter|kombat|injustice|marvel|demon slayer|my hero|jojo|one piece|king of fighters|snk|jump force|arms|taiko|melty blood|under night)/.test(name)) return "pelea";
  // 3. Deportes
  if (/(fifa|fc 24|fc 25|fc |efootball|nba|tennis|golf|football|soccer|wwe|sport|tony hawk|skate|olympic|mario golf|mario tennis|mario strikers|windjammers|captain tsubasa)/.test(name)) return "deportes";
  // 4. Terror
  if (/(resident evil|outlast|alien isolation|amnesia|dead by daylight|five nights|fnaf|horror|blair witch|tormented souls|signalis|fatal frame|project zero)/.test(name)) return "terror";
  // 5. RPG
  if (/(pokemon|final fantasy|persona|xenoblade|monster hunter|fire emblem|octopath|rpg|dragon quest|diablo|witcher|skyrim|tales of|dark souls|shin megami|bravely|ni no kuni|ys |chrono|sea of stars|live a live|paper mario|mario & luigi)/.test(name)) return "rpg";
  // 6. Estrategia
  if (/(civilization|strategy|tactics|wars|tycoon|management|pikmin|mario \\+ rabbids|advance wars|triangle strategy|tactics ogre|disgaea|fire emblem engage)/.test(name)) return "estrategia";
  // 7. Simulación
  if (/(simulator|simulador|farm|stardew|animal crossing|minecraft|sims|harvest moon|story of seasons|terraria|dreamlight|cozy grove|rune factory|subnautica)/.test(name)) return "simulacion";
  // 8. Infantil / Familiar
  if (/(paw patrol|peppa|bluey|barbie|disney|just dance|wario|party|cocomelon|baby|my little pony|gigantosaurus|peppa pig|ryan)/.test(name)) return "infantil";
  // 9. Plataformas
  if (/(sonic|donkey kong|crash bandicoot|spyro|rayman|celeste|cuphead|shovel knight|yoshi|little nightmares|platformer|super mario 3d|super mario bros|mario wonder|kirby)/.test(name)) return "plataformas";
  // 10. Aventura
  if (/(zelda|assassin|tomb raider|uncharted|metroid|luigi|prince of persia|adventure|journey|batman|hollow knight|ori|dead cells|hades|tunic|deaths door)/.test(name)) return "aventura";
  // Por descarte: Acción
  return "accion";
}

function isPopularSwitchTitle(title) {
  return /(zelda|mario|pokemon|animal crossing|minecraft|super smash|mario kart|sonic|kirby|metroid|donkey kong|splatoon|fire emblem|xenoblade|hollow knight|cuphead|stardew|lego|dragon ball|naruto|mortal kombat|just dance|gta|grand theft|red dead|hogwarts|ea sports|fc 24|fc 25|fifa|monster hunter|bayonetta|luigi|pikmin|persona|witcher|doom|spyro|crash|rayman|assassin|dark souls|borderlands|bioshock|resident evil|it takes two|overcooked|dead cells|celeste|hades|batman|skyrim)/i.test(String(title || ""));
}

function isBestSellerSwitchTitle(title) {
  return /(mario kart 8|animal crossing: new horizons|super smash bros|breath of the wild|tears of the kingdom|sword|shield|scarlet|violet|legends.*arceus|brilliant diamond|shining pearl|let's go.*pikachu|let's go.*eevee|super mario odyssey|mario party|super mario party|mario party superstars|new super mario bros|super mario 3d world|bowser's fury|super mario bros\\.? wonder|ring fit|splatoon 2|splatoon 3|luigi's mansion 3|mario \\+ rabbids|monster hunter rise|minecraft|fc 24|fc 25|fifa|kirby and the forgotten land|tropical freeze|metroid dread|hogwarts legacy|just dance|nintendo switch sports|clubhouse games|1-2-switch)/i.test(String(title || ""));
}"""

old_helpers_target = """function getSwitchGenre(title) {
  const name = String(title || "").toLowerCase();
  if (/(mario kart|crash team|hot wheels|need for speed|grid|racing|racer|f1|cars)/.test(name)) return "carreras";
  if (/(street fighter|mortal kombat|dragon ball|naruto|tekken|guilty gear|smash|brawlhalla|fight|fighter)/.test(name)) return "pelea";
  if (/(fifa|fc |efootball|nba|tennis|golf|football|soccer|wwe|sport)/.test(name)) return "deportes";
  if (/(pokemon|final fantasy|persona|xenoblade|monster hunter|fire emblem|octopath|rpg|dragon quest|diablo)/.test(name)) return "rpg";
  if (/(mario|kirby|yoshi|paw patrol|peppa|lego|bluey|barbie|disney|sonic)/.test(name)) return "infantil";
  if (/(civilization|strategy|tactics|wars|tycoon|management)/.test(name)) return "estrategia";
  if (/(simulator|simulador|farm|stardew|animal crossing|minecraft)/.test(name)) return "simulacion";
  if (/(hollow knight|celeste|cuphead|hades|dead cells|undertale|ori|limbo|inside)/.test(name)) return "indie";
  if (/(zelda|assassin|tomb raider|uncharted|metroid|luigi|prince of persia|lego|adventure)/.test(name)) return "aventura";
  return "accion";
}

function isPopularSwitchTitle(title) {
  return /(zelda|mario|pokemon|animal crossing|minecraft|super smash|mario kart|sonic|kirby|metroid|donkey kong|splatoon|fire emblem|xenoblade|hollow knight|cuphead|stardew|lego|dragon ball|naruto|mortal kombat|just dance)/i.test(String(title || ""));
}"""

if old_helpers_target in content:
    content = content.replace(old_helpers_target, genres_and_helpers, 1)
    print("Updated genres and helper functions")

# 3. Add hideCatalogGames state
state_old = '  const [genreFilter, setGenreFilter] = useState("todos");'
state_new = """  const [genreFilter, setGenreFilter] = useState("todos");
  const [hideCatalogGames, setHideCatalogGames] = useState(false);"""

if state_old in content and "hideCatalogGames" not in content:
    content = content.replace(state_old, state_new, 1)
    print("Added hideCatalogGames state")

# 4. Update kpiStats to calculate populares, masVendidos, and genreCounts
kpi_old = """    return { total, publicados, abundantes, criticos, agotados, sinPublicar, preciosEnRiesgo, soloBase, baseMasDlc, soloDlc };
  }, [masterGameList]);"""

kpi_new = """    const populares = masterGameList.filter(g => isPopularSwitchTitle(g.displayName)).length;
    const masVendidos = masterGameList.filter(g => isBestSellerSwitchTitle(g.displayName)).length;

    const genreCounts = {};
    SWITCH_GENRES.forEach(sg => {
      if (sg.id !== "todos") {
        genreCounts[sg.id] = masterGameList.filter(g => getSwitchGenre(g.displayName) === sg.id).length;
      }
    });

    return { total, publicados, abundantes, criticos, agotados, sinPublicar, preciosEnRiesgo, soloBase, baseMasDlc, soloDlc, populares, masVendidos, genreCounts };
  }, [masterGameList]);"""

if kpi_old in content:
    content = content.replace(kpi_old, kpi_new, 1)
    print("Updated kpiStats with populares, masVendidos and genreCounts")

# 5. Update filteredGames logic to include hideCatalogGames and mas_vendidos
filter_func_old = """  // Filtrado de la lista maestra
  const filteredGames = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return masterGameList.filter(master => {
      // 1. Filtro estricto por tipo de variante (Solo Base, Base + DLC, Solo DLC)
      if (variantTypeFilter !== "todos") {
        const targetVar = master.variants[variantTypeFilter];
        // Si no tiene esta variante en lo absoluto, se excluye
        if (!targetVar) return false;

        // Si el filtro de stock está en "todos", mostrar solo los que tengan stock disponible o estén publicados en esa variante
        if (stockFilter === "todos") {
          if (targetVar.stockCount <= 0 && !targetVar.isPublished) return false;
        } else if (stockFilter === "abundante") {
          if (targetVar.stockCount < 5) return false;
        } else if (stockFilter === "critico") {
          if (targetVar.stockCount < 1 || targetVar.stockCount > 4) return false;
        } else if (stockFilter === "agotado") {
          if (targetVar.stockCount !== 0) return false;
        } else if (stockFilter === "publicados") {
          if (!targetVar.isPublished) return false;
        } else if (stockFilter === "sin_publicar") {
          if (targetVar.isPublished) return false;
        } else if (stockFilter === "riesgo") {
          if (!targetVar.isPublished || (targetVar.gananciaRevendedor >= 5000 && targetVar.gananciaClientePrimaria >= 5000)) return false;
        }
      } else {
        // Modo "todos los tipos": evalúa a nivel general de juego
        if (stockFilter === "abundante") return master.stockStatus === "abundante";
        if (stockFilter === "critico") return master.stockStatus === "critico";
        if (stockFilter === "agotado") return master.stockStatus === "agotado";
        if (stockFilter === "publicados") return master.isAnyPublished;
        if (stockFilter === "sin_publicar") return !master.isAllPublished;
        if (stockFilter === "riesgo") {
          return Object.values(master.variants).some(v => v.isPublished && (v.gananciaRevendedor < 5000 || v.gananciaClientePrimaria < 5000));
        }
      }

      // 2. Búsqueda inteligente por texto:
      // Busca en: displayName, canonKey, todos los nombres de packs originales (chino, ruso, inglés),
      // IDs de packs, y nicknames de cuentas de proveedores (Sobro, Birdman, etc.)
      if (query) {
        const matchTitle = master.displayName.toLowerCase().includes(query) || master.canonKey.includes(query);
        const matchOriginals = master.allOriginalNames.some(on => on.toLowerCase().includes(query));
        const matchPackIds = master.allPackIds.some(pid => pid.toLowerCase().includes(query));
        const matchNicknames = master.allPackDetails.some(pd => (pd.nickname || "").toLowerCase().includes(query));
        if (!matchTitle && !matchOriginals && !matchPackIds && !matchNicknames) {
          return false;
        }
      }

      if (popularityFilter === "populares" && !isPopularSwitchTitle(master.displayName)) return false;
      if (genreFilter !== "todos" && getSwitchGenre(master.displayName) !== genreFilter) return false;

      return true;
    });
  }, [masterGameList, searchTerm, stockFilter, variantTypeFilter, popularityFilter, genreFilter]);"""

filter_func_new = """  // Filtrado de la lista maestra
  const filteredGames = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return masterGameList.filter(master => {
      // 0. Ocultar los que ya tenemos en el catálogo de la tienda
      if (hideCatalogGames) {
        if (variantTypeFilter !== "todos") {
          const targetVar = master.variants[variantTypeFilter];
          if (targetVar && targetVar.isPublished) return false;
        } else {
          if (master.isAnyPublished) return false;
        }
      }

      // 1. Filtro estricto por tipo de variante (Solo Base, Base + DLC, Solo DLC)
      if (variantTypeFilter !== "todos") {
        const targetVar = master.variants[variantTypeFilter];
        if (!targetVar) return false;

        // Si el filtro de stock está en "todos", mostrar solo los que tengan stock disponible o estén publicados en esa variante
        if (stockFilter === "todos") {
          if (targetVar.stockCount <= 0 && !targetVar.isPublished) return false;
        } else if (stockFilter === "abundante") {
          if (targetVar.stockCount < 5) return false;
        } else if (stockFilter === "critico") {
          if (targetVar.stockCount < 1 || targetVar.stockCount > 4) return false;
        } else if (stockFilter === "agotado") {
          if (targetVar.stockCount !== 0) return false;
        } else if (stockFilter === "publicados") {
          if (!targetVar.isPublished) return false;
        } else if (stockFilter === "sin_publicar") {
          if (targetVar.isPublished) return false;
        } else if (stockFilter === "riesgo") {
          if (!targetVar.isPublished || (targetVar.gananciaRevendedor >= 5000 && targetVar.gananciaClientePrimaria >= 5000)) return false;
        }
      } else {
        // Modo "todos los tipos": evalúa a nivel general de juego
        if (stockFilter === "abundante") return master.stockStatus === "abundante";
        if (stockFilter === "critico") return master.stockStatus === "critico";
        if (stockFilter === "agotado") return master.stockStatus === "agotado";
        if (stockFilter === "publicados") return master.isAnyPublished;
        if (stockFilter === "sin_publicar") return !master.isAllPublished;
        if (stockFilter === "riesgo") {
          return Object.values(master.variants).some(v => v.isPublished && (v.gananciaRevendedor < 5000 || v.gananciaClientePrimaria < 5000));
        }
      }

      // 2. Búsqueda inteligente por texto:
      if (query) {
        const matchTitle = master.displayName.toLowerCase().includes(query) || master.canonKey.includes(query);
        const matchOriginals = master.allOriginalNames.some(on => on.toLowerCase().includes(query));
        const matchPackIds = master.allPackIds.some(pid => pid.toLowerCase().includes(query));
        const matchNicknames = master.allPackDetails.some(pd => (pd.nickname || "").toLowerCase().includes(query));
        if (!matchTitle && !matchOriginals && !matchPackIds && !matchNicknames) {
          return false;
        }
      }

      // 3. Filtro por popularidad y más vendidos
      if (popularityFilter === "populares" && !isPopularSwitchTitle(master.displayName)) return false;
      if (popularityFilter === "mas_vendidos" && !isBestSellerSwitchTitle(master.displayName)) return false;

      // 4. Filtro por género / tipo
      if (genreFilter !== "todos" && getSwitchGenre(master.displayName) !== genreFilter) return false;

      return true;
    });
  }, [masterGameList, searchTerm, stockFilter, variantTypeFilter, hideCatalogGames, popularityFilter, genreFilter]);"""

if filter_func_old in content:
    content = content.replace(filter_func_old, filter_func_new, 1)
    print("Updated filteredGames logic")

# 6. Update the controls bar and add Popularity & Genre filter bar
old_controls_bar = """      {/* SEARCH & FILTERS BAR */}
      <div className="adm-controls-bar">
        <div className="adm-unpub-search" style={{ flex: 1, margin: 0 }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Buscar por juego, Nickname de pack (ej: Sobro), o pack ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              type="button" 
              onClick={() => setSearchTerm("")}
              style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
            >
              ✕
            </button>
          )}
        </div>

        <div className="adm-filter-pills">
          <button
            className={`filter-btn ${stockFilter === "todos" ? "active" : ""}`}
            onClick={() => setStockFilter("todos")}
          >
            Todos ({masterGameList.length})
          </button>
          <button
            className={`filter-btn ${stockFilter === "publicados" ? "active" : ""}`}
            onClick={() => setStockFilter("publicados")}
            style={stockFilter === "publicados" ? { borderColor: "#38bdf8", color: "#38bdf8", background: "rgba(56, 189, 248, 0.2)" } : {}}
          >
            🛍️ Publicados en Tienda ({kpiStats.publicados})
          </button>
          <button
            className={`filter-btn ${stockFilter === "sin_publicar" ? "active" : ""}`}
            onClick={() => setStockFilter("sin_publicar")}
          >
            ✨ Por Publicar ({kpiStats.sinPublicar})
          </button>
          <button
            className={`filter-btn ${stockFilter === "abundante" ? "active" : ""}`}
            onClick={() => setStockFilter("abundante")}
          >
            🟢 Abundantes ({kpiStats.abundantes})
          </button>
          <button
            className={`filter-btn ${stockFilter === "critico" ? "active" : ""}`}
            onClick={() => setStockFilter("critico")}
          >
            ⚠️ Críticos ({kpiStats.criticos})
          </button>
          <button
            className={`filter-btn ${stockFilter === "agotado" ? "active" : ""}`}
            onClick={() => setStockFilter("agotado")}
          >
            🔴 Agotados ({kpiStats.agotados})
          </button>
          {kpiStats.preciosEnRiesgo > 0 && (
            <button
              className={`filter-btn ${stockFilter === "riesgo" ? "active" : ""}`}
              onClick={() => setStockFilter("riesgo")}
              style={{ borderColor: "#f43f5e", color: "#fca5a5" }}
            >
              🚨 Margen en Riesgo ({kpiStats.preciosEnRiesgo})
            </button>
          )}
        </div>
      </div>"""

new_controls_bar = """      {/* SEARCH & FILTERS BAR */}
      <div className="adm-controls-bar" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <div className="adm-unpub-search" style={{ flex: 1, minWidth: 280, margin: 0 }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Buscar por juego, Nickname de pack (ej: Sobro), o pack ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              type="button" 
              onClick={() => setSearchTerm("")}
              style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
            >
              ✕
            </button>
          )}
        </div>

        {/* BOTÓN PARA OCULTAR LOS QUE YA ESTÁN EN EL CATÁLOGO */}
        <button
          type="button"
          onClick={() => setHideCatalogGames(!hideCatalogGames)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 15px",
            borderRadius: "12px",
            border: hideCatalogGames ? "1.5px solid #f43f5e" : "1px solid rgba(255,255,255,0.18)",
            background: hideCatalogGames
              ? "linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(225, 29, 72, 0.35) 100%)"
              : "rgba(255,255,255,0.06)",
            color: hideCatalogGames ? "#fecdd3" : "#e2e8f0",
            fontWeight: 800,
            cursor: "pointer",
            fontSize: "0.85rem",
            boxShadow: hideCatalogGames ? "0 0 15px rgba(244, 63, 94, 0.35)" : "none",
            transition: "all 0.2s ease"
          }}
          title={hideCatalogGames ? "Haga clic para volver a mostrar los juegos ya publicados" : "Ocultar juegos que ya están publicados en el catálogo de la tienda"}
        >
          {hideCatalogGames ? <EyeOff size={16} color="#fda4af" /> : <Eye size={16} color="#94a3b8" />}
          <span>{hideCatalogGames ? "Ocultando Ya en Catálogo" : "Ocultar Ya en Catálogo"}</span>
          <span style={{
            fontSize: "0.72rem",
            padding: "2px 6px",
            borderRadius: "6px",
            background: hideCatalogGames ? "rgba(244, 63, 94, 0.4)" : "rgba(255,255,255,0.1)",
            color: hideCatalogGames ? "#fff" : "#94a3b8"
          }}>
            {kpiStats.publicados}
          </span>
        </button>

        {/* BOTÓN RESTABLECER FILTROS (SI HAY ALGUNO ACTIVO) */}
        {(searchTerm || stockFilter !== "todos" || variantTypeFilter !== "todos" || popularityFilter !== "todos" || genreFilter !== "todos" || hideCatalogGames) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setStockFilter("todos");
              setVariantTypeFilter("todos");
              setPopularityFilter("todos");
              setGenreFilter("todos");
              setHideCatalogGames(false);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 13px",
              borderRadius: "12px",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              background: "rgba(148, 163, 184, 0.12)",
              color: "#cbd5e1",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: "pointer"
            }}
            title="Restablecer todos los filtros"
          >
            <RotateCcw size={14} />
            <span>Limpiar Filtros</span>
          </button>
        )}

        <div className="adm-filter-pills" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            className={`filter-btn ${stockFilter === "todos" ? "active" : ""}`}
            onClick={() => setStockFilter("todos")}
          >
            Todos ({masterGameList.length})
          </button>
          <button
            className={`filter-btn ${stockFilter === "publicados" ? "active" : ""}`}
            onClick={() => setStockFilter("publicados")}
            style={stockFilter === "publicados" ? { borderColor: "#38bdf8", color: "#38bdf8", background: "rgba(56, 189, 248, 0.2)" } : {}}
          >
            🛍️ Publicados ({kpiStats.publicados})
          </button>
          <button
            className={`filter-btn ${stockFilter === "sin_publicar" ? "active" : ""}`}
            onClick={() => setStockFilter("sin_publicar")}
          >
            ✨ Por Publicar ({kpiStats.sinPublicar})
          </button>
          <button
            className={`filter-btn ${stockFilter === "abundante" ? "active" : ""}`}
            onClick={() => setStockFilter("abundante")}
          >
            🟢 Abundantes ({kpiStats.abundantes})
          </button>
          <button
            className={`filter-btn ${stockFilter === "critico" ? "active" : ""}`}
            onClick={() => setStockFilter("critico")}
          >
            ⚠️ Críticos ({kpiStats.criticos})
          </button>
          <button
            className={`filter-btn ${stockFilter === "agotado" ? "active" : ""}`}
            onClick={() => setStockFilter("agotado")}
          >
            🔴 Agotados ({kpiStats.agotados})
          </button>
          {kpiStats.preciosEnRiesgo > 0 && (
            <button
              className={`filter-btn ${stockFilter === "riesgo" ? "active" : ""}`}
              onClick={() => setStockFilter("riesgo")}
              style={{ borderColor: "#f43f5e", color: "#fca5a5" }}
            >
              🚨 Margen en Riesgo ({kpiStats.preciosEnRiesgo})
            </button>
          )}
        </div>
      </div>

      {/* ─── BARRA DE POPULARIDAD, MÁS VENDIDOS Y GÉNEROS / TIPO ──────────────── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        marginTop: "10px",
        marginBottom: "16px",
        padding: "14px 16px",
        background: "rgba(15, 23, 42, 0.65)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "14px",
        backdropFilter: "blur(6px)"
      }}>
        {/* FILA 1: POPULARIDAD & TOP MÁS VENDIDOS */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fbbf24", fontWeight: 800, fontSize: "0.85rem", minWidth: 160 }}>
            <Flame size={16} color="#fbbf24" />
            <span>Popularidad & Ventas:</span>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flex: 1 }}>
            <button
              type="button"
              className={`filter-btn ${popularityFilter === "todos" ? "active" : ""}`}
              onClick={() => setPopularityFilter("todos")}
            >
              ⭐ Todos ({masterGameList.length})
            </button>
            <button
              type="button"
              className={`filter-btn ${popularityFilter === "populares" ? "active" : ""}`}
              onClick={() => setPopularityFilter("populares")}
              style={popularityFilter === "populares" ? {
                borderColor: "#f59e0b",
                color: "#fef08a",
                background: "rgba(245, 158, 11, 0.25)",
                fontWeight: 800,
                boxShadow: "0 0 10px rgba(245, 158, 11, 0.25)"
              } : {}}
            >
              🔥 Franquicias Populares ({kpiStats.populares})
            </button>
            <button
              type="button"
              className={`filter-btn ${popularityFilter === "mas_vendidos" ? "active" : ""}`}
              onClick={() => setPopularityFilter("mas_vendidos")}
              style={popularityFilter === "mas_vendidos" ? {
                borderColor: "#ec4899",
                color: "#fbcfe8",
                background: "rgba(236, 72, 153, 0.25)",
                fontWeight: 800,
                boxShadow: "0 0 10px rgba(236, 72, 153, 0.25)"
              } : {}}
            >
              🏆 Top Más Vendidos Switch ({kpiStats.masVendidos})
            </button>
          </div>
        </div>

        {/* FILA 2: FILTRO POR GÉNERO / TIPO DE JUEGO */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flexWrap: "wrap", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#38bdf8", fontWeight: 800, fontSize: "0.85rem", minWidth: 160, paddingTop: "4px" }}>
            <Gamepad2 size={16} color="#38bdf8" />
            <span>Género / Tipo:</span>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flex: 1 }}>
            {SWITCH_GENRES.map((g) => {
              const count = g.id === "todos" ? masterGameList.length : (kpiStats.genreCounts?.[g.id] || 0);
              const isActive = genreFilter === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  className={`filter-btn ${isActive ? "active" : ""}`}
                  onClick={() => setGenreFilter(g.id)}
                  style={isActive ? {
                    borderColor: "#38bdf8",
                    color: "#fff",
                    background: "rgba(56, 189, 248, 0.25)",
                    fontWeight: 800,
                    boxShadow: "0 0 10px rgba(56, 189, 248, 0.25)"
                  } : { fontSize: "0.78rem", padding: "5px 10px" }}
                >
                  {g.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RESUMEN DE RESULTADOS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", fontSize: "0.85rem", color: "#94a3b8", flexWrap: "wrap", gap: "8px" }}>
        <div>
          Mostrando <strong style={{ color: "#fff" }}>{filteredGames.length}</strong> de <strong style={{ color: "#fff" }}>{masterGameList.length}</strong> títulos Nintendo Switch
          {hideCatalogGames && (
            <span style={{ marginLeft: 8, color: "#fda4af", background: "rgba(244, 63, 94, 0.15)", padding: "2px 8px", borderRadius: "6px", fontSize: "0.76rem" }}>
              • Ocultando {kpiStats.publicados} ya publicados en catálogo
            </span>
          )}
          {popularityFilter !== "todos" && (
            <span style={{ marginLeft: 8, color: "#fef08a", background: "rgba(245, 158, 11, 0.15)", padding: "2px 8px", borderRadius: "6px", fontSize: "0.76rem" }}>
              • {popularityFilter === "mas_vendidos" ? "Top Más Vendidos" : "Populares"}
            </span>
          )}
          {genreFilter !== "todos" && (
            <span style={{ marginLeft: 8, color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "2px 8px", borderRadius: "6px", fontSize: "0.76rem" }}>
              • Género: {SWITCH_GENRES.find(g => g.id === genreFilter)?.label || genreFilter}
            </span>
          )}
        </div>
      </div>"""

if old_controls_bar in content:
    content = content.replace(old_controls_bar, new_controls_bar, 1)
    print("Updated controls bar and added popularity and genre UI")
else:
    print("Warning: old_controls_bar not found in content!")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("AdminJuegosSinPublicar.js patched successfully!")
