import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Helmet } from 'react-helmet-async';
import { useMoneda } from "../../context/MonedaContext";
import { db, auth } from "../../firebase";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { getMinPriceByMoneda } from "../../components/Header";
import { useLocation, useNavigate } from "react-router-dom";
import letreroPromos from "../../assets/letreros/promociones.png";
import SpecularButton from "../../components/SpecularButton/SpecularButton";
import Loader from "../../components/Loader";
import { VIP_HIGHLIGHT_GAMES, isVipGame, isTopTierVip, isSteamProduct, getSteamGameSurcharge, getVipPrice, isRetiredSteamTitle } from "../../utils/vipGames";
import { isOnlineOnlySteamProduct } from "../../utils/steamCatalogCache";
import { calculateSwitchStockMap, getGameStockCount } from "../../utils/switchStockHelper";
import { hasResellerBenefits } from "../../utils/userRoles";
import steamImportData from "../../assets/steam_import_data.json";
import steamPromo3x from "../../assets/promos/steam_3x_4990.png";
import steamPromo10x from "../../assets/promos/steam_10x_9990.png";
import steamPromo23x from "../../assets/promos/steam_23x_17990.png";
import { fetchRyuuCatalog, getDlcBundlePrice } from "../../utils/ryuuDlcHelper";
import PromoDlcModal from "../../components/PromoDlcModal/PromoDlcModal";
import "../../components/PromoDlcModal/PromoDlcModal.css";

