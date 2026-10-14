// Devuelve el menor precio disponible según moneda y variantes
import { getMinPriceByMoneda } from '../../components/Header';
import { handleCartAddOrRemove } from '../../utils/cartHelpers';
import { getProductPricing, formatCLP, calcularPrecioRevendedor } from '../../utils/priceHelper';
import { calculateSwitchStockMap, getGameStockCount, buildStockRequestWhatsappUrl } from '../../utils/switchStockHelper';
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  ArrowDownAZ,
  ArrowUpZA,
  Sparkles,
  Gamepad2,
  Tag as TagIcon,
  Check
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useMoneda } from "../../context/MonedaContext";
import { db, auth } from "../../firebase";
import { useParams, Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, setDoc, onSnapshot } from "firebase/firestore";
import "./CategoriaPage.css";
import { prodUrl, extractId } from '../../utils/slugify';
import { getCachedSteamCatalog, setCachedSteamCatalog, isOnlineOnlyAppId, isOnlineOnlySteamProduct } from '../../utils/steamCatalogCache';
import { fetchRyuuCatalog, getDlcBundlePrice } from '../../utils/ryuuDlcHelper';
import PromoDlcModal from '../../components/PromoDlcModal/PromoDlcModal';
import '../../components/PromoDlcModal/PromoDlcModal.css';
import ps5Logo from '../../assets/logos/ps5.png';
import ps4Logo from '../../assets/logos/ps4.png';
import switchLogo from '../../assets/logos/switch.png';
import streamingLogo from '../../assets/logos/streaming.png';
import suscLogo from '../../assets/logos/suscripciones.png';
import steamLogo from '../../assets/logos/logosteam.png';
import bannerStreamingHalloween from '../../assets/halloween/category-banners/streaming-halloween.png';
import bannerSteamHalloween from '../../assets/halloween/category-banners/steam-halloween.png';
import bannerPlaystationHalloween from '../../assets/halloween/category-banners/playstation-halloween.png';
import bannerNintendoHalloween from '../../assets/halloween/category-banners/nintendo-halloween.png';
import bannerPromosHalloween from '../../assets/halloween/category-banners/promos-halloween.png';
import bannerSubscriptionsHalloween from '../../assets/halloween/category-banners/subscriptions-halloween.png';
import bannerPacksHalloween from '../../assets/halloween/category-banners/packs-halloween.png';
import bannerEmprendedoresHalloween from '../../assets/halloween/category-banners/emprendedores-halloween.png';

import steamPromo3x from '../../assets/promos/steam_3x_4990.png';
import steamPromo10x from '../../assets/promos/steam_10x_9990.png';
import steamPromo23x from '../../assets/promos/steam_23x_17990.png';
import steamPromo100x from '../../assets/promos/steam_100x_15000.jpg';
import steamPromo200x from '../../assets/promos/steam_200x_25000.jpg';
import steamPromo300x from '../../assets/promos/steam_300x_35000.jpg';
import steamPromo400x from '../../assets/promos/pack_steam_launcher_220.jpg'; // O /pack_400_steam.jpg
import packLauncherImg from '../../assets/promos/pack_steam_launcher_220.jpg';

import switchPromo2xBasica from '../../assets/promos/2 x 25.000 basica.png';
import switchPromo3xBasica from '../../assets/promos/3x1 $35.000 basica.png';
import switchPromo2xDeluxe from '../../assets/promos/deluxe 2 x 30.000.png';
import switchPromo3xDeluxe from '../../assets/promos/deluxe 3 x40.000.png';
import switchPromo4xMega from '../../assets/promos/4x55.png';
import switchPromoKart from '../../assets/promos/kart + pase.png';
import switchPromoViolet from '../../assets/promos/violet + dlc.png';
import switchPromoScarlet from '../../assets/promos/scarlet + dlc.png';
import switchPromoWild from '../../assets/promos/wild + dlc.png';
import switchPromoAnimal from '../../assets/promos/animal +dlc.png';
import switchPromoSplatoon from '../../assets/promos/splatoon 3 + dlc.png';
import switchPromoSword from '../../assets/promos/pokemon espada + dlc.png';
import switchPromoShield from '../../assets/promos/pokemon escudo +dlc.png';
import switchPromoCuphead from '../../assets/promos/cuphead + dlc.png';
import DepthCarousel from '../../components/DepthCarousel/DepthCarousel';
import StrokeText from '../../components/StrokeText/StrokeText';
import TiltedCard from '../../components/TiltedCard/TiltedCard';
import AnimatedList from '../../components/AnimatedList/AnimatedList';
import Loader from '../../components/Loader';
import GooeySearch from '../../components/GooeySearch';
import wspLogo from '../../assets/logos/logowsp.png';
import igLogo from '../../assets/logos/logoig.png';
import steamFastLookup from '../../assets/steam_fast_lookup.json';
import steamImportData from '../../assets/steam_import_data.json';
import { VIP_HIGHLIGHT_GAMES, isVipGame, isTopTierVip, isSteamProduct, getVipPrice, getSteamGameSurcharge, isRetiredSteamTitle } from '../../utils/vipGames';
import { STEAM_SAGAS } from '../../utils/sagasData';
import { trackSearch } from '../../utils/analytics';
import { hasResellerBenefits } from '../../utils/userRoles';

function getPlatformLogo(catName) {
  const n = (catName || '').toLowerCase();
  if (n.includes('steam')) return steamLogo;
  if (n.includes('ps5')) return ps5Logo;
  if (n.includes('ps4')) return ps4Logo;
  if (n.includes('switch')) return switchLogo;
  if (n.includes('streaming')) return streamingLogo;
  if (n.includes('suscrip')) return suscLogo;
  return null;
}

// Devuelve el texto del badge según la plataforma/categoría
function getCategoryPriceLabel(catName, prod) {
  const n = (catName || '').toLowerCase();
  // PS4 y PS5: Precio desde (cuentas primaria y secundaria tienen distintos precios)
  if (n.includes('ps4') || n.includes('ps5') || n.includes('playstation') || prod?.pricePrimariaCLP || prod?.priceSecundariaCLP) {
    return 'PRECIO DESDE';
  }
  // Streaming y Suscripciones: Precio por mes
  if (n.includes('streaming') || n.includes('suscrip') || (Array.isArray(prod?.preciosPorMes) && prod.preciosPorMes.length > 0)) {
    return 'PRECIO POR MES';
  }
  // Nintendo Switch y Steam / PC: Precio único
  if (n.includes('switch') || n.includes('nintendo') || n.includes('steam') || n.includes('pc')) {
    return 'PRECIO ÚNICO';
  }
  return 'PRECIO ÚNICO';
}

// Formatea el precio según la moneda
function formatPrecio(precio, moneda) {
  if (!precio || isNaN(precio)) return "";
  if (moneda === "USD") {
    return `$${Number(precio).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (moneda === "CLP") {
    return `$${Number(precio).toLocaleString("es-CL")}`;
  }
  return precio;
}

const STEAM_SAGAS_PROMOS = STEAM_SAGAS;

const SWITCH_PACKS_PROMOS = [
  { key: 'promo-basica-2x', name: 'Pack 2X Básico', shortName: 'Pack 2X Básico', subtitle: 'Elige 2 juegos a elección', priceCLP: 25000, image: switchPromo2xBasica, badge: '2X1 BÁSICO', count: 2 },
  { key: 'promo-basica-3x', name: 'Pack 3X Básico', shortName: 'Pack 3X Básico', subtitle: 'Elige 3 juegos a elección', priceCLP: 35000, image: switchPromo3xBasica, badge: '3X1 BÁSICO', count: 3 },
  { key: 'promo-deluxe-2x', name: 'Pack 2X Deluxe', shortName: 'Pack 2X Deluxe', subtitle: 'Elige 2 juegos Deluxe', priceCLP: 30000, image: switchPromo2xDeluxe, badge: '2X1 DELUXE', count: 2 },
  { key: 'promo-deluxe-3x', name: 'Pack 3X Deluxe', shortName: 'Pack 3X Deluxe', subtitle: 'Elige 3 juegos Deluxe', priceCLP: 40000, image: switchPromo3xDeluxe, badge: '3X1 DELUXE', count: 3 },
  { key: 'promo-4x', name: 'Pack 4X Mega', shortName: 'Pack 4X Mega', subtitle: 'Elige 4 juegos a libre elección', priceCLP: 55000, image: switchPromo4xMega, badge: '4X1 MEGA', count: 4 },
];

const SWITCH_DLC_PROMOS = [
  { key: 'promo-kart', name: 'Mario Kart 8 + Pase', shortName: 'Mario Kart 8 + Pase', subtitle: 'Juego + 48 Pistas Extra', priceCLP: 22000, image: switchPromoKart, badge: 'JUEGO + DLC' },
  { key: 'promo-wild', name: 'Zelda BOTW + Pase', shortName: 'Zelda BOTW + Pase', subtitle: 'Juego + Balada Elegidos', priceCLP: 24000, image: switchPromoWild, badge: 'JUEGO + DLC' },
  { key: 'promo-violet', name: 'Pokémon Violet + DLC', shortName: 'Pokémon Violet + DLC', subtitle: 'Juego + Tesoro Área Cero', priceCLP: 24000, image: switchPromoViolet, badge: 'JUEGO + DLC' },
  { key: 'promo-scarlet', name: 'Pokémon Scarlet + DLC', shortName: 'Pokémon Scarlet + DLC', subtitle: 'Juego + Tesoro Área Cero', priceCLP: 24000, image: switchPromoScarlet, badge: 'JUEGO + DLC' },
  { key: 'promo-animal', name: 'Animal Crossing + DLC', shortName: 'Animal Crossing + DLC', subtitle: 'Juego + Happy Home Paradise', priceCLP: 20000, image: switchPromoAnimal, badge: 'JUEGO + DLC' },
  { key: 'promo-splatoon', name: 'Splatoon 3 + DLC', shortName: 'Splatoon 3 + DLC', subtitle: 'Juego + La Cara del Orden', priceCLP: 24000, image: switchPromoSplatoon, badge: 'JUEGO + DLC' },
  { key: 'promo-sword', name: 'Pokémon Espada + DLC', shortName: 'Pokémon Espada + DLC', subtitle: 'Juego + Pase Expansión', priceCLP: 23000, image: switchPromoSword, badge: 'JUEGO + DLC' },
  { key: 'promo-shield', name: 'Pokémon Escudo + DLC', shortName: 'Pokémon Escudo + DLC', subtitle: 'Juego + Pase Expansión', priceCLP: 23000, image: switchPromoShield, badge: 'JUEGO + DLC' },
  { key: 'promo-cuphead', name: 'Cuphead + DLC', shortName: 'Cuphead + DLC', subtitle: 'Juego + Last Course DLC', priceCLP: 12000, image: switchPromoCuphead, badge: 'JUEGO + DLC' },
];


export default function CategoriaPage() {
  const { id: rawId } = useParams();
  const id = extractId(rawId);
  const navigate = useNavigate();
  const { moneda, formatearPrecio } = useMoneda();
  const [user, setUser] = useState(auth.currentUser);
  const [role, setRole] = useState(null);
  const [categoria, setCategoria] = useState(null);
  const catName = categoria ? categoria.name : '';
  const catNameLower = (catName || '').toLowerCase();
  const isSteamCat = catNameLower.includes('steam') || (id || '').toLowerCase().includes('steam');
  const isSwitchCat = catNameLower.includes('switch') || catNameLower.includes('nintendo') || (id || '').toLowerCase().includes('switch') || (id || '').toLowerCase().includes('nintendo') || (id || '') === 'VtQaPwP0xXdC1qdz6Hvq' || (id || '') === 'Y7j7vSXMUgWxFNMkOuwX';
  const isPSCat = catNameLower.includes('playstation') || catNameLower.includes('ps4') || catNameLower.includes('ps5') || (id || '').toLowerCase().includes('playstation');
  const isSubCat = catNameLower.includes('suscri') || catNameLower.includes('streaming');
  const categoryBanner = (() => {
    const categoryKey = `${catNameLower} ${(id || '').toLowerCase()}`;
    if (categoryKey.includes('steam')) return { image: bannerSteamHalloween, title: 'Elige tu próxima aventura', description: 'Miles de historias te esperan para una noche de juego inolvidable.', accent: 'PC GAMING' };
    if (categoryKey.includes('playstation') || categoryKey.includes('ps4') || categoryKey.includes('ps5')) return { image: bannerPlaystationHalloween, title: 'Tu historia favorita empieza aquí', description: 'Encuentra tu próxima aventura y juega sin complicaciones.', accent: 'PLAYSTATION' };
    if (categoryKey.includes('switch') || categoryKey.includes('nintendo')) return { image: bannerNintendoHalloween, title: 'Diversión para llevar', description: 'Elige tu juego, recíbelo digital y que comience la aventura.', accent: 'NINTENDO SWITCH' };
    if (categoryKey.includes('streaming')) return { image: bannerStreamingHalloween, title: 'Tu próxima maratón empieza aquí', description: 'Elige tu plataforma favorita, encuentra tu plan y disfruta sin complicaciones.', accent: 'STREAMING' };
    if (categoryKey.includes('suscri')) return { image: bannerSubscriptionsHalloween, title: 'Tus beneficios siguen activos', description: 'Membresías y accesos para seguir jugando cuando quieras.', accent: 'SUSCRIPCIONES' };
    if (categoryKey.includes('promo') || categoryKey.includes('oferta')) return { image: bannerPromosHalloween, title: 'Ofertas que dan miedo', description: 'Aprovecha promociones especiales antes de que desaparezcan.', accent: 'PROMOCIONES' };
    if (categoryKey.includes('emprend') || categoryKey.includes('mayor')) return { image: bannerEmprendedoresHalloween, title: 'Haz crecer tu propia tienda', description: 'Packs pensados para emprender con el respaldo de PandaStore.', accent: 'EMPRENDEDORES' };
    return { image: bannerPacksHalloween, title: 'Más juegos, mejor precio', description: 'Descubre packs especiales para ampliar tu colección.', accent: 'PACKS ESPECIALES' };
  })();
  const isSteamCategory = Boolean(
    isSteamCat ||
    (categoria?.id || '').toLowerCase().includes('steam')
  );
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ryuuLoading, setRyuuLoading] = useState(false);
  const [cartIds, setCartIds] = useState([]);
  const [favIds, setFavIds] = useState([]);
  const [modal, setModal] = useState({ open: false, prod: null, opciones: [], tipo: null });

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const profile = userDoc.data();
            setRole(hasResellerBenefits(profile) ? "revendedor" : (profile.role || "user"));
          }
        } catch (e) {
          console.error("Error obteniendo rol de usuario:", e);
        }
      } else {
        setRole(null);
      }
    });
    return () => unsubAuth();
  }, []);

  // Buscador local para la categoría
  const [productos, setProductos] = useState([]);
  const [search, setSearch] = useState(""); // valor aplicado
  const [searchInput, setSearchInput] = useState(""); // mientras escribe
  const [filtroAplicado, setFiltroAplicado] = useState(false);

  const [searchResults, setSearchResults] = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [order, setOrder] = useState("price-asc");
  const [page, setPage] = useState(1);
  const perPage = 30;
  const [primeraCarga, setPrimeraCarga] = useState(true);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [selectedSwitchCompat, setSelectedSwitchCompat] = useState(null);
  const [selectedPSPlatform, setSelectedPSPlatform] = useState(null); // null ('todos') | 'ps4' | 'ps5'
  const [selectedSteamGenre, setSelectedSteamGenre] = useState(null); // null ('todos') | 'terror' | 'accion' | 'estrategia' | 'rpg' | 'aventura' | 'carreras' | 'coop' | 'metroidvania'
  const [selectedSteamDlcFilter, setSelectedSteamDlcFilter] = useState(null); // null ('todos') | 'con_dlc' | 'sin_dlc'
  const [dlcMap, setDlcMap] = useState(() => new Map());
  const [switchStockMap, setSwitchStockMap] = useState(() => new Map());

  useEffect(() => {
    let isMounted = true;
    const catLow = (id || '').toLowerCase();
    const isSwitchTarget = catLow.includes('switch') || catLow.includes('nintendo') || id === 'VtQaPwP0xXdC1qdz6Hvq' || id === 'Y7j7vSXMUgWxFNMkOuwX';
    if (isSwitchTarget || switchStockMap.size === 0) {
      calculateSwitchStockMap(false).then(res => {
        if (isMounted && res && res.stockMap) {
          setSwitchStockMap(res.stockMap);
        }
      }).catch(() => {});
    }
    return () => { isMounted = false; };
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    fetchRyuuCatalog().then(data => {
      if (isMounted && Array.isArray(data) && data.length > 0) {
        setRawRyuuCatalog(data);
        const map = new Map();
        for (let i = 0; i < data.length; i++) {
          const r = data[i];
          if (r.appid && r.dlc && typeof r.dlc === 'object') {
            const count = Object.keys(r.dlc).length;
            if (count > 0) map.set(String(r.appid), count);
          }
        }
        setDlcMap(map);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const getGameDlcCount = React.useCallback((prod) => {
    if (!prod) return 0;
    if (Array.isArray(prod.dlcs) && prod.dlcs.length > 0) return prod.dlcs.length;
    if (prod.dlcCount && typeof prod.dlcCount === 'number') return prod.dlcCount;
    const appId = String(prod.app_id || prod.appId || (String(prod.id || '').startsWith('ryuu_') ? prod.id.replace('ryuu_', '') : ''));
    if (appId && dlcMap && dlcMap.has(appId)) {
      return dlcMap.get(appId);
    }
    return 0;
  }, [dlcMap]);

  const [showSteamInfo, setShowSteamInfo] = useState(false); // Colapsado por defecto para no invadir la pantalla
  const [activeSteamPromoTab, setActiveSteamPromoTab] = useState("packs"); // "packs" | "sagas"
  const steamPromoRowRef = React.useRef(null);
  const scrollSteamPromo = (direction) => {
    if (steamPromoRowRef.current) {
      const scrollAmount = direction === "left" ? -350 : 350;
      steamPromoRowRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };
  const [showMoreSteamPromos, setShowMoreSteamPromos] = useState(false);
  const [showAllSagas, setShowAllSagas] = useState(false);
  const [steamPromoModal, setSteamPromoModal] = useState({ open: false, promo: null, selectedIds: [], search: "", vipTab: "vip" });
  const [steamPromoSelectedDlcs, setSteamPromoSelectedDlcs] = useState({});
  const [activeDlcModalGame, setActiveDlcModalGame] = useState(null);
  const [rawRyuuCatalog, setRawRyuuCatalog] = useState([]);
  const [sagaPreviewModal, setSagaPreviewModal] = useState({ open: false, saga: null, selectedVipExtras: [] });
  const [steamViewMode, setSteamViewMode] = useState(() => {
    try {
      return localStorage.getItem("panda_steam_view_mode") || "grid";
    } catch {
      return "grid";
    }
  });

  const handleSteamViewModeChange = (mode) => {
    setSteamViewMode(mode);
    try {
      localStorage.setItem("panda_steam_view_mode", mode);
    } catch (e) {}
  };

  const [steamPromoSearch, setSteamPromoSearch] = useState("");
  const [steamPromoDebouncedSearch, setSteamPromoDebouncedSearch] = useState("");

  const openSteamPromoModal = (promo) => {
    setSteamPromoSearch("");
    setSteamPromoDebouncedSearch("");
    setSteamPromoSelectedDlcs({});
    setActiveDlcModalGame(null);
    setSteamPromoModal({ open: true, promo, selectedIds: [], vipTab: "vip" });
  };

  const openDlcModalForGame = (p) => {
    if (!p) return;
    // Si el juego no está seleccionado todavía, seleccionarlo automáticamente
    setSteamPromoModal(prev => {
      if (prev.promo?.isVipPromo) {
        if (prev.vipTab === "vip") {
          if (selectedVipId !== p.id) {
            const bonusOnly = prev.selectedIds.filter(x => x !== selectedVipId);
            return { ...prev, selectedIds: [p.id, ...bonusOnly] };
          }
        } else {
          if (!prev.selectedIds.includes(p.id)) {
            if (selectedBonusIds.length < 2) {
              return { ...prev, selectedIds: [...prev.selectedIds, p.id] };
            } else {
              return { ...prev, selectedIds: [selectedVipId, selectedBonusIds[0], p.id].filter(Boolean) };
            }
          }
        }
      } else {
        if (!prev.selectedIds.includes(p.id)) {
          if (prev.selectedIds.length < prev.promo.count) {
            return { ...prev, selectedIds: [...prev.selectedIds, p.id] };
          } else {
            const newIds = [...prev.selectedIds.slice(0, Math.max(0, prev.promo.count - 1)), p.id];
            return { ...prev, selectedIds: newIds };
          }
        }
      }
      return prev;
    });
    setActiveDlcModalGame(p);
  };

  // Debounce search in Steam Promo Modal to keep UI instant (60fps) like the EXE
  useEffect(() => {
    const handler = setTimeout(() => {
      setSteamPromoDebouncedSearch(steamPromoSearch);
    }, 150);
    return () => clearTimeout(handler);
  }, [steamPromoSearch]);

  // El selector de packs usa un catálogo curado y acotado. Así no intenta
  // pintar ni recorrer el catálogo masivo de Steam al abrirse, pero conserva
  // los productos administrados y todos los títulos del listado oficial.
  const steamPromoCatalog = React.useMemo(() => {
    const entries = [];
    const seen = new Set();
    const add = (item) => {
      if (!item || (!isSteamProduct(item) && !item.app_id)) return;
      if (isOnlineOnlySteamProduct(item) || isRetiredSteamTitle(item)) return;
      const appId = String(item.app_id || item.appId || item.steamAppId || '').trim();
      const nameKey = String(item.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      const key = appId ? `app:${appId}` : `name:${nameKey}`;
      if (!nameKey || seen.has(key)) return;
      seen.add(key);
      const imageUrl = item.imageUrl || item.image || (appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg` : null);
      entries.push({
        ...item,
        id: item.id || `promo-steam-${appId || nameKey}`,
        app_id: appId || item.app_id,
        plataforma: 'Steam',
        categoryId: item.categoryId || 'steam',
        categoryName: item.categoryName || 'Steam',
        imageUrl,
        image: imageUrl,
      });
    };

    // No incluimos el catálogo Ryuu completo en el modal: son decenas de
    // miles de registros y es la causa de los bloqueos al escribir.
    productos.filter(p => !String(p.id || '').startsWith('ryuu_')).forEach(add);
    (Array.isArray(steamImportData) ? steamImportData : []).forEach(add);
    return entries;
  }, [productos]);

  const steamProductMap = React.useMemo(() => {
    const map = new Map();
    steamPromoCatalog.forEach(p => map.set(p.id, p));
    VIP_HIGHLIGHT_GAMES.forEach(g => {
      if (!map.has(g.id)) map.set(g.id, g);
    });
    return map;
  }, [steamPromoCatalog]);

  const selectedVipId = React.useMemo(() => {
    if (!steamPromoModal.promo?.isVipPromo) return null;
    return steamPromoModal.selectedIds.find(id => {
      const g = steamProductMap.get(id);
      return isVipGame(g);
    }) || null;
  }, [steamPromoModal.promo, steamPromoModal.selectedIds, steamProductMap]);

  const selectedBonusIds = React.useMemo(() => {
    if (!steamPromoModal.promo?.isVipPromo) return [];
    return steamPromoModal.selectedIds.filter(id => id !== selectedVipId);
  }, [steamPromoModal.promo, steamPromoModal.selectedIds, selectedVipId]);

  const steamFilteredPromoProducts = React.useMemo(() => {
    if (!steamPromoModal.open) return [];
    const query = steamPromoDebouncedSearch.trim().toLowerCase();

    if (steamPromoModal.promo?.isVipPromo) {
      if (steamPromoModal.vipTab === "vip") {
        const existingNames = new Set(VIP_HIGHLIGHT_GAMES.map(g => (g.name || "").toLowerCase().trim()));
        const extraVip = steamPromoCatalog.filter(p => isVipGame(p) && !existingNames.has((p.name || "").toLowerCase().trim()));
        const combined = [...VIP_HIGHLIGHT_GAMES, ...extraVip].filter(p => !isRetiredSteamTitle(p));
        return !query ? combined : combined.filter(p => (p.name && p.name.toLowerCase().includes(query)));
      } else {
        const cleanGames = steamPromoCatalog.filter(p => !isVipGame(p));
        if (!query) return cleanGames.slice(0, 100);
        const filtered = [];
        for (let i = 0; i < cleanGames.length; i++) {
          const p = cleanGames[i];
          if ((p.name && p.name.toLowerCase().includes(query)) || (p.app_id && String(p.app_id).includes(query))) {
            filtered.push(p);
            if (filtered.length >= 100) break;
          }
        }
        return filtered;
      }
    }

    // Promos normales de Steam (3X, 10X, 23X, etc.) -> EXCLUIR 100% ONLINE (Rust, DayZ, etc.)
    const steamEligible = steamPromoCatalog;
    if (!query) {
      return steamEligible.slice(0, 80); // Primeros 80 instantáneos
    }
    const filtered = [];
    for (let i = 0; i < steamEligible.length; i++) {
      const p = steamEligible[i];
      if ((p.name && p.name.toLowerCase().includes(query)) || (p.app_id && String(p.app_id).includes(query))) {
        filtered.push(p);
        if (filtered.length >= 100) break; // Límite de 100 resultados para respuesta ultra rápida
      }
    }
    return filtered;
  }, [steamPromoCatalog, steamPromoDebouncedSearch, steamPromoModal.open, steamPromoModal.promo, steamPromoModal.vipTab]);

  const totalSelectedDlcsCount = React.useMemo(() => {
    let count = 0;
    (steamPromoModal.selectedIds || []).forEach(id => {
      const dlcs = steamPromoSelectedDlcs[id] || [];
      count += dlcs.length;
    });
    return count;
  }, [steamPromoModal.selectedIds, steamPromoSelectedDlcs]);

  const totalDlcExtraPrice = React.useMemo(() => {
    let price = 0;
    (steamPromoModal.selectedIds || []).forEach(id => {
      const dlcs = steamPromoSelectedDlcs[id] || [];
      if (dlcs.length > 0) {
        price += getDlcBundlePrice(dlcs.length);
      }
    });
    return price;
  }, [steamPromoModal.selectedIds, steamPromoSelectedDlcs]);

  const steamDynamicPrice = React.useMemo(() => {
    if (!steamPromoModal.promo) return 0;
    let basePrice = 0;
    if (steamPromoModal.promo.isVipPromo) {
      if (!selectedVipId) basePrice = 8000;
      else {
        const vipProd = steamProductMap.get(selectedVipId);
        const vipPrice = getVipPrice(vipProd);
        const listedVipPrice = vipPrice || Number(vipProd?.priceCLP || 8000);
        // El estreno Steam de $8.000 está incluido. Sólo Ubisoft y EA agregan
        // costo sobre el pack: +$3.000 y +$5.000 respectivamente.
        basePrice = listedVipPrice >= 15000 ? 13000 : listedVipPrice >= 12000 ? 11000 : 8000;
      }
    } else {
      let extraSurcharges = 0;
      steamPromoModal.selectedIds.forEach(id => {
        const p = steamProductMap.get(id);
        if (p) {
          extraSurcharges += getSteamGameSurcharge(p);
        }
      });
      basePrice = steamPromoModal.promo.priceCLP + extraSurcharges;
    }

    const totalRaw = basePrice + totalDlcExtraPrice;
    if (role === "revendedor") {
      return Math.round(totalRaw * 0.5);
    }
    return totalRaw;
  }, [steamPromoModal.promo, steamPromoModal.selectedIds, steamProductMap, selectedVipId, role, totalDlcExtraPrice]);

  const confirmSteamPromoSelection = async () => {
    const { promo, selectedIds } = steamPromoModal;
    if (!promo) return;
    if (promo.isVipPromo) {
      if (!selectedVipId || selectedBonusIds.length !== 2) return;
    } else {
      if (selectedIds.length !== promo.count) return;
    }

    const chosen = selectedIds.map(id => steamProductMap.get(id)).filter(Boolean);
    const names = chosen.map(p => p.name).join(" + ");

    // Recopilar todos los DLCs seleccionados en la promo
    const allSelectedDlcs = [];
    selectedIds.forEach(id => {
      const dlcs = steamPromoSelectedDlcs[id] || [];
      const prod = steamProductMap.get(id);
      dlcs.forEach(d => {
        allSelectedDlcs.push({
          ...d,
          gameId: id,
          gameName: prod?.name || 'Juego',
          gameAppId: prod?.app_id || null
        });
      });
    });

    const dlcText = allSelectedDlcs.length > 0
      ? ` + DLCs: ${allSelectedDlcs.map(d => d.name).join(', ')}`
      : '';

    const packId = `promo-${promo.key}-${Date.now()}`;
    const cartItem = {
      id: packId,
      productId: packId,
      isPromo: true,
      name: `${promo.name} (${names})${dlcText}`,
      priceCLP: steamDynamicPrice,
      priceUSD: steamDynamicPrice / 900,
      isResellerPrice: role === "revendedor",
      imageUrl: promo.image || chosen[0]?.imageUrl || null,
      cantidad: 1,
      plataforma: "steam",
      categoryId: "steam",
      categoryName: "Steam",
      isSteam: true,
      promoGames: chosen.map(p => ({
        id: p.id,
        name: p.name,
        app_id: p.app_id,
        appId: p.app_id,
        selectedDlcs: steamPromoSelectedDlcs[p.id] || []
      })),
      selectedDlcs: allSelectedDlcs,
      dlcsCount: allSelectedDlcs.length
    };

    if (user) {
      await setDoc(doc(db, `users/${user.uid}/cart`, packId), cartItem);
    } else {
      let localCart = [];
      try {
        const stored = localStorage.getItem('guestCart');
        if (stored) localCart = JSON.parse(stored);
      } catch (e) {}
      localCart.push(cartItem);
      localStorage.setItem('guestCart', JSON.stringify(localCart));
      window.dispatchEvent(new Event('localCartUpdated'));
    }
    setSteamPromoModal({ open: false, promo: null, selectedIds: [], search: "", vipTab: "vip" });
    setSteamPromoSelectedDlcs({});
    setActiveDlcModalGame(null);
    navigate("/checkoutcarrito");
  };

  const addSagaToCart = async (saga, selectedVipExtras = [], goToCheckout = true) => {
    if (!saga) return;
    const packId = `promo-${saga.key}-${Date.now()}`;
    const extraPrice = (selectedVipExtras || []).reduce((acc, curr) => acc + (curr.priceCLP || 8000), 0);
    const publicPriceCLP = (saga.priceCLP || 0) + extraPrice;
    const finalPriceCLP = role === "revendedor" ? Math.round(publicPriceCLP * 0.5) : publicPriceCLP;

    const vipText = selectedVipExtras.length > 0 
      ? ` + Extras VIP: ${selectedVipExtras.map(v => v.name).join(', ')}` 
      : '';

    const cartItem = {
      id: packId,
      productId: packId,
      isPromo: true,
      isSaga: true,
      plataforma: "steam",
      categoryId: "juegos-steam",
      categoryName: "Juegos Steam",
      isSteam: true,
      appId: saga.appId || null,
      name: `${saga.name} (${saga.games.join(" + ")})${vipText}`,
      priceCLP: finalPriceCLP,
      precioPublicoCLP: publicPriceCLP,
      priceUSD: finalPriceCLP / 900,
      isResellerPrice: role === "revendedor",
      imageUrl: saga.image,
      cantidad: 1,
      games: saga.games,
      promoGames: [
        ...saga.games.map(t => ({ id: t, name: t, plataforma: "steam" })),
        ...(selectedVipExtras || []).map(v => ({ id: v.id, name: `${v.name} (VIP Extra)`, appId: v.appId || null, plataforma: "steam" }))
      ]
    };

    if (user) {
      await setDoc(doc(db, `users/${user.uid}/cart`, packId), cartItem);
    } else {
      let localCart = [];
      try {
        const stored = localStorage.getItem('guestCart');
        if (stored) localCart = JSON.parse(stored);
      } catch (e) {}
      localCart.push(cartItem);
      localStorage.setItem('guestCart', JSON.stringify(localCart));
      window.dispatchEvent(new Event('localCartUpdated'));
    }
    setSagaPreviewModal({ open: false, saga: null, selectedVipExtras: [] });
    if (goToCheckout) {
      navigate("/checkoutcarrito");
    }
  };

  useEffect(() => {
    function normalize(str) {
      return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

    function tokenize(str) {
      return normalize(str).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
    }

    function levenshtein(a, b) {
      if (a === b) return 0;
      if (!a.length) return b.length;
      if (!b.length) return a.length;
      const row = Array(b.length + 1).fill(0).map((_, i) => i);
      for (let i = 1; i <= a.length; i++) {
        let prev = i;
        for (let j = 1; j <= b.length; j++) {
          const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
          row[j - 1] = prev;
          prev = val;
        }
        row[b.length] = prev;
      }
      return row[b.length];
    }

    function smartMatch(queryStr, targetStr) {
      if (!queryStr) return true;
      const qNorm = normalize(queryStr);
      const tNorm = normalize(targetStr);
      if (tNorm.includes(qNorm)) return true;

      const qTokens = tokenize(queryStr);
      const tTokens = tokenize(targetStr);
      if (qTokens.length === 0) return true;

      return qTokens.every(qTok => {
        // Direct inclusion
        if (tTokens.some(tTok => tTok.includes(qTok))) return true;
        // Fuzzy tolerance for typos (1 typo if length >= 4, 2 typos if length >= 6)
        if (qTok.length >= 4) {
          const maxDist = qTok.length <= 5 ? 1 : 2;
          return tTokens.some(tTok => levenshtein(qTok, tTok) <= maxDist);
        }
        return false;
      });
    }

    if (loading || !productos || productos.length === 0) {
      setSearchResults([]);
      return;
    }

    const texto = normalize(searchInput.trim());
    let results = [...productos]; // ya vienen filtrados por categoría desde Firestore

    // Búsqueda inteligente
    if (texto) {
      results = results.filter(prod => {
        const precios = [];
        if (moneda === "CLP") {
          if (prod.priceCLP) precios.push(String(prod.priceCLP));
          if (prod.pricePrimariaCLP) precios.push(String(prod.pricePrimariaCLP));
          if (prod.priceSecundariaCLP) precios.push(String(prod.priceSecundariaCLP));
          if (Array.isArray(prod.preciosPorMes)) {
            prod.preciosPorMes.forEach(p => { if (p.clp) precios.push(String(p.clp)); });
          }
        } else if (moneda === "USD") {
          if (prod.priceUSD) precios.push(String(prod.priceUSD));
          if (prod.pricePrimariaUSD) precios.push(String(prod.pricePrimariaUSD));
          if (prod.priceSecundariaUSD) precios.push(String(prod.priceSecundariaUSD));
          if (Array.isArray(prod.preciosPorMes)) {
            prod.preciosPorMes.forEach(p => { if (p.usd) precios.push(String(p.usd)); });
          }
        }

        const matchName = prod.name && smartMatch(texto, prod.name);
        const matchDesc = prod.description && normalize(prod.description).includes(texto);
        const matchPrice = precios.some(precio => normalize(precio).includes(texto));
        return matchName || matchDesc || matchPrice;
      });
    }

    // Deduplicación estricta de resultados por nombre normalizado
    const seenResults = new Set();
    results = results.filter(p => {
      const cleanKey = (p.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      if (!cleanKey) return true;
      if (seenResults.has(cleanKey)) return false;
      seenResults.add(cleanKey);
      return true;
    });

    // Filtros de precio
    results = results.filter(prod => {
      const preciosNum = [];
      if (moneda === "CLP") {
        if (prod.priceCLP) preciosNum.push(Number(prod.priceCLP));
        if (prod.pricePrimariaCLP) preciosNum.push(Number(prod.pricePrimariaCLP));
        if (prod.priceSecundariaCLP) preciosNum.push(Number(prod.priceSecundariaCLP));
        if (Array.isArray(prod.preciosPorMes)) {
          prod.preciosPorMes.forEach(p => { if (p.clp) preciosNum.push(Number(p.clp)); });
        }
      } else if (moneda === "USD") {
        if (prod.priceUSD) preciosNum.push(Number(prod.priceUSD));
        if (prod.pricePrimariaUSD) preciosNum.push(Number(prod.pricePrimariaUSD));
        if (prod.priceSecundariaUSD) preciosNum.push(Number(prod.priceSecundariaUSD));
        if (Array.isArray(prod.preciosPorMes)) {
          prod.preciosPorMes.forEach(p => { if (p.usd) preciosNum.push(Number(p.usd)); });
        }
      }
      const min = preciosNum.length > 0 ? Math.min(...preciosNum.filter(x => x > 0)) : null;
      if (minPrice && (min === null || min < Number(minPrice))) return false;
      if (maxPrice && (min === null || min > Number(maxPrice))) return false;
      return true;
    });

    // Filtro por etiqueta
    if (selectedTag) {
      results = results.filter(prod => Array.isArray(prod.tags) && prod.tags.includes(selectedTag));
    }

    // Filtro por letra inicial
    if (selectedLetter) {
      results = results.filter(prod => prod.name && prod.name.trim()[0] && prod.name.trim()[0].toUpperCase() === selectedLetter);
    }

    // Filtro por compatibilidad Switch
    if (selectedSwitchCompat) {
      results = results.filter(prod => {
        const compat = prod.switchCompat || 'ambas';
        if (selectedSwitchCompat === 'para1')      return compat === 'switch1' || compat === 'ambas';
        if (selectedSwitchCompat === 'para2')      return compat === 'switch2' || compat === 'ambas';
        if (selectedSwitchCompat === 'exclusivo2') return compat === 'switch2';
        return true;
      });
    }

    // Filtro por consola PlayStation (PS4 o PS5)
    if (selectedPSPlatform) {
      results = results.filter(prod => {
        const cId = (prod.categoryId || '').toLowerCase();
        const pName = (prod.name || '').toLowerCase();
        const tags = Array.isArray(prod.tags) ? prod.tags.map(t => String(t).toLowerCase()) : [];
        if (selectedPSPlatform === 'ps4') {
          return cId.includes('ps4') || pName.includes('ps4') || tags.includes('ps4') || prod.categoryId === 'xA4NsfBdY5MOvqegPDBw';
        }
        if (selectedPSPlatform === 'ps5') {
          return cId.includes('ps5') || pName.includes('ps5') || tags.includes('ps5') || prod.categoryId === 'cLMyaADucf7zGkC73DWK';
        }
        return true;
      });
    }

    // Filtro por Género (Terror, Acción, Estrategia, RPG, Aventura, Carreras, Coop, Metroidvania, Mario, etc.)
    if (selectedSteamGenre) {
      const gTerm = selectedSteamGenre.toLowerCase();
      results = results.filter(prod => {
        const pName = (prod.name || '').toLowerCase();
        const pGen = (prod.genero || '').toLowerCase();
        const pDesc = (prod.description || '').toLowerCase();
        const tags = Array.isArray(prod.tags) ? prod.tags.map(t => String(t).toLowerCase()) : [];

        if (gTerm === 'terror') {
          return pGen.includes('terror') || pGen.includes('horror') || tags.some(t => t.includes('terror') || t.includes('horror')) ||
                 pName.includes('resident evil') || pName.includes('silent hill') || pName.includes('outlast') || pName.includes('dead space') || pName.includes('amnesia') || pName.includes('phasmophobia') || pName.includes('forest') || pName.includes('evil') || pName.includes('fear') || pName.includes('alien') || pName.includes('dying light') || pName.includes('left 4 dead') || pName.includes('alan wake') || pName.includes('dead by daylight') || pName.includes('five nights') || pName.includes('the last of us') || pName.includes('until dawn') || pName.includes('bloodborne');
        }
        if (gTerm === 'accion') {
          return pGen.includes('acci') || pGen.includes('action') || tags.some(t => t.includes('acci') || t.includes('action')) ||
                 pName.includes('gta') || pName.includes('grand theft auto') || pName.includes('cyberpunk') || pName.includes('god of war') || pName.includes('doom') || pName.includes('devil may cry') || pName.includes('spider-man') || pName.includes('spiderman') || pName.includes('batman') || pName.includes('arkham') || pName.includes('assassin') || pName.includes('red dead') || pName.includes('metal gear') || pName.includes('tomb raider') || pName.includes('far cry') || pName.includes('call of duty') || pName.includes('mafia') || pName.includes('sekiro') || pName.includes('battlefield') || pName.includes('dishonored') || pName.includes('wolfenstein') || pName.includes('hitman') || pName.includes('prototype') || pName.includes('max payne') || pName.includes('just cause') || pName.includes('ghost of tsushima') || pName.includes('helldivers') || pName.includes('the last of us');
        }
        if (gTerm === 'estrategia') {
          return pGen.includes('estrateg') || pGen.includes('strategy') || pGen.includes('rts') || tags.some(t => t.includes('estrateg') || t.includes('strategy') || t.includes('rts')) ||
                 pName.includes('age of empires') || pName.includes('age of mythology') || pName.includes('civilization') || pName.includes('total war') || pName.includes('hearts of iron') || pName.includes('crusader') || pName.includes('stellaris') || pName.includes('frostpunk') || pName.includes('command & conquer') || pName.includes('cities: skylines') || pName.includes('company of heroes') || pName.includes('tropico') || pName.includes('stronghold');
        }
        if (gTerm === 'rpg') {
          return pGen.includes('rpg') || pGen.includes('rol') || tags.some(t => t.includes('rpg') || t.includes('rol')) ||
                 pName.includes('elden ring') || pName.includes('dark souls') || pName.includes('witcher') || pName.includes('baldur') || pName.includes('persona') || pName.includes('dragon') || pName.includes('monster hunter') || pName.includes('final fantasy') || pName.includes('fallout') || pName.includes('skyrim') || pName.includes('hogwarts') || pName.includes('lies of p') || pName.includes('cyberpunk') || pName.includes('starfield') || pName.includes('mass effect') || pName.includes('nier') || pName.includes('yakuza') || pName.includes('like a dragon');
        }
        if (gTerm === 'aventura') {
          return pGen.includes('aventura') || pGen.includes('adventure') || tags.some(t => t.includes('aventura') || t.includes('adventure')) ||
                 pName.includes('tomb raider') || pName.includes('uncharted') || pName.includes('the last of us') || pName.includes('zelda') || pName.includes('hollow knight') || pName.includes('stray') || pName.includes('ori') || pName.includes('plague tale') || pName.includes('god of war') || pName.includes('horizon') || pName.includes('death stranding') || pName.includes('indiana jones') || pName.includes('subnautica') || pName.includes('little nightmares') || pName.includes('detroit') || pName.includes('ghost of tsushima');
        }
        if (gTerm === 'coop') {
          return pGen.includes('coop') || pGen.includes('multiplayer') || tags.some(t => t.includes('coop') || t.includes('pareja') || t.includes('multiplayer')) ||
                 pName.includes('it takes two') || pName.includes('a way out') || pName.includes('cuphead') || pName.includes('overcooked') || pName.includes('left 4 dead') || pName.includes('portal 2') || pName.includes('dont starve') || pName.includes("don't starve") || pName.includes('human fall flat') || pName.includes('raft') || pName.includes('valheim') || pName.includes('borderlands') || pName.includes('payday') || pName.includes('mario party') || pName.includes('smash');
        }
        if (gTerm === 'carreras') {
          return pGen.includes('carrera') || pGen.includes('racing') || tags.some(t => t.includes('carrera') || t.includes('racing')) ||
                 pName.includes('gran turismo') || pName.includes('mario kart') || pName.includes('forza') || pName.includes('need for speed') || pName.includes('f1') || pName.includes('assetto') || pName.includes('dirt') || pName.includes('grid') || pName.includes('rally') || pName.includes('wrc') || pName.includes('crew') || pName.includes('beamng') || pName.includes('burnout');
        }
        if (gTerm === 'metroidvania' || gTerm === 'hollow') {
          return pName.includes('hollow knight') || pName.includes('ori') || pName.includes('blasphemous') || pName.includes('dead cells') || pName.includes('cuphead') || pName.includes('celeste') || pName.includes('ender lilies') || pName.includes('castlevania') || pName.includes('bloodstained') || pName.includes('metroid');
        }
        if (gTerm === 'mario_pokemon') {
          return pName.includes('mario') || pName.includes('pokemon') || pName.includes('pokémon') || pName.includes('zelda') || pName.includes('kirby') || pName.includes('donkey') || pName.includes('smash') || pName.includes('luigi') || pName.includes('metroid');
        }
        if (gTerm === 'plataformas') {
          return pGen.includes('plataforma') || pGen.includes('platform') || tags.some(t => t.includes('plataforma') || t.includes('platform')) ||
                 pName.includes('mario') || pName.includes('sonic') || pName.includes('crash') || pName.includes('donkey') || pName.includes('rayman') || pName.includes('cuphead') || pName.includes('celeste') || pName.includes('spyro') || pName.includes('ratchet');
        }
        if (gTerm === 'estrenos' || gTerm === 'top') {
          return Boolean(
            (typeof isVipGame === 'function' && isVipGame(prod)) ||
            prod.isVipExclusive ||
            (typeof isTopTierVip === 'function' && isTopTierVip(prod)) ||
            pName.includes('black myth') || pName.includes('wukong') ||
            pName.includes('elden ring') || pName.includes('space marine') ||
            pName.includes('silent hill 2') || pName.includes('dragon ball') ||
            pName.includes('sparking') || pName.includes('ragnarok') ||
            pName.includes('ghost of tsushima') ||
            pName.includes('final fantasy xvi') || pName.includes('metaphor') ||
            pName.includes('stalker 2') || pName.includes('persona 3 reload')
          );
        }
        if (gTerm === 'tombraider') {
          return pName.includes('tomb raider') || pName.includes('lara croft');
        }
        if (gTerm === 'batman') {
          return pName.includes('batman') || pName.includes('arkham');
        }
        if (gTerm === 'residentevil') {
          return pName.includes('resident evil') || pName.includes('biohazard');
        }
        if (gTerm === 'souls') {
          return pName.includes('dark souls') || pName.includes('elden ring') || pName.includes('sekiro') || pName.includes('bloodborne') || pName.includes('demon') || pName.includes('armored core') || pName.includes('lies of p');
        }
        if (gTerm === 'outlast') {
          return pName.includes('outlast') || pName.includes('whistleblower');
        }
        if (gTerm === 'ageofempires') {
          return pName.includes('age of empires') || pName.includes('age of mythology') || pName.includes('aoe');
        }
        if (gTerm === 'godofwar') {
          return pName.includes('god of war');
        }
        if (gTerm === 'gta') {
          return pName.includes('grand theft auto') || pName.includes('gta') || pName.includes('red dead') || pName.includes('rdr') || pName.includes('bully') || pName.includes('max payne');
        }
        if (gTerm === 'farcry') {
          return pName.includes('far cry') || pName.includes('farcry');
        }
        if (gTerm === 'monsterhunter') {
          return pName.includes('monster hunter');
        }
        return pGen.includes(gTerm) || tags.some(t => t.includes(gTerm));
      });
    }

    // Filtro por contenido extra / DLCs (Steam / PC)
    if (selectedSteamDlcFilter) {
      results = results.filter(prod => {
        const count = getGameDlcCount(prod);
        if (selectedSteamDlcFilter === 'con_dlc') return count > 0;
        if (selectedSteamDlcFilter === 'sin_dlc') return count === 0;
        return true;
      });
    }

    // Filtro estricto para Nintendo Switch (Switch 1 y Switch 2):
    // SOLO mostrar en catálogo juegos que REALMENTE tienen stock (> 0) en packs_nintendo
    const isSwitchCurrent = Boolean(
      isSwitchCat ||
      catNameLower.includes('switch') ||
      catNameLower.includes('nintendo') ||
      (id || '').toLowerCase().includes('switch') ||
      (id || '').toLowerCase().includes('nintendo') ||
      (id || '') === 'VtQaPwP0xXdC1qdz6Hvq' ||
      (id || '') === 'Y7j7vSXMUgWxFNMkOuwX'
    );
    if (isSwitchCurrent) {
      results = results.filter(prod => {
        const pCat = (prod.categoryId || prod.categoria || prod.plataforma || '').toLowerCase();
        const isSwitchProd = pCat.includes('switch') || pCat.includes('nintendo') || 
                             prod.categoryId === "VtQaPwP0xXdC1qdz6Hvq" || 
                             prod.categoryId === "Y7j7vSXMUgWxFNMkOuwX" ||
                             Boolean(prod.switchCompat);
        if (!isSwitchProd) return false;

        const stock = getGameStockCount(prod.name, switchStockMap, true);
        return stock > 0;
      });
    }

    // Orden o aleatorio similar a Home: si no hay filtros, mezclar
    const noFiltros = !searchInput && !minPrice && !maxPrice && !selectedTag && !selectedLetter && !selectedSwitchCompat && !selectedPSPlatform && !selectedSteamGenre && !selectedSteamDlcFilter && (!order || order === 'price-asc');
    function getMinPrice(prod) {
      const precios = [];
      if (moneda === "CLP") {
        if (prod.priceCLP) precios.push(Number(prod.priceCLP));
        if (prod.pricePrimariaCLP) precios.push(Number(prod.pricePrimariaCLP));
        if (prod.priceSecundariaCLP) precios.push(Number(prod.priceSecundariaCLP));
        if (Array.isArray(prod.preciosPorMes)) {
          prod.preciosPorMes.forEach(p => { if (p.clp) precios.push(Number(p.clp)); });
        }
      } else if (moneda === "USD") {
        if (prod.priceUSD) precios.push(Number(prod.priceUSD));
        if (prod.pricePrimariaUSD) precios.push(Number(prod.pricePrimariaUSD));
        if (prod.priceSecundariaUSD) precios.push(Number(prod.priceSecundariaUSD));
        if (Array.isArray(prod.preciosPorMes)) {
          prod.preciosPorMes.forEach(p => { if (p.usd) precios.push(Number(p.usd)); });
        }
      }
      return precios.length > 0 ? Math.min(...precios.filter(x => x > 0)) : 9999999;
    }
    if (noFiltros) {
      results = [...results].sort(() => 0.5 - Math.random());
    } else {
      if(order==="price-asc") results.sort((a,b)=>(getMinPrice(a)-getMinPrice(b)));
      else if(order==="price-desc") results.sort((a,b)=>(getMinPrice(b)-getMinPrice(a)));
      else if(order==="az") results.sort((a,b)=>a.name.localeCompare(b.name));
      else if(order==="za") results.sort((a,b)=>b.name.localeCompare(a.name));
    }
    setSearchResults(results);
  }, [searchInput, productos, minPrice, maxPrice, moneda, order, selectedTag, selectedLetter, selectedSwitchCompat, selectedPSPlatform, selectedSteamGenre, selectedSteamDlcFilter, getGameDlcCount, switchStockMap, isSwitchCat, catNameLower, id]);

  // Cuando el usuario cambia cualquier filtro/búsqueda, desactivar primeraCarga
  useEffect(() => {
    if (!primeraCarga) return;
    if (searchInput.trim() || minPrice || maxPrice || order !== "price-asc" || selectedTag || selectedLetter || selectedSwitchCompat || selectedPSPlatform || selectedSteamGenre || selectedSteamDlcFilter) {
      setPrimeraCarga(false);
    }
  }, [searchInput, minPrice, maxPrice, order, primeraCarga, selectedTag, selectedLetter, selectedSwitchCompat, selectedPSPlatform, selectedSteamGenre, selectedSteamDlcFilter]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setProductos([]);
    setSearchResults([]);
    setSearchInput("");
    setSelectedTag(null);
    setSelectedLetter(null);
    setSelectedSwitchCompat(null);
    setSelectedPSPlatform(null);
    setSelectedSteamGenre(null);
    setSelectedSteamDlcFilter(null);
    setPage(1);

    const failsafeTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 10000);

    const fetchData = async () => {
      try {
        let userRole = role;
        const activeUser = auth.currentUser || user;
        if (!userRole && activeUser) {
          const userDoc = await getDoc(doc(db, "users", activeUser.uid)).catch(() => null);
          if (userDoc && userDoc.exists()) {
            const profile = userDoc.data();
            userRole = hasResellerBenefits(profile) ? "revendedor" : profile.role;
          }
        }
        if (!isMounted) return;
        if (userRole) setRole(userRole);

      // Obtener todas las categorías para navegación y resolución por slug/id
      const catsSnap = await getDocs(collection(db, "categories"));
      const cats = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategorias(cats);

      // Resolver categoría por id directo o por slug del nombre
      let targetCat = cats.find(c => c.id === id);
      const paramLower = (rawId || '').toLowerCase().trim();

      if (!targetCat && paramLower) {
        targetCat = cats.find(c => {
          const catSlug = (c.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
          return catSlug === paramLower || catSlug.includes(paramLower) || paramLower.includes(catSlug);
        });
      }
      if (!targetCat && paramLower) {
        // Coincidencia inteligente por palabras clave (steam, ps5, ps4, switch, etc.)
        targetCat = cats.find(c => {
          const nameLower = (c.name || '').toLowerCase();
          return nameLower.includes(paramLower) || paramLower.includes(nameLower) ||
                 (paramLower.includes('steam') && nameLower.includes('steam')) ||
                 (paramLower.includes('ps5') && nameLower.includes('ps5')) ||
                 (paramLower.includes('ps4') && nameLower.includes('ps4')) ||
                 (paramLower.includes('switch') && nameLower.includes('switch'));
        });
      }

      const isPlayStationParam = paramLower === 'playstation' || paramLower.includes('playstation') || paramLower.includes('psn');
      let isPlayStationCat = isPlayStationParam;

      if (!targetCat && paramLower) {
        if (isPlayStationParam) {
          targetCat = { id: 'playstation', name: 'PlayStation' };
          isPlayStationCat = true;
        } else {
          const prettyName = paramLower.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          targetCat = { id: paramLower, name: prettyName };
        }
      } else if (targetCat) {
        const tName = (targetCat.name || '').toLowerCase();
        if (tName === 'playstation' || isPlayStationParam) {
          isPlayStationCat = true;
        }
      }

      setCategoria(targetCat || null);
      const catId = targetCat ? targetCat.id : id;

      const catName = (targetCat ? targetCat.name || '' : '').toLowerCase();
      const isSwitchVariantCat = catName.includes('switch 2') || catName.includes('switch2');
      let prodDocs = [];

      if (isPlayStationCat) {
        // Encontrar las categorías de PS4 y PS5 en Firestore
        const psCategoryIds = cats
          .filter(c => {
            const n = (c.name || '').toLowerCase();
            return n.includes('ps4') || n.includes('ps5') || n.includes('playstation');
          })
          .map(c => c.id);

        if (psCategoryIds.length > 0) {
          // Firestore 'in' soporta hasta 30 elementos
          const snap = await getDocs(query(collection(db, "products"), where("categoryId", "in", psCategoryIds)));
          prodDocs = snap.docs;
        }

        // Si faltan o para garantizar todos los juegos PlayStation, buscar también por coincidencia
        if (prodDocs.length === 0) {
          const allProdsSnap = await getDocs(collection(db, "products"));
          prodDocs = allProdsSnap.docs.filter(d => {
            const data = d.data();
            const pName = (data.name || '').toLowerCase();
            const pCat = (data.categoryId || '').toLowerCase();
            const tags = Array.isArray(data.tags) ? data.tags.map(t => String(t).toLowerCase()) : [];
            return psCategoryIds.includes(data.categoryId) ||
                   pCat.includes('ps4') || pCat.includes('ps5') || pCat.includes('playstation') ||
                   tags.includes('ps4') || tags.includes('ps5') || tags.includes('playstation') ||
                   pName.includes('ps4') || pName.includes('ps5');
          });
        }
      } else if (isSwitchVariantCat) {
        // Find the Nintendo Switch base category and get its products excluding switch1-only
        const switchBaseCat = cats.find(c => {
          const n = (c.name || '').toLowerCase();
          return n.includes('nintendo switch') && !n.includes('switch 2') && !n.includes('switch2');
        });
        if (switchBaseCat) {
          const snap = await getDocs(query(collection(db, "products"), where("categoryId", "==", switchBaseCat.id)));
          prodDocs = snap.docs.filter(d => (d.data().switchCompat || 'ambas') !== 'switch1');
        } else {
          const snap = await getDocs(query(collection(db, "products"), where("switchCompat", "in", ["switch2", "ambas"])));
          prodDocs = snap.docs;
        }
      } else {
        const snap = await getDocs(query(collection(db, "products"), where("categoryId", "==", catId)));
        prodDocs = snap.docs;
        // Si no trae productos con el catId, buscar por coincidencia de texto o tags en la colección completa de productos
        if (prodDocs.length === 0) {
          const allProdsSnap = await getDocs(collection(db, "products"));
          prodDocs = allProdsSnap.docs.filter(d => {
            const data = d.data();
            const pName = (data.name || '').toLowerCase();
            const pCat = (data.categoryId || '').toLowerCase();
            return pCat === catId || pCat === paramLower || pName.includes(paramLower) || (paramLower.includes('steam') && pName.includes('steam'));
          });
        }
      }
      let rawProds = prodDocs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (catId.includes('steam') || paramLower.includes('steam')) {
        const existingIds = new Set();
        const existingCleanNames = new Set();

        rawProds.forEach(p => {
          if (p.app_id) existingIds.add(String(p.app_id));
          if (p.id) existingIds.add(String(p.id));
          const cleanN = (p.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
          if (cleanN) existingCleanNames.add(cleanN);
        });

        // Combinar con el catálogo curado de juegos de Steam (787 juegos verificados con app_id e imagen Akamai oficial)
        if (Array.isArray(steamImportData)) {
          steamImportData.forEach(s => {
            const appIdStr = String(s.app_id || '');
            const cleanN = (s.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
            if ((!appIdStr || !existingIds.has(appIdStr)) && (!cleanN || !existingCleanNames.has(cleanN))) {
              const img = s.imageUrl || s.image || (appIdStr ? `https://cdn.akamai.steamstatic.com/steam/apps/${appIdStr}/header.jpg` : null);
              rawProds.push({
                ...s,
                id: s.id || `steam_${appIdStr || cleanN}`,
                app_id: appIdStr,
                imageUrl: img,
                image: img,
                priceCLP: s.priceCLP ? Number(s.priceCLP) : 2000,
                categoryId: 'steam',
                categoryName: 'Steam',
                available: true
              });
              if (appIdStr) existingIds.add(appIdStr);
              if (cleanN) existingCleanNames.add(cleanN);
            }
          });
        }

        // Asegurar que absolutamente todos los juegos de Steam tengan portadas reales de Steam Akamai / Cloudflare
        rawProds = rawProds.map(p => {
          const appId = p.app_id || (p.id && !isNaN(p.id) ? p.id : null);
          let img = p.imageUrl || p.image;
          if (!img || img === "") {
            const cleanN = (p.name || '').toLowerCase()
              .replace(/\|.*$/g, '')
              .replace(/\+.*dlc.*/g, '')
              .replace(/\b(dlc|expansion|edition|deluxe|remastered|definitive)\b/g, '')
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
            
            const match = steamFastLookup[cleanN];
            if (match) {
              p.app_id = match.app_id;
              img = match.imageUrl;
            } else if (appId) {
              img = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
            }
          }
          const cleanProdName = (p.name || '').replace(/\s*\((?:requiere\s*fix|requiere\s*parche|fix|parche)\)/gi, '').replace(/\s*\[(?:requiere\s*fix|requiere\s*parche|fix|parche)\]/gi, '').trim();
          const vipPrice = getVipPrice(p);
          return {
            ...p,
            name: cleanProdName,
            app_id: p.app_id || appId,
            imageUrl: img,
            image: img,
            priceCLP: vipPrice ? vipPrice : (p.priceCLP ? Number(p.priceCLP) : 2000),
            isVipExclusive: Boolean(vipPrice)
          };
        });
        rawProds = rawProds.filter(p => !isOnlineOnlySteamProduct(p));
      }

      if (isMounted) {
        setProductos(rawProds);
        setLoading(false);
      }

      // 🔥 CARGA ASYNC DEL CATÁLOGO COMPLETO DE RYUU (70k+ juegos) para Steam
      if (catId.includes('steam') || paramLower.includes('steam')) {
        try {
          if (isMounted) setRyuuLoading(true);
          let ryuuData = await getCachedSteamCatalog();
          if (!ryuuData) {
            const ryuuRes = await fetch("https://generator.ryuu.lol/files/games.json").catch(() => null);
            if (ryuuRes && ryuuRes.ok) {
              ryuuData = await ryuuRes.json();
              await setCachedSteamCatalog(ryuuData);
            }
          }
          if (ryuuData && Array.isArray(ryuuData) && isMounted) {
            const NON_BASE_KEYWORDS = ['soundtrack','ost','artbook','dlc','expansion pack','bonus content','wallpaper','demo','playtest','dedicated server','sdk','mod kit','add-on','season pass','content pack','upgrade pack','cosmetic','skin pack','supporter pack','sound track','digital artbook','original score','pre-order bonus'];
            const vipAppIds = new Set(rawProds.filter(p => p.isVipExclusive).map(p => String(p.app_id)));
            const existingIdsSet = new Set(rawProds.map(p => String(p.app_id || p.id)));
            const ryuuExtras = [];
            for (const r of ryuuData) {
              const appIdStr = String(r.appid);
              if (existingIdsSet.has(appIdStr)) continue;
              if (vipAppIds.has(appIdStr)) continue;
              if (isOnlineOnlyAppId(appIdStr)) continue;
              if (isOnlineOnlySteamProduct(r)) continue;
              const rType = (r.type || '').toLowerCase();
              const rName = (r.name || '').toLowerCase();
              if (rType !== 'game') continue;
              if (NON_BASE_KEYWORDS.some(kw => rName.includes(kw))) continue;
              const img = r.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${appIdStr}/header.jpg`;
              const vipPriceForGame = getVipPrice({ app_id: appIdStr, name: r.name });
              ryuuExtras.push({
                id: `ryuu_${appIdStr}`,
                app_id: appIdStr,
                name: r.name,
                imageUrl: img,
                image: img,
                priceCLP: vipPriceForGame || 2000,
                isVipExclusive: Boolean(vipPriceForGame),
                categoryId: 'steam',
                categoryName: 'Steam',
                available: true,
                isRyuu: true
              });
              existingIdsSet.add(appIdStr);
            }
            if (ryuuExtras.length > 0 && isMounted) {
              setProductos(prev => [...prev, ...ryuuExtras]);
            }
          }
        } catch (e) {
          console.warn('[Steam] Error cargando catálogo Ryuu:', e);
        } finally {
          if (isMounted) setRyuuLoading(false);
        }
      }
      } catch (err) {
        console.error("Error al cargar categoría:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();

    return () => {
      isMounted = false;
      clearTimeout(failsafeTimer);
    };
  }, [id, rawId, user]);

  // Sincronización en tiempo real de carrito y favoritos
  useEffect(() => {
    if (!user) {
      const syncGuest = () => {
        try {
          const stored = localStorage.getItem('guestCart');
          if (stored) {
            const lCart = JSON.parse(stored);
            const ids = [];
            lCart.forEach(item => {
              if (item.cartLineId) ids.push(item.cartLineId);
              if (item.id) ids.push(item.id);
              if (item.productId && !ids.includes(item.productId)) ids.push(item.productId);
            });
            setCartIds(ids);
          } else {
            setCartIds([]);
          }
        } catch(e) {}
      };
      syncGuest();
      window.addEventListener('localCartUpdated', syncGuest);
      return () => window.removeEventListener('localCartUpdated', syncGuest);
    }
    const cartUnsub = onSnapshot(collection(db, `users/${user.uid}/cart`), snap => {
      const ids = [];
      snap.docs.forEach(d => {
        ids.push(d.id);
        const data = d.data();
        if (data.productId && !ids.includes(data.productId)) ids.push(data.productId);
      });
      setCartIds(ids);
    });
    const favUnsub = onSnapshot(collection(db, `users/${user.uid}/favorites`), snap => {
      setFavIds(snap.docs.map(d => d.id));
    });
    return () => {
      cartUnsub();
      favUnsub();
    };
  }, [user]);

  // Helper SEO Variables
  const catKeywordsMap = {
    steam: 'juegos steam pc baratos, comprar juegos steam baratos, activador steam pc, pandastore launcher, juegos pc baratos, juegos steam offline, steam verde seguro, estrenos steam pc, ofertas steam, comprar black myth wukong pc, elden ring pc barato, ea sports fc 25 pc barato, gta v pc barato',
    switch: 'juegos nintendo switch baratos, juegos nintendo switch 2, comprar juegos switch digitales, mario zelda pokemon switch baratos, catalogo nintendo switch, packs nintendo switch 2x1, cuentas nintendo switch',
    nintendo: 'juegos nintendo switch baratos, juegos nintendo switch 2, comprar juegos switch digitales, mario zelda pokemon switch baratos, catalogo nintendo switch, packs nintendo switch 2x1',
    playstation: 'juegos ps5 baratos, juegos ps4 digitales baratos, cuentas primarias ps5, cuentas secundarias ps4, cuentas primarias ps4, ps store barata, ofertas playstation, ps plus barato chile mexico argentina',
    ps5: 'juegos ps5 digitales baratos, cuenta primaria ps5, cuenta secundaria ps5, comprar juegos ps5 baratos, ps5 latam, ofertas ps store',
    ps4: 'juegos ps4 digitales baratos, cuenta primaria ps4, cuenta secundaria ps4, juegos baratos playstation 4, ps4 chile mexico argentina',
    streaming: 'suscripciones streaming baratas, Netflix, Disney Plus, Max, Spotify, comprar streaming digital chile mexico argentina',
    suscripciones: 'PlayStation Plus precio oferta, Nintendo Switch Online barato, suscripciones gaming latam',
  };

  const catKey = Object.keys(catKeywordsMap).find(k => catNameLower.includes(k) || (id || '').toLowerCase().includes(k)) || '';
  const extraKeywords = catKeywordsMap[catKey] || 'videojuegos digitales baratos, juegos entrega inmediata, tienda gamer latam';

  const pageTitle = isSteamCat
    ? 'Juegos Steam PC Baratos | Catálogo PandaStore Launcher & Activador 24/7'
    : isSwitchCat
    ? 'Juegos Nintendo Switch 1 y 2 Digitales Baratos | PandaStore'
    : isPSCat
    ? 'Juegos PS5 y PS4 Digitales Baratos | Cuentas Primarias y Secundarias - PandaStore'
    : isSubCat
    ? 'Suscripciones PlayStation Plus, Nintendo Switch Online y Streaming | PandaStore'
    : categoria
    ? `${catName} - Comprar Juegos Digitales Baratos | PandaStore`
    : 'PandaStore | Tienda de Videojuegos Digitales';

  const pageDesc = isSteamCat
    ? 'Compra juegos de Steam para PC al mejor precio en PandaStore. Cientos de títulos, sagas completas, estrenos VIP y activación automática con PandaStore Launcher. Entrega inmediata 24/7.'
    : isSwitchCat
    ? 'Catálogo completo de juegos digitales para Nintendo Switch y Switch 2 en PandaStore. Mario, Zelda, Pokémon, packs 2x1 y 3x1. Entrega inmediata 100% garantizada.'
    : isPSCat
    ? 'Compra juegos digitales para PS5 y PS4 en PandaStore. Cuentas primarias y secundarias con entrega inmediata 24/7, precios imbatibles y garantía total en toda Latinoamérica.'
    : isSubCat
    ? 'Suscripciones gamer y cuentas de streaming al mejor precio en PandaStore. PS Plus, Nintendo Switch Online, Netflix, Disney+ y más con activación inmediata.'
    : categoria
    ? `Compra juegos de ${catName} en PandaStore. El mayor catálogo de videojuegos digitales en Latinoamérica. Entrega inmediata 24/7 y precios imbatibles. ${extraKeywords}.`
    : 'Tienda líder de videojuegos digitales en Latinoamérica. Entrega inmediata 24/7.';

  const getJsonLd = () => {
    if (!categoria) return null;
    const topItems = (productos || []).slice(0, 15).map((p, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "name": p.name,
      "url": `https://pandastoreupdate.web.app/producto/${p.id}`,
      "image": p.imageUrl || undefined
    }));

    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": pageTitle,
      "description": pageDesc,
      "url": window.location.href,
      "isPartOf": {
        "@type": "VideoGameStore",
        "name": "PandaStore",
        "url": "https://pandastoreupdate.web.app"
      },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pandastoreupdate.web.app/home" },
          { "@type": "ListItem", "position": 2, "name": "Categorías", "item": "https://pandastoreupdate.web.app/categorias" },
          { "@type": "ListItem", "position": 3, "name": catName, "item": window.location.href }
        ]
      },
      "mainEntity": {
        "@type": "ItemList",
        "name": `Catálogo de ${catName} en PandaStore`,
        "numberOfItems": productos.length,
        "itemListElement": topItems
      }
    };
  };

  // Handlers para agregar/quitar del carrito y favoritos
  const [showFilterModal, setShowFilterModal] = useState(false);

  const handleCart = async (prod) => {
    if (isSwitch) {
      const stock = getGameStockCount(prod?.name, switchStockMap);
      if (stock <= 0) {
        alert(`El juego "${prod?.name || 'seleccionado'}" se encuentra actualmente sin stock en los packs de Nintendo Switch.`);
        return;
      }
    }
    await handleCartAddOrRemove({
      db,
      user,
      prod,
      moneda,
      cartIds,
      setModal,
      consoleName: categoria?.name || null,
      userRole: role,
      purchaseCount: 0
    });
  };

  const handleCartModal = async (opcion) => {
    const { prod, tipo } = modal;
    if (!prod) return;
    let customProd = { ...prod };
    if (tipo === 'ps') {
      customProd.variante = opcion.value;
      customProd.priceCLP = opcion.priceCLP;
      customProd.pricePrimariaCLP = prod.pricePrimariaCLP;
      customProd.priceSecundariaCLP = prod.priceSecundariaCLP;
      if (opcion.priceUSD) customProd.priceUSD = opcion.priceUSD;
      if (opcion.precioPublicoCLP) customProd.precioPublicoCLP = opcion.precioPublicoCLP;
      if (opcion.isResellerPrice) customProd.isResellerPrice = true;
    } else if (tipo === 'suscripcion') {
      customProd.meses = opcion.value;
      customProd.priceCLP = opcion.priceCLP;
      if (opcion.priceUSD) customProd.priceUSD = opcion.priceUSD;
      if (opcion.precioPublicoCLP) customProd.precioPublicoCLP = opcion.precioPublicoCLP;
      if (opcion.isResellerPrice) customProd.isResellerPrice = true;
    }
    await handleCartAddOrRemove({
      db,
      user,
      prod: customProd,
      moneda,
      cartIds,
      setModal: null,
      consoleName: categoria?.name || null,
      userRole: role,
      purchaseCount: 0
    });
    setModal({ open: false, prod: null, opciones: [], tipo: null });
  };

  const handleFav = async (prod) => {
    if (!user) {
      let localFavs = [];
      try {
        const stored = localStorage.getItem('guestFavs');
        if (stored) localFavs = JSON.parse(stored);
      } catch(e) {}
      if (favIds.includes(prod.id)) {
        localFavs = localFavs.filter(f => f.productId !== prod.id);
      } else {
        localFavs.push({
          productId: prod.id,
          name: prod.name,
          imageUrl: prod.imageUrl || null,
          priceCLP: prod.priceCLP || null,
          priceUSD: prod.priceUSD || null
        });
      }
      localStorage.setItem('guestFavs', JSON.stringify(localFavs));
      window.dispatchEvent(new Event('localFavUpdated'));
      return;
    }
    const favRef = doc(db, `users/${user.uid}/favorites`, prod.id);
    if (favIds.includes(prod.id)) {
      await deleteDoc(favRef);
    } else {
      await setDoc(favRef, {
        productId: prod.id,
        name: prod.name,
        priceCLP: prod.priceCLP || null,
        imageUrl: prod.imageUrl || null
      });
    }
  };

  const handleDelete = async (prodId) => {
    await deleteDoc(doc(db, "products", prodId));
    setProductos(productos.filter(p => p.id !== prodId));
  };

  // Reiniciar a la página 1 si cambian los filtros/búsqueda/categoría
  React.useEffect(() => {
    setPage(1);
  }, [search, minPrice, maxPrice, moneda, id]);

  const isSwitch = Boolean(isSwitchCat || (categoria?.name || '').toLowerCase().includes('switch') || (categoria?.name || '').toLowerCase().includes('nintendo') || (id || '').toLowerCase().includes('switch') || (id || '').toLowerCase().includes('nintendo'));

  const catCarouselItems = React.useMemo(() => {
    if (!productos || productos.length === 0) return [];
    let pool = productos;
    if (isSwitch) {
      pool = productos.filter(p => getGameStockCount(p.name, switchStockMap, true) > 0);
    }
    return pool.slice(0, 8).map(prod => ({
      image: prod.imageUrl || switchLogo,
      alt: prod.name,
      title: prod.name,
      subtitle: getMinPriceByMoneda(prod, 'CLP') ? formatearPrecio(getMinPriceByMoneda(prod, 'CLP')) : '🔥 Destacado',
      link: prodUrl(prod.name, prod.id),
      key: prod.id
    }));
  }, [productos, moneda, formatearPrecio, isSwitch, switchStockMap]);
  const isSteam = (categoria?.name || '').toLowerCase().includes('steam');
  const isPlayStation = (categoria?.name || '').toLowerCase().includes('playstation') || (categoria?.id || '').toLowerCase().includes('playstation');
  const activeFilterCount = [selectedTag, selectedLetter, selectedSwitchCompat, selectedPSPlatform, selectedSteamGenre, selectedSteamDlcFilter, order !== 'price-asc', Boolean(minPrice || maxPrice)].filter(Boolean).length;

  const searchPlaceholder = isSteam
    ? "Buscar en Steam (juegos, sagas, géneros)..."
    : isPlayStation
    ? "Buscar en PlayStation (PS4, PS5, sagas)..."
    : isSwitch
    ? "Buscar en Nintendo Switch (Mario, Zelda, sagas)..."
    : `Buscar en ${categoria?.name || 'la tienda'}...`;

  const usedTags = new Set();
  if (!isSteam) {
    productos.forEach(p => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach(t => {
          const clean = (t || '').trim();
          if (!clean) return;
          const lower = clean.toLowerCase();
          if (/^\d+$/.test(clean)) return; // ignora tags numéricos como 2000, 4990
          // CERO mención a denuvo, bypass, fix, lua, o términos técnicos
          if (
            lower.includes('denuvo') ||
            lower.includes('bypass') ||
            lower.includes('fix') ||
            lower.includes('lua') ||
            lower.includes('activad') ||
            lower.includes('crack') ||
            lower.includes('offline') ||
            lower.includes('online') ||
            lower.includes('promo') ||
            lower.includes('pack') ||
            lower.includes('precio') ||
            ['steam', 'normal', 'promociones', 'packs', 'default', 'vip', 'destacado', 'juegos'].includes(lower)
          ) return;
          usedTags.add(clean);
        });
      }
    });
  }
  const allLetters = (() => { const letterSet = new Set(); productos.forEach(p => { if (p.name) { const first = p.name.trim()[0] && p.name.trim()[0].toUpperCase(); if (first && first >= 'A' && first <= 'Z') letterSet.add(first); } }); return Array.from(letterSet).sort(); })();
  const effectivePerPage = isSteam ? 60 : perPage;
  const totalPages = Math.ceil(searchResults.length / effectivePerPage);
  const paginated = searchResults.slice((page - 1) * effectivePerPage, page * effectivePerPage);

  if (loading) return <Loader text="Cargando..." subtext="PandaStore • Catálogo Oficial" fullScreen={true} />;
  if (!categoria) return <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#a084e8',fontWeight:700,fontSize:'1.15rem'}}>Categor&iacute;a no encontrada.</div>;

  return (
    <div className="catpage-root home-root">
      {categoria && (
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" content={pageDesc} />
          <meta name="keywords" content={extraKeywords} />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={pageDesc} />
          <meta property="og:url" content={window.location.href} />
          <meta property="og:image" content="https://pandastoreupdate.web.app/favicon.png" />
          <meta name="twitter:title" content={pageTitle} />
          <meta name="twitter:description" content={pageDesc} />
          <meta name="twitter:image" content="https://pandastoreupdate.web.app/favicon96.png" />
          <link rel="canonical" href={window.location.href} />
          <script type="application/ld+json">{JSON.stringify(getJsonLd())}</script>
        </Helmet>
      )}

      {/* Hero header */}
      <div className="catpage-hero" style={{ paddingBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <StrokeText
            text={categoria?.name || 'Categoría'}
            strokeColor="#a259ff"
            fillColor="#ffffff"
            strokeWidth={1.6}
            fontSize={42}
            fontWeight={900}
            letterSpacing={-1}
            trigger="loop"
            fillMode="wipe"
          />
        </div>
        <span className="catpage-hero-line" />
        <span className="catpage-hero-count">{searchResults.length} producto{searchResults.length !== 1 ? 's' : ''}</span>
      </div>

      <section
        className="category-halloween-hero"
        aria-label={`Especial de Halloween para ${categoria?.name || 'la categoría'}`}
        style={{ '--category-banner-image': `url(${categoryBanner.image})` }}
      >
        <div className="category-halloween-hero__content">
          <span className="category-halloween-hero__eyebrow">🎃 HALLOWEEN · {categoryBanner.accent}</span>
          <h2>{categoryBanner.title}</h2>
          <p>{categoryBanner.description}</p>
          <div className="category-halloween-hero__benefits">
            <span>⚡ Entrega digital</span>
            <span>💬 Soporte PandaStore</span>
            <span>🛡️ Compra segura</span>
          </div>
        </div>
      </section>

      {/* Secciones de Promociones Steam Exclusivas al inicio de la Categoría */}
      {isSteam && (
        <div style={{ maxWidth: 1100, margin: '6px auto 12px', padding: '0 12px' }}>
          {/* CUADRO INFORMATIVO STEAM: COMPACTO Y COLAPSABLE CON BOTÓN */}
          <div className="steam-terms-banner-box" style={{ padding: '7px 12px', marginBottom: 10, borderRadius: 10 }}>
            <div
              className="steam-banner-header"
              style={{
                cursor: 'pointer',
                margin: 0,
                padding: 0,
                borderBottom: showSteamInfo ? '1px solid rgba(255,255,255,0.08)' : 'none',
                paddingBottom: showSteamInfo ? 8 : 0,
              }}
              onClick={() => setShowSteamInfo(!showSteamInfo)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="steam-banner-badge" style={{ fontSize: '0.7rem', padding: '2px 7px' }}>ℹ️ INFO STEAM (PC)</span>
                <span style={{ color: '#e2e8f0', fontSize: '0.78rem', fontWeight: 600 }}>
                  Modo Historia y Campaña ilimitada garantizados
                </span>
                <span style={{
                  background: 'rgba(239, 68, 68, 0.22)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.55)',
                  borderRadius: 999,
                  padding: '2px 9px',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  letterSpacing: '0.4px'
                }}>
                  🚫 SIN MODO ONLINE
                </span>
              </div>
              <button
                type="button"
                style={{
                  background: 'rgba(0,245,212,0.12)',
                  border: '1px solid rgba(0,245,212,0.4)',
                  color: '#00f5d4',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {showSteamInfo ? '▲ Ocultar info' : '▼ Ver detalles y garantía'}
              </button>
            </div>

            {showSteamInfo && (
              <div className="steam-banner-grid" style={{ marginTop: 14 }}>
                <div className="steam-banner-item allowed">
                  <div className="steam-item-icon">✅</div>
                  <div className="steam-item-content">
                    <strong>Para Modo Historia & Campaña (100% Garantizado):</strong>
                    <p>Diseñados para <strong>Modo Historia / Campaña individual ilimitada</strong> y <strong>Cooperativo local</strong> (misma pantalla / LAN local).</p>
                  </div>
                </div>

                <div className="steam-banner-item restricted">
                  <div className="steam-item-icon">🚫</div>
                  <div className="steam-item-content">
                    <strong style={{ color: '#fca5a5' }}>SIN MODO ONLINE (Solo Modo Historia / Campaña Offline):</strong>
                    <p>Todos los juegos son <strong>exclusivamente para Modo Historia / Campaña individual y Cooperativo local</strong>. <strong>NO incluyen modo online ni servidores multijugador oficiales</strong> (por ello juegos como <em>Rust, DayZ, etc.</em> quedan excluidos).</p>
                  </div>
                </div>

                <div className="steam-banner-item guarantee">
                  <div className="steam-item-icon">🛡️</div>
                  <div className="steam-item-content">
                    <strong>Garantía Total en Modo Seguro (PC Local):</strong>
                    <p>Garantía permanente siguiendo las instrucciones de PandaStore. <Link to="/terminos" style={{ color: '#00f5d4', textDecoration: 'underline', fontWeight: 'bold' }}>Ver Políticas</Link>.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* HUB COMPACTO & MINIMALISTA: 2 FILAS DE PROMOS (PACKS & SAGAS) */}
          <div className="catpage-promo-hub catpage-promo-hub--steam" style={{
            background: 'linear-gradient(160deg, rgba(16, 9, 32, 0.94) 0%, rgba(26, 12, 50, 0.94) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: '8px 10px 10px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.45)',
            marginBottom: 14,
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
          }}>
            {/* Accent hairline */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, background: 'linear-gradient(90deg, transparent, #00f5d4, #a259ff, transparent)' }} />

            {/* FILA 1: PACKS Y PROMOS */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, padding: '0 2px' }}>
                <span className="catpage-promo-heading" style={{ color: '#00f5d4', fontWeight: 800, fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                  Packs y promociones
                </span>
                <span style={{ color: 'rgba(0, 245, 212, 0.8)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.02em' }}>
                  Ahorro Steam
                </span>
              </div>

              {/* Fila Horizontal Scroll de Packs */}
              <div className="catpage-promo-rail" style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 2,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}>
                {[
                  { key: 'promo-estreno-vip', name: 'Pack Juegos VIP', shortName: '⭐ Pack VIP', subtitle: '1 Estreno + 2 Regalos', priceCLP: 8000, image: '/promos/promo_denuvo_vip.jpg', count: 3, isCustomChoose: true, isVipPromo: true, badge: 'ESTRENO VIP' },
                  { key: 'promo-steam-3x', name: 'Pack 3X Steam', shortName: 'Pack 3X Steam', subtitle: 'Elige 3 juegos a elección', priceCLP: 4990, image: steamPromo3x, count: 3, isCustomChoose: true, badge: 'POPULAR' },
                  { key: 'promo-steam-10x', name: 'Pack 10X Steam', shortName: 'Pack 10X Steam', subtitle: 'Elige 10 juegos a elección', priceCLP: 9990, image: steamPromo10x, count: 10, isCustomChoose: true, badge: 'VALOR' },
                  { key: 'promo-steam-23x', name: 'Pack 23X Steam', shortName: 'Pack 23X Steam', subtitle: 'Elige 23 juegos a elección', priceCLP: 17990, image: steamPromo23x, count: 23, isCustomChoose: true, badge: 'COLECCIÓN' },
                  { key: 'promo-steam-100x', name: 'Pack 100 Juegos', shortName: 'Pack 100X Steam', subtitle: 'PandaStore Launcher', priceCLP: 15000, image: steamPromo100x, count: 100, isLauncherPack: true, badge: 'LAUNCHER' },
                ].map(p => (
                  <div
                    key={p.key}
                    onClick={async () => {
                      if (p.isCustomChoose) {
                        openSteamPromoModal(p);
                      } else {
                        const packId = `pack-steam-${p.count}-games`;
                        const cartItem = {
                          id: packId,
                          productId: packId,
                          plataforma: 'steam',
                          categoryId: 'juegos-steam',
                          categoryName: 'Juegos Steam',
                          isSteam: true,
                          name: `${p.name} (PandaStore Launcher)`,
                          priceCLP: p.priceCLP,
                          priceUSD: p.priceCLP / 900,
                          imageUrl: p.image,
                          cantidad: 1,
                          description: `Acceso a ${p.count} juegos aleatorios con PandaStore Launcher.`
                        };
                        if (user) {
                          await setDoc(doc(db, `users/${user.uid}/cart`, packId), cartItem);
                        } else {
                          let localCart = [];
                          try {
                            const stored = localStorage.getItem('guestCart');
                            if (stored) localCart = JSON.parse(stored);
                          } catch (e) {}
                          localCart.push(cartItem);
                          localStorage.setItem('guestCart', JSON.stringify(localCart));
                          window.dispatchEvent(new Event('localCartUpdated'));
                        }
                        navigate("/checkoutcarrito");
                      }
                    }}
                    className="catpage-promo-tile"
                    style={{
                      flex: '0 0 clamp(170px, 38vw, 200px)',
                      minWidth: 0,
                      height: '52px',
                      background: p.isVipPromo
                        ? 'linear-gradient(135deg, rgba(40, 16, 68, 0.95), rgba(18, 8, 38, 0.98))'
                        : 'linear-gradient(135deg, rgba(22, 11, 46, 0.95), rgba(12, 6, 26, 0.98))',
                      border: p.isVipPromo ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(0, 245, 212, 0.25)',
                      borderRadius: 8,
                      padding: '4px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = p.isVipPromo ? '#f59e0b' : '#00f5d4'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = p.isVipPromo ? 'rgba(245, 158, 11, 0.5)' : 'rgba(0, 245, 212, 0.25)'}
                  >
                    <div className="catpage-promo-tile-image" style={{ width: 40, height: 40, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: p.isLauncherPack || p.key.includes('3x') || p.key.includes('10x') || p.key.includes('23x') ? 'contain' : 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
                      <div className="catpage-promo-tile-title" style={{ color: '#ffffff', fontWeight: 800, fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.shortName || p.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
                        <span style={{
                          background: p.isVipPromo ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0, 245, 212, 0.12)',
                          color: p.isVipPromo ? '#f59e0b' : '#00f5d4',
                          fontSize: '6.5px',
                          fontWeight: 800,
                          padding: '1px 3px',
                          borderRadius: 2,
                          textTransform: 'uppercase',
                        }}>
                          {role === "revendedor" ? "💎 50% DCTO" : p.badge}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {role === "revendedor" && (
                            <span style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through', fontSize: '8px' }}>
                              {formatearPrecio(p.priceCLP)}
                            </span>
                          )}
                          <span style={{ color: '#00f5d4', fontWeight: 900, fontSize: '10px', whiteSpace: 'nowrap' }}>
                            {formatearPrecio(role === "revendedor" ? Math.round(p.priceCLP * 0.5) : p.priceCLP)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* BOTÓN VER MÁS ABAJO DE LA FILA 1 DE PACKS: SLIM & ELEGANTE */}
              <button
                type="button"
                onClick={() => navigate('/promos?plataforma=steam')}
                style={{
                  width: '100%',
                  marginTop: 4,
                  height: 26,
                  background: 'rgba(0, 245, 212, 0.06)',
                  border: '1px solid rgba(0, 245, 212, 0.3)',
                  borderRadius: 6,
                  color: '#00f5d4',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(0, 245, 212, 0.16)';
                  e.currentTarget.style.borderColor = '#00f5d4';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(0, 245, 212, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(0, 245, 212, 0.3)';
                }}
              >
                <span>Ver packs y promociones</span>
                <span style={{ fontSize: '0.8rem' }}>→</span>
              </button>
            </div>

            {/* FILA 2: SAGAS LEGENDARIAS */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, padding: '0 2px' }}>
                <span className="catpage-promo-heading" style={{ color: '#e0baff', fontWeight: 800, fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                  Sagas y franquicias
                </span>
                <span style={{ color: 'rgba(224, 186, 255, 0.7)', fontSize: '9px', fontWeight: 700 }}>
                  55+ Sagas
                </span>
              </div>

              {/* Fila Horizontal Scroll de Sagas */}
              <div className="catpage-promo-rail" style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 2,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}>
                {STEAM_SAGAS_PROMOS.slice(0, 5).map(saga => (
                  <div
                    key={saga.key}
                    onClick={() => setSagaPreviewModal({ open: true, saga, selectedVipExtras: [] })}
                    className="catpage-promo-tile"
                    style={{
                      flex: '0 0 clamp(170px, 38vw, 200px)',
                      minWidth: 0,
                      height: '52px',
                      background: 'linear-gradient(135deg, rgba(22, 11, 46, 0.95), rgba(12, 6, 26, 0.98))',
                      border: '1px solid rgba(162, 89, 255, 0.25)',
                      borderRadius: 8,
                      padding: '4px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#a259ff'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(162, 89, 255, 0.25)'}
                  >
                    <div className="catpage-promo-tile-image" style={{ width: 40, height: 40, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: 'rgba(0,0,0,0.4)' }}>
                      <img src={saga.image} alt={saga.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = '/banner22.jpg'; }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
                      <div className="catpage-promo-tile-title" style={{ color: '#ffffff', fontWeight: 800, fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {saga.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
                        <span style={{
                          background: 'rgba(162, 89, 255, 0.18)',
                          color: '#e0baff',
                          fontSize: '6.5px',
                          fontWeight: 700,
                          padding: '1px 3px',
                          borderRadius: 2,
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}>
                          {role === "revendedor" ? "💎 50% DCTO" : `${saga.games.length} juegos`}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {role === "revendedor" && (
                            <span style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through', fontSize: '8px' }}>
                              {formatearPrecio(saga.priceCLP)}
                            </span>
                          )}
                          <span style={{ color: '#00f5d4', fontWeight: 900, fontSize: '10px', whiteSpace: 'nowrap' }}>
                            {formatearPrecio(role === "revendedor" ? Math.round(saga.priceCLP * 0.5) : saga.priceCLP)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* BOTÓN VER MÁS ABAJO DE LA FILA 2 DE SAGAS: SLIM & ELEGANTE */}
              <button
                type="button"
                onClick={() => navigate('/sagas')}
                style={{
                  width: '100%',
                  marginTop: 4,
                  height: 26,
                  background: 'rgba(162, 89, 255, 0.08)',
                  border: '1px solid rgba(162, 89, 255, 0.3)',
                  borderRadius: 6,
                  color: '#e0baff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(162, 89, 255, 0.18)';
                  e.currentTarget.style.borderColor = '#a259ff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(162, 89, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(162, 89, 255, 0.3)';
                }}
              >
                <span>Ver catálogo de sagas</span>
                <span style={{ fontSize: '0.8rem' }}>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secciones de Promociones Nintendo Switch Exclusivas al inicio de la Categoría */}
      {isSwitch && (
        <div style={{ maxWidth: 1100, margin: '6px auto 14px', padding: '0 12px' }}>
          {/* HUB COMPACTO & MINIMALISTA: 2 FILAS DE PROMOS NINTENDO SWITCH */}
          <div className="catpage-promo-hub catpage-promo-hub--switch" style={{
            background: 'linear-gradient(160deg, rgba(20, 10, 36, 0.94) 0%, rgba(32, 12, 45, 0.94) 100%)',
            border: '1px solid rgba(255, 56, 92, 0.22)',
            borderRadius: 12,
            padding: '8px 10px 10px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.45)',
            marginBottom: 14,
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
          }}>
            {/* Accent hairline */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, background: 'linear-gradient(90deg, transparent, #ff385c, #00b4d8, transparent)' }} />

            {/* FILA 1: PACKS Y PROMOS A ELECCIÓN NINTENDO SWITCH */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, padding: '0 2px' }}>
                <span className="catpage-promo-heading" style={{ color: '#ff385c', fontWeight: 800, fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                  Packs y promociones Nintendo Switch
                </span>
                <span style={{ color: 'rgba(255, 56, 92, 0.85)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.02em' }}>
                  Ahorro Switch • Juegos a Elección
                </span>
              </div>

              {/* Fila Horizontal Scroll de Packs */}
              <div className="catpage-promo-rail" style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 2,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}>
                {SWITCH_PACKS_PROMOS.map(p => (
                  <div
                    key={p.key}
                    onClick={() => navigate(`/promos?promo=${p.key}`)}
                    className="catpage-promo-tile"
                    style={{
                      flex: '0 0 clamp(170px, 38vw, 205px)',
                      minWidth: 0,
                      height: '52px',
                      background: 'linear-gradient(135deg, rgba(32, 14, 48, 0.95), rgba(18, 8, 30, 0.98))',
                      border: '1px solid rgba(255, 56, 92, 0.3)',
                      borderRadius: 8,
                      padding: '4px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#ff385c';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 56, 92, 0.3)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div className="catpage-promo-tile-image" style={{ width: 40, height: 40, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
                      <div className="catpage-promo-tile-title" style={{ color: '#ffffff', fontWeight: 800, fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.shortName || p.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
                        <span style={{
                          background: 'rgba(255, 56, 92, 0.18)',
                          color: '#ff5c7c',
                          fontSize: '6.5px',
                          fontWeight: 800,
                          padding: '1px 3px',
                          borderRadius: 2,
                          textTransform: 'uppercase',
                        }}>
                          {p.badge}
                        </span>
                        <span style={{ color: '#00f5d4', fontWeight: 900, fontSize: '10px', whiteSpace: 'nowrap' }}>
                          {formatearPrecio(p.priceCLP)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* BOTÓN VER MÁS ABAJO DE LA FILA 1 DE PACKS: SLIM & ELEGANTE */}
              <button
                type="button"
                onClick={() => navigate('/promos?plataforma=nintendo')}
                style={{
                  width: '100%',
                  marginTop: 4,
                  height: 26,
                  background: 'rgba(255, 56, 92, 0.08)',
                  border: '1px solid rgba(255, 56, 92, 0.35)',
                  borderRadius: 6,
                  color: '#ff758f',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 56, 92, 0.18)';
                  e.currentTarget.style.borderColor = '#ff385c';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 56, 92, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255, 56, 92, 0.35)';
                }}
              >
                <span>Ver promociones y armar mi pack</span>
                <span style={{ fontSize: '0.8rem' }}>→</span>
              </button>
            </div>

            {/* FILA 2: JUEGO + DLC & SAGAS NINTENDO */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, padding: '0 2px' }}>
                <span className="catpage-promo-heading" style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                  Ediciones juego + DLC
                </span>
                <span style={{ color: 'rgba(56, 189, 248, 0.85)', fontSize: '9px', fontWeight: 700 }}>
                  Expansiones & Cuentas Múltiples
                </span>
              </div>

              {/* Fila Horizontal Scroll de DLCs / Sagas */}
              <div className="catpage-promo-rail" style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 2,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}>
                {SWITCH_DLC_PROMOS.map(promo => (
                  <div
                    key={promo.key}
                    onClick={() => navigate(`/promos?promo=${promo.key}`)}
                    className="catpage-promo-tile"
                    style={{
                      flex: '0 0 clamp(170px, 38vw, 205px)',
                      minWidth: 0,
                      height: '52px',
                      background: 'linear-gradient(135deg, rgba(14, 26, 54, 0.95), rgba(8, 14, 34, 0.98))',
                      border: '1px solid rgba(0, 180, 216, 0.3)',
                      borderRadius: 8,
                      padding: '4px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#00b4d8';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(0, 180, 216, 0.3)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div className="catpage-promo-tile-image" style={{ width: 40, height: 40, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={promo.image} alt={promo.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.src = '/banner22.jpg'; }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
                      <div className="catpage-promo-tile-title" style={{ color: '#ffffff', fontWeight: 800, fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {promo.shortName || promo.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
                        <span style={{
                          background: 'rgba(0, 180, 216, 0.18)',
                          color: '#38bdf8',
                          fontSize: '6.5px',
                          fontWeight: 700,
                          padding: '1px 3px',
                          borderRadius: 2,
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}>
                          {promo.badge}
                        </span>
                        <span style={{ color: '#00f5d4', fontWeight: 900, fontSize: '10px', whiteSpace: 'nowrap' }}>
                          {formatearPrecio(promo.priceCLP)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* BOTÓN VER MÁS ABAJO DE LA FILA 2 DE SAGAS / PACKS: SLIM & ELEGANTE */}
              <button
                type="button"
                onClick={() => navigate('/packs-nintendo')}
                style={{
                  width: '100%',
                  marginTop: 4,
                  height: 26,
                  background: 'rgba(0, 180, 216, 0.08)',
                  border: '1px solid rgba(0, 180, 216, 0.35)',
                  borderRadius: 6,
                  color: '#38bdf8',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(0, 180, 216, 0.18)';
                  e.currentTarget.style.borderColor = '#00b4d8';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(0, 180, 216, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(0, 180, 216, 0.35)';
                }}
              >
                <span>Ver packs Nintendo Switch</span>
                <span style={{ fontSize: '0.8rem' }}>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top 3D Carousel Showcase for Category (Oculto en Steam) */}
      {!isSteam && catCarouselItems.length > 0 && (
        <div className="home-depth-carousel-wrapper" style={{ height: '420px', position: 'relative', margin: '20px auto', maxWidth: 1100 }}>
          <DepthCarousel
            items={catCarouselItems}
            depth={200}
            spread={85}
            tilt={20}
            perspective={1400}
            visibleCards={4}
            falloff={0.2}
            blur={6}
            autoplay
            autoplayDelay={3400}
            loop
            showControls
            showIndicators
            onItemClick={(item) => {
              if (item.link) navigate(item.link);
            }}
          />
        </div>
      )}

      {/* Search & Contextual Filters Hub with Gooey Orb */}
      <div className="catpage-search-wrap">
        <GooeySearch
          value={searchInput}
          onChange={e => { setSearchInput(e.target.value); setFiltroAplicado(false); }}
          onSearch={term => {
            const clean = (term !== undefined ? term : searchInput).trim();
            if (!clean) return;
            setSearch(clean);
            setFiltroAplicado(true);
            trackSearch(clean, searchResults.length, auth.currentUser?.uid || null);
          }}
          onClear={() => {
            setSearchInput("");
            setSearch("");
            setMinPrice("");
            setMaxPrice("");
            setOrder('price-asc');
            setFiltroAplicado(false);
            setSelectedTag(null);
            setSelectedLetter(null);
            setSelectedSwitchCompat(null);
            setSelectedPSPlatform(null);
            setSelectedSteamGenre(null);
            setSelectedSteamDlcFilter(null);
            setPage(1);
          }}
          placeholder={searchPlaceholder}
          onOpenFilterModal={() => setShowFilterModal(true)}
          activeFilterCount={activeFilterCount}
          totalResults={searchResults.length}
          isFiltered={Boolean(filtroAplicado || search || searchInput.trim() || minPrice || maxPrice || selectedTag || selectedLetter || selectedSwitchCompat || selectedPSPlatform || selectedSteamGenre || selectedSteamDlcFilter || (order && order !== 'price-asc'))}
          activeFilterLabel={
            selectedSteamGenre ? (
              {
                estrenos: '🔥 Estrenos & Top',
                terror: '🧟 Terror',
                accion: '💥 Acción',
                estrategia: '🏰 Estrategia',
                rpg: '🛡️ RPG / Rol',
                aventura: '🏹 Aventura',
                coop: '🤝 Cooperativo',
                carreras: '🏎️ Carreras',
                metroidvania: '🗡️ Metroidvania',
                residentevil: 'Resident Evil',
                souls: 'Souls & Elden Ring',
                godofwar: 'God of War',
                gta: 'Grand Theft Auto',
                tombraider: 'Tomb Raider',
                batman: 'Batman Arkham',
                ageofempires: 'Age of Empires',
                farcry: 'Far Cry',
                outlast: 'Outlast',
                monsterhunter: 'Monster Hunter',
                mario_pokemon: 'Mario & Pokémon',
                plataformas: 'Plataformas'
              }[selectedSteamGenre] || `Colección: ${selectedSteamGenre}`
            ) :
            selectedSteamDlcFilter ? (selectedSteamDlcFilter === 'con_dlc' ? '🎁 Con DLCs' : '🎮 Solo Juego Base') :
            selectedPSPlatform ? `Consola: ${selectedPSPlatform.toUpperCase()}` :
            selectedSwitchCompat ? `Switch: ${selectedSwitchCompat === 'para1' ? 'Switch 1' : selectedSwitchCompat === 'para2' ? 'Switch 2' : 'Exclusivo S2'}` :
            selectedTag ? `#${selectedTag}` :
            selectedLetter ? `Letra: ${selectedLetter}` : null
          }
          onClearSpecificFilter={() => {
            if (selectedSteamGenre) setSelectedSteamGenre(null);
            else if (selectedSteamDlcFilter) setSelectedSteamDlcFilter(null);
            else if (selectedPSPlatform) setSelectedPSPlatform(null);
            else if (selectedSwitchCompat) setSelectedSwitchCompat(null);
            else if (selectedTag) setSelectedTag(null);
            else if (selectedLetter) setSelectedLetter(null);
            setPage(1);
          }}
        />

        {/* Autocomplete dropdown */}
        {!filtroAplicado && searchInput.trim().length > 0 && searchResults.length > 0 && (
          <div className="catpage-autocomplete">
            {searchResults.slice(0, 12).map(prod => (
              <Link key={prod.id} to={prodUrl(prod.name, prod.id)} className="catpage-autocomplete-item" onClick={() => {
                setSearch(prod.name);
              }}>
                {prod.imageUrl && <img src={prod.imageUrl} alt={prod.name} className="catpage-autocomplete-img" />}
                <span>{prod.name}</span>
              </Link>
            ))}
            {searchResults.length > 12 && (
              <div style={{padding:'8px 14px',textAlign:'center',color:'rgba(160,132,232,0.6)',fontSize:'0.85rem',fontWeight:500}}>
                Mostrando los primeros 12 resultados...
              </div>
            )}
          </div>
        )}
        {!filtroAplicado && searchInput.trim().length > 0 && searchResults.length === 0 && (
          <div className="catpage-autocomplete">
            <div className="catpage-autocomplete-empty">
              Sin resultados para &quot;{searchInput}&quot;
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal — rendered via portal to escape stacking context */}
      {showFilterModal && ReactDOM.createPortal((
        <div className="catpage-fmodal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowFilterModal(false); }}>
          <div className="catpage-fmodal">
            <div className="catpage-fmodal-handle" />
            <div className="catpage-fmodal-header">
              <div className="catpage-fmodal-header-left">
                <div className="catpage-fmodal-icon-badge">
                  <SlidersHorizontal size={17} />
                </div>
                <div className="catpage-fmodal-titles">
                  <h3 className="catpage-fmodal-title">Filtros</h3>
                  {activeFilterCount > 0 ? (
                    <span className="catpage-fmodal-count-badge">
                      <span className="catpage-fmodal-count-dot" />
                      {activeFilterCount} activo{activeFilterCount !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="catpage-fmodal-sub">Personaliza tu búsqueda</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="catpage-fmodal-close"
                onClick={() => setShowFilterModal(false)}
                aria-label="Cerrar filtros"
              >
                <X size={17} />
              </button>
            </div>
            <div className="catpage-fmodal-body">
              {/* ORDENAR POR */}
              <div className="catpage-fmodal-section">
                <span className="catpage-fmodal-label">
                  <ArrowDownAZ size={13} className="catpage-fmodal-label-icon" /> Ordenar por
                </span>
                <div className="catpage-filter-grid-2x2">
                  {[
                    { val: 'price-asc',  label: 'Menor Precio', Icon: TrendingDown },
                    { val: 'price-desc', label: 'Mayor Precio', Icon: TrendingUp },
                    { val: 'az',         label: 'Nombre A → Z', Icon: ArrowDownAZ },
                    { val: 'za',         label: 'Nombre Z → A', Icon: ArrowUpZA },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      className={`catpage-fmodal-btn${order === opt.val ? ' active' : ''}`}
                      onClick={() => { setOrder(opt.val); setPage(1); }}
                    >
                      <opt.Icon size={14} className="catpage-fmodal-btn-icon" />
                      <span>{opt.label}</span>
                      {order === opt.val && <Check size={13} className="catpage-fmodal-check-icon" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* RANGO DE PRECIOS */}
              <div className="catpage-fmodal-section">
                <span className="catpage-fmodal-label">
                  <span className="catpage-fmodal-label-dot" /> Rango de Precio ({moneda})
                </span>
                <div className="catpage-price-row">
                  <div className="catpage-price-field">
                    <span className="catpage-price-symbol">$</span>
                    <input
                      type="number"
                      placeholder="Mínimo"
                      value={minPrice}
                      onChange={e => { setMinPrice(e.target.value); setPage(1); }}
                      className="catpage-price-input"
                    />
                  </div>
                  <span className="catpage-price-divider">a</span>
                  <div className="catpage-price-field">
                    <span className="catpage-price-symbol">$</span>
                    <input
                      type="number"
                      placeholder="Máximo"
                      value={maxPrice}
                      onChange={e => { setMaxPrice(e.target.value); setPage(1); }}
                      className="catpage-price-input"
                    />
                  </div>
                </div>
                <div className="catpage-price-presets">
                  {[
                    { label: '< $5.000', max: '5000' },
                    { label: '< $15.000', max: '15000' },
                    { label: '< $30.000', max: '30000' },
                    { label: '< $50.000', max: '50000' },
                  ].map(preset => (
                    <button
                      key={preset.max}
                      type="button"
                      className={`catpage-price-preset-chip${maxPrice === preset.max ? ' active' : ''}`}
                      onClick={() => {
                        setMinPrice('');
                        setMaxPrice(maxPrice === preset.max ? '' : preset.max);
                        setPage(1);
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* STEAM: GÉNEROS Y COLECCIONES */}
              {isSteam && (
                <>
                  <div className="catpage-fmodal-section">
                    <span className="catpage-fmodal-label">
                      <Gamepad2 size={13} className="catpage-fmodal-label-icon" /> Colecciones & Géneros Steam
                    </span>
                    <div className="catpage-fmodal-chips-wrap">
                      {[
                        { id: null, label: 'Todos los Juegos' },
                        { id: 'estrenos', label: '🔥 Estrenos & Top', dot: '#ffd166' },
                        { id: 'terror', label: 'Terror / Survival', dot: '#ff5555' },
                        { id: 'accion', label: 'Acción & Shooters', dot: '#ff9f1c' },
                        { id: 'rpg', label: 'RPG & Rol', dot: '#a259ff' },
                        { id: 'aventura', label: 'Aventura & Narrativa', dot: '#00f5d4' },
                        { id: 'coop', label: 'Cooperativo & Parejas', dot: '#ff66c4' },
                        { id: 'estrategia', label: 'Estrategia & RTS', dot: '#2ec4b6' },
                        { id: 'carreras', label: 'Carreras & Deportes', dot: '#f72585' },
                        { id: 'metroidvania', label: 'Metroidvania & Indie', dot: '#48cae4' },
                      ].map(opt => (
                        <button
                          key={String(opt.id)}
                          type="button"
                          className={`catpage-fmodal-btn${selectedSteamGenre === opt.id ? ' active' : ''}`}
                          onClick={() => { setSelectedSteamGenre(selectedSteamGenre === opt.id ? null : opt.id); setPage(1); }}
                        >
                          {opt.dot && <span className="catpage-fmodal-btn-dot" style={{ background: opt.dot }} />}
                          <span>{opt.label}</span>
                          {selectedSteamGenre === opt.id && <Check size={12} className="catpage-fmodal-check-icon" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="catpage-fmodal-section">
                    <span className="catpage-fmodal-label">
                      <Sparkles size={13} className="catpage-fmodal-label-icon" /> Sagas Legendarias de Steam
                    </span>
                    <div className="catpage-fmodal-chips-wrap">
                      {[
                        { id: 'residentevil', label: 'Resident Evil', dot: '#ff4757' },
                        { id: 'souls', label: 'Dark Souls & Elden Ring', dot: '#ffa502' },
                        { id: 'godofwar', label: 'God of War', dot: '#00d2d3' },
                        { id: 'gta', label: 'Grand Theft Auto & RDR', dot: '#ff9ff3' },
                        { id: 'tombraider', label: 'Tomb Raider', dot: '#2ed573' },
                        { id: 'batman', label: 'Batman Arkham', dot: '#5352ed' },
                        { id: 'ageofempires', label: 'Age of Empires', dot: '#eccc68' },
                        { id: 'farcry', label: 'Far Cry', dot: '#70a1ff' },
                        { id: 'outlast', label: 'Outlast', dot: '#ff6348' },
                        { id: 'monsterhunter', label: 'Monster Hunter', dot: '#1dd1a1' },
                      ].map(opt => (
                        <button
                          key={String(opt.id)}
                          type="button"
                          className={`catpage-fmodal-btn${selectedSteamGenre === opt.id ? ' active' : ''}`}
                          onClick={() => { setSelectedSteamGenre(selectedSteamGenre === opt.id ? null : opt.id); setPage(1); }}
                        >
                          {opt.dot && <span className="catpage-fmodal-btn-dot" style={{ background: opt.dot }} />}
                          <span>{opt.label}</span>
                          {selectedSteamGenre === opt.id && <Check size={12} className="catpage-fmodal-check-icon" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="catpage-fmodal-section">
                    <span className="catpage-fmodal-label">
                      🎁 Contenido Extra / DLCs
                    </span>
                    <div className="catpage-fmodal-chips-wrap">
                      {[
                        { id: null, label: 'Todos los Juegos' },
                        { id: 'con_dlc', label: '🎁 Con DLCs Disponibles', dot: '#00f5d4' },
                        { id: 'sin_dlc', label: '🎮 Solo Juego Base', dot: '#c4b5fd' },
                      ].map(opt => (
                        <button
                          key={String(opt.id)}
                          type="button"
                          className={`catpage-fmodal-btn${selectedSteamDlcFilter === opt.id ? ' active' : ''}`}
                          onClick={() => { setSelectedSteamDlcFilter(selectedSteamDlcFilter === opt.id ? null : opt.id); setPage(1); }}
                        >
                          {opt.dot && <span className="catpage-fmodal-btn-dot" style={{ background: opt.dot }} />}
                          <span>{opt.label}</span>
                          {selectedSteamDlcFilter === opt.id && <Check size={12} className="catpage-fmodal-check-icon" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* NINTENDO SWITCH */}
              {isSwitch && (
                <>
                  <div className="catpage-fmodal-section">
                    <span className="catpage-fmodal-label">
                      <Gamepad2 size={13} className="catpage-fmodal-label-icon" /> Versión Nintendo Switch
                    </span>
                    <div className="catpage-fmodal-chips-wrap">
                      {[
                        { val: null,         label: 'Todos' },
                        { val: 'para1',      label: 'Para Switch 1', dot: '#ff2a6d' },
                        { val: 'para2',      label: 'Para Switch 2', dot: '#00f5d4' },
                        { val: 'exclusivo2', label: 'Exclusivos Switch 2', dot: '#ffd166' },
                      ].map(opt => (
                        <button
                          key={String(opt.val)}
                          type="button"
                          className={`catpage-fmodal-btn${selectedSwitchCompat === opt.val ? ' active' : ''}`}
                          onClick={() => { setSelectedSwitchCompat(opt.val); setPage(1); }}
                        >
                          {opt.dot && <span className="catpage-fmodal-btn-dot" style={{ background: opt.dot }} />}
                          <span>{opt.label}</span>
                          {selectedSwitchCompat === opt.val && <Check size={12} className="catpage-fmodal-check-icon" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="catpage-fmodal-section">
                    <span className="catpage-fmodal-label">
                      <Sparkles size={13} className="catpage-fmodal-label-icon" /> Sagas y Géneros Switch
                    </span>
                    <div className="catpage-fmodal-chips-wrap">
                      {[
                        { id: null, label: 'Todas las Sagas' },
                        { id: 'mario_pokemon', label: 'Mario & Pokémon', dot: '#ff3366' },
                        { id: 'aventura', label: 'Aventura & Zelda', dot: '#00f5d4' },
                        { id: 'plataformas', label: 'Plataformas', dot: '#ff9f1c' },
                        { id: 'coop', label: 'Party & Cooperativo', dot: '#ff66c4' },
                        { id: 'terror', label: 'Terror / Survival', dot: '#9d4edd' },
                      ].map(opt => (
                        <button
                          key={String(opt.id)}
                          type="button"
                          className={`catpage-fmodal-btn${selectedSteamGenre === opt.id ? ' active' : ''}`}
                          onClick={() => { setSelectedSteamGenre(selectedSteamGenre === opt.id ? null : opt.id); setPage(1); }}
                        >
                          {opt.dot && <span className="catpage-fmodal-btn-dot" style={{ background: opt.dot }} />}
                          <span>{opt.label}</span>
                          {selectedSteamGenre === opt.id && <Check size={12} className="catpage-fmodal-check-icon" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* PLAYSTATION */}
              {isPlayStation && (
                <>
                  <div className="catpage-fmodal-section">
                    <span className="catpage-fmodal-label">
                      <Gamepad2 size={13} className="catpage-fmodal-label-icon" /> Consola PlayStation
                    </span>
                    <div className="catpage-fmodal-chips-wrap">
                      {[
                        { val: null,   label: 'Todos' },
                        { val: 'ps4',  label: 'PlayStation 4 (PS4)', dot: '#0070d1' },
                        { val: 'ps5',  label: 'PlayStation 5 (PS5)', dot: '#ffffff' },
                      ].map(opt => (
                        <button
                          key={String(opt.val)}
                          type="button"
                          className={`catpage-fmodal-btn${selectedPSPlatform === opt.val ? ' active' : ''}`}
                          onClick={() => { setSelectedPSPlatform(opt.val); setPage(1); }}
                        >
                          {opt.dot && <span className="catpage-fmodal-btn-dot" style={{ background: opt.dot }} />}
                          <span>{opt.label}</span>
                          {selectedPSPlatform === opt.val && <Check size={12} className="catpage-fmodal-check-icon" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="catpage-fmodal-section">
                    <span className="catpage-fmodal-label">
                      <Sparkles size={13} className="catpage-fmodal-label-icon" /> Géneros PlayStation
                    </span>
                    <div className="catpage-fmodal-chips-wrap">
                      {[
                        { id: null, label: 'Todos los Géneros' },
                        { id: 'terror', label: 'Terror / Horror', dot: '#ff5555' },
                        { id: 'accion', label: 'Acción', dot: '#ff9f1c' },
                        { id: 'aventura', label: 'Aventura', dot: '#00f5d4' },
                        { id: 'carreras', label: 'Carreras & GT', dot: '#f72585' },
                        { id: 'rpg', label: 'RPG / Rol', dot: '#a259ff' },
                        { id: 'coop', label: 'Multijugador / Coop', dot: '#ff66c4' },
                      ].map(opt => (
                        <button
                          key={String(opt.id)}
                          type="button"
                          className={`catpage-fmodal-btn${selectedSteamGenre === opt.id ? ' active' : ''}`}
                          onClick={() => { setSelectedSteamGenre(selectedSteamGenre === opt.id ? null : opt.id); setPage(1); }}
                        >
                          {opt.dot && <span className="catpage-fmodal-btn-dot" style={{ background: opt.dot }} />}
                          <span>{opt.label}</span>
                          {selectedSteamGenre === opt.id && <Check size={12} className="catpage-fmodal-check-icon" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {!isSteam && usedTags.size > 0 && (
                <div className="catpage-fmodal-section">
                  <span className="catpage-fmodal-label">
                    <TagIcon size={13} className="catpage-fmodal-label-icon" /> Categorías / Etiquetas
                  </span>
                  <div className="catpage-fmodal-chips-wrap">
                    {Array.from(usedTags).map(tag => (
                      <button
                        key={tag}
                        type="button"
                        className={`catpage-fmodal-btn${selectedTag === tag ? ' active' : ''}`}
                        onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setPage(1); }}
                      >
                        <span>#{tag}</span>
                        {selectedTag === tag && <Check size={12} className="catpage-fmodal-check-icon" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {allLetters.length > 0 && (
                <div className="catpage-fmodal-section">
                  <span className="catpage-fmodal-label">🔤 Letra Inicial</span>
                  <div className="catpage-letters-grid">
                    <button
                      type="button"
                      className={`catpage-letter-btn${!selectedLetter ? ' active' : ''}`}
                      onClick={() => { setSelectedLetter(null); setPage(1); }}
                    >TODAS</button>
                    {allLetters.map(l => (
                      <button
                        key={l}
                        type="button"
                        className={`catpage-letter-btn${selectedLetter === l ? ' active' : ''}`}
                        onClick={() => { setSelectedLetter(selectedLetter === l ? null : l); setPage(1); }}
                      >{l}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="catpage-fmodal-footer">
              <button
                type="button"
                className="catpage-fmodal-clear-btn"
                onClick={() => {
                  setOrder('price-asc');
                  setMinPrice('');
                  setMaxPrice('');
                  setSelectedTag(null);
                  setSelectedLetter(null);
                  setSelectedSwitchCompat(null);
                  setSelectedPSPlatform(null);
                  setSelectedSteamGenre(null);
                  setSelectedSteamDlcFilter(null);
                  setPage(1);
                }}
              >
                <RotateCcw size={14} />
                <span>Limpiar filtros</span>
              </button>
              <button
                type="button"
                className="catpage-fmodal-apply-btn"
                onClick={() => setShowFilterModal(false)}
              >
                <span>Ver resultados</span>
                <span className="catpage-fmodal-apply-badge">{searchResults.length}</span>
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Product grid */}
      <div className="catpage-grid-container">
        <aside className="catpage-desktop-sidebar" aria-label="Filtros del catálogo">
          <div className="catpage-sidebar-heading">
            <div>
              <span className="catpage-sidebar-eyebrow">CATÁLOGO</span>
              <h2>Filtrar juegos</h2>
            </div>
            {activeFilterCount > 0 && <span className="catpage-sidebar-count">{activeFilterCount}</span>}
          </div>

          <section className="catpage-sidebar-section">
            <div className="catpage-sidebar-label">Rango de precio</div>
            <div className="catpage-sidebar-price-fields">
              <label><span>Desde</span><input type="number" inputMode="numeric" value={minPrice} onChange={e => { setMinPrice(e.target.value); setPage(1); }} placeholder="$ 0" /></label>
              <label><span>Hasta</span><input type="number" inputMode="numeric" value={maxPrice} onChange={e => { setMaxPrice(e.target.value); setPage(1); }} placeholder="$ 50.000" /></label>
            </div>
          </section>

          <section className="catpage-sidebar-section">
            <div className="catpage-sidebar-label">Ordenar por</div>
            <div className="catpage-sidebar-options">
              {[{ value: 'price-asc', label: 'Menor precio' }, { value: 'price-desc', label: 'Mayor precio' }, { value: 'az', label: 'Nombre A — Z' }, { value: 'za', label: 'Nombre Z — A' }].map(option => (
                <button key={option.value} type="button" className={order === option.value ? 'active' : ''} onClick={() => { setOrder(option.value); setPage(1); }}>
                  <span className="catpage-sidebar-radio" />{option.label}
                </button>
              ))}
            </div>
          </section>

          {usedTags.size > 0 && (
            <section className="catpage-sidebar-section">
              <div className="catpage-sidebar-label">Etiquetas</div>
              <div className="catpage-sidebar-chips">
                {Array.from(usedTags).slice(0, 12).map(tag => <button key={tag} type="button" className={selectedTag === tag ? 'active' : ''} onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setPage(1); }}>#{tag}</button>)}
              </div>
            </section>
          )}

          {allLetters.length > 0 && (
            <section className="catpage-sidebar-section">
              <div className="catpage-sidebar-label">Inicial</div>
              <div className="catpage-sidebar-letters">
                <button type="button" className={!selectedLetter ? 'active' : ''} onClick={() => { setSelectedLetter(null); setPage(1); }}>Todas</button>
                {allLetters.map(letter => <button key={letter} type="button" className={selectedLetter === letter ? 'active' : ''} onClick={() => { setSelectedLetter(selectedLetter === letter ? null : letter); setPage(1); }}>{letter}</button>)}
              </div>
            </section>
          )}

          <button type="button" className="catpage-sidebar-clear" onClick={() => { setOrder('price-asc'); setMinPrice(''); setMaxPrice(''); setSelectedTag(null); setSelectedLetter(null); setSelectedSwitchCompat(null); setSelectedPSPlatform(null); setSelectedSteamGenre(null); setSelectedSteamDlcFilter(null); setPage(1); }}>
            <RotateCcw size={14} /> Limpiar filtros
          </button>
        </aside>
        <div className="catpage-catalog-body">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '380px', gap: 16 }}>
            <Loader />
            <p style={{ color: '#c4b5fd', fontSize: '0.95rem', fontWeight: 600 }}>Cargando catálogo...</p>
          </div>
        ) : searchResults.length === 0 ? (
          isSwitch ? (
            <div style={{
              width: '100%',
              maxWidth: '620px',
              margin: '40px auto',
              background: 'linear-gradient(145deg, rgba(23, 13, 54, 0.95), rgba(13, 7, 34, 0.95))',
              border: '1.5px solid rgba(162, 89, 255, 0.35)',
              borderRadius: '24px',
              padding: '40px 24px',
              textAlign: 'center',
              boxShadow: '0 12px 35px rgba(0,0,0,0.5)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎮</div>
              <h2 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 900, marginBottom: 10 }}>
                Stock de Nintendo Switch en Actualización
              </h2>
              <p style={{ color: '#c4b5fd', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 auto 24px', maxWidth: '480px' }}>
                Actualmente no hay packs con stock inmediato cargados en la base de datos. Los juegos aparecerán automáticamente aquí a medida que se suban los packs.
              </p>
              <a
                href={buildStockRequestWhatsappUrl("un juego")}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'linear-gradient(90deg, #25D366, #128C7E)',
                  color: '#fff',
                  padding: '14px 28px',
                  borderRadius: '30px',
                  fontWeight: 800,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  boxShadow: '0 6px 20px rgba(37, 211, 102, 0.35)'
                }}
              >
                <span>📲</span> Consultar Disponibilidad por WhatsApp
              </a>
            </div>
          ) : (
            <div className="catpage-empty">No se encontraron productos</div>
          )
        ) : isSteam ? (
          <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 16px', boxSizing: 'border-box' }}>
            <div style={{ padding: "16px 22px", background: "linear-gradient(135deg, rgba(162,89,255,0.1), rgba(0,245,212,0.05))", border: "1.5px solid rgba(0,245,212,0.3)", borderRadius: 16, display: "flex", flexDirection: "column", gap: 10, alignItems: "center", textAlign: "center", marginBottom: 20 }}>
              <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>🎮 ¿No encuentras el juego que buscas? Escríbenos y te lo conseguimos al instante:</span>
              <div style={{ display: "flex", gap: 12, width: "100%", justifyContent: "center" }}>
                <a
                  href="https://wa.me/56974751810?text=Hola!%20Busco%20un%20juego%20de%20Steam%20que%20no%20encuentro%20en%20la%20página"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: 'linear-gradient(135deg, #128C7E, #25D366)', flex: 1, maxWidth: 160, fontSize: '13px', padding: '8px 12px', borderRadius: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#fff', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(37,211,102,0.2)' }}
                >
                  <img src={wspLogo} alt="WhatsApp" style={{ width: 16, height: 16, objectFit: 'contain' }} /> WhatsApp
                </a>
              </div>
            </div>

            {/* View Mode Toggle (Grid vs Compact List) */}
            <div className="steam-view-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ color: 'rgba(226, 217, 255, 0.7)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>Mostrando <b style={{ color: '#00f5d4' }}>{searchResults.length.toLocaleString()}</b> juegos</span>
                {ryuuLoading && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(0,245,212,0.07)', border: '1px solid rgba(0,245,212,0.2)', borderRadius: 999, padding: '2px 8px', fontSize: '0.72rem', color: '#00f5d4', fontWeight: 700 }}>
                    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#00f5d4', animation: 'pulse 1s ease-in-out infinite' }} />
                    Cargando catálogo completo...
                  </span>
                )}
                {/* Filtros rápidos de DLCs */}
                <div className="steam-dlc-quick-filter-wrap">
                  <button
                    type="button"
                    className={`steam-dlc-quick-btn${!selectedSteamDlcFilter ? ' active' : ''}`}
                    onClick={() => { setSelectedSteamDlcFilter(null); setPage(1); }}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className={`steam-dlc-quick-btn${selectedSteamDlcFilter === 'con_dlc' ? ' active' : ''}`}
                    onClick={() => { setSelectedSteamDlcFilter(selectedSteamDlcFilter === 'con_dlc' ? null : 'con_dlc'); setPage(1); }}
                  >
                    🎁 Con DLCs
                  </button>
                  <button
                    type="button"
                    className={`steam-dlc-quick-btn${selectedSteamDlcFilter === 'sin_dlc' ? ' active' : ''}`}
                    onClick={() => { setSelectedSteamDlcFilter(selectedSteamDlcFilter === 'sin_dlc' ? null : 'sin_dlc'); setPage(1); }}
                  >
                    🎮 Solo Base
                  </button>
                </div>
              </div>
              <div className="steam-view-toggle-wrap">
                <button
                  type="button"
                  className={`steam-toggle-btn${steamViewMode === 'grid' ? ' active' : ''}`}
                  onClick={() => handleSteamViewModeChange('grid')}
                  title="Vista de Cuadrícula con Portadas Steam"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/>
                  </svg>
                  <span>Cuadrícula</span>
                </button>
                <button
                  type="button"
                  className={`steam-toggle-btn${steamViewMode === 'list' ? ' active' : ''}`}
                  onClick={() => handleSteamViewModeChange('list')}
                  title="Vista de Lista Compacta"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                  </svg>
                  <span>Lista</span>
                </button>
              </div>
            </div>

            {steamViewMode === 'grid' ? (
              <div className="catpage-grid">
                {paginated.map(prod => {
                  const inCart = cartIds.includes(prod.id);
                  const precioVal = prod.priceCLP ? Number(prod.priceCLP) : 2000;
                  const isGreen = prod.isGreenTier || precioVal >= 4990;
                  const steamImg = prod.imageUrl || prod.image || (prod.app_id ? `https://cdn.akamai.steamstatic.com/steam/apps/${prod.app_id}/header.jpg` : null);
                  const dlcCount = getGameDlcCount(prod);

                  return (
                    <div
                      key={prod.id}
                      className="catpage-card steam-grid-card"
                      onClick={e => {
                        if (e.target.tagName === 'BUTTON' || (e.target.closest && e.target.closest('button'))) return;
                        if (e.target.tagName === 'A' || (e.target.closest && e.target.closest('a'))) return;
                        navigate(prodUrl(prod.name, prod.id));
                      }}
                    >
                      <div className="catpage-card-img-wrap steam-grid-img-wrap">
                        {steamImg ? (
                          <div className="steam-banner-container">
                            <img
                              src={steamImg}
                              alt={prod.name}
                              loading="lazy"
                              decoding="async"
                              className="steam-grid-img"
                              onError={e => {
                                if (!e.target.dataset.triedFallback && prod.app_id) {
                                  e.target.dataset.triedFallback = "1";
                                  e.target.src = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${prod.app_id}/header.jpg`;
                                } else if (e.target.dataset.triedFallback === "1" && prod.app_id) {
                                  e.target.dataset.triedFallback = "2";
                                  e.target.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${prod.app_id}/header.jpg`;
                                } else {
                                  e.target.onerror = null;
                                  e.target.src = steamLogo;
                                  e.target.className = "steam-fallback-icon";
                                }
                              }}
                            />
                            <div className="steam-grid-badge-wrap">
                              <span className={`steam-type-tag ${isGreen ? 'destacado' : 'regular'}`}>
                                {isGreen ? '⭐ DESTACADO' : 'STEAM'}
                              </span>
                              {dlcCount > 0 ? (
                                <span className="steam-dlc-badge has-dlc" title={`${dlcCount} DLCs disponibles para este juego`}>
                                  🎁 {dlcCount} DLC{dlcCount > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="steam-dlc-badge no-dlc" title="Juego Base (Sin DLCs)">
                                  Base
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="steam-banner-fallback">
                            <img src={steamLogo} alt="Steam" style={{ width: 36, height: 36, objectFit: 'contain', opacity: 0.9 }} />
                            <span style={{ fontSize: '0.72rem', color: '#00f5d4', fontWeight: 800 }}>STEAM DIGITAL</span>
                            {dlcCount > 0 && (
                              <span className="steam-dlc-badge has-dlc" style={{ marginTop: 4 }}>
                                🎁 {dlcCount} DLC{dlcCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="catpage-card-name" style={{ minHeight: 38, marginTop: 10 }}>
                        <Link to={prodUrl(prod.name, prod.id)} title={prod.name}>
                          {prod.name}
                        </Link>
                      </div>

                      {/* Indicador sutil de DLCs */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '0 2px' }}>
                        {dlcCount > 0 ? (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: '#00f5d4',
                            background: 'rgba(0, 245, 212, 0.1)',
                            border: '1px solid rgba(0, 245, 212, 0.35)',
                            borderRadius: 6,
                            padding: '2px 7px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            ✨ Incluye opción DLCs (+{dlcCount})
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 600,
                            color: 'rgba(255, 255, 255, 0.45)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 6,
                            padding: '2px 6px'
                          }}>
                            Juego Base Completo
                          </span>
                        )}
                      </div>

                      <div className="catpage-price-badge">
                        <span className="price-label">{role === "revendedor" ? "PRECIO REVENDEDOR" : "PRECIO"}</span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                          <span className="price-val" style={{ color: '#00f5d4', fontWeight: 900 }}>
                            {formatearPrecio(role === "revendedor" ? Math.max(500, Math.round(precioVal * 0.5)) : precioVal)}
                          </span>
                          {role === "revendedor" && (
                            <span style={{ color: "rgba(255,255,255,0.4)", textDecoration: "line-through", fontSize: "0.82em" }}>
                              {formatearPrecio(precioVal)}
                            </span>
                          )}
                        </div>
                        {role === "revendedor" && (
                          <div style={{
                            marginTop: 3,
                            background: "rgba(0, 245, 212, 0.15)",
                            border: "1px solid #00f5d4",
                            borderRadius: 6,
                            padding: "2px 6px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            color: "#00f5d4"
                          }}>
                            💎 50% Mitad de Precio
                          </div>
                        )}
                      </div>

                      <button
                        className={`catpage-cart-btn${inCart ? ' in-cart' : ''}`}
                        onClick={async e => {
                          e.stopPropagation();
                          await handleCart(prod);
                        }}
                      >
                        {inCart ? 'Quitar del Carrito' : '+ Agregar al Carrito'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <AnimatedList
                items={paginated}
                showGradients={false}
                enableArrowNavigation={true}
                displayScrollbar={false}
                onItemSelect={(prod) => navigate(prodUrl(prod.name, prod.id))}
                renderItem={(prod) => {
                  const inCart = cartIds.includes(prod.id);
                  const precioVal = prod.priceCLP ? Number(prod.priceCLP) : 2000;
                  const isGreen = prod.isGreenTier || precioVal >= 4990;
                  const steamImg = prod.imageUrl || prod.image || (prod.app_id ? `https://cdn.akamai.steamstatic.com/steam/apps/${prod.app_id}/header.jpg` : null);
                  const dlcCount = getGameDlcCount(prod);

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 10, boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        {/* Steam Image Thumbnail */}
                        <div className="steam-list-thumb-wrap">
                          {steamImg ? (
                            <img
                              src={steamImg}
                              alt={prod.name}
                              loading="lazy"
                              decoding="async"
                              className="steam-list-thumb-img"
                              onError={e => {
                                if (!e.target.dataset.triedFallback && prod.app_id) {
                                  e.target.dataset.triedFallback = "1";
                                  e.target.src = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${prod.app_id}/header.jpg`;
                                } else if (e.target.dataset.triedFallback === "1" && prod.app_id) {
                                  e.target.dataset.triedFallback = "2";
                                  e.target.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${prod.app_id}/header.jpg`;
                                } else {
                                  e.target.onerror = null;
                                  e.target.src = steamLogo;
                                  e.target.className = "steam-list-thumb-fallback";
                                }
                              }}
                            />
                          ) : (
                            <img src={steamLogo} alt="Steam" className="steam-list-thumb-fallback" />
                          )}
                        </div>

                        <div style={{
                          background: isGreen ? 'rgba(0, 245, 212, 0.12)' : 'rgba(162, 89, 255, 0.12)',
                          border: isGreen ? '1px solid rgba(0, 245, 212, 0.6)' : '1px solid rgba(162, 89, 255, 0.3)',
                          borderRadius: 6,
                          padding: '3px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          flexShrink: 0
                        }}>
                          <span style={{ fontSize: '0.66rem', fontWeight: 900, color: isGreen ? '#00f5d4' : '#c4b5fd', letterSpacing: '0.04em' }}>
                            {isGreen ? 'DESTACADO' : 'STEAM'}
                          </span>
                        </div>

                        {dlcCount > 0 ? (
                          <div style={{
                            background: 'rgba(0, 245, 212, 0.12)',
                            border: '1px solid rgba(0, 245, 212, 0.5)',
                            borderRadius: 6,
                            padding: '3px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ fontSize: '0.66rem', fontWeight: 900, color: '#00f5d4', letterSpacing: '0.04em' }}>
                              🎁 {dlcCount} DLC{dlcCount > 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : (
                          <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 6,
                            padding: '3px 7px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ fontSize: '0.64rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.45)', letterSpacing: '0.04em' }}>
                              BASE
                            </span>
                          </div>
                        )}

                        <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.92rem', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {prod.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.55rem', color: role === 'revendedor' ? '#00f5d4' : 'rgba(196,181,253,0.6)', fontWeight: 700, letterSpacing: '0.05em' }}>
                            {role === 'revendedor' ? 'REVENDEDOR' : 'PRECIO'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                            {role === 'revendedor' && (
                              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through' }}>
                                {formatearPrecio(precioVal)}
                              </span>
                            )}
                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#00f5d4' }}>
                              {formatearPrecio(role === 'revendedor' ? calcularPrecioRevendedor(precioVal, 'steam') : precioVal)}
                            </div>
                          </div>
                        </div>

                        <button
                          className={`catpage-cart-btn${inCart ? ' in-cart' : ''}`}
                          style={{ padding: '7px 12px', fontSize: '0.78rem', borderRadius: 8, flexShrink: 0, whiteSpace: 'nowrap' }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleCart(prod);
                          }}
                        >
                          {inCart ? 'Quitar' : '+ Agregar'}
                        </button>
                      </div>
                    </div>
                  );
                }}
              />
            )}

            {/* Pagination for Steam */}
            {totalPages > 1 && (
              <div className="catpage-pagination" style={{ marginTop: 24 }}>
                <button
                  className="catpage-page-btn"
                  disabled={page === 1}
                  onClick={() => { setPage(p => Math.max(1, p - 1)); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10); }}
                >&#8592; Anterior</button>
                <span className="catpage-page-info">
                  {page} / {totalPages}
                </span>
                <button
                  className="catpage-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10); }}
                >Siguiente &#8594;</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="catpage-grid">
              {/* Tarjeta especial: SIEMPRE la primera card en la grilla */}
              <div className="catpage-card catpage-request-item-card">
                <div className="catpage-card-img-wrap" style={{ background: 'linear-gradient(135deg, #1b0a3c 0%, #2e1263 60%, #120732 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 6px', textAlign: 'center', border: '1px solid rgba(162, 89, 255, 0.35)', aspectRatio: 'auto', flex: 1, minHeight: '110px' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '4px', filter: 'drop-shadow(0 0 10px rgba(162, 89, 255, 0.6))' }}>🎮🔍</div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#00f5d4', letterSpacing: '0.06em', textTransform: 'uppercase' }}>¿BUSCAS OTRO JUEGO?</span>
                  <span style={{ fontSize: '0.65rem', color: '#c4b5fd', marginTop: '3px', lineHeight: 1.2, fontWeight: 600 }}>¡Te conseguimos cualquier juego al instante!</span>
                </div>

                <div className="catpage-card-name" style={{ minHeight: 'auto', marginBottom: '4px' }}>
                  <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.8rem' }}>¿No encuentras tu juego?</span>
                </div>

                <div className="catpage-price-badge" style={{ padding: '4px 8px', marginBottom: '6px' }}>
                  <span className="price-label" style={{ fontSize: '0.58rem' }}>PEDIDO DIRECTO</span>
                  <span className="price-val" style={{ fontSize: '0.92rem' }}>Escríbenos</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', marginTop: 'auto', flexShrink: 0 }}>
                  <a
                    href="https://wa.me/56974751810?text=Hola!%20Busco%20un%20juego%20que%20no%20encuentro%20en%20la%20tienda"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="catpage-cart-btn"
                    style={{ background: 'linear-gradient(135deg, #128C7E, #25D366)', fontSize: '0.74rem', padding: '6px 8px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexShrink: 0 }}
                  >
                    <img src={wspLogo} alt="WhatsApp" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                    WhatsApp
                  </a>
                </div>
              </div>

              {paginated.map(prod => (
                <div
                  key={prod.id}
                  className="catpage-card"
                  onClick={e => {
                    if (e.target.tagName === 'BUTTON' || (e.target.closest && e.target.closest('button'))) return;
                    if (e.target.tagName === 'A' || (e.target.closest && e.target.closest('a'))) return;
                    navigate(prodUrl(prod.name, prod.id));
                  }}
                >
                  <div className="catpage-card-img-wrap">
                    {(!prod.imageUrl && !prod.image) ? (
                      <div
                        onClick={() => navigate(prodUrl(prod.name, prod.id))}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(145deg, #170d36 0%, #0d0722 100%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '16px 12px',
                          textAlign: 'center',
                          boxSizing: 'border-box',
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          background: 'rgba(0, 245, 212, 0.15)',
                          border: '1px solid #00f5d4',
                          borderRadius: 6,
                          padding: '2px 8px',
                          color: '#00f5d4',
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          letterSpacing: '0.05em'
                        }}>
                          STEAM DIGITAL
                        </div>
                        <img src={steamLogo} alt="Steam" style={{ width: 34, height: 34, objectFit: 'contain', opacity: 0.9, marginBottom: 8, filter: 'drop-shadow(0 0 8px rgba(0,245,212,0.4))' }} />
                        <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {prod.name}
                        </span>
                      </div>
                    ) : (
                      <TiltedCard
                        imageSrc={prod.imageUrl}
                        altText={prod.name}
                        captionText={getMinPriceByMoneda(prod, 'CLP') ? formatearPrecio(getMinPriceByMoneda(prod, 'CLP')) : prod.name}
                        containerHeight="100%"
                        containerWidth="100%"
                        imageHeight="100%"
                        imageWidth="100%"
                        rotateAmplitude={12}
                        scaleOnHover={1.05}
                        showMobileWarning={false}
                        showTooltip={true}
                        displayOverlayContent={true}
                        overlayContent={
                          <>
                            {(() => {
                              const logo = getPlatformLogo(categoria?.name);
                              if (!logo) return null;
                              return (
                                <div style={{position:'absolute',top:8,left:8,zIndex:3,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(6px)',borderRadius:8,padding:'4px 8px',display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                                  <img src={logo} alt="" style={{height:18,width:'auto',maxWidth:46,objectFit:'contain',display:'block',filter:'brightness(1.1)'}} />
                                </div>
                              );
                            })()}
                            <button className="catpage-fav-btn" onClick={e => { e.stopPropagation(); handleFav(prod); }} title={favIds.includes(prod.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
                              <span className={`catpage-fav-star ${favIds.includes(prod.id) ? 'on' : 'off'}`}>&#9733;</span>
                            </button>
                            {(() => {
                              const BADGE_TAGS = [
                                { tag:'Oferta',      icon:'🔥', bg:'#c0180c' },
                                { tag:'Más vendido', icon:'⭐', bg:'#9a6500' },
                                { tag:'Bestseller',  icon:'⭐', bg:'#9a6500' },
                                { tag:'Nuevo',       icon:'✨', bg:'#0f7a38' },
                                { tag:'Exclusivo',   icon:'💎', bg:'#6b0fa8' },
                                { tag:'Preventa',    icon:'⏰', bg:'#0f4db5' },
                                { tag:'Promo',       icon:'🏷️', bg:'#b54d0a' },
                              ];
                              if (!Array.isArray(prod.tags) || !prod.tags.length) return null;
                              const match = BADGE_TAGS.find(b => prod.tags.includes(b.tag));
                              if (!match) return null;
                              return (
                                <div className="catpage-ribbon-wrap">
                                  <span className="catpage-ribbon" style={{background:match.bg}}>
                                    {match.icon} {match.tag}
                                  </span>
                                </div>
                              );
                            })()}
                            {isSwitch && (() => {
                              const compat = prod.switchCompat || 'ambas';
                              const COMPAT_MAP = {
                                switch1: { label:'Solo Switch 1', bg:'rgba(140,10,10,0.92)',  border:'rgba(228,0,15,0.5)' },
                                switch2: { label:'Solo Switch 2', bg:'rgba(8,45,130,0.92)',   border:'rgba(0,120,215,0.5)' },
                                ambas:   { label:'Switch 1 y 2',  bg:'rgba(8,80,30,0.92)',    border:'rgba(74,222,128,0.5)' },
                              };
                              const c = COMPAT_MAP[compat] || COMPAT_MAP.ambas;
                              return (
                                <div className="catpage-compat-strip" style={{background:c.bg,borderTop:`1px solid ${c.border}`}}>
                                  🎮 {c.label}
                                </div>
                              );
                            })()}
                          </>
                        }
                      />
                    )}
                  </div>

                  <div className="catpage-card-name">
                    <Link to={prodUrl(prod.name, prod.id)}>{prod.name}</Link>
                  </div>

                  {(() => {
                    const minCLP = getMinPriceByMoneda(prod, 'CLP');
                    const label = getCategoryPriceLabel(categoria?.name, prod);
                    const isReseller = role === "revendedor";
                    const isSteamProd = isSteamCategory || Boolean(prod.app_id) || Boolean(prod.isSteam) || String(prod.id || '').startsWith("ryuu_");
                    // La categoría real no siempre está grabada en productos antiguos;
                    // se la entregamos al motor B2B para aplicar el descuento correcto.
                    const resellerPricing = isReseller ? getProductPricing({ ...prod, categoryName: isSteamProd ? "steam" : (categoria?.name || "") }, role) : null;
                    const finalDisplayPrice = isReseller
                      ? (resellerPricing?.precioFinal || minCLP)
                      : minCLP;

                    return minCLP ? (
                      <div className="catpage-price-badge">
                        <span className="price-label">{isReseller ? "PRECIO REVENDEDOR" : label}</span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                          <span className="price-val" style={{ color: isReseller ? "#00f5d4" : "#ffffff" }}>
                            {formatearPrecio(finalDisplayPrice)}
                          </span>
                          {isReseller && finalDisplayPrice < minCLP && (
                            <span style={{ color: "rgba(255, 255, 255, 0.4)", textDecoration: "line-through", fontSize: "0.82em" }}>
                              {formatearPrecio(minCLP)}
                            </span>
                          )}
                        </div>
                        {isReseller && (
                          <div style={{
                            marginTop: 4,
                            background: "rgba(0, 245, 212, 0.15)",
                            border: "1px solid #00f5d4",
                            borderRadius: 6,
                            padding: "2px 6px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            color: "#00f5d4"
                          }}>
                            {resellerPricing?.badge || "💎 Precio Revendedor"}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="catpage-no-price">Sin precio disponible</div>
                    );
                  })()}

                  {(() => {
                    const switchStock = isSwitch ? getGameStockCount(prod.name, switchStockMap) : null;
                    const isOutOfStock = isSwitch && switchStock === 0;

                    if (isOutOfStock) {
                      return (
                        <a
                          href={buildStockRequestWhatsappUrl(prod.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="catpage-cart-btn"
                          style={{
                            background: 'linear-gradient(90deg, #25D366, #128C7E)',
                            textDecoration: 'none',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <span>📲</span> Pedir por WhatsApp
                        </a>
                      );
                    }

                    return (
                      <button
                        className={`catpage-cart-btn${cartIds.includes(prod.id) ? ' in-cart' : ''}`}
                        onClick={async e => {
                          e.stopPropagation();
                          await handleCart(prod);
                        }}
                      >
                        {cartIds.includes(prod.id) ? (
                          <><span style={{fontSize:'0.9rem'}}>&#10005;</span> Quitar del carrito</>
                        ) : (
                          <><svg className="catpage-cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Agregar al carrito</>
                        )}
                      </button>
                    );
                  })()}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="catpage-pagination">
                <button
                  className="catpage-page-btn"
                  disabled={page === 1}
                  onClick={() => { setPage(p => Math.max(1, p - 1)); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10); }}
                >&#8592; Anterior</button>
                <span className="catpage-page-info">
                  {page} / {totalPages}
                </span>
                <button
                  className="catpage-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10); }}
                >Siguiente &#8594;</button>
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {/* Variant / Subscription modal */}
      {modal.open && (
        <div className="catpage-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal({ open: false, prod: null, opciones: [], tipo: null }); }}>
          <div className="catpage-modal-card">
            <h3>Selecciona una opci&oacute;n</h3>
            <ul className="catpage-modal-options">
              {modal.opciones.map(op => (
                <li key={op.value}>
                  <button
                    className="catpage-modal-option-btn"
                    onClick={() => handleCartModal(op)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      width: "100%",
                      padding: "12px 16px"
                    }}
                  >
                    <span style={{ fontSize: "1rem", fontWeight: 700 }}>{op.label}</span>
                    <span style={{ fontSize: "1.05rem", fontWeight: 800, color: op.isResellerPrice ? "#00f5d4" : "#ffffff" }}>
                      {formatearPrecio(op.priceCLP)}
                    </span>
                    {op.isResellerPrice && (
                      <span style={{
                        fontSize: "0.72rem",
                        color: "#00f5d4",
                        background: "rgba(0, 245, 212, 0.15)",
                        border: "1px solid rgba(0, 245, 212, 0.3)",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontWeight: 700
                      }}>
                        💎 Descuento Revendedor (-$5.000)
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <button className="catpage-modal-cancel" onClick={() => setModal({ open: false, prod: null, opciones: [], tipo: null })}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Modal interactivo de Promoción Steam */}
      {steamPromoModal.open && steamPromoModal.promo && ReactDOM.createPortal(
        <div
          className="steam-promo-modal-backdrop"
          onClick={e => { if (e.target === e.currentTarget) setSteamPromoModal({ open: false, promo: null, selectedIds: [], search: "", vipTab: "vip" }); }}
        >
          <div className="steam-promo-modal-container">
            {/* Header */}
            <div className="steam-modal-header">
              <div className="steam-modal-header-top">
                <span className={`steam-modal-status-badge ${
                  (steamPromoModal.promo.isVipPromo ? (selectedVipId && selectedBonusIds.length === 2) : (steamPromoModal.selectedIds.length === steamPromoModal.promo.count)) ? "ready" : ""
                }`}>
                  {steamPromoModal.promo.isVipPromo ? (
                    `⭐ Pack VIP · ${selectedVipId ? "1 VIP" : "0 VIP"} + ${selectedBonusIds.length}/2 Regalos`
                  ) : (
                    `🎮 ${steamPromoModal.promo.name} (${steamPromoModal.selectedIds.length}/${steamPromoModal.promo.count})`
                  )}
                  {totalSelectedDlcsCount > 0 && (
                    <span style={{ marginLeft: 6, color: '#00f5d4' }}>
                      · 🎁 {totalSelectedDlcsCount} DLC{totalSelectedDlcsCount > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
                
                <div className="steam-modal-header-actions">
                  <span className={`steam-modal-total-pill ${steamDynamicPrice > steamPromoModal.promo.priceCLP ? "highlight" : ""}`}>
                    Total: {formatearPrecio(steamDynamicPrice)}
                  </span>
                  <button
                    type="button"
                    className="steam-modal-close-btn"
                    onClick={() => setSteamPromoModal({ open: false, promo: null, selectedIds: [], search: "", vipTab: "vip" })}
                    aria-label="Cerrar"
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Pestañas de 2 Pasos para Pack VIP */}
              {steamPromoModal.promo.isVipPromo && (
                <div className="steam-modal-tabs">
                  <button
                    type="button"
                    className={`steam-modal-tab ${steamPromoModal.vipTab === "vip" ? "active" : ""}`}
                    onClick={() => setSteamPromoModal(prev => ({ ...prev, vipTab: "vip" }))}
                  >
                    <span>⭐ PASO 1: Estreno VIP</span>
                    <span className="steam-modal-tab-counter">
                      {selectedVipId ? "1/1 Listo" : "0/1"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`steam-modal-tab ${steamPromoModal.vipTab === "bonus" ? "active" : ""}`}
                    onClick={() => setSteamPromoModal(prev => ({ ...prev, vipTab: "bonus" }))}
                  >
                    <span>🎁 PASO 2: 2 Regalos Catálogo</span>
                    <span className="steam-modal-tab-counter">
                      {selectedBonusIds.length}/2
                    </span>
                  </button>
                </div>
              )}

              <input
                type="text"
                className="steam-modal-search-input"
                value={steamPromoSearch}
                onChange={e => setSteamPromoSearch(e.target.value)}
                placeholder={
                  steamPromoModal.promo.isVipPromo
                    ? (steamPromoModal.vipTab === "vip" ? "🔍 Buscar estreno VIP (Wukong, FC 26, Dragon's Dogma 2...)" : "🔍 Buscar juego de regalo del catálogo...")
                    : "🔍 Buscar juegos en promoción..."
                }
              />

              {/* Banner explicativo de DLCs extras para que sea 100% obvio */}
              <div className="steam-modal-dlc-promo-hint">
                <span className="dlc-hint-icon">🎁</span>
                <span className="dlc-hint-text">
                  <strong>¿Quieres sumar DLCs?</strong> Haz clic en el botón <strong>«🎁 Sumar DLCs»</strong> de cada juego para elegir sus expansiones (1x $1.000 • 2x $1.800 • 3x $2.500 • Pack Completo: $3.500).
                </span>
              </div>
            </div>

            {/* Lista de juegos */}
            <div className="steam-modal-games-grid">
              {steamFilteredPromoProducts.map(p => {
                const isVipMode = steamPromoModal.promo.isVipPromo;
                const checked = isVipMode
                  ? (steamPromoModal.vipTab === "vip" ? selectedVipId === p.id : selectedBonusIds.includes(p.id))
                  : steamPromoModal.selectedIds.includes(p.id);

                const surcharge = !isVipMode ? getSteamGameSurcharge(p) : 0;
                const visibleSurcharge = role === "revendedor" ? Math.round(surcharge * 0.5) : surcharge;

                let extraCharge = 0;
                if (isVipMode) {
                  if (steamPromoModal.vipTab === "vip") {
                    const itemVipPrice = getVipPrice(p) || (p.priceCLP ? Number(p.priceCLP) : (isTopTierVip(p) ? 15000 : 8000));
                    const isEA = itemVipPrice >= 15000;
                    const isUbi = itemVipPrice >= 12000 && !isEA;
                    const rawExtra = isEA ? 5000 : isUbi ? 3000 : 0;
                    extraCharge = role === "revendedor" ? Math.round(rawExtra * 0.5) : rawExtra;
                  }
                } else {
                  extraCharge = visibleSurcharge;
                }

                const dlcCount = getGameDlcCount(p);
                const currentDlcs = steamPromoSelectedDlcs[p.id] || [];
                const hasSelectedDlcs = currentDlcs.length > 0;
                const rawGameDlcCost = hasSelectedDlcs ? getDlcBundlePrice(currentDlcs.length) : 0;
                const gameDlcCost = role === "revendedor" ? Math.round(rawGameDlcCost * 0.5) : rawGameDlcCost;

                const steamImg = p.imageUrl || p.image || (p.app_id ? `https://cdn.akamai.steamstatic.com/steam/apps/${p.app_id}/header.jpg` : null);

                return (
                  <div
                    key={p.id}
                    className={`steam-modal-game-card ${checked ? "checked" : ""}`}
                    onClick={() => {
                      setSteamPromoModal(prev => {
                        if (prev.promo.isVipPromo) {
                          if (prev.vipTab === "vip") {
                            const bonusOnly = prev.selectedIds.filter(x => x !== selectedVipId);
                            const nextIds = [p.id, ...bonusOnly];
                            const nextTab = selectedBonusIds.length < 2 ? "bonus" : "vip";
                            return { ...prev, selectedIds: nextIds, vipTab: nextTab };
                          } else {
                            if (prev.selectedIds.includes(p.id)) {
                              // Quitar juego y sus DLCs
                              setSteamPromoSelectedDlcs(dPrev => {
                                if (!dPrev[p.id]) return dPrev;
                                const n = { ...dPrev };
                                delete n[p.id];
                                return n;
                              });
                              return { ...prev, selectedIds: prev.selectedIds.filter(x => x !== p.id) };
                            }
                            if (selectedBonusIds.length >= 2) return prev;
                            return { ...prev, selectedIds: [...prev.selectedIds, p.id] };
                          }
                        }
                        const ids = prev.selectedIds;
                        if (ids.includes(p.id)) {
                          // Quitar juego y sus DLCs
                          setSteamPromoSelectedDlcs(dPrev => {
                            if (!dPrev[p.id]) return dPrev;
                            const n = { ...dPrev };
                            delete n[p.id];
                            return n;
                          });
                          return { ...prev, selectedIds: ids.filter(x => x !== p.id) };
                        }
                        if (ids.length >= prev.promo.count) return prev;
                        return { ...prev, selectedIds: [...ids, p.id] };
                      });
                    }}
                  >
                    {/* Imagen Banner Steam */}
                    <div className="steam-modal-game-img-wrap">
                      {steamImg ? (
                        <img
                          src={steamImg}
                          alt={p.name}
                          loading="lazy"
                          className="steam-modal-game-img"
                          onError={(e) => {
                            if (p.app_id && !e.target.src.includes("capsule")) {
                              e.target.src = `https://cdn.akamai.steamstatic.com/steam/apps/${p.app_id}/capsule_616x353.jpg`;
                            }
                          }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 28 }}>
                          🎮
                        </div>
                      )}

                      {/* Indicador de Seleccionado */}
                      {checked && (
                        <div className="steam-modal-game-check">
                          ✓
                        </div>
                      )}

                      {/* Botón interactivo de DLCs en la carátula */}
                      {dlcCount > 0 && (
                        <button
                          type="button"
                          className={`steam-modal-badge-has-dlc-btn ${hasSelectedDlcs ? "has-active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openDlcModalForGame(p);
                          }}
                          title="Haz clic para ver y sumar los DLCs oficiales a tu promo"
                        >
                          <span>🎁 {hasSelectedDlcs ? `${currentDlcs.length} DLCs listos` : `${dlcCount} DLCs`}</span>
                          <span className="dlc-badge-pill-action">{hasSelectedDlcs ? "✓" : "+"}</span>
                        </button>
                      )}
                    </div>

                    {/* Nombre del Juego */}
                    <div className="steam-modal-game-title" title={p.name}>
                      {p.name}
                    </div>

                    {/* Badge extra SOLO si tiene sobrecargo */}
                    {extraCharge > 0 && (
                      <div style={{ marginTop: 4, display: "flex", alignItems: "center" }}>
                        <span className="steam-modal-game-badge">
                          +{formatearPrecio(extraCharge)}
                        </span>
                      </div>
                    )}

                    {/* Botón prominente e interactivo de DLCs */}
                    {dlcCount > 0 && (
                      <button
                        type="button"
                        className={`steam-modal-card-dlc-btn ${checked ? "is-checked" : ""} ${hasSelectedDlcs ? "has-active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openDlcModalForGame(p);
                        }}
                        title="Haz clic para ver y sumar expansiones DLC"
                      >
                        {hasSelectedDlcs ? (
                          <>
                            <span className="dlc-btn-main">
                              <span style={{ color: "#00f5d4" }}>✓</span> {currentDlcs.length} DLC{currentDlcs.length > 1 ? "s" : ""} (+{formatearPrecio(gameDlcCost)})
                            </span>
                            <span className="dlc-btn-action edit">EDITAR ✏️</span>
                          </>
                        ) : (
                          <>
                            <span className="dlc-btn-main">
                              <span>🎁</span> Sumar DLCs ({dlcCount})
                            </span>
                            <span className="dlc-btn-action add">+ ELEGIR</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
              {steamFilteredPromoProducts.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "30px 10px", color: "#a89ec4" }}>
                  <span style={{ fontSize: 26, display: "block", marginBottom: 6 }}>🔍</span>
                  No encontramos coincidencias para "{steamPromoDebouncedSearch}". Si quieres algún juego que no aparezca, ¡avísanos por WhatsApp y te lo agregamos!
                </div>
              )}
            </div>

            {/* Barra de soporte WhatsApp */}
            <div className="steam-modal-support-bar">
              <span className="steam-modal-support-text">¿No encuentras el juego que buscas? Escríbenos:</span>
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href="https://wa.me/56974751810?text=Hola!%20Busco%20un%20juego%20de%20Steam%20que%20no%20encuentro%20en%20la%20promo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="steam-modal-support-pill"
                  style={{ background: 'linear-gradient(135deg, #128C7E, #25D366)', boxShadow: '0 2px 8px rgba(37,211,102,0.3)' }}
                >
                  <img src={wspLogo} alt="WhatsApp" style={{ width: 14, height: 14, objectFit: 'contain' }} /> WhatsApp
                </a>
              </div>
            </div>

              {/* Footer con botón de confirmación */}
            <div className="steam-modal-footer">
              <button
                type="button"
                onClick={confirmSteamPromoSelection}
                disabled={steamPromoModal.promo.isVipPromo ? (!selectedVipId || selectedBonusIds.length !== 2) : (steamPromoModal.selectedIds.length !== steamPromoModal.promo.count)}
                className={`steam-modal-confirm-btn ${
                  (steamPromoModal.promo.isVipPromo ? (selectedVipId && selectedBonusIds.length === 2) : (steamPromoModal.selectedIds.length === steamPromoModal.promo.count)) ? "active" : "disabled"
                }`}
              >
                <span>🛒</span>
                {steamPromoModal.promo.isVipPromo ? (
                  !selectedVipId
                    ? "⚠️ Paso 1: Elige 1 Estreno Exclusivo VIP"
                    : selectedBonusIds.length < 2
                      ? `🎁 Paso 2: Elige ${2 - selectedBonusIds.length} Juego(s) de Regalo más`
                      : `Agregar Pack VIP al carrito · ${formatearPrecio(steamDynamicPrice)}${totalSelectedDlcsCount > 0 ? ` (+${totalSelectedDlcsCount} DLCs)` : ''}`
                ) : (
                  steamPromoModal.selectedIds.length === steamPromoModal.promo.count
                    ? `Agregar Promo al carrito · ${formatearPrecio(steamDynamicPrice)}${totalSelectedDlcsCount > 0 ? ` (+${totalSelectedDlcsCount} DLCs)` : ''}`
                    : `Selecciona ${steamPromoModal.promo.count - steamPromoModal.selectedIds.length} más`
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal para selección de DLCs de un juego de la promo */}
      {activeDlcModalGame && (
        <PromoDlcModal
          isOpen={Boolean(activeDlcModalGame)}
          onClose={() => setActiveDlcModalGame(null)}
          game={activeDlcModalGame}
          initialSelectedDlcs={steamPromoSelectedDlcs[activeDlcModalGame.id] || []}
          onSaveDlcs={(dlcs) => {
            setSteamPromoSelectedDlcs(prev => ({
              ...prev,
              [activeDlcModalGame.id]: dlcs
            }));
          }}
          formatearPrecio={formatearPrecio}
          isReseller={role === "revendedor"}
          ryuuCatalog={rawRyuuCatalog}
        />
      )}

      {/* Modal de Vista Previa de Sagas (Qué juegos incluye, Extras VIP y compra directa) */}
      {sagaPreviewModal.open && sagaPreviewModal.saga && (() => {
        const saga = sagaPreviewModal.saga;
        const selectedVipExtras = sagaPreviewModal.selectedVipExtras || [];
        const extraPrice = selectedVipExtras.reduce((acc, curr) => acc + (curr.priceCLP || 8000), 0);
        const publicPrice = (saga.priceCLP || 0) + extraPrice;
        const totalPrice = role === "revendedor" ? Math.round(publicPrice * 0.5) : publicPrice;

        const toggleVipExtra = (vipItem) => {
          const exists = selectedVipExtras.some(v => v.id === vipItem.id);
          let updated = [];
          if (exists) {
            updated = selectedVipExtras.filter(v => v.id !== vipItem.id);
          } else {
            updated = [...selectedVipExtras, vipItem];
          }
          setSagaPreviewModal(prev => ({ ...prev, selectedVipExtras: updated }));
        };

        return ReactDOM.createPortal(
          <div
            className="steam-saga-modal-backdrop"
            onClick={e => { if (e.target === e.currentTarget) setSagaPreviewModal({ open: false, saga: null, selectedVipExtras: [] }); }}
          >
            <div className="steam-saga-modal-container">
              {/* Header con título y botón de cierre */}
              <div className="steam-saga-modal-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: "1.2rem" }}>🏆</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="steam-saga-modal-title">{saga.name}</div>
                    <div className="steam-saga-modal-subtitle">Colección completa · {saga.games.length} Juegos base incluidos</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span className="steam-saga-modal-price">{formatearPrecio(totalPrice)}</span>
                  <button
                    type="button"
                    className="steam-saga-modal-close"
                    onClick={() => setSagaPreviewModal({ open: false, saga: null, selectedVipExtras: [] })}
                    aria-label="Cerrar"
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Banner de la Saga */}
              <div className="steam-saga-modal-banner-wrap">
                <img src={saga.image} alt={saga.name} className="steam-saga-modal-banner-img" onError={(e) => { e.target.src = '/banner22.jpg'; }} />
                <div className="steam-saga-modal-banner-overlay">
                  <span className="steam-saga-modal-banner-badge">
                    🎮 Modo Historia Completo · Entrega Inmediata
                  </span>
                </div>
              </div>

              {/* Aviso modo historia */}
              <div className="steam-saga-modal-alert">
                <span>✅</span>
                <span>Todos los juegos de esta colección se juegan en <strong>Modo Historia Completo</strong> con acceso directo e inmediato.</span>
              </div>

              {/* Lista de Juegos Incluidos */}
              <div className="steam-saga-modal-games-list">
                <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  Juegos base incluidos ({saga.games.length}):
                </div>
                {saga.games.map((gameName, idx) => (
                  <div key={idx} className="steam-saga-game-row">
                    <div className="steam-saga-game-check">✓</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="steam-saga-game-name">{gameName}</div>
                      <div className="steam-saga-game-sub">Juego completo · PandaStore Launcher</div>
                    </div>
                    <span className="steam-saga-game-tag">Incluido</span>
                  </div>
                ))}
              </div>

              {/* Extras VIP Opcionales */}
              {saga.vipExtras && saga.vipExtras.length > 0 && (
                <div className="steam-saga-vip-extras-wrap" style={{
                  margin: '12px 0',
                  padding: '12px 14px',
                  background: 'linear-gradient(135deg, rgba(255, 183, 3, 0.08), rgba(123, 47, 242, 0.12))',
                  border: '1.2px solid rgba(255, 183, 3, 0.4)',
                  borderRadius: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#ffb703', fontWeight: 900, fontSize: '0.82rem', letterSpacing: '0.03em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                      ⭐ Extras VIP Opcionales (+ {formatearPrecio(role === "revendedor" ? 4000 : 8000)} c/u)
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#e0baff', fontWeight: 700 }}>
                      {selectedVipExtras.length} seleccionado(s)
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {saga.vipExtras.map((vip) => {
                      const isSelected = selectedVipExtras.some(v => v.id === vip.id);
                      return (
                        <div
                          key={vip.id}
                          onClick={() => toggleVipExtra(vip)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'space-between',
                            padding: '8px 12px',
                            background: isSelected ? 'linear-gradient(135deg, rgba(255, 183, 3, 0.25), rgba(162, 89, 255, 0.3))' : 'rgba(0,0,0,0.3)',
                            border: isSelected ? '1.5px solid #ffb703' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: 4,
                              background: isSelected ? '#ffb703' : 'rgba(255,255,255,0.1)',
                              color: isSelected ? '#000' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 900,
                            }}>
                              ✓
                            </div>
                            <div>
                              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.84rem' }}>{vip.name}</div>
                              <div style={{ color: '#ffb703', fontSize: '0.72rem', fontWeight: 700 }}>Estreno VIP Exclusivo</div>
                            </div>
                          </div>
                          <span style={{ color: isSelected ? '#00f5d4' : '#e0baff', fontWeight: 900, fontSize: '0.82rem' }}>
                            + {formatearPrecio(role === "revendedor" ? Math.round((vip.priceCLP || 8000) * 0.5) : (vip.priceCLP || 8000))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="steam-saga-modal-footer">
                <button
                  type="button"
                  className="steam-saga-btn-primary"
                  onClick={() => addSagaToCart(saga, selectedVipExtras, true)}
                >
                  <span>🛒</span>
                  <span>Comprar Colección Ahora · {formatearPrecio(totalPrice)}</span>
                </button>
                <button
                  type="button"
                  className="steam-saga-btn-secondary"
                  onClick={() => addSagaToCart(saga, selectedVipExtras, false)}
                >
                  + Agregar al carrito y seguir viendo
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