function formatPrecio(precio, moneda) {
  if (!precio || isNaN(precio)) return "";
  if (moneda === "USD") {
    return `$${Number(precio).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${Number(precio).toLocaleString("es-CL")}`;
}

/* Steam promo surcharge per DESTACADO game */
const STEAM_BASE_PRICE = 4990;
const STEAM_GREEN_SURCHARGE = 3500;

const steamCatalogKey = (product) => {
  const appId = String(product?.app_id || product?.appId || product?.steamAppId || "").trim();
  if (appId) return `app:${appId}`;
  return `name:${String(product?.name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")}`;
};

const makeSteamPromoProduct = (product) => {
  const appId = String(product?.app_id || product?.appId || product?.steamAppId || "").trim();
  const imageUrl = product?.imageUrl || product?.image || (appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg` : null);
  return {
    ...product,
    id: product?.id || `promo-steam-${appId || steamCatalogKey(product)}`,
    app_id: appId || product?.app_id,
    plataforma: "Steam",
    categoryId: product?.categoryId || "steam",
    categoryName: product?.categoryName || "Steam",
    imageUrl,
    image: imageUrl,
    priceCLP: Number(product?.priceCLP || 2000),
    available: product?.available !== false,
  };
};



const PROMOS = [
  /* Packs Steam Armables a Elección */
  {
    key: "promo-estreno-vip",
    name: "Pack Juegos VIP (1 Estreno + 2 Regalos)",
    priceCLP: 8000,
    image: "/promos/promo_denuvo_vip.jpg",
    selectCount: 3,
    restricted: true,
    isSteam: true,
    isVipPromo: true
  },
  {
    key: "promo-steam-3x",
    name: "Pack 3X Steam (3 Juegos a Elección)",
    priceCLP: 4990,
    image: steamPromo3x,
    selectCount: 3,
    restricted: true,
    isSteam: true
  },
  {
    key: "promo-steam-10x",
    name: "Pack 10X Steam (10 Juegos a Elección)",
    priceCLP: 9990,
    image: steamPromo10x,
    selectCount: 10,
    restricted: true,
    isSteam: true
  },
  {
    key: "promo-steam-23x",
    name: "Pack 23X Steam (23 Juegos a Elección)",
    priceCLP: 17990,
    image: steamPromo23x,
    selectCount: 23,
    restricted: true,
    isSteam: true
  },

  /* Steam Pass All-Access Mensual */
  {
    key: "promo-steam-panda-pass",
    name: "Panda Pass Steam · Acceso Total (+1.500 Juegos)",
    priceCLP: 25000,
    image: require("../../assets/promos/pack_steam_launcher_220.jpg"),
    selectCount: 1,
    isSteamPass: true,
    isSteam: true,
    restricted: false
  },

  /* Packs Masivos Launcher */
  { key: "promo-steam-100x", name: "Pack 100 Juegos Steam (Aleatorio)", priceCLP: 15000, image: require("../../assets/promos/steam_100x_15000.jpg"), selectCount: 100, restricted: false, isRandomPack: true, isSteam: true },
  { key: "promo-steam-200x", name: "Pack 200 Juegos Steam (Aleatorio)", priceCLP: 25000, image: require("../../assets/promos/steam_200x_25000.jpg"), selectCount: 200, restricted: false, isRandomPack: true, isSteam: true },
  { key: "promo-steam-300x", name: "Pack 300 Juegos Steam (Aleatorio)", priceCLP: 35000, image: require("../../assets/promos/steam_300x_35000.jpg"), selectCount: 300, restricted: false, isRandomPack: true, isSteam: true },
  { key: "promo-steam-400x", name: "Pack 400+ Juegos Steam (Aleatorio)", priceCLP: 40000, image: "/pack_400_steam.jpg", selectCount: 400, restricted: false, isRandomPack: true, isSteam: true },

  /* Nintendo promos */
  { key: "promo-basica-2x",  name: "Pack 2X Básico",    priceCLP: 25000, image: require("../../assets/promos/2 x 25.000 basica.png"),      selectCount: 2, restricted: true, maxPriceCLP: 15000 },
  { key: "promo-basica-3x",  name: "Pack 3X Básico",    priceCLP: 35000, image: require("../../assets/promos/3x1 $35.000 basica.png"),      selectCount: 3, restricted: true, maxPriceCLP: 17000 },
  { key: "promo-deluxe-2x",  name: "Pack 2X Deluxe",    priceCLP: 30000, image: require("../../assets/promos/deluxe 2 x 30.000.png"),       selectCount: 2, restricted: true, maxPriceCLP: 20000 },
  { key: "promo-deluxe-3x",  name: "Pack 3X Deluxe",    priceCLP: 40000, image: require("../../assets/promos/deluxe 3 x40.000.png"),        selectCount: 3, restricted: true, maxPriceCLP: 20000 },
  { key: "promo-4x",         name: "Pack 4X Mega",       priceCLP: 55000, image: require("../../assets/promos/4x55.png"),                    selectCount: 4, restricted: true },
  { key: "promo-kart",       name: "Kart + Pase",        priceCLP: 22000, image: require("../../assets/promos/kart + pase.png"),             selectCount: 1 },
  { key: "promo-violet",     name: "Violet + DLC",       priceCLP: 24000, image: require("../../assets/promos/violet + dlc.png"),            selectCount: 1 },
  { key: "promo-scarlet",    name: "Scarlet + DLC",      priceCLP: 24000, image: require("../../assets/promos/scarlet + dlc.png"),           selectCount: 1 },
  { key: "promo-animal",     name: "Animal + DLC",       priceCLP: 20000, image: require("../../assets/promos/animal +dlc.png"),             selectCount: 1 },
  { key: "promo-cuphead",    name: "Cuphead + DLC",      priceCLP: 12000, image: require("../../assets/promos/cuphead + dlc.png"),           selectCount: 1 },
  { key: "promo-wild",       name: "Zelda Wild + Pass",  priceCLP: 24000, image: require("../../assets/promos/wild + dlc.png"),              selectCount: 1 },
  { key: "promo-sword",      name: "Pokémon Espada + DLC", priceCLP: 23000, image: require("../../assets/promos/pokemon espada + dlc.png"), selectCount: 1 },
  { key: "promo-shield",     name: "Pokémon Escudo + DLC", priceCLP: 23000, image: require("../../assets/promos/pokemon escudo +dlc.png"),  selectCount: 1 },
  { key: "promo-splatoon",   name: "Splatoon 3 + DLC",   priceCLP: 24000, image: require("../../assets/promos/splatoon 3 + dlc.png"),       selectCount: 1 },
];

const WA_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ textAlign: "center", margin: "44px 0 28px" }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        background: "rgba(123,47,242,0.18)",
        border: "1.5px solid rgba(162,89,255,0.4)",
        borderRadius: 999, padding: "7px 22px 7px 16px",
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ color: "#e0baff", fontWeight: 800, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>{title}</span>
      </div>
      <p style={{ color: "#a78bfa", fontSize: 14, margin: 0, fontWeight: 500 }}>{subtitle}</p>
    </div>
  );
}

function PromoCard({ promo, onSelect, highlighted, formatearPrecio, cardRef, role }) {
  const isCustom = promo.restricted && promo.selectCount > 1;
  const [hovered, setHovered] = useState(false);
  const isReseller = role === "revendedor";
  const isSteamOrVip = promo.isSteam || promo.isVipPromo || promo.isRandomPack || promo.isSteamPass || promo.key.includes("steam") || promo.key.includes("vip");
  const finalPrice = (isReseller && isSteamOrVip) ? Math.round(promo.priceCLP * 0.5) : promo.priceCLP;

  const cardBorder = highlighted
    ? "2px solid #22c55e"
    : promo.isVipPromo
    ? hovered ? "1.5px solid #f59e0b" : "1.5px solid rgba(245,158,11,0.55)"
    : promo.isSteam
    ? hovered ? "1.5px solid #00f5d4" : "1.5px solid rgba(0,245,212,0.35)"
    : (isReseller && isSteamOrVip)
    ? "1.5px solid rgba(16,185,129,0.6)"
    : hovered
    ? "1.5px solid rgba(162,89,255,0.7)"
    : "1.5px solid rgba(162,89,255,0.25)";

  const cardShadow = highlighted
    ? "0 0 0 4px #22c55e22, 0 16px 48px rgba(0,0,0,0.5)"
    : promo.isVipPromo
    ? (hovered ? "0 16px 48px rgba(245,158,11,0.3), 0 4px 16px rgba(0,0,0,0.4)" : "0 8px 32px rgba(245,158,11,0.15)")
    : promo.isSteam
    ? (hovered ? "0 16px 48px rgba(0,245,212,0.25), 0 4px 16px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,245,212,0.12)")
    : (isReseller && isSteamOrVip)
    ? "0 8px 32px rgba(16,185,129,0.2)"
    : hovered
    ? "0 16px 48px rgba(123,47,242,0.25), 0 4px 16px rgba(0,0,0,0.4)"
    : "0 8px 32px rgba(0,0,0,0.3)";

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: promo.isVipPromo
          ? "linear-gradient(160deg, rgba(42,22,65,0.95) 0%, rgba(16,8,30,0.98) 100%)"
          : promo.isSteam
          ? "linear-gradient(160deg, rgba(18,24,60,0.95) 0%, rgba(10,12,32,0.98) 100%)"
          : "linear-gradient(160deg, rgba(35,28,80,0.95) 0%, rgba(15,10,40,0.98) 100%)",
        border: cardBorder,
        borderRadius: 20,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: cardShadow,
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "all 0.22s cubic-bezier(.4,0,.2,1)",
        cursor: "default",
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", width: "100%", height: 190, background: "rgba(0,0,0,0.25)", flexShrink: 0 }}>
        <img
          src={promo.image}
          alt={promo.name}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: "8px 0" }}
        />
        {/* Count badge */}
        {isCustom && (
          <div style={{
            position: "absolute", top: 10, left: 10,
            background: promo.isVipPromo
              ? "linear-gradient(135deg,#f59e0b,#d97706)"
              : promo.isSteam
              ? "linear-gradient(135deg,#00f5d4,#05b39b)"
              : "linear-gradient(135deg,#7b2ff2,#a855f7)",
            color: promo.isSteam && !promo.isVipPromo ? "#041c18" : "#fff",
            borderRadius: 999,
            padding: "4px 12px", fontSize: 11, fontWeight: 900,
            boxShadow: promo.isVipPromo
              ? "0 2px 10px rgba(245,158,11,0.55)"
              : promo.isSteam
              ? "0 2px 10px rgba(0,245,212,0.4)"
              : "0 2px 10px rgba(123,47,242,0.55)",
            letterSpacing: 0.5, textTransform: "uppercase",
          }}>
            {promo.isVipPromo ? "⭐ 1 VIP + 2 REGALOS" : `${promo.selectCount} juegos`}
          </div>
        )}
        {/* Reseller Badge */}
        {isReseller && isSteamOrVip && (
          <div style={{
            position: "absolute", top: 10, right: 10,
            background: "linear-gradient(135deg,#10b981,#059669)",
            color: "#fff", borderRadius: 999,
            padding: "4px 10px", fontSize: 10, fontWeight: 900,
            boxShadow: "0 2px 10px rgba(16,185,129,0.55)",
            letterSpacing: 0.5, textTransform: "uppercase",
          }}>
            💎 Revendedor -50%
          </div>
        )}
        {/* Bottom gradient overlay with price */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(to top, rgba(10,6,30,0.95) 0%, rgba(10,6,30,0.6) 60%, transparent 100%)",
          padding: "28px 14px 12px",
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        }}>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 14, lineHeight: 1.25, maxWidth: "60%", textShadow: "0 1px 6px #000a" }}>
            {promo.name}
          </div>
          <div style={{
            background: (isReseller && isSteamOrVip)
              ? "linear-gradient(135deg,#059669,#10b981)"
              : promo.isVipPromo
              ? "linear-gradient(135deg,#f59e0b,#b45309)"
              : promo.isSteam
              ? "linear-gradient(135deg,#00f5d4,#05b39b)"
              : "linear-gradient(135deg,#7b2ff2,#5b21b6)",
            color: promo.isSteam && !promo.isVipPromo && !(isReseller && isSteamOrVip) ? "#041c18" : "#fff",
            borderRadius: 10, padding: "5px 11px",
            fontWeight: 900, fontSize: 15,
            boxShadow: promo.isVipPromo
              ? "0 3px 12px rgba(245,158,11,0.4)"
              : promo.isSteam
              ? "0 3px 12px rgba(0,245,212,0.4)"
              : "0 3px 12px rgba(123,47,242,0.5)",
            whiteSpace: "nowrap", flexShrink: 0,
            display: "flex", flexDirection: "column", alignItems: "flex-end"
          }}>
            {isReseller && isSteamOrVip && (
              <span style={{ fontSize: "0.68rem", textDecoration: "line-through", opacity: 0.75, fontWeight: 700 }}>
                {formatearPrecio(promo.priceCLP)}
              </span>
            )}
            <span>{formatearPrecio(finalPrice)}</span>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "12px 14px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {promo.isVipPromo ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "rgba(245,158,11,0.14)",
            border: "1px solid rgba(245,158,11,0.35)",
            borderRadius: 9, padding: "7px 10px",
            color: "#fde68a", fontSize: 12.5, fontWeight: 600, lineHeight: 1.4,
          }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>⭐</span>
            <span>Elige <strong style={{ color: "#fbbf24" }}>1 Estreno VIP</strong> + <strong style={{ color: "#fbbf24" }}>2 Juegos Regalo</strong></span>
          </div>
        ) : promo.isSteam && isCustom ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "rgba(0,245,212,0.12)",
            border: "1px solid rgba(0,245,212,0.3)",
            borderRadius: 9, padding: "7px 10px",
            color: "#00f5d4", fontSize: 12.5, fontWeight: 600, lineHeight: 1.4,
          }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>🎮</span>
            <span>Elige <strong style={{ color: "#fff" }}>{promo.selectCount} juegos Steam</strong> a libre elección</span>
          </div>
        ) : promo.maxPriceCLP ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "rgba(123,47,242,0.12)",
            border: "1px solid rgba(162,89,255,0.22)",
            borderRadius: 9, padding: "7px 10px",
            color: "#c4b5fd", fontSize: 12.5, fontWeight: 600, lineHeight: 1.4,
          }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>📋</span>
            <span>Elige <strong style={{ color: "#e0baff" }}>{promo.selectCount} juegos</strong> con precio máx. <strong style={{ color: "#e0baff" }}>{formatearPrecio(promo.maxPriceCLP)}</strong></span>
          </div>
        ) : promo.isRandomPack ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "rgba(0,245,212,0.12)",
            border: "1px solid rgba(0,245,212,0.3)",
            borderRadius: 9, padding: "7px 10px",
            color: "#00f5d4", fontSize: 12, fontWeight: 600, lineHeight: 1.4,
          }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>🎲</span>
            <span>Acceso aleatorio a <strong>{promo.selectCount} juegos</strong> con PandaStore Launcher</span>
          </div>
        ) : (
          <div style={{ flex: 1 }} />
        )}
        <div style={{ marginTop: "auto" }}>
          <SpecularButton
            size="md"
            radius={18}
            tint={promo.isVipPromo ? "#f59e0b" : promo.isSteam ? "#00f5d4" : isCustom ? "#a259ff" : "#00f5d4"}
            tintOpacity={0.25}
            lineColor={promo.isVipPromo ? "#f59e0b" : promo.isSteam ? "#00f5d4" : isCustom ? "#a259ff" : "#00f5d4"}
            baseColor={promo.isVipPromo ? "#3b2306" : promo.isSteam ? "#0c3b34" : isCustom ? "#2d1654" : "#0c3b34"}
            intensity={1.4}
            autoAnimate
            onClick={() => onSelect(promo)}
            style={{ width: "100%" }}
          >
            {isCustom ? (
              <>
                <span className="material-icons" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 6 }}>sports_esports</span>
                Armar mi pack
              </>
            ) : (
              <>
                <span className="material-icons" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 6 }}>add_shopping_cart</span>
                Agregar al carrito
              </>
            )}
          </SpecularButton>
        </div>
      </div>
    </div>
  );
}

export default function PromosList() {
  const { moneda, formatearPrecio } = useMoneda();
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activePromo, setActivePromo] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [deferredSteamSearch, setDeferredSteamSearch] = useState("");
  const [vipTab, setVipTab] = useState("vip"); // "vip" | "bonus"
  const [categories, setCategories] = useState([]);
  const [modalTopOffset, setModalTopOffset] = useState(96);
  const [highlightPromoKey, setHighlightPromoKey] = useState(null);
  const [confirmPromo, setConfirmPromo] = useState(null);
  const [switchStockMap, setSwitchStockMap] = useState(new Map());
  const [user, setUser] = useState(auth.currentUser);
  const [role, setRole] = useState(null);
  const [promoSelectedDlcs, setPromoSelectedDlcs] = useState({});
  const [activeDlcModalGame, setActiveDlcModalGame] = useState(null);
  const [rawRyuuCatalog, setRawRyuuCatalog] = useState([]);
  const [dlcMap, setDlcMap] = useState(new Map());

  // Evita recalcular y volver a pintar el selector mientras el usuario escribe.
  // La lista visible se actualiza tras una pausa breve, no en cada pulsación.
  useEffect(() => {
    const timer = setTimeout(() => setDeferredSteamSearch(search), 140);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const profile = userDoc.data();
            setRole(hasResellerBenefits(profile) ? "revendedor" : (profile.role || "user"));
          }
        } catch (e) {
          console.error("Error obteniendo rol en PromosList:", e);
        }
      } else {
        setRole(null);
      }
    });
    return () => unsub();
  }, []);

  const promoRefs = useRef({});

  const searchParams = useMemo(() => new URLSearchParams(location.search || ""), [location.search]);
  const initialPlat = searchParams.get("plataforma") || searchParams.get("platform") || searchParams.get("cat") || "todas";
  const [selectedPlataforma, setSelectedPlataforma] = useState(initialPlat);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const plat = params.get("plataforma") || params.get("platform") || params.get("cat");
    if (plat) {
      setSelectedPlataforma(plat.toLowerCase());
    }
    const promoKey = params.get("promo");
    if (promoKey) {
      const targetPromo = PROMOS.find(p => p.key === promoKey);
      if (targetPromo) {
        if (targetPromo.isSteam || targetPromo.isVipPromo) {
          setSelectedPlataforma(prev => prev === "nintendo" ? "todas" : prev);
        } else {
          setSelectedPlataforma(prev => prev === "steam" ? "todas" : prev);
        }
      }
    }
  }, [location.search]);

  const customPacks = PROMOS.filter(p => p.restricted && p.selectCount > 1);
  const fixedPacks  = PROMOS.filter(p => !p.restricted || p.selectCount <= 1);

  const filteredCustomPacks = useMemo(() => {
    return customPacks.filter(p => {
      if (selectedPlataforma === "steam") return p.isSteam || p.isVipPromo;
      if (selectedPlataforma === "nintendo") return !p.isSteam && !p.isVipPromo;
      return true;
    });
  }, [customPacks, selectedPlataforma]);

  const filteredFixedPacks = useMemo(() => {
    return fixedPacks.filter(p => {
      if (selectedPlataforma === "steam") return p.isSteam;
      if (selectedPlataforma === "nintendo") return !p.isSteam;
      return true;
    });
  }, [fixedPacks, selectedPlataforma]);

  // Eliminado useEffect SEO manual, usamos Helmet

  const closeModal = () => {
    setModalOpen(false);
    setActivePromo(null);
    setSelectedIds([]);
    setSearch("");
    setDeferredSteamSearch("");
    setVipTab("vip");
    setPromoSelectedDlcs({});
    setActiveDlcModalGame(null);
  };

  useEffect(() => {
    let isMounted = true;
    const failsafeTimer = setTimeout(() => {
      if (isMounted) setLoadingProducts(false);
    }, 2500);

    getDocs(collection(db, "products"))
      .then(snap => {
        if (!isMounted) return;
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoadingProducts(false);
      })
      .catch(err => {
        console.error("Error al cargar productos en Promos:", err);
        if (isMounted) setLoadingProducts(false);
      });

    getDocs(collection(db, "categories"))
      .then(snap => {
        if (!isMounted) return;
        setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      })
      .catch(err => console.error("Error al cargar categorias en Promos:", err));

    calculateSwitchStockMap()
      .then(res => {
        if (!isMounted) return;
        if (res && res.stockMap) {
          setSwitchStockMap(res.stockMap);
        }
      })
      .catch(err => console.error("Error al cargar stock de Nintendo Switch:", err));

    fetchRyuuCatalog()
      .then(data => {
        if (!isMounted || !Array.isArray(data)) return;
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
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      clearTimeout(failsafeTimer);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const promoKey = params.get("promo");
    if (!promoKey) return;
    const el = promoRefs.current?.[promoKey];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightPromoKey(promoKey);
    const t = setTimeout(() => setHighlightPromoKey(null), 1600);
    return () => clearTimeout(t);
  }, [location.search, loading]);

  useEffect(() => {
    if (!modalOpen) return;
    const computeOffset = () => {
      const headerEl = document.querySelector(".banner-header");
      const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;
      const base = headerHeight ? Math.ceil(headerHeight + 16) : 96;
      setModalTopOffset(Math.min(base, Math.max(96, Math.floor(window.innerHeight * 0.65))));
    };
    computeOffset();
    window.addEventListener("resize", computeOffset);
    return () => window.removeEventListener("resize", computeOffset);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = e => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  const nintendoCategoryId = useMemo(() => {
    const match = categories.find(c => { const n = (c.name || "").toLowerCase(); return n.includes("nintendo") && n.includes("switch"); });
    return match ? match.id : null;
  }, [categories]);

  const steamCategoryId = useMemo(() => {
    const match = categories.find(c => { const n = (c.name || "").toLowerCase(); return n.includes("steam"); });
    return match ? match.id : null;
  }, [categories]);

  // Los packs deben ofrecer el mismo catálogo Steam que la tienda, incluso si
  // la colección de productos aún tiene pocos registros importados.
  const steamPromoCatalog = useMemo(() => {
    const catalog = [];
    const keys = new Set();
    const add = (product) => {
      if (!product || (!isSteamProduct(product, steamCategoryId) && !product.app_id)) return;
      if (isOnlineOnlySteamProduct(product) || isRetiredSteamTitle(product)) return;
      const normalized = makeSteamPromoProduct(product);
      const key = steamCatalogKey(normalized);
      if (!key || keys.has(key)) return;
      keys.add(key);
      catalog.push(normalized);
    };

    // Los productos administrados conservan prioridad: pueden incluir
    // atributos especiales de precio o de entrega para el cálculo del pack.
    products.filter(p => !String(p.id || '').startsWith('ryuu_')).forEach(add);
    (Array.isArray(steamImportData) ? steamImportData : []).forEach(add);
    return catalog;
  }, [products, steamCategoryId]);

  // VIP game selection helpers
  const selectedVipId = useMemo(() => {
    if (!activePromo?.isVipPromo) return null;
    return selectedIds.find(id => {
      const g = VIP_HIGHLIGHT_GAMES.find(x => x.id === id) || steamPromoCatalog.find(x => x.id === id);
      return isVipGame(g);
    }) || null;
  }, [activePromo, selectedIds, steamPromoCatalog]);

  const selectedBonusIds = useMemo(() => {
    if (!activePromo?.isVipPromo) return [];
    return selectedIds.filter(id => id !== selectedVipId);
  }, [activePromo, selectedIds, selectedVipId]);

  const vipList = useMemo(() => {
    if (!activePromo?.isVipPromo) return [];
    const existingNames = new Set(VIP_HIGHLIGHT_GAMES.map(g => (g.name || "").toLowerCase().trim()));
    const extraVip = steamPromoCatalog.filter(p => isVipGame(p) && !existingNames.has((p.name || "").toLowerCase().trim()));
    const combined = [...VIP_HIGHLIGHT_GAMES, ...extraVip].filter(p => !isRetiredSteamTitle(p));
    const texto = deferredSteamSearch.trim().toLowerCase();
    if (!texto) return combined.slice(0, 80);
    return combined.filter(p => (p.name && p.name.toLowerCase().includes(texto)) || (p.app_id && String(p.app_id).includes(texto))).slice(0, 100);
  }, [activePromo, steamPromoCatalog, deferredSteamSearch]);

  const bonusList = useMemo(() => {
    if (!activePromo?.isVipPromo) return [];
    const texto = deferredSteamSearch.trim().toLowerCase();
    const cleanGames = steamPromoCatalog.filter(p => !isVipGame(p));
    if (!texto) return cleanGames.slice(0, 80);
    return cleanGames.filter(p => (p.name && p.name.toLowerCase().includes(texto)) || (p.app_id && String(p.app_id).includes(texto))).slice(0, 100);
  }, [activePromo, steamPromoCatalog, deferredSteamSearch]);

  const eligibleProducts = useMemo(() => {
    if (!activePromo || !activePromo.restricted) return [];
    
    if (activePromo.isSteam) {
      if (activePromo.isVipPromo) {
        return vipTab === "vip" ? vipList : bonusList;
      }
      // ALL Steam games can enter the promo (normal + DESTACADO), excluding online-only
      const filtered = steamPromoCatalog;
      const texto = deferredSteamSearch.trim().toLowerCase();
      if (!texto) return filtered.slice(0, 80);
      return filtered.filter(p => (p.name && p.name.toLowerCase().includes(texto)) || (p.app_id && String(p.app_id).includes(texto))).slice(0, 100);
    }

    if (!nintendoCategoryId) return [];
    const maxCLP = activePromo.maxPriceCLP ?? Infinity;
    const filtered = products.filter(p => {
      if (p.categoryId !== nintendoCategoryId) return false;
      const minCLP = getMinPriceByMoneda(p, "CLP");
      return minCLP && minCLP <= maxCLP;
    });
    const texto = search.trim().toLowerCase();
    return !texto ? filtered : filtered.filter(p => (p.name || "").toLowerCase().includes(texto));
  }, [products, activePromo, search, deferredSteamSearch, nintendoCategoryId, steamPromoCatalog, vipTab, vipList, bonusList]);

  const getGameDlcCount = (prod) => {
    if (!prod) return 0;
    if (Array.isArray(prod.dlcs) && prod.dlcs.length > 0) return prod.dlcs.length;
    if (prod.dlcCount && typeof prod.dlcCount === 'number') return prod.dlcCount;
    const appId = String(prod.app_id || prod.appId || (String(prod.id || '').startsWith('ryuu_') ? prod.id.replace('ryuu_', '') : ''));
    if (appId && dlcMap && dlcMap.has(appId)) {
      return dlcMap.get(appId);
    }
    return 0;
  };

  const totalSelectedDlcsCount = useMemo(() => {
    let count = 0;
    selectedIds.forEach(id => {
      const dlcs = promoSelectedDlcs[id] || [];
      count += dlcs.length;
    });
    return count;
  }, [selectedIds, promoSelectedDlcs]);

  const totalDlcExtraPrice = useMemo(() => {
    let price = 0;
    selectedIds.forEach(id => {
      const dlcs = promoSelectedDlcs[id] || [];
      if (dlcs.length > 0) {
        price += getDlcBundlePrice(dlcs.length);
      }
    });
    return price;
  }, [selectedIds, promoSelectedDlcs]);

  /* Dynamic Steam promo price calculation */
  const steamDynamicPrice = useMemo(() => {
    if (!activePromo?.isSteam) return activePromo?.priceCLP || 0;
    
    let basePrice = 0;
    // Si es Pack Juegos VIP (1 Estreno + 2 Juegos de regalo)
    if (activePromo.isVipPromo) {
      if (!selectedVipId) basePrice = 8000;
      else {
        const vipProd = VIP_HIGHLIGHT_GAMES.find(g => g.id === selectedVipId) || products.find(p => p.id === selectedVipId);
        const itemVipPrice = getVipPrice(vipProd);
        const listedVipPrice = itemVipPrice || Number(vipProd?.priceCLP || 8000);
        basePrice = listedVipPrice >= 15000 ? 13000 : listedVipPrice >= 12000 ? 11000 : 8000;
      }
    } else {
      const selectedProducts = steamPromoCatalog.filter(p => selectedIds.includes(p.id));
      const extraSurcharges = selectedProducts.reduce((acc, p) => acc + getSteamGameSurcharge(p), 0);
      basePrice = activePromo.priceCLP + extraSurcharges;
    }

    const totalRaw = basePrice + totalDlcExtraPrice;

    if (role === "revendedor") {
      return Math.round(totalRaw * 0.5);
    }
    return totalRaw;
  }, [activePromo, selectedIds, products, steamPromoCatalog, selectedVipId, role, totalDlcExtraPrice]);

  const toggleSelect = id => {
    if (!activePromo?.isSteam) {
      const prod = products.find(p => p.id === id);
      const stock = getGameStockCount(prod?.name, switchStockMap);
      if (stock === 0 && !selectedIds.includes(id)) {
        return;
      }
    }

    if (activePromo?.isVipPromo) {
      if (vipTab === "vip") {
        setSelectedIds(prev => {
          const currentBonus = prev.filter(x => x !== selectedVipId);
          return [id, ...currentBonus];
        });
        if (selectedBonusIds.length < 2) {
          setVipTab("bonus");
        }
      } else {
        setSelectedIds(prev => {
          if (prev.includes(id)) {
            setPromoSelectedDlcs(dPrev => {
              if (!dPrev[id]) return dPrev;
              const n = { ...dPrev };
              delete n[id];
              return n;
            });
            return prev.filter(x => x !== id);
          }
          if (selectedBonusIds.length >= 2) return prev;
          return [...prev, id];
        });
      }
      return;
    }

    setSelectedIds(prev => {
      if (prev.includes(id)) {
        setPromoSelectedDlcs(dPrev => {
          if (!dPrev[id]) return dPrev;
          const n = { ...dPrev };
          delete n[id];
          return n;
        });
        return prev.filter(x => x !== id);
      }
      if (activePromo && prev.length >= activePromo.selectCount) return prev;
      return [...prev, id];
    });
  };

  const openDlcModalForGame = (p) => {
    if (!p) return;
    if (activePromo?.isVipPromo) {
      if (vipTab === "vip") {
        if (selectedVipId !== p.id) {
          setSelectedIds(prev => {
            const currentBonus = prev.filter(x => x !== selectedVipId);
            return [p.id, ...currentBonus];
          });
        }
      } else {
        if (!selectedBonusIds.includes(p.id)) {
          if (selectedBonusIds.length < 2) {
            setSelectedIds(prev => [...prev, p.id]);
          } else {
            setSelectedIds([selectedVipId, selectedBonusIds[0], p.id].filter(Boolean));
          }
        }
      }
    } else {
      if (!selectedIds.includes(p.id)) {
        const maxCount = activePromo?.selectCount || 999;
        if (selectedIds.length < maxCount) {
          setSelectedIds(prev => [...prev, p.id]);
        } else {
          setSelectedIds(prev => [...prev.slice(0, Math.max(0, maxCount - 1)), p.id]);
        }
      }
    }
    setActiveDlcModalGame(p);
  };

  const openSelection = promo => {
    if (promo.restricted && promo.selectCount > 1) {
      setActivePromo(promo);
      setSelectedIds([]);
      setPromoSelectedDlcs({});
      setActiveDlcModalGame(null);
      setSearch("");
      setDeferredSteamSearch("");
      setVipTab("vip");
      setModalOpen(true);
    } else {
      setConfirmPromo(promo);
    }
  };

  const addFixedPromoToCart = async () => {
    if (!confirmPromo) return;
    const isReseller = role === "revendedor";
    const isSteamOrVip = confirmPromo.isSteam || confirmPromo.isVipPromo || confirmPromo.isRandomPack || confirmPromo.isSteamPass || (confirmPromo.key && (confirmPromo.key.includes("steam") || confirmPromo.key.includes("vip")));
    const finalPrice = (isReseller && isSteamOrVip) ? Math.round(confirmPromo.priceCLP * 0.5) : confirmPromo.priceCLP;

    const user = auth.currentUser;
    const packId = `promo-${confirmPromo.key}-${Date.now()}`;
    const cartItem = {
      id: packId,
      productId: packId,
      isPromo: true,
      name: confirmPromo.name,
      priceCLP: finalPrice,
      priceUSD: finalPrice / 900,
      isResellerPrice: isReseller && isSteamOrVip,
      imageUrl: confirmPromo.image || null,
      cantidad: 1,
      promoGames: (confirmPromo.fixedGames || []).map(title => ({ id: title, name: title }))
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
    setConfirmPromo(null);
    navigate("/checkoutcarrito");
  };

  const confirmSelection = async () => {
    if (!activePromo) return;
    if (activePromo.isVipPromo) {
      if (!selectedVipId || selectedBonusIds.length !== 2) return;
    } else {
      if (selectedIds.length !== activePromo.selectCount) return;
    }

    const chosen = selectedIds.map(id => {
      return steamPromoCatalog.find(p => p.id === id) || VIP_HIGHLIGHT_GAMES.find(g => g.id === id) || products.find(p => p.id === id);
    }).filter(Boolean);

    const names = chosen.map(p => p.name).join(" + ");

    // Recopilar todos los DLCs seleccionados en la promo
    const allSelectedDlcs = [];
    selectedIds.forEach(id => {
      const dlcs = promoSelectedDlcs[id] || [];
      const prod = steamPromoCatalog.find(p => p.id === id) || VIP_HIGHLIGHT_GAMES.find(g => g.id === id) || products.find(p => p.id === id);
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

    // steamDynamicPrice ya incorpora el 50% B2B; aplicarlo otra vez duplicaría el descuento.
    const finalPrice = activePromo.isSteam ? steamDynamicPrice : activePromo.priceCLP;
    
    const user = auth.currentUser;
    const packId = `promo-${activePromo.key}-${Date.now()}`;
    const cartItem = {
      id: packId,
      productId: packId,
      isPromo: true,
      name: `${activePromo.name} (${names})${dlcText}`,
      priceCLP: finalPrice,
      priceUSD: finalPrice / 900,
      isResellerPrice: role === "revendedor" && (activePromo.isSteam || activePromo.isVipPromo),
      imageUrl: activePromo.image || chosen[0]?.imageUrl || null,
      cantidad: 1,
      plataforma: activePromo.isSteam ? "steam" : null,
      categoryId: activePromo.isSteam ? "steam" : null,
      categoryName: activePromo.isSteam ? "Steam" : null,
      isSteam: Boolean(activePromo.isSteam),
      promoGames: chosen.map(p => ({
        id: p.id,
        name: p.name,
        app_id: p.app_id,
        appId: p.app_id,
        selectedDlcs: promoSelectedDlcs[p.id] || []
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
    closeModal();
    navigate("/checkoutcarrito");
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: 20,
  };

  return (
    <>
      <Helmet>
        <title>Promociones y Packs 2x1 y 3x1 | Videojuegos Digitales Baratos - PandaStore</title>
        <meta name="description" content="Aprovecha las mejores promociones y packs de videojuegos digitales en PandaStore. 2x1, 3x1 y sagas completas para Steam PC, Nintendo Switch, PS4 y PS5. ¡Entrega inmediata 24/7 y mejor precio garantizado!" />
        <meta name="keywords" content="promociones videojuegos, packs juegos 2x1, ofertas juegos steam pc, packs nintendo switch baratos, juegos ps5 ofertas, packs juegos ps4, pandastore ofertas" />
        <meta property="og:title" content="Promociones y Packs de Videojuegos 2x1 y 3x1 | PandaStore" />
        <meta property="og:description" content="Packs 2x1, 3x1 y sagas completas para Steam PC, Nintendo Switch, PS4 y PS5. ¡Elige tus juegos favoritos con entrega inmediata 24/7!" />
        <meta property="og:url" content="https://pandastoreupdate.web.app/promos" />
        <meta property="og:image" content="https://pandastoreupdate.web.app/favicon.png" />
        <meta name="twitter:title" content="Packs y Promociones de Videojuegos | PandaStore" />
        <meta name="twitter:description" content="Ahorra con packs 2x1 y 3x1 en juegos para PC, Switch y PlayStation en PandaStore." />
        <meta name="twitter:image" content="https://pandastoreupdate.web.app/favicon96.png" />
        <link rel="canonical" href="https://pandastoreupdate.web.app/promos" />
        <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Promociones y Packs de Videojuegos - PandaStore",
          "description": "Packs especiales 2x1 y 3x1 de videojuegos digitales para Steam PC, Nintendo Switch y PlayStation.",
          "url": "https://pandastoreupdate.web.app/promos",
          "isPartOf": { "@type": "VideoGameStore", "name": "PandaStore", "url": "https://pandastoreupdate.web.app" }
        })}
        </script>
      </Helmet>
      <div style={{ minHeight: "100vh", padding: "28px 0 80px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 16px" }}>

          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 8, marginTop: 16 }}>
            <img src={letreroPromos} alt="Promociones" style={{ maxWidth: 480, width: "88%", height: "auto" }} />
          </div>
          <p style={{ color: "#a78bfa", textAlign: "center", margin: "0 0 4px", fontSize: 15, fontWeight: 500 }}>
            Packs especiales · Elige tus juegos dentro del límite de precio
          </p>

          {/* Stats bar */}
          <div style={{
            display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap",
            margin: "20px 0 0",
          }}>
            {[
              { icon: "🎮", label: `${filteredCustomPacks.length} packs armables` },
              { icon: "🏷️", label: `${filteredFixedPacks.length} packs especiales` },
              { icon: "⚡", label: "Entrega inmediata" },
              { icon: "💬", label: "Soporte 24/7" },
            ].map(stat => (
              <div key={stat.label} style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: "rgba(123,47,242,0.13)",
                border: "1px solid rgba(162,89,255,0.28)",
                borderRadius: 999, padding: "6px 16px",
                color: "#c4b5fd", fontSize: 13, fontWeight: 600,
              }}>
                <span>{stat.icon}</span><span>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Selector de Plataforma: Todas / Steam PC / Nintendo Switch */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
            margin: "24px 0 10px"
          }}>
            {[
              { id: "todas", label: "🎮 Todas las Promos", color: "#a259ff" },
              { id: "steam", label: "💻 Packs Steam (PC)", color: "#00f5d4" },
              { id: "nintendo", label: "🔴 Nintendo Switch", color: "#ff385c" },
            ].map(tab => {
              const active = selectedPlataforma === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedPlataforma(tab.id)}
                  style={{
                    background: active
                      ? (tab.id === "steam" ? "rgba(0, 245, 212, 0.2)" : tab.id === "nintendo" ? "rgba(255, 56, 92, 0.2)" : "rgba(162, 89, 255, 0.25)")
                      : "rgba(255, 255, 255, 0.05)",
                    border: `1.5px solid ${active ? tab.color : "rgba(255, 255, 255, 0.15)"}`,
                    color: active ? tab.color : "#c4b5fd",
                    padding: "8px 18px",
                    borderRadius: 999,
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: active ? `0 0 16px ${tab.color}33` : "none"
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* VIP Panda Pass Banner (Solo visible en Todas o Steam) */}
          {selectedPlataforma !== "nintendo" && (
            <div style={{
              margin: "26px 0 16px",
              background: "linear-gradient(135deg, rgba(20, 10, 48, 0.95) 0%, rgba(8, 4, 22, 0.98) 100%)",
              border: "1.5px solid rgba(0, 245, 212, 0.5)",
              borderRadius: 24,
              padding: "24px 28px",
              boxShadow: "0 12px 40px rgba(0, 245, 212, 0.15), 0 0 25px rgba(123, 47, 242, 0.2)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20
            }}>
              <div style={{ maxWidth: 620 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,245,212,0.15)", border: "1px solid #00f5d4", borderRadius: 999, padding: "4px 14px", color: "#00f5d4", fontSize: 11.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                  <span>🔥 NOVEDAD VIP</span>
                  <span>•</span>
                  <span>CATÁLOGO COMPLETO</span>
                </div>
                <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
                  Panda Pass Steam · Acceso Total (+1.500 Juegos)
                </h2>
                <p style={{ margin: "0 0 12px", color: "#c4b5fd", fontSize: 14.5, lineHeight: 1.5 }}>
                  Juega sin límites a todo el catálogo de Steam en PandaStore Launcher durante 30 días. Incluye guardado en la nube, modo offline y lanzamientos actualizados continuamente.
                </p>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "#00f5d4", fontWeight: 700 }}>
                  <span>⚡ Activación inmediata</span>
                  <span>🎮 +1.500 títulos</span>
                  <span>🔄 30 Días de Acceso</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, minWidth: 200 }}>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600, display: "block" }}>
                    {role === "revendedor" ? "Suscripción Revendedor (-50%)" : "Suscripción mensual"}
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "flex-end" }}>
                    {role === "revendedor" && (
                      <span style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", textDecoration: "line-through", fontWeight: 700 }}>
                        {formatearPrecio(25000)}
                      </span>
                    )}
                    <span style={{ fontSize: 28, fontWeight: 900, color: "#00f5d4", textShadow: "0 0 12px rgba(0,245,212,0.4)" }}>
                      {formatearPrecio(role === "revendedor" ? 12500 : 25000)}
                    </span>
                    <span style={{ fontSize: 13, color: "#c4b5fd" }}> / mes</span>
                  </div>
                </div>
                <SpecularButton
                  size="md"
                  radius={16}
                  tint="#00f5d4"
                  tintOpacity={0.3}
                  lineColor="#00f5d4"
                  baseColor="#0b3d36"
                  intensity={1.5}
                  autoAnimate
                  onClick={() => {
                    const passPromo = PROMOS.find(p => p.key === "promo-steam-panda-pass");
                    if (passPromo) openSelection(passPromo);
                  }}
                  style={{ padding: "10px 22px", fontSize: 14 }}
                >
                  <span className="material-icons" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 6 }}>
                    bolt
                  </span>
                  Obtener Panda Pass
                </SpecularButton>
              </div>
            </div>
          )}

          {/* Section 1: Custom packs */}
          {filteredCustomPacks.length > 0 && (
            <>
              <SectionHeader
                icon={selectedPlataforma === "steam" ? "💻" : selectedPlataforma === "nintendo" ? "🔴" : "🎮"}
                title={selectedPlataforma === "steam" ? "Arma tu pack Steam (PC)" : selectedPlataforma === "nintendo" ? "Arma tu pack Nintendo Switch" : "Arma tu pack (Steam & Nintendo)"}
                subtitle="Tú eliges los juegos dentro del catálogo · Elige tus favoritos"
              />
              <div style={gridStyle}>
                {filteredCustomPacks.map(promo => (
                  <PromoCard
                    key={promo.key}
                    promo={promo}
                    onSelect={openSelection}
                    highlighted={highlightPromoKey === promo.key}
                    formatearPrecio={formatearPrecio}
                    cardRef={node => { if (node && promo.key) promoRefs.current[promo.key] = node; }}
                    role={role}
                  />
                ))}
              </div>
            </>
          )}

          {/* Section 2: Fixed packs */}
          {filteredFixedPacks.length > 0 && (
            <>
              <SectionHeader
                icon="🏷️"
                title={selectedPlataforma === "steam" ? "Packs Masivos Steam Launcher" : selectedPlataforma === "nintendo" ? "Ediciones Especiales & DLCs Switch" : "Packs especiales & Launcher Masivos"}
                subtitle={selectedPlataforma === "steam" ? "Bundles masivos de juegos con PandaStore Launcher" : "Packs con DLC incluido y bundles masivos de juegos aleatorios"}
              />
              <div style={gridStyle}>
                {filteredFixedPacks.filter(p => !p.isFixedBundle).map(promo => (
                  <PromoCard
                    key={promo.key}
                    promo={promo}
                    onSelect={openSelection}
                    highlighted={highlightPromoKey === promo.key}
                    formatearPrecio={formatearPrecio}
                    cardRef={node => { if (node && promo.key) promoRefs.current[promo.key] = node; }}
                    role={role}
                  />
                ))}
              </div>
            </>
          )}

        </div>
      </div>

      {/* Modal: selección de juegos */}
      {modalOpen && activePromo && createPortal(
        <div
          className="modal-bg"
          style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(10,6,30,0.96)", backdropFilter: "blur(4px)",
            zIndex: 10001, display: "flex", alignItems: "flex-start", justifyContent: "center",
            paddingTop: modalTopOffset, paddingBottom: 24,
          }}
          onClick={e => { if (e.target.classList.contains("modal-bg")) closeModal(); }}
        >
          <div style={{
            background: "linear-gradient(180deg, #1e0f3d 0%, #0c0620 100%)",
            borderRadius: 24, padding: 0,
            boxShadow: "0 20px 70px rgba(0,0,0,0.8), 0 0 30px rgba(162,89,255,0.25)",
            border: "1.5px solid rgba(162,89,255,0.4)",
            maxWidth: 1080, width: "92%", position: "relative",
            maxHeight: `calc(100vh - ${modalTopOffset}px - 24px)`,
            overflow: "hidden", display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "20px 22px 0 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", fontWeight: 900,
                    color: (activePromo.isVipPromo ? (selectedVipId && selectedBonusIds.length === 2) : (selectedIds.length === activePromo.selectCount)) ? "#00f5d4" : "#c4b5fd",
                    fontSize: 16, padding: "6px 16px", borderRadius: 12,
                    background: (activePromo.isVipPromo ? (selectedVipId && selectedBonusIds.length === 2) : (selectedIds.length === activePromo.selectCount)) ? "rgba(0,245,212,0.15)" : "rgba(123,47,242,0.2)",
                    border: (activePromo.isVipPromo ? (selectedVipId && selectedBonusIds.length === 2) : (selectedIds.length === activePromo.selectCount)) ? "1.5px solid #00f5d4" : "1.5px solid rgba(162,89,255,0.4)",
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {activePromo.isVipPromo ? (
                      `Pack VIP · ${selectedVipId ? "1 VIP" : "0 VIP"} + ${selectedBonusIds.length}/2 Regalos`
                    ) : (
                      `Seleccionados: ${selectedIds.length} / ${activePromo.selectCount}`
                    )}
                    {totalSelectedDlcsCount > 0 && (
                      <span style={{ marginLeft: 6, color: '#00f5d4' }}>
                        · 🎁 {totalSelectedDlcsCount} DLC{totalSelectedDlcsCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    {activePromo.isSteam ? (
                      <span style={{
                        background: steamDynamicPrice > activePromo.priceCLP ? "rgba(0,245,212,0.18)" : "rgba(162,89,255,0.25)",
                        border: steamDynamicPrice > activePromo.priceCLP ? "1px solid #00f5d4" : "1px solid rgba(162,89,255,0.4)",
                        color: steamDynamicPrice > activePromo.priceCLP ? "#00f5d4" : "#e0baff",
                        borderRadius: 999, padding: "6px 16px", fontWeight: 800, fontSize: 15,
                        transition: "all 0.3s ease"
                      }}>
                        Total: {formatearPrecio(steamDynamicPrice)}
                      </span>
                    ) : (
                      <span style={{ background: "rgba(162,89,255,0.25)", border: "1px solid rgba(162,89,255,0.4)", color: "#e0baff", borderRadius: 999, padding: "6px 16px", fontWeight: 800, fontSize: 13.5 }}>
                        Máx. {activePromo.maxPriceCLP ? formatearPrecio(activePromo.maxPriceCLP) : "sin límite"} / juego
                      </span>
                    )}
                    <button type="button" onClick={closeModal} style={{ width: 38, height: 38, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                      <span style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>&times;</span>
                    </button>
                  </span>
                </div>
              </div>

              {/* Pestañas de 2 Pasos para Pack VIP */}
              {activePromo.isVipPromo && (
                <div style={{ display: "flex", gap: 10, width: "100%", marginBottom: 12 }}>
                  <button
                    type="button"
                    onClick={() => setVipTab("vip")}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 12, fontWeight: 900, fontSize: 13.5,
                      cursor: "pointer", border: vipTab === "vip" ? "2px solid #00f5d4" : "1.5px solid rgba(162,89,255,0.3)",
                      background: vipTab === "vip" ? "rgba(0,245,212,0.18)" : "rgba(255,255,255,0.05)",
                      color: vipTab === "vip" ? "#00f5d4" : "#c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                    }}
                  >
                    <span>⭐ PASO 1: Estreno VIP</span>
                    <span style={{ background: selectedVipId ? "#00f5d4" : "rgba(255,255,255,0.15)", color: selectedVipId ? "#000" : "#fff", borderRadius: 999, padding: "2px 8px", fontSize: 11 }}>
                      {selectedVipId ? "1/1 Listo" : "0/1"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVipTab("bonus")}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 12, fontWeight: 900, fontSize: 13.5,
                      cursor: "pointer", border: vipTab === "bonus" ? "2px solid #00f5d4" : "1.5px solid rgba(162,89,255,0.3)",
                      background: vipTab === "bonus" ? "rgba(0,245,212,0.18)" : "rgba(255,255,255,0.05)",
                      color: vipTab === "bonus" ? "#00f5d4" : "#c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                    }}
                  >
                    <span>🎁 PASO 2: 2 Regalos del Catálogo</span>
                    <span style={{ background: selectedBonusIds.length === 2 ? "#00f5d4" : "rgba(255,255,255,0.15)", color: selectedBonusIds.length === 2 ? "#000" : "#fff", borderRadius: 999, padding: "2px 8px", fontSize: 11 }}>
                      {selectedBonusIds.length} / 2
                    </span>
                  </button>
                </div>
              )}

              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={
                  activePromo.isSteam
                    ? "Filtrar por nombre (Ej. Wukong, Silent Hill 2, FC 26, Shadows)..."
                    : "🔍 Buscar juegos de Nintendo Switch..."
                }
                style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(15, 23, 42, 0.65)", color: "#fff", marginBottom: 14, outline: "none", boxSizing: "border-box", fontSize: 14.5 }}
              />

              {activePromo.isSteam && (
                <div className="steam-modal-dlc-promo-hint">
                  <span className="dlc-hint-icon">🎁</span>
                  <span className="dlc-hint-text">
                    <strong>¿Quieres sumar DLCs?</strong> Haz clic en el botón <strong>«🎁 Sumar DLCs»</strong> en cualquier juego para ver y agregar sus expansiones con descuento (1x $1.000 • 2x $1.800 • 3x $2.500 • Full Pack $3.500).
                  </span>
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: activePromo.isSteam ? "repeat(auto-fill, minmax(210px, 1fr))" : "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, flex: 1, minHeight: 0, overflowY: "auto", padding: "6px 22px 14px" }}>
              {loadingProducts && products.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "50px 20px", color: "#c4b5fd" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Cargando catálogo de juegos...</div>
                  <div style={{ fontSize: 13, color: "#a78bfa" }}>Un momento por favor mientras preparamos la lista</div>
                </div>
              ) : eligibleProducts.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
                  No se encontraron juegos para esta selección.
                </div>
              ) : (
                eligibleProducts.map(p => {
                const min = getMinPriceByMoneda(p, moneda);
                const isVipMode = activePromo.isVipPromo;
                const checked = isVipMode
                  ? (vipTab === "vip" ? selectedVipId === p.id : selectedBonusIds.includes(p.id))
                  : selectedIds.includes(p.id);

                const surcharge = !isVipMode && activePromo.isSteam ? getSteamGameSurcharge(p) : 0;
                const isGreenGame = surcharge > 0;
                const visibleSurcharge = role === "revendedor" ? Math.round(surcharge * 0.5) : surcharge;
                const isTopVip = isVipMode && vipTab === "vip" && isTopTierVip(p);
                const vipListPrice = getVipPrice(p) || Number(p.priceCLP || 8000);
                const vipExtra = vipListPrice >= 15000 ? 5000 : vipListPrice >= 12000 ? 3000 : 0;
                const visibleVipExtra = role === "revendedor" ? Math.round(vipExtra * 0.5) : vipExtra;

                const switchStock = !activePromo.isSteam ? getGameStockCount(p.name, switchStockMap) : null;
                const isSwitchOutOfStock = !activePromo.isSteam && switchStock === 0;
                const steamImg = p.imageUrl || p.image || (p.app_id ? `https://cdn.akamai.steamstatic.com/steam/apps/${p.app_id}/header.jpg` : null);
                const extraCharge = isVipMode ? (vipTab === "vip" ? visibleVipExtra : 0) : visibleSurcharge;

                const dlcCount = activePromo.isSteam ? getGameDlcCount(p) : 0;
                const currentDlcs = promoSelectedDlcs[p.id] || [];
                const hasSelectedDlcs = currentDlcs.length > 0;
                const rawGameDlcCost = hasSelectedDlcs ? getDlcBundlePrice(currentDlcs.length) : 0;
                const gameDlcCost = role === "revendedor" ? Math.round(rawGameDlcCost * 0.5) : rawGameDlcCost;

                if (activePromo.isSteam) {
                  return (
                    <div
                      key={p.id}
                      className={`steam-modal-game-card ${checked ? "checked" : ""}`}
                      onClick={() => toggleSelect(p.id)}
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
                            title="Haz clic para ver y sumar expansiones DLC"
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

                      {/* Solo mostrar si tiene un valor extra a pagar */}
                      {extraCharge > 0 && (
                        <div style={{
                          marginTop: 6,
                          display: "flex",
                          alignItems: "center"
                        }}>
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
                }

                return (
                  <label key={p.id} style={{
                    display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 12,
                    border: checked ? "2px solid #00f5d4" : isSwitchOutOfStock ? "1.5px dashed rgba(239,68,68,0.4)" : isGreenGame ? "1.5px solid rgba(0,245,212,0.3)" : "1.5px solid rgba(162,89,255,0.25)",
                    borderRadius: 16, padding: 12, alignItems: "center",
                    background: checked ? "rgba(0,245,212,0.12)" : isSwitchOutOfStock ? "rgba(239,68,68,0.06)" : isGreenGame ? "rgba(0,245,212,0.04)" : "rgba(255,255,255,0.04)",
                    opacity: isSwitchOutOfStock ? 0.55 : 1,
                    boxShadow: checked ? "0 4px 20px rgba(0,245,212,0.25)" : "none",
                    cursor: isSwitchOutOfStock ? "not-allowed" : "pointer", color: "#fff", transition: "all .18s",
                  }}>
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10 }} />
                      : <div style={{ width: 64, height: 64, borderRadius: 10, background: "rgba(255,255,255,0.1)" }} />
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#fff", lineHeight: 1.25, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontSize: 13 }}>{p.name}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        {switchStock !== null && (
                          isSwitchOutOfStock ? (
                            <span style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 999, padding: "2px 8px", fontWeight: 800, fontSize: 10, border: "1px solid rgba(239,68,68,0.5)" }}>
                              ❌ AGOTADO EN COMBOS
                            </span>
                          ) : (
                            <span style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", borderRadius: 999, padding: "2px 8px", fontWeight: 800, fontSize: 10, border: "1px solid rgba(34,197,94,0.4)" }}>
                              🟢 Stock: {switchStock}
                            </span>
                          )
                        )}
                        <span style={{ background: "rgba(162,89,255,0.3)", color: isGreenGame ? "#00f5d4" : "#00f5d4", borderRadius: 999, padding: "3px 10px", fontWeight: 800, fontSize: 12, display: "inline-block" }}>
                          {min ? (moneda === "USD" ? formatPrecio(min, "USD") : formatearPrecio(min)) : "Sin precio"}
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isSwitchOutOfStock}
                      onChange={() => toggleSelect(p.id)}
                      style={{ width: 22, height: 22, accentColor: "#00f5d4", cursor: isSwitchOutOfStock ? "not-allowed" : "pointer" }}
                    />
                  </label>
                );
              })
            )}
            </div>
            <div style={{ flexShrink: 0, padding: "16px 22px 20px", background: "rgba(12,6,32,0.95)", borderTop: "1.5px solid rgba(162,89,255,0.25)", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0,
                background: (activePromo.isVipPromo ? (selectedVipId && selectedBonusIds.length === 2) : (selectedIds.length === activePromo.selectCount)) ? "rgba(0,245,212,0.15)" : "rgba(162,89,255,0.15)",
                border: `1.5px solid ${(activePromo.isVipPromo ? (selectedVipId && selectedBonusIds.length === 2) : (selectedIds.length === activePromo.selectCount)) ? "#00f5d4" : "rgba(162,89,255,0.4)"}`,
                borderRadius: 14, padding: "8px 18px", minWidth: 64,
              }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: (activePromo.isVipPromo ? (selectedVipId && selectedBonusIds.length === 2) : (selectedIds.length === activePromo.selectCount)) ? "#00f5d4" : "#a259ff" }}>
                  {activePromo.isVipPromo ? `${selectedVipId ? 1 : 0}+${selectedBonusIds.length}` : selectedIds.length}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd" }}>
                  {activePromo.isVipPromo ? "/ 1+2" : `/ ${activePromo.selectCount}`}
                </span>
              </div>
              <button
                onClick={confirmSelection}
                disabled={activePromo.isVipPromo ? (!selectedVipId || selectedBonusIds.length !== 2) : (selectedIds.length !== activePromo.selectCount)}
                style={{
                  flex: 1,
                  background: (activePromo.isVipPromo ? (selectedVipId && selectedBonusIds.length === 2) : (selectedIds.length === activePromo.selectCount)) ? "linear-gradient(90deg,#00f5d4,#05b39b)" : "rgba(255,255,255,0.1)",
                  color: (activePromo.isVipPromo ? (selectedVipId && selectedBonusIds.length === 2) : (selectedIds.length === activePromo.selectCount)) ? "#041c18" : "#888",
                  fontWeight: 900, borderRadius: 14, padding: "15px 16px", border: "none",
                  fontSize: 16, boxShadow: (activePromo.isVipPromo ? (selectedVipId && selectedBonusIds.length === 2) : (selectedIds.length === activePromo.selectCount)) ? "0 6px 24px rgba(0,245,212,0.4)" : "none",
                  cursor: (activePromo.isVipPromo ? (selectedVipId && selectedBonusIds.length === 2) : (selectedIds.length === activePromo.selectCount)) ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 52,
                }}
              >
                <span>🛒</span>
                {activePromo.isVipPromo ? (
                  !selectedVipId
                    ? "⚠️ Paso 1: Elige 1 Estreno Exclusivo VIP"
                    : selectedBonusIds.length < 2
                      ? `🎁 Paso 2: Elige ${2 - selectedBonusIds.length} Juego(s) de Regalo más`
                      : `Agregar Pack VIP al carrito · ${formatearPrecio(steamDynamicPrice)}${totalSelectedDlcsCount > 0 ? ` (+${totalSelectedDlcsCount} DLCs)` : ''}`
                ) : (
                  selectedIds.length === activePromo.selectCount
                    ? `Agregar al carrito · ${formatearPrecio(activePromo.isSteam ? steamDynamicPrice : activePromo.priceCLP)}${totalSelectedDlcsCount > 0 ? ` (+${totalSelectedDlcsCount} DLCs)` : ''}`
                    : `Selecciona ${activePromo.selectCount - selectedIds.length} más`
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
          initialSelectedDlcs={promoSelectedDlcs[activeDlcModalGame.id] || []}
          onSaveDlcs={(dlcs) => {
            setPromoSelectedDlcs(prev => ({
              ...prev,
              [activeDlcModalGame.id]: dlcs
            }));
          }}
          formatearPrecio={formatearPrecio}
          isReseller={role === "revendedor"}
          ryuuCatalog={rawRyuuCatalog}
        />
      )}

      {/* Modal: confirmación pack fijo */}
      {confirmPromo && createPortal(
        <div
          onClick={() => setConfirmPromo(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(5,2,20,0.9)", backdropFilter: "blur(8px)", zIndex: 2147483647, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "linear-gradient(135deg,#1a1035,#2d1950)", border: "2px solid rgba(162,89,255,0.4)", borderRadius: 22, padding: "28px 24px 24px", maxWidth: 400, width: "100%", boxShadow: "0 8px 48px rgba(123,47,242,0.35)", color: "#fff" }}
          >
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <img src={confirmPromo.image} alt={confirmPromo.name} style={{ maxHeight: 140, maxWidth: "100%", objectFit: "contain", borderRadius: 12 }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, textAlign: "center", color: "#FFD600", marginBottom: 8 }}>{confirmPromo.name}</div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <span style={{ background: "#2a126b", color: "#fff", borderRadius: 999, padding: "7px 20px", fontWeight: 800, fontSize: 22, boxShadow: "0 2px 12px #2a126b44", display: "inline-block" }}>
                {formatearPrecio(confirmPromo.priceCLP)}
              </span>
            </div>

            {confirmPromo.fixedGames && confirmPromo.fixedGames.length > 0 && (
              <div style={{
                background: "rgba(10, 6, 30, 0.65)",
                border: "1px solid rgba(162, 89, 255, 0.25)",
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 16,
                maxHeight: 180,
                overflowY: "auto"
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#00f5d4", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🎮</span> Títulos incluidos en esta colección:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {confirmPromo.fixedGames.map((game, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#e9d5ff", background: "rgba(255,255,255,0.04)", padding: "5px 10px", borderRadius: 8 }}>
                      <span style={{ color: "#22c55e", fontWeight: 900, fontSize: 14 }}>✔</span>
                      <span style={{ fontWeight: 600 }}>{game}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ color: "#c4b5fd", fontSize: 12.5, textAlign: "center", marginBottom: 18, lineHeight: 1.5 }}>
              Al confirmar este pack se añadirá a tu carrito con todos sus juegos.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmPromo(null)} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1.5px solid rgba(162,89,255,0.4)", background: "rgba(255,255,255,0.06)", color: "#c4b5fd", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={addFixedPromoToCart} style={{ flex: 2, padding: "13px 0", borderRadius: 12, border: "none", background: "linear-gradient(90deg,#22c55e,#16a34a)", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 2px 14px #22c55e44", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span>🛒</span> Agregar al carrito
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
