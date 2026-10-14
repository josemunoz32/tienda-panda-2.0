import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { db, auth } from "../../firebase";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, setDoc, arrayUnion } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { STEAM_SAGAS } from "../../utils/sagasData";
import { VIP_HIGHLIGHT_GAMES } from "../../utils/vipGames";
import { buildVipActivationWspUrl, buildDlcPurchaseWspUrl, getOrderPlatformInfo, buildSolicitarInstalacionWspUrl } from "../../utils/whatsappHelper";
import {
  fetchRyuuCatalog,
  getDlcsForGame,
  getDlcBundlePrice,
  formatClp,
  splitDlcsByOwnership
} from "../../utils/ryuuDlcHelper";

import {
  Package,
  Clock,
  CheckCircle2,
  KeyRound,
  Headphones,
  Copy,
  Check,
  Search,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Download,
  Receipt,
  Eye,
  X,
  FileText,
  Calendar,
  Gamepad2,
  BookOpen,
  Trash2,
  BellOff,
  AlertTriangle,
  Filter
} from "lucide-react";
import "./MisPedidos.css";

// ─── helpers ────────────────────────────────────────────────────────────────
export function isGhostOrder(p) {
  if (!p) return true;
  const prods = Array.isArray(p.productos) ? p.productos : [];
  const noProds = prods.length === 0;
  const noTotal = (!p.total || Number(p.total) === 0) && (!p.totalCLP || Number(p.totalCLP) === 0);
  const noCustomer = !p.email && (!p.nombre || p.nombre === "-") && (!p.uid || p.uid === "desconocido" || p.uid === "guest");
  return noProds && (noTotal || noCustomer || !p.metodoPago);
}

export function detectDuplicates(allOrders) {
  const duplicateIds = new Set();
  const ghostIds = new Set();

  allOrders.forEach(o => {
    if (isGhostOrder(o)) {
      ghostIds.add(o.id);
    }
  });

  const validOrders = allOrders.filter(o => !ghostIds.has(o.id));
  const groups = {};

  validOrders.forEach(o => {
    const key = (o.email ? o.email.trim().toLowerCase() : "") ||
      (o.uid && o.uid !== "guest" && o.uid !== "desconocido" ? o.uid : "") ||
      (o.nombre ? o.nombre.trim().toLowerCase() : "");
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(o);
  });

  Object.values(groups).forEach(userOrders => {
    if (userOrders.length < 2) return;

    const visited = new Set();
    for (let i = 0; i < userOrders.length; i++) {
      const orderA = userOrders[i];
      if (visited.has(orderA.id)) continue;

      const cluster = [orderA];
      const prodsA = (Array.isArray(orderA.productos) ? orderA.productos : [])
        .map(p => (p.name || p.nombre || "").trim().toLowerCase())
        .sort()
        .join("||");
      const totalA = Math.round(Number(orderA.totalCLP || orderA.total || 0));

      for (let j = i + 1; j < userOrders.length; j++) {
        const orderB = userOrders[j];
        if (visited.has(orderB.id)) continue;

        const prodsB = (Array.isArray(orderB.productos) ? orderB.productos : [])
          .map(p => (p.name || p.nombre || "").trim().toLowerCase())
          .sort()
          .join("||");
        const totalB = Math.round(Number(orderB.totalCLP || orderB.total || 0));

        const sameTotal = Math.abs(totalA - totalB) <= 2;
        const sameProds = prodsA.length > 0 && prodsA === prodsB;

        let closeTime = false;
        if (orderA.fecha && orderB.fecha) {
          const diffMs = Math.abs(new Date(orderA.fecha).getTime() - new Date(orderB.fecha).getTime());
          closeTime = diffMs <= 1000 * 60 * 60 * 12; // 12 horas
        } else {
          closeTime = true;
        }

        if (sameTotal && sameProds && closeTime) {
          cluster.push(orderB);
          visited.add(orderB.id);
        }
      }

      if (cluster.length > 1) {
        cluster.sort((a, b) => {
          const aKey = a.licenseKey ? 1 : 0;
          const bKey = b.licenseKey ? 1 : 0;
          if (aKey !== bKey) return bKey - aKey;

          const aSuccess = (a.transferenciaEstado === "exitoso" || !["transferencia", "prex", "crypto"].includes(a.metodoPago)) ? 1 : 0;
          const bSuccess = (b.transferenciaEstado === "exitoso" || !["transferencia", "prex", "crypto"].includes(b.metodoPago)) ? 1 : 0;
          if (aSuccess !== bSuccess) return bSuccess - aSuccess;

          const aComp = a.comprobanteUrl ? 1 : 0;
          const bComp = b.comprobanteUrl ? 1 : 0;
          if (aComp !== bComp) return bComp - aComp;

          const aDate = a.fecha ? new Date(a.fecha).getTime() : 0;
          const bDate = b.fecha ? new Date(b.fecha).getTime() : 0;
          return aDate - bDate;
        });

        cluster.slice(1).forEach(dup => {
          duplicateIds.add(dup.id);
        });
      }
    }
  });

  return { duplicateIds, ghostIds };
}

function formatPrecioPedido(precio, moneda) {
  if (!precio || isNaN(Number(precio))) return "";
  if (moneda === "USD") return `USD $${Number(precio).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (moneda === "CLP") return `$${Number(precio).toLocaleString("es-CL")}`;
  return `${moneda} $${precio}`;
}

function fmtFecha(f) {
  if (!f) return "-";
  const d = new Date(f);
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }) +
    " • " + d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

const ESTADO_INFO = {
  exitoso:   { label: "Exitoso",       color: "#10b981", bg: "rgba(16,185,129,0.14)",  border: "rgba(16,185,129,0.4)" },
  rechazado: { label: "Rechazado",     color: "#ef4444", bg: "rgba(239,68,68,0.14)",   border: "rgba(239,68,68,0.4)" },
  pendiente: { label: "Pendiente",     color: "#f59e0b", bg: "rgba(245,158,11,0.14)",  border: "rgba(245,158,11,0.4)" },
  vacio:     { label: "Sin productos", color: "#f43f5e", bg: "rgba(244,63,94,0.14)",  border: "rgba(244,63,94,0.4)" },
  incompleto:{ label: "Incompleto",    color: "#a855f7", bg: "rgba(168,85,247,0.14)",  border: "rgba(168,85,247,0.4)" },
};

const METODO_LABEL = {
  transferencia: "Transferencia bancaria",
  prex:          "Prex",
  crypto:        "Crypto — USDT",
  paypal:        "PayPal",
  mercadopago:   "Tarjeta crédito/débito",
};

function EstadoBadge({ estado }) {
  const e = ESTADO_INFO[estado] || ESTADO_INFO.pendiente;
  const isPending = estado === "pendiente";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: e.bg,
      color: e.color,
      border: `1px solid ${e.border}`,
      borderRadius: 999,
      padding: "3px 11px",
      fontSize: "0.74rem",
      fontWeight: 800,
      letterSpacing: "0.03em"
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: e.color,
        boxShadow: `0 0 8px ${e.color}`,
        animation: isPending ? "catPulseDot 1.8s infinite" : "none"
      }} />
      {e.label}
    </span>
  );
}

// ─── Comprobante viewer ──────────────────────────────────────────────────────
function Comprobante({ url }) {
  const [open, setOpen] = useState(false);
  if (!url) return null;
  const isPdf = url.toLowerCase().includes(".pdf");

  return (
    <>
      <div style={{
        background: "rgba(162,89,255,0.06)",
        border: "1px solid rgba(162,89,255,0.22)",
        borderRadius: 14,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "rgba(162,89,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#c4b5fd"
          }}>
            <Receipt size={18} />
          </div>
          <div>
            <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "0.82rem" }}>
              Comprobante de pago adjunto
            </div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem" }}>
              Documento verificado para esta orden
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {!isPdf && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              style={{
                background: "linear-gradient(135deg, #7b2ff2, #a259ff)",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                padding: "6px 14px",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5
              }}
            >
              <Eye size={13} />
              <span>Ver imagen</span>
            </button>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "#c4b5fd",
              border: "1px solid rgba(162,89,255,0.3)",
              borderRadius: 9,
              padding: "6px 14px",
              fontSize: "0.75rem",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 5
            }}
          >
            <FileText size={13} />
            <span>{isPdf ? "Ver PDF" : "Abrir original"}</span>
          </a>
        </div>
      </div>

      {open && createPortal(
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(4,2,14,0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "88vh" }}>
            <img
              src={url}
              alt="Comprobante"
              style={{
                maxWidth: "90vw",
                maxHeight: "85vh",
                borderRadius: 18,
                boxShadow: "0 15px 60px rgba(0,0,0,0.8)",
                border: "1.5px solid rgba(162,89,255,0.4)"
              }}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                position: "absolute",
                top: -12,
                right: -12,
                background: "#a259ff",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 14px rgba(123,47,242,0.5)"
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

async function generarKeyDirectaFallback(pedido) {
  if (!pedido) return null;
  if (pedido.licenseKey) return pedido.licenseKey;

  // VERIFICAR PLATAFORMA: Solo pedidos de Steam pueden generar clave de Launcher!
  const platInfo = getOrderPlatformInfo(pedido);
  if (platInfo.platformKey !== "steam") {
    console.log(`[generarKeyDirectaFallback] Pedido #${pedido.id} es de plataforma ${platInfo.platformKey}, omitiendo clave Steam.`);
    return null;
  }

  const prods = Array.isArray(pedido.productos) ? pedido.productos : [];
  const allowedGames = [];
  const allowedDlcs = [];
  let isFullAccess = false;

  for (const p of prods) {
    const nom = (p.nombre || p.name || p.title || "").trim();
    const clean = nom.toLowerCase();
    const pPlat = (p.plataforma || p.platform || "").toLowerCase();
    const pCat = (p.categoria || p.categoriaNombre || p.categoryName || p.categoryId || "").toLowerCase();

    // Descartar si el producto individual es consola o streaming
    if (
      p.switchCompat ||
      p.pricePrimariaCLP ||
      p.priceSecundariaCLP ||
      pPlat.includes("switch") ||
      pPlat.includes("nintendo") ||
      pPlat.includes("playstation") ||
      pPlat.includes("ps4") ||
      pPlat.includes("ps5") ||
      pPlat.includes("streaming") ||
      pCat.includes("switch") ||
      pCat.includes("nintendo") ||
      pCat.includes("playstation") ||
      pCat.includes("ps4") ||
      pCat.includes("ps5") ||
      pCat.includes("streaming")
    ) {
      continue;
    }

    if (clean.includes("pack steam") || clean.includes("todos los juegos") || clean.includes("catálogo completo")) {
      isFullAccess = true;
      break;
    }

    let appId = p.appId || p.app_id || p.steamAppId || null;
    if (!appId && p.id) {
      const m = String(p.id).match(/^(?:ryuu_|vip-)?(\d+)$/);
      if (m) appId = m[1];
    }

    if (appId) {
      allowedGames.push(String(appId));
    }
    if (nom) {
      allowedGames.push(nom);
    }

    // Extraer DLCs seleccionados en el producto
    const dlcsArr = Array.isArray(p.selectedDlcs) && p.selectedDlcs.length > 0 ?
      p.selectedDlcs :
      (Array.isArray(p.dlcs) ? p.dlcs : []);
    for (const d of dlcsArr) {
      const did = d.dlc_app_id || d.id || d.appId;
      if (did && !isNaN(did)) allowedDlcs.push(String(did));
      if (d.name) allowedGames.push(d.name);
    }

    // Si tiene sub-juegos en promoGames
    if (Array.isArray(p.promoGames) && p.promoGames.length > 0) {
      for (const pg of p.promoGames) {
        const pgName = (pg.name || pg.title || (typeof pg === "string" ? pg : "")).trim();
        const pgAppId = pg.app_id || pg.appId || pg.id || null;
        if (pgName) allowedGames.push(pgName);
        if (pgAppId && !isNaN(pgAppId)) allowedGames.push(String(pgAppId));
        if (Array.isArray(pg.selectedDlcs)) {
          for (const d of pg.selectedDlcs) {
            const did = d.dlc_app_id || d.id || d.appId;
            if (did && !isNaN(did)) allowedDlcs.push(String(did));
            if (d.name) allowedGames.push(d.name);
          }
        }
      }
    }

    // Si tiene games
    if (Array.isArray(p.games) && p.games.length > 0) {
      for (const g of p.games) {
        const gName = (typeof g === "string" ? g : (g.name || "")).trim();
        if (gName) allowedGames.push(gName);
      }
    } else if (p.isSaga || clean.includes("saga")) {
      const cleanSaga = clean.replace(/\(.*?\)/g, "").replace(/colecci[oó]n/g, "").trim();
      const foundSaga = STEAM_SAGAS.find(s =>
        (p.id && s.key === p.id) ||
        (s.name && clean.includes(s.name.toLowerCase())) ||
        (s.name && cleanSaga && s.name.toLowerCase().includes(cleanSaga))
      );
      if (foundSaga && Array.isArray(foundSaga.games)) {
        for (const g of foundSaga.games) {
          allowedGames.push(typeof g === "string" ? g : g.name);
        }
      }
    }

    // Extras VIP
    const extras = Array.isArray(p.selectedVipExtras) && p.selectedVipExtras.length > 0
      ? p.selectedVipExtras
      : (Array.isArray(p.vipExtras) ? p.vipExtras : []);
    for (const ex of extras) {
      const exName = (ex.name || ex.title || (typeof ex === "string" ? ex : "")).trim();
      if (exName) allowedGames.push(exName);
    }
  }

  const finalAllowed = isFullAccess ? ["*"] : Array.from(new Set(allowedGames.filter(Boolean)));
  if (finalAllowed.length === 0 && !isFullAccess) return null;

  // Generar clave única PANDA-XXXX-YYYY
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const licenseKey = `PANDA-${part1}-${part2}`;
  const now = new Date().toISOString();

  const licenseData = {
    key: licenseKey,
    client_email: (pedido.email || "").trim().toLowerCase(),
    license_type: "permanent",
    is_trial: false,
    trial_minutes: 15,
    expiry_date: null,
    hwid: null,
    status: "active",
    allowed_games: finalAllowed,
    allowed_dlcs: isFullAccess ? ["*"] : Array.from(new Set(allowedDlcs.filter(Boolean))),
    orderId: pedido.id,
    createdAt: now,
    deliveredAt: now,
    activatedAt: null,
    last_seen: null,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, "licenses", licenseKey), licenseData);
    await updateDoc(doc(db, "orders", pedido.id), {
      licenseKey,
      licenseDeliveredAt: now
    }).catch(() => {});
    if (pedido.uid && pedido.uid !== "guest") {
      await updateDoc(doc(db, `users/${pedido.uid}/orders`, pedido.id), {
        licenseKey,
        licenseDeliveredAt: now
      }).catch(() => {});
    }
    return licenseKey;
  } catch (e) {
    console.error("Error en fallback generar clave:", e);
    return null;
  }
}

// ─── Sección de DLCs disponibles para pedidos con clave ──────────────────────
function PedidoDlcSection({ pedido, isAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const [licenseData, setLicenseData] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [activatingDlc, setActivatingDlc] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (pedido.licenseKey) {
      getDoc(doc(db, "licenses", pedido.licenseKey)).then(snap => {
        if (isMounted && snap.exists()) {
          setLicenseData(snap.data());
        }
      }).catch(console.error);
    }
    fetchRyuuCatalog().then(cat => {
      if (isMounted) setCatalog(cat || []);
    }).catch(console.error);

    return () => { isMounted = false; };
  }, [pedido.licenseKey]);

  if (!pedido.licenseKey || !catalog.length) return null;

  const prods = Array.isArray(pedido.productos) ? pedido.productos : [];
  const allowedGames = Array.isArray(licenseData?.allowed_games) ? licenseData.allowed_games : [];
  const allowedDlcs = Array.isArray(licenseData?.allowed_dlcs) ? licenseData.allowed_dlcs : [];

  const targetAppIds = new Set();
  prods.forEach(p => {
    const aid = p.app_id || p.appId;
    if (aid && !p.isDlc) targetAppIds.add(String(aid));
  });
  allowedGames.forEach(gid => {
    if (gid !== "*" && /^\d+$/.test(String(gid).trim())) {
      targetAppIds.add(String(gid).trim());
    }
  });

  if (targetAppIds.size === 0) return null;

  const gamesDlcList = [];
  targetAppIds.forEach(appId => {
    const gameDlcs = getDlcsForGame(appId, catalog);
    if (gameDlcs.length > 0) {
      const gameInCatalog = catalog.find(g => String(g.appid) === String(appId));
      const gameProd = prods.find(p => String(p.app_id || p.appId) === String(appId));
      const gameName = gameProd?.nombre || gameProd?.name || gameInCatalog?.name || `Juego (${appId})`;
      const { available, owned } = splitDlcsByOwnership(gameDlcs, allowedDlcs);
      gamesDlcList.push({
        appId,
        gameName,
        available,
        owned,
        total: gameDlcs.length
      });
    }
  });

  if (gamesDlcList.length === 0) return null;

  const totalAvailable = gamesDlcList.reduce((acc, g) => acc + g.available.length, 0);
  const totalOwned = gamesDlcList.reduce((acc, g) => acc + g.owned.length, 0);

  const handleAdminActivateDlc = async (dlcAppId) => {
    if (!isAdmin || !pedido.licenseKey) return;
    setActivatingDlc(dlcAppId);
    try {
      await updateDoc(doc(db, "licenses", pedido.licenseKey), {
        allowed_dlcs: arrayUnion(String(dlcAppId))
      });
      setLicenseData(prev => ({
        ...prev,
        allowed_dlcs: Array.from(new Set([...(prev?.allowed_dlcs || []), String(dlcAppId)]))
      }));
      alert(`¡DLC (AppID: ${dlcAppId}) activado con éxito en la clave ${pedido.licenseKey}!`);
    } catch (e) {
      alert("Error al activar DLC: " + e.message);
    } finally {
      setActivatingDlc(null);
    }
  };

  return (
    <div style={{
      marginTop: 8,
      background: "linear-gradient(135deg, rgba(36, 0, 70, 0.4) 0%, rgba(16, 5, 36, 0.6) 100%)",
      border: "1px solid rgba(162, 89, 255, 0.25)",
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: "0.82rem"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1.1rem" }}>🎁</span>
          <div>
            <span style={{ fontWeight: 800, color: "#e2e8f0" }}>DLCs Oficiales para tus Juegos</span>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
              {totalAvailable > 0 && <span style={{ color: "#00f5d4", fontWeight: 700 }}>{totalAvailable} disponibles para añadir</span>}
              {totalAvailable > 0 && totalOwned > 0 && " • "}
              {totalOwned > 0 && <span style={{ color: "#a78bfa" }}>{totalOwned} activos en launcher</span>}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "#c4b5fd",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: "0.74rem",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          {expanded ? "Ocultar ▲" : "Ver DLCs ▼"}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{
            fontSize: "0.72rem",
            color: "#cbd5e1",
            marginBottom: 10,
            background: "rgba(0, 0, 0, 0.25)",
            padding: "6px 10px",
            borderRadius: 6,
            borderLeft: "3px solid #00f5d4"
          }}>
            💡 <strong>Precios de DLCs:</strong> $1.000 CLP c/u • 2x $1.800 • 3x $2.500 • 4x $3.000 • 5+ en Pack: $3.500 CLP.
          </div>

          {gamesDlcList.map(g => (
            <div key={g.appId} style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 6, fontSize: "0.8rem" }}>
                🎮 {g.gameName}
              </div>

              {/* DLCs Disponibles */}
              {g.available.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                  {g.available.map(dlc => {
                    const buyWspUrl = buildDlcPurchaseWspUrl({
                      gameName: g.gameName,
                      dlcName: dlc.name,
                      dlcAppId: dlc.dlc_app_id,
                      licenseKey: pedido.licenseKey,
                      email: pedido.email || ""
                    });

                    return (
                      <div
                        key={dlc.dlc_app_id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 10px",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          borderRadius: 8,
                          gap: 10
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                          {dlc.header_image && (
                            <img
                              src={dlc.header_image}
                              alt=""
                              style={{ width: 44, height: 26, objectFit: "cover", borderRadius: 4 }}
                              onError={e => { e.target.style.display = "none"; }}
                            />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "0.76rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {dlc.name}
                            </div>
                            <div style={{ color: "#64748b", fontSize: "0.68rem" }}>AppID: {dlc.dlc_app_id}</div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "#00f5d4", fontWeight: 700, fontSize: "0.76rem" }}>
                            $1.000 CLP
                          </span>
                          <a
                            href={buyWspUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              color: "#fff",
                              borderRadius: 6,
                              padding: "4px 8px",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            📲 Comprar
                          </a>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleAdminActivateDlc(dlc.dlc_app_id)}
                              disabled={activatingDlc === dlc.dlc_app_id}
                              style={{
                                background: "rgba(162, 89, 255, 0.2)",
                                border: "1px solid rgba(162, 89, 255, 0.4)",
                                color: "#c084fc",
                                borderRadius: 6,
                                padding: "4px 8px",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              {activatingDlc === dlc.dlc_app_id ? "..." : "⚡ Activar"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Botón Pack de DLCs si hay 2 o más */}
                  {g.available.length >= 2 && (
                    <div style={{ marginTop: 4, textAlign: "right" }}>
                      <a
                        href={buildDlcPurchaseWspUrl({
                          gameName: g.gameName,
                          dlcName: `Pack completo (${g.available.length} DLCs)`,
                          dlcAppId: g.available.map(d => d.dlc_app_id).join(","),
                          licenseKey: pedido.licenseKey,
                          email: pedido.email || ""
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: "linear-gradient(135deg, #7b2ff2 0%, #a259ff 100%)",
                          color: "#fff",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: "0.74rem",
                          fontWeight: 800,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6
                        }}
                      >
                        ⚡ Pedir Pack ({g.available.length} DLCs) por {formatClp(getDlcBundlePrice(g.available.length))}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* DLCs Ya Comprados / Activos */}
              {g.owned.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: "0.7rem", color: "#a78bfa", fontWeight: 700, marginBottom: 4 }}>
                    ✓ DLCs Activos en tu Licencia ({g.owned.length}):
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {g.owned.map(od => (
                      <span
                        key={od.dlc_app_id}
                        style={{
                          background: "rgba(16, 185, 129, 0.12)",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          color: "#34d399",
                          borderRadius: 6,
                          padding: "2px 8px",
                          fontSize: "0.68rem",
                          fontWeight: 600
                        }}
                      >
                        ✓ {od.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tarjeta de pedido (Moderna y Minimalista) ────────────────────────────────
function PedidoCard({ pedido, userId, isAdmin, setPedidos, onCopyKey, copiedKey, isDuplicate, isGhost, onDeletePedido }) {
  const [generandoKey, setGenerandoKey] = useState(false);
  const estado = pedido.transferenciaEstado || "pendiente";
  const esManual = ["transferencia", "prex", "crypto"].includes(pedido.metodoPago);

  const prods = Array.isArray(pedido.productos) ? pedido.productos : [];
  const platInfo = getOrderPlatformInfo(pedido);
  const tieneJuegosSteam = platInfo.platformKey === "steam";

  const estadoBadge = isGhost ? "vacio" : (esManual ? estado : (pedido.metodoPago ? "exitoso" : "incompleto"));

  // Detectar si algún producto del pedido es un juego VIP (Denuvo/Ubisoft/EA)
  const VIP_APP_ID_SET = new Set(VIP_HIGHLIGHT_GAMES.map(v => String(v.app_id)));
  const vipProductsInOrder = prods.filter(p => {
    const appIdStr = String(p.appId || p.app_id || "");
    const nom = (p.nombre || p.name || p.title || "").toLowerCase();
    return VIP_APP_ID_SET.has(appIdStr) || p.isDenuvoActivation ||
      VIP_HIGHLIGHT_GAMES.some(v => (v.name || "").toLowerCase() === nom && nom.length > 3);
  });
  const hasVipGames = vipProductsInOrder.length > 0;


  const precioDisplay = (() => {
    if (pedido.monedaLocal && pedido.monedaLocal !== "CLP") {
      return `${pedido.monedaLocal} ${Number(pedido.totalLocal).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return formatPrecioPedido(pedido.total, pedido.moneda);
  })();

  const clpEquiv = pedido.monedaLocal && pedido.monedaLocal !== "CLP"
    ? `≈ CLP $${Math.round(pedido.totalCLP ?? pedido.total).toLocaleString("es-CL")}`
    : null;

  const handleEntregarKey = async () => {
    if (!tieneJuegosSteam) {
      alert(`Este pedido es de ${platInfo.platformLabel}. No requiere clave de Steam/Launcher.`);
      return;
    }
    setGenerandoKey(true);
    const idToSend = pedido.globalOrderId || pedido.id;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("https://us-central1-pandastoreupdate.cloudfunctions.net/entregarKeyPedido", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify({ orderId: idToSend })
      });
      const data = await res.json().catch(() => null);
      if (data && data.licenseKey) {
        alert(`¡Clave de Steam generada y enviada al cliente con éxito!\n\nClave: ${data.licenseKey}`);
        setPedidos(prev => {
          if (isAdmin) {
            return prev.map(u => u.userId === userId
              ? { ...u, pedidos: u.pedidos.map(p => p.id === pedido.id ? { ...p, licenseKey: data.licenseKey } : p) }
              : u
            );
          } else {
            return prev.map(p => p.id === pedido.id ? { ...p, licenseKey: data.licenseKey } : p);
          }
        });
        return;
      }

      // Fallback directo a Firestore
      const keyFallback = await generarKeyDirectaFallback(pedido);
      if (keyFallback) {
        alert(`¡Clave generada exitosamente!\n\nClave: ${keyFallback}`);
        setPedidos(prev => {
          if (isAdmin) {
            return prev.map(u => u.userId === userId
              ? { ...u, pedidos: u.pedidos.map(p => p.id === pedido.id ? { ...p, licenseKey: keyFallback } : p) }
              : u
            );
          } else {
            return prev.map(p => p.id === pedido.id ? { ...p, licenseKey: keyFallback } : p);
          }
        });
      } else {
        alert(data?.message || "El pedido no contiene juegos de Steam/Sagas o ya tenía clave.");
      }
    } catch (err) {
      const keyFallback = await generarKeyDirectaFallback(pedido).catch(() => null);
      if (keyFallback) {
        alert(`¡Clave generada exitosamente!\n\nClave: ${keyFallback}`);
        setPedidos(prev => {
          if (isAdmin) {
            return prev.map(u => u.userId === userId
              ? { ...u, pedidos: u.pedidos.map(p => p.id === pedido.id ? { ...p, licenseKey: keyFallback } : p) }
              : u
            );
          } else {
            return prev.map(p => p.id === pedido.id ? { ...p, licenseKey: keyFallback } : p);
          }
        });
      } else {
        alert("Error al contactar con el servidor: " + err.message);
      }
    } finally {
      setGenerandoKey(false);
    }
  };

  const handleEstado = async (nuevoEstado, options = {}) => {
    const isSilent = Boolean(options.silent);
    const updateData = {
      transferenciaEstado: nuevoEstado,
      ...(isSilent ? { silencioso: true, notificarCliente: false } : { silencioso: false })
    };

    try {
      if (nuevoEstado === "exitoso" && !isSilent) {
        const idToSend = pedido.globalOrderId || pedido.id;
        try {
          const token = await auth.currentUser?.getIdToken();
          const res = await fetch("https://us-central1-pandastoreupdate.cloudfunctions.net/entregarKeyPedido", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
            body: JSON.stringify({ orderId: idToSend })
          });
          const data = await res.json().catch(() => null);
          if (data && data.licenseKey) {
            updateData.licenseKey = data.licenseKey;
          } else if (tieneJuegosSteam && !pedido.licenseKey) {
            const fallbackKey = await generarKeyDirectaFallback(pedido);
            if (fallbackKey) {
              updateData.licenseKey = fallbackKey;
            }
          }
        } catch (_) {
          if (tieneJuegosSteam && !pedido.licenseKey) {
            const fallbackKey = await generarKeyDirectaFallback(pedido).catch(() => null);
            if (fallbackKey) {
              updateData.licenseKey = fallbackKey;
            }
          }
        }
      }

      await updateDoc(doc(db, "orders", pedido.id), updateData);
      try {
        const ref = doc(db, `users/${userId}/orders`, pedido.id);
        const snap = await getDoc(ref);
        if (snap.exists()) await updateDoc(ref, updateData);
      } catch (_) {}

      setPedidos(prev => {
        if (isAdmin) {
          return prev.map(u => u.userId === userId
            ? { ...u, pedidos: u.pedidos.map(p => p.id === pedido.id ? { ...p, ...updateData } : p) }
            : u
          );
        } else {
          return prev.map(p => p.id === pedido.id ? { ...p, ...updateData } : p);
        }
      });

      if (isSilent) {
        alert("¡Pedido marcado como Exitoso en modo SILENCIOSO!\nNo se ha enviado ningún correo al cliente ni al administrador.");
      }
    } catch (err) {
      alert("Error al actualizar estado: " + err.message);
    }
  };

  const isCopied = copiedKey === pedido.licenseKey;

  return (
    <div className="pedido-card-modern">
      {/* Header tarjeta */}
      <div className="pedido-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={14} color="#a259ff" />
          <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 600, fontSize: "0.8rem" }}>
            {fmtFecha(pedido.fecha)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <EstadoBadge estado={estadoBadge} />
          {pedido.silencioso && (
            <span className="pedido-badge-silent">
              <BellOff size={11} /> Silencioso
            </span>
          )}
          {isDuplicate && (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.7rem",
              background: "rgba(245, 158, 11, 0.18)",
              color: "#fbbf24",
              border: "1px solid rgba(245, 158, 11, 0.45)",
              borderRadius: 999,
              padding: "2px 8px",
              fontWeight: 800
            }}>
              <AlertTriangle size={11} /> Copia Duplicada
            </span>
          )}
          {isGhost && (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.7rem",
              background: "rgba(239, 68, 68, 0.18)",
              color: "#f87171",
              border: "1px solid rgba(239, 68, 68, 0.45)",
              borderRadius: 999,
              padding: "2px 8px",
              fontWeight: 800
            }}>
              <AlertTriangle size={11} /> Vacío / Fantasma
            </span>
          )}
          {esManual && isAdmin && (
            <select
              value={pedido.silencioso && estado === "exitoso" ? "exitoso_silencioso" : estado}
              onChange={e => {
                const val = e.target.value;
                if (val === "exitoso_silencioso") {
                  handleEstado("exitoso", { silent: true });
                } else if (val === "exitoso") {
                  handleEstado("exitoso", { silent: false });
                } else {
                  handleEstado(val);
                }
              }}
              style={{
                padding: "3px 8px",
                borderRadius: 8,
                border: "1px solid rgba(162,89,255,0.4)",
                background: "#120924",
                color: "#e8e0f5",
                fontWeight: 600,
                fontSize: "0.75rem",
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="pendiente">Pendiente</option>
              <option value="exitoso_silencioso">🔕 Exitoso Silencioso (Sin correos)</option>
              <option value="exitoso">📧 Exitoso (Enviar Correo & Clave)</option>
              <option value="rechazado">Rechazado</option>
            </select>
          )}
        </div>
      </div>

      {/* Cuerpo */}
      <div className="pedido-card-body">
        <div className="pedido-meta-grid">
          <div>
            <div className="pedido-meta-label">Método de pago</div>
            <div className="pedido-meta-value">{METODO_LABEL[pedido.metodoPago] || pedido.metodoPago || "-"}</div>
          </div>
          <div>
            <div className="pedido-meta-label">Total cobrado</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {pedido.pais && (
                <img
                  src={`https://flagcdn.com/w40/${pedido.pais.toLowerCase()}.png`}
                  alt={pedido.pais}
                  style={{ width: 18, height: 12, objectFit: "cover", borderRadius: 2 }}
                />
              )}
              <span className="pedido-meta-price">{precioDisplay}</span>
              {clpEquiv && <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.75rem" }}>{clpEquiv}</span>}
            </div>
          </div>
          <div>
            <div className="pedido-meta-label">Cliente</div>
            <div className="pedido-meta-value">{pedido.nombre || "-"}</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem" }}>{pedido.email || ""}</div>
          </div>
          <div>
            <div className="pedido-meta-label">ID pedido</div>
            <div style={{ color: "#a259ff", fontSize: "0.72rem", wordBreak: "break-all", fontFamily: "monospace" }}>
              {pedido.id}
            </div>
          </div>
        </div>

        {/* Clave PandaStore Steam: SOLO si el pedido está aprobado/exitoso (o si es administrador) */}
        {(() => {
          const esAprobado = (estado === "exitoso") || (!esManual && (pedido.status === "approved" || pedido.estado === "exitoso" || pedido.transferenciaEstado === "exitoso" || Boolean(pedido.metodoPago && !["transferencia", "prex", "crypto"].includes(pedido.metodoPago))));
          
          if (pedido.licenseKey && (esAprobado || isAdmin)) {
            return (
              <>
                <div className="vault-key-box" style={{ marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <KeyRound size={20} color="#00f5d4" />
                <div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
                    Clave PandaStore Launcher (Steam)
                  </div>
                  <div className="vault-key-code">
                    {pedido.licenseKey}
                  </div>
                </div>
              </div>

              {/* Botones de acción de la clave */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="vault-copy-btn"
                  onClick={() => onCopyKey && onCopyKey(pedido.licenseKey)}
                >
                  {isCopied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{isCopied ? "¡Copiado!" : "Copiar"}</span>
                </button>

                {/* Botón VIP: Activar por WhatsApp (solo para juegos Denuvo/Ubisoft/EA) */}
                {hasVipGames && vipProductsInOrder.map((vp, idx) => {
                  const vipInfo = VIP_HIGHLIGHT_GAMES.find(v => String(v.app_id) === String(vp.appId || vp.app_id || "")) || {};
                  const platform = vipInfo.platform || vp.platform || "Steam";
                  const wspUrl = buildVipActivationWspUrl({
                    gameName: vp.nombre || vp.name || vp.title || vipInfo.name || "Juego VIP",
                    appId: vp.appId || vp.app_id || vipInfo.app_id || "",
                    licenseKey: pedido.licenseKey || "",
                    platform,
                    email: pedido.email || ""
                  });
                  return (
                    <a
                      key={idx}
                      href={wspUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "6px 12px",
                        background: "linear-gradient(135deg, #a259ff 0%, #7b2ff2 100%)",
                        border: "1px solid #c084fc",
                        color: "#fff",
                        borderRadius: 8,
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        textDecoration: "none",
                        boxShadow: "0 0 12px rgba(162,89,255,0.4)"
                      }}
                      title={`Activar ${vp.nombre || vp.name || "Juego VIP"} por WhatsApp`}
                    >
                      🔑 Activar{vipProductsInOrder.length > 1 ? ` (${(vp.nombre || vp.name || "VIP").split(" ")[0]})` : ""} por WhatsApp
                    </a>
                  );
                })}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleEntregarKey}
                    disabled={generandoKey}
                    style={{
                      background: "rgba(162, 89, 255, 0.2)",
                      border: "1px solid rgba(162, 89, 255, 0.5)",
                      color: "#d8b4fe",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                      fontWeight: 700
                    }}
                  >
                    {generandoKey ? "Reenviando..." : "Reenviar correo"}
                  </button>
                )}
              </div>
            </div>

            {/* Sección de DLCs oficiales para la clave del pedido */}
              </>
            );
          }

          if (tieneJuegosSteam && !esAprobado) {
            return (
              <div style={{
                marginTop: 6,
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px dashed rgba(245, 158, 11, 0.35)",
                borderRadius: 10,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.75rem",
                color: "#fde68a"
              }}>
                <Clock size={15} color="#f59e0b" />
                <span><strong>Clave de Steam protegida:</strong> Tu clave se liberará aquí automáticamente tan pronto el administrador verifique tu pago.</span>
              </div>
            );
          }

          if (!isGhost && isAdmin && tieneJuegosSteam && (estado === "exitoso" || !esManual)) {
            return (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
                background: "rgba(162, 89, 255, 0.08)",
                border: "1px dashed rgba(162, 89, 255, 0.4)",
                borderRadius: 12,
                padding: "10px 14px"
              }}>
                <span style={{ fontSize: "0.78rem", color: "#c4b5fd" }}>
                  ¿El pedido incluye juegos de Steam? Puedes generar y enviar la clave:
                </span>
                <button
                  type="button"
                  onClick={handleEntregarKey}
                  disabled={generandoKey}
                  style={{
                    background: "linear-gradient(135deg, #a259ff 0%, #7b2ff2 100%)",
                    border: "none",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {generandoKey ? "Generando..." : "🔑 Generar Clave Steam"}
                </button>
              </div>
            );
          }

          if (!tieneJuegosSteam && (esAprobado || estado === "exitoso")) {
            const wspUrl = buildSolicitarInstalacionWspUrl({
              nombre: pedido.nombre || "",
              email: pedido.email || "",
              pedidoId: pedido.id || "",
              productos: prods,
              plataforma: platInfo.platformLabel,
              total: pedido.total,
              moneda: pedido.moneda || "CLP",
              metodoPago: pedido.metodoPago || ""
            });

            return (
              <div style={{
                marginTop: 6,
                background: "linear-gradient(135deg, rgba(162, 89, 255, 0.08) 0%, rgba(0, 245, 212, 0.05) 100%)",
                border: "1px solid rgba(162, 89, 255, 0.25)",
                borderRadius: 12,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 10
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Sparkles size={16} color="#00f5d4" />
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff" }}>
                      Instalación y Activación ({platInfo.platformLabel})
                    </span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                    {platInfo.guideSub}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {platInfo.showGuideBtn && platInfo.guideRoute && (
                    <Link
                      to={platInfo.guideRoute}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 12px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 8,
                        color: "#fff",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textDecoration: "none"
                      }}
                    >
                      <BookOpen size={14} color="#00f5d4" />
                      <span>{platInfo.guideTitle}</span>
                    </Link>
                  )}

                  <a
                    href={wspUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 14px",
                      background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      textDecoration: "none",
                      boxShadow: "0 2px 10px rgba(37,211,102,0.3)"
                    }}
                  >
                    <span>💬 {platInfo.wspButtonTitle}</span>
                  </a>
                </div>
              </div>
            );
          }

          return null;
        })()}

        {/* Banner de Pedido Vacío / Fantasma si aplica */}
        {isGhost && isAdmin && (
          <div style={{
            background: "rgba(244, 63, 94, 0.08)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 4
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fda4af", fontSize: "0.78rem" }}>
              <AlertTriangle size={16} color="#f43f5e" />
              <span><strong>Pedido Fantasma / Vacío:</strong> Este pedido no tiene productos registrados.</span>
            </div>
            <button
              type="button"
              onClick={() => onDeletePedido && onDeletePedido(pedido.id, userId)}
              style={{
                background: "rgba(244, 63, 94, 0.2)",
                border: "1px solid rgba(244, 63, 94, 0.5)",
                color: "#fff",
                borderRadius: 8,
                padding: "5px 12px",
                fontSize: "0.74rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5
              }}
            >
              <Trash2 size={13} />
              <span>Eliminar Pedido Vacío</span>
            </button>
          </div>
        )}

        {/* Banner de Copia Duplicada si aplica */}
        {isDuplicate && isAdmin && (
          <div style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 4
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fde68a", fontSize: "0.78rem" }}>
              <AlertTriangle size={16} color="#f59e0b" />
              <span><strong>Copia Duplicada:</strong> El cliente envió este pedido repetido. El pedido original legítimo ya está conservado.</span>
            </div>
            <button
              type="button"
              onClick={() => onDeletePedido && onDeletePedido(pedido.id, userId)}
              style={{
                background: "rgba(245, 158, 11, 0.25)",
                border: "1px solid rgba(245, 158, 11, 0.5)",
                color: "#fff",
                borderRadius: 8,
                padding: "5px 12px",
                fontSize: "0.74rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5
              }}
            >
              <Trash2 size={13} />
              <span>Eliminar Copia Duplicada</span>
            </button>
          </div>
        )}

        {/* Toolbar de Administración */}
        {isAdmin && (
          <div className="pedido-admin-toolbar">
            <div className="pedido-admin-toolbar-header">
              <span className="pedido-admin-toolbar-title">⚡ Acciones de Administrador:</span>
              {pedido.silencioso && (
                <span className="pedido-badge-silent">
                  <BellOff size={11} /> Aprobado sin correos
                </span>
              )}
            </div>

            <div className="pedido-admin-btn-group">
              {/* Opción 1: Exitoso Silencioso (Sin correos) */}
              <button
                type="button"
                className="adm-act-btn adm-act-btn--silent"
                title="Marcar como Exitoso SIN enviar correo al cliente ni a ti"
                onClick={() => handleEstado("exitoso", { silent: true })}
                disabled={estado === "exitoso" && pedido.silencioso}
              >
                <BellOff size={13} />
                <span>Exitoso Silencioso (Sin Correos)</span>
              </button>

              {/* Opción 2: Exitoso Normal con Correo */}
              <button
                type="button"
                className="adm-act-btn adm-act-btn--notify"
                title="Marcar como Exitoso y despachar clave y correo al cliente"
                onClick={() => handleEstado("exitoso", { silent: false })}
                disabled={estado === "exitoso" && !pedido.silencioso}
              >
                <CheckCircle2 size={13} />
                <span>Exitoso (Enviar Correo)</span>
              </button>

              {/* Opción 3: Pendiente */}
              {estado !== "pendiente" && (
                <button
                  type="button"
                  className="adm-act-btn adm-act-btn--pending"
                  onClick={() => handleEstado("pendiente")}
                >
                  <Clock size={13} />
                  <span>Pendiente</span>
                </button>
              )}

              {/* Opción 4: Rechazar */}
              {estado !== "rechazado" && (
                <button
                  type="button"
                  className="adm-act-btn adm-act-btn--reject"
                  onClick={() => handleEstado("rechazado")}
                >
                  <X size={13} />
                  <span>Rechazar</span>
                </button>
              )}

              {/* Opción 5: Eliminar */}
              <button
                type="button"
                className="adm-act-btn adm-act-btn--delete"
                title="Eliminar este pedido de la base de datos permanentemente"
                onClick={() => onDeletePedido && onDeletePedido(pedido.id, userId)}
              >
                <Trash2 size={13} />
                <span>{isDuplicate ? "Eliminar Copia Duplicada" : isGhost ? "Eliminar Pedido Fantasma" : "Eliminar"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Productos */}
        <div>
          <div className="pedido-meta-label">
            Productos ({prods.length})
          </div>
          <div className="pedido-prods-wrap">
            {prods.length > 0 ? (
              prods.map((prod, idx) => (
                <div key={idx} className="pedido-prod-item">
                  <Gamepad2 size={16} color="#a259ff" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "0.85rem" }}>
                      {prod.name}
                    </span>
                    {prod.categoria && prod.categoria !== 'Sin categoría' && (
                      <span
                        className="pedido-prod-badge"
                        style={{
                          background: prod.categoria.toLowerCase().includes('switch')
                            ? 'rgba(255,42,109,0.16)'
                            : prod.categoria.toLowerCase().includes('playstation') || prod.categoria.toLowerCase().includes('ps')
                            ? 'rgba(0,112,209,0.2)'
                            : 'rgba(123,47,242,0.2)',
                          color: prod.categoria.toLowerCase().includes('switch')
                            ? '#ff2a6d'
                            : prod.categoria.toLowerCase().includes('playstation') || prod.categoria.toLowerCase().includes('ps')
                            ? '#60a5fa'
                            : '#00f5d4',
                          border: `1px solid ${
                            prod.categoria.toLowerCase().includes('switch')
                              ? 'rgba(255,42,109,0.4)'
                              : prod.categoria.toLowerCase().includes('playstation') || prod.categoria.toLowerCase().includes('ps')
                              ? 'rgba(96,165,250,0.4)'
                              : 'rgba(0,245,212,0.4)'
                          }`
                        }}
                      >
                        {prod.categoria}
                      </span>
                    )}
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", fontWeight: 700 }}>
                    ×{prod.cantidad}
                  </span>
                  {prod.precio && (
                    <span style={{ color: "#00f5d4", fontSize: "0.82rem", fontWeight: 800 }}>
                      {formatPrecioPedido(prod.precio, pedido.moneda)}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>Sin productos registrados</div>
            )}
          </div>
        </div>

        {/* Comprobante */}
        <Comprobante url={pedido.comprobanteUrl} />
      </div>
    </div>
  );
}

// ─── Componente Principal (Mobile 1 React Bits Pro) ───────────────────────────
export default function MisPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [role, setRole] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [ordenar, setOrdenar] = useState("reciente");
  const [user, setUser] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [activeTab, setActiveTab] = useState("todos");
  const [copiedKey, setCopiedKey] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos"); // 'todos' | 'ocultar_duplicados' | 'solo_duplicados' | 'solo_fantasmas'
  const [limpiando, setLimpiando] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then(docSnap => {
      setRole(docSnap.exists() ? (docSnap.data().role || "user") : "user");
    });
  }, [user]);

  useEffect(() => {
    if (!user || !role) return;
    setCargando(true);
    if (role === "admin") {
      getDocs(collection(db, "orders")).then(snap => {
        const porUsuario = {};
        snap.docs.forEach(d => {
          const pedido = { id: d.id, ...d.data() };
          const uid = pedido.uid || "desconocido";
          if (!porUsuario[uid]) {
            porUsuario[uid] = {
              userId: uid,
              pedidos: [],
              user: { displayName: pedido.nombre || pedido.email || uid, email: pedido.email || "" }
            };
          }
          porUsuario[uid].pedidos.push(pedido);
        });
        setPedidos(Object.values(porUsuario).filter(u => u.pedidos.length > 0));
        setCargando(false);
      }).catch(() => setCargando(false));
    } else {
      getDocs(collection(db, `users/${user.uid}/orders`)).then(snapshot => {
        setPedidos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setCargando(false);
      }).catch(() => setCargando(false));
    }
  }, [user, role]);

  const handleCopyKey = (keyText) => {
    if (!keyText) return;
    navigator.clipboard.writeText(keyText);
    setCopiedKey(keyText);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  // Flattened orders list for calculations
  const allUserPedidos = useMemo(() => {
    if (!Array.isArray(pedidos)) return [];
    return role === "admin"
      ? pedidos.flatMap(u => (Array.isArray(u.pedidos) ? u.pedidos : []))
      : pedidos;
  }, [role, pedidos]);

  // Duplicate & ghost detection
  const { duplicateIds, ghostIds } = useMemo(() => {
    return detectDuplicates(allUserPedidos);
  }, [allUserPedidos]);

  // Counters for Mobile 1 badges (ignoring ghosts in pending/delivered)
  const totalCount = allUserPedidos.length;
  const pendingCount = allUserPedidos.filter(p => !ghostIds.has(p.id) && (p.transferenciaEstado || "pendiente") === "pendiente").length;
  const successCount = allUserPedidos.filter(p => !ghostIds.has(p.id) && ((p.transferenciaEstado || "pendiente") === "exitoso" || !["transferencia", "prex", "crypto"].includes(p.metodoPago))).length;
  const allKeys = allUserPedidos.filter(p => {
    if (!p.licenseKey) return false;
    if (role === "admin") return true;
    const esManual = ["transferencia", "prex", "crypto"].includes(p.metodoPago);
    const estado = p.transferenciaEstado || p.estado || "pendiente";
    return estado === "exitoso" || (!esManual && (p.status === "approved" || p.estado === "exitoso"));
  });
  const keysCount = allKeys.length;

  // Single order delete handler
  const handleDeletePedido = async (pedidoId, targetUserId) => {
    const esDup = duplicateIds.has(pedidoId);
    const esGhost = ghostIds.has(pedidoId);
    const tipo = esDup ? "copia duplicada" : esGhost ? "pedido fantasma" : "pedido";

    if (!window.confirm(`¿Estás seguro de eliminar permanentemente este ${tipo} (${pedidoId}) de la base de datos?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "orders", pedidoId));
      if (targetUserId && targetUserId !== "desconocido" && targetUserId !== "guest") {
        try {
          await deleteDoc(doc(db, `users/${targetUserId}/orders`, pedidoId));
        } catch (_) {}
      }

      setPedidos(prev => {
        if (role === "admin") {
          return prev
            .map(u => ({
              ...u,
              pedidos: u.pedidos.filter(p => p.id !== pedidoId)
            }))
            .filter(u => u.pedidos.length > 0);
        } else {
          return prev.filter(p => p.id !== pedidoId);
        }
      });
      alert(`¡${tipo.charAt(0).toUpperCase() + tipo.slice(1)} eliminado con éxito!`);
    } catch (err) {
      alert("Error al eliminar pedido: " + err.message);
    }
  };

  // Bulk cleanup of duplicates and ghosts
  const handleLimpiarDuplicadosYFantasmas = async (dupsSet, ghostsSet) => {
    const totalAEliminar = dupsSet.size + ghostsSet.size;
    if (totalAEliminar === 0) {
      alert("No se detectaron pedidos duplicados ni pedidos vacíos para limpiar.");
      return;
    }

    const confirmMsg = `Se eliminarán permanentemente de la base de datos:\n` +
      (dupsSet.size > 0 ? `• ${dupsSet.size} copias de pedidos duplicados (conservando 1 pedido original legítimo por cada compra)\n` : "") +
      (ghostsSet.size > 0 ? `• ${ghostsSet.size} pedidos fantasmas vacíos (sin productos)\n` : "") +
      `\n¿Deseas proceder con la limpieza automática?`;

    if (!window.confirm(confirmMsg)) return;

    setLimpiando(true);
    let eliminados = 0;
    const allIdsToDelete = new Set([...dupsSet, ...ghostsSet]);

    try {
      for (const id of allIdsToDelete) {
        try {
          await deleteDoc(doc(db, "orders", id));
          const pObj = allUserPedidos.find(p => p.id === id);
          if (pObj && pObj.uid && pObj.uid !== "desconocido" && pObj.uid !== "guest") {
            try {
              await deleteDoc(doc(db, `users/${pObj.uid}/orders`, id));
            } catch (_) {}
          }
          eliminados++;
        } catch (e) {
          console.error("Error al eliminar pedido " + id, e);
        }
      }

      setPedidos(prev => {
        if (role === "admin") {
          return prev
            .map(u => ({
              ...u,
              pedidos: u.pedidos.filter(p => !allIdsToDelete.has(p.id))
            }))
            .filter(u => u.pedidos.length > 0);
        } else {
          return prev.filter(p => !allIdsToDelete.has(p.id));
        }
      });

      alert(`¡Limpieza completada!\nSe eliminaron ${eliminados} pedidos duplicados y fantasmas con éxito.`);
    } catch (err) {
      alert("Error durante la limpieza: " + err.message);
    } finally {
      setLimpiando(false);
    }
  };

  // Filter & sort logic for admin (only computed if user is admin)
  const filteredAdmin = useMemo(() => {
    if (role !== "admin" || !Array.isArray(pedidos)) return [];
    return pedidos.map(u => ({
      ...u,
      pedidos: (Array.isArray(u.pedidos) ? u.pedidos : []).filter(p => {
        if (filtroTipo === "ocultar_duplicados" && (duplicateIds.has(p.id) || ghostIds.has(p.id))) return false;
        if (filtroTipo === "solo_duplicados" && !duplicateIds.has(p.id)) return false;
        if (filtroTipo === "solo_fantasmas" && !ghostIds.has(p.id)) return false;

        if (!busqueda.trim()) return true;
        const q = busqueda.toLowerCase();
        return (
          (u.user?.displayName || "").toLowerCase().includes(q) ||
          (u.user?.email || "").toLowerCase().includes(q) ||
          (u.userId || "").toLowerCase().includes(q) ||
          (p.nombre || "").toLowerCase().includes(q) ||
          (p.email || "").toLowerCase().includes(q) ||
          (p.id || "").toLowerCase().includes(q)
        );
      })
    })).filter(u => Array.isArray(u.pedidos) && u.pedidos.length > 0);
  }, [role, pedidos, filtroTipo, duplicateIds, ghostIds, busqueda]);

  const sortedAdmin = useMemo(() => {
    if (role !== "admin" || !Array.isArray(filteredAdmin)) return [];
    return [...filteredAdmin].sort((a, b) => {
      const aList = Array.isArray(a.pedidos) ? a.pedidos : [];
      const bList = Array.isArray(b.pedidos) ? b.pedidos : [];
      const fa = aList.length > 0 ? Math.max(...aList.map(p => p.fecha ? new Date(p.fecha).getTime() : 0)) : 0;
      const fb = bList.length > 0 ? Math.max(...bList.map(p => p.fecha ? new Date(p.fecha).getTime() : 0)) : 0;
      return ordenar === "reciente" ? fb - fa : fa - fb;
    });
  }, [role, filteredAdmin, ordenar]);

  // Filter & sort logic for user
  const sortedUser = useMemo(() => {
    if (role === "admin" || !Array.isArray(pedidos)) return [];
    return [...pedidos].sort((a, b) => {
      const fa = a.fecha ? new Date(a.fecha).getTime() : 0;
      const fb = b.fecha ? new Date(b.fecha).getTime() : 0;
      return ordenar === "reciente" ? fb - fa : fa - fb;
    });
  }, [role, pedidos, ordenar]);

  // Filter user orders by tab
  const getTabFilteredUserPedidos = () => {
    if (activeTab === "pendientes") {
      return sortedUser.filter(p => !ghostIds.has(p.id) && (p.transferenciaEstado || "pendiente") === "pendiente");
    }
    if (activeTab === "entregados") {
      return sortedUser.filter(p => !ghostIds.has(p.id) && ((p.transferenciaEstado || "pendiente") === "exitoso" || !["transferencia", "prex", "crypto"].includes(p.metodoPago)));
    }
    return sortedUser;
  };

  const currentTabUserPedidos = getTabFilteredUserPedidos();

  // Five Tabs Definition with icons and badges
  const TABS = [
    { id: "todos",      label: "Todos",      icon: Package,       badge: totalCount > 0 ? totalCount : null, badgeClass: "" },
    { id: "pendientes", label: "Pendientes", icon: Clock,         badge: pendingCount > 0 ? pendingCount : null, badgeClass: "mobile1-badge--pending" },
    { id: "entregados", label: "Entregados", icon: CheckCircle2,  badge: successCount > 0 ? successCount : null, badgeClass: "mobile1-badge--success" },
    { id: "licencias",  label: "Licencias",  icon: KeyRound,      badge: keysCount > 0 ? keysCount : null, badgeClass: "" },
    { id: "soporte",    label: "Soporte",    icon: Headphones,    badge: null, badgeClass: "" },
  ];

  const activeTabIndex = Math.max(0, TABS.findIndex(t => t.id === activeTab));

  return (
    <div className="mispedidos-root">
      <style>{`@keyframes pandaSpin { to { transform: rotate(360deg); } }`}</style>

      {/* Loading Overlay */}
      {cargando && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(6,3,18,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(26,16,53,0.98), rgba(45,25,80,0.98))",
            border: "1px solid rgba(0,245,212,0.4)",
            borderRadius: 24,
            padding: "2.5rem 2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            minWidth: 270,
            boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(0,245,212,0.2)"
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "3.5px solid rgba(0,245,212,0.2)",
              borderTop: "3.5px solid #00f5d4",
              animation: "pandaSpin 0.9s linear infinite"
            }} />
            <div style={{ color: "#ffffff", fontWeight: 800, fontSize: "1rem" }}>
              {role === "admin" ? "Cargando órdenes de la tienda..." : "Cargando tus pedidos..."}
            </div>
            <div style={{ color: "#00f5d4", fontSize: "0.75rem", fontWeight: 700 }}>
              PandaStore Oficial
            </div>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="mispedidos-hero">
        <div className="mispedidos-hero-left">
          <div className="mispedidos-hero-icon">
            <Package size={24} />
          </div>
          <div>
            <h1 className="mispedidos-hero-title">
              {role === "admin" ? "Panel de Pedidos" : "Mis Pedidos"}
            </h1>
            <p className="mispedidos-hero-sub">
              {role === "admin"
                ? `${totalCount} pedido${totalCount !== 1 ? "s" : ""} de ${pedidos.length} cliente${pedidos.length !== 1 ? "s" : ""}`
                : `${totalCount} pedido${totalCount !== 1 ? "s" : ""} registrado${totalCount !== 1 ? "s" : ""} • Historial de compras y licencias`}
            </p>
          </div>
        </div>

        {!cargando && totalCount > 0 && (
          <div className="mispedidos-hero-controls">
            {role === "admin" && (
              <>
                <select
                  value={filtroTipo}
                  onChange={e => setFiltroTipo(e.target.value)}
                  className="mispedidos-sort-select"
                  style={{ borderColor: filtroTipo !== "todos" ? "#00f5d4" : "rgba(162,89,255,0.3)" }}
                >
                  <option value="todos">Todos los pedidos ({totalCount})</option>
                  <option value="ocultar_duplicados">Ocultar copias y vacíos</option>
                  {duplicateIds.size > 0 && <option value="solo_duplicados">Solo duplicados ({duplicateIds.size})</option>}
                  {ghostIds.size > 0 && <option value="solo_fantasmas">Solo fantasmas / vacíos ({ghostIds.size})</option>}
                </select>

                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Buscar cliente, ID o email..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="mispedidos-search-input"
                  />
                </div>
              </>
            )}
            <select
              value={ordenar}
              onChange={e => setOrdenar(e.target.value)}
              className="mispedidos-sort-select"
            >
              <option value="reciente">Más recientes</option>
              <option value="antiguo">Más antiguos</option>
            </select>
          </div>
        )}
      </div>

      {/* Banner de Limpieza de Duplicados y Fantasmas para Admin */}
      {role === "admin" && (duplicateIds.size > 0 || ghostIds.size > 0) && (
        <div className="mispedidos-alert-banner">
          <div className="mispedidos-alert-banner-left">
            <div className="mispedidos-alert-banner-icon">
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="mispedidos-alert-banner-title">
                Se detectaron {duplicateIds.size > 0 ? `${duplicateIds.size} pedido(s) duplicado(s)` : ""}{duplicateIds.size > 0 && ghostIds.size > 0 ? " y " : ""}{ghostIds.size > 0 ? `${ghostIds.size} pedido(s) fantasma(s) vacíos` : ""}
              </div>
              <div className="mispedidos-alert-banner-desc">
                Clientes que enviaron múltiples veces el mismo pedido por clics repetidos, o registros vacíos sin productos. Puedes depurarlos en 1 clic dejando intacto 1 pedido original.
              </div>
            </div>
          </div>
          <div className="mispedidos-alert-banner-actions">
            <button
              type="button"
              className="mispedidos-clean-btn"
              disabled={limpiando}
              onClick={() => handleLimpiarDuplicadosYFantasmas(duplicateIds, ghostIds)}
            >
              <Sparkles size={15} />
              <span>{limpiando ? "Limpiando pedidos..." : `🧹 Limpiar Todo (${duplicateIds.size + ghostIds.size})`}</span>
            </button>
            <button
              type="button"
              className={`mispedidos-filter-btn${filtroTipo === "ocultar_duplicados" ? " active" : ""}`}
              onClick={() => setFiltroTipo(prev => prev === "ocultar_duplicados" ? "todos" : "ocultar_duplicados")}
            >
              <Filter size={14} />
              <span>{filtroTipo === "ocultar_duplicados" ? "Mostrar todos" : "Ocultar duplicados"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          "MOBILE 1" REACT BITS PRO FIVE-TAB BOTTOM BAR WITH SPRING INDICATOR
          ==================================================================== */}
      <div className="mobile1-tab-bar-wrapper">
        <div className="mobile1-tab-bar">
          {/* Fluid Spring Physics Sliding Capsule */}
          <div
            className="mobile1-spring-indicator"
            style={{
              transform: `translateX(${activeTabIndex * 100}%)`,
            }}
          />

          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`mobile1-tab-btn${isActive ? " active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                aria-label={tab.label}
              >
                <div className="mobile1-tab-icon-wrap">
                  <Icon size={19} className="mobile1-tab-icon" />
                  {tab.badge !== null && tab.badge > 0 && (
                    <span className={`mobile1-badge ${tab.badgeClass}`}>
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  )}
                </div>
                <span className="mobile1-tab-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          CROSSFADING PANELS PER TAB
          ==================================================================== */}

      {/* TAB 1: TODOS (List of all orders) */}
      {activeTab === "todos" && (
        <div key="panel-todos" className="mobile1-panel">
          {role === "admin" ? (
            <div>
              {sortedAdmin.length === 0 ? (
                <div className="mispedidos-empty">
                  <div className="mispedidos-empty-icon"><Search size={26} /></div>
                  <h3 className="mispedidos-empty-title">Sin pedidos coincidentes</h3>
                  <p className="mispedidos-empty-sub">No se encontraron pedidos con el término o filtro actual.</p>
                </div>
              ) : (
                sortedAdmin.map(({ userId, pedidos: userPedidos, user: uInfo }) => {
                  const sorted = [...userPedidos].sort((a, b) => {
                    const fa = a.fecha ? new Date(a.fecha).getTime() : 0;
                    const fb = b.fecha ? new Date(b.fecha).getTime() : 0;
                    return ordenar === "reciente" ? fb - fa : fa - fb;
                  });
                  return (
                    <div key={userId} style={{ marginBottom: 28 }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 12, marginBottom: 10,
                        background: "rgba(162,89,255,0.08)", borderRadius: 12,
                        border: "1px solid rgba(162,89,255,0.2)", padding: "10px 16px"
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: "linear-gradient(135deg,#7b2ff2,#00f5d4)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 900, fontSize: 16, color: "#031411", flexShrink: 0
                        }}>
                          {(uInfo?.displayName || "?")[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: "#ffffff", fontWeight: 800, fontSize: "0.92rem" }}>
                            {uInfo?.displayName || userId}
                          </div>
                          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.75rem" }}>
                            {uInfo?.email || userId}
                          </div>
                        </div>
                        <div style={{
                          background: "rgba(0,245,212,0.12)", color: "#00f5d4",
                          borderRadius: 999, padding: "2px 10px", fontSize: "0.72rem", fontWeight: 800
                        }}>
                          {sorted.length} pedido{sorted.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      {sorted.map(pedido => (
                        <PedidoCard
                          key={pedido.id}
                          pedido={pedido}
                          userId={userId}
                          isAdmin={true}
                          setPedidos={setPedidos}
                          onCopyKey={handleCopyKey}
                          copiedKey={copiedKey}
                          isDuplicate={duplicateIds.has(pedido.id)}
                          isGhost={ghostIds.has(pedido.id)}
                          onDeletePedido={handleDeletePedido}
                        />
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div>
              {sortedUser.length === 0 ? (
                <div className="mispedidos-empty">
                  <div className="mispedidos-empty-icon"><Package size={26} /></div>
                  <h3 className="mispedidos-empty-title">Aún no tienes pedidos registrados</h3>
                  <p className="mispedidos-empty-sub">Explora nuestro catálogo con los mejores precios en juegos y suscripciones.</p>
                  <Link
                    to="/categorias"
                    style={{
                      marginTop: 8,
                      background: "linear-gradient(135deg, #7b2ff2 0%, #00f5d4 100%)",
                      color: "#031411",
                      padding: "9px 20px",
                      borderRadius: 12,
                      fontWeight: 800,
                      fontSize: "0.84rem",
                      textDecoration: "none"
                    }}
                  >
                    Ver Catálogo Oficial
                  </Link>
                </div>
              ) : (
                sortedUser.map(pedido => (
                  <PedidoCard
                    key={pedido.id}
                    pedido={pedido}
                    userId={user?.uid}
                    isAdmin={false}
                    setPedidos={setPedidos}
                    onCopyKey={handleCopyKey}
                    copiedKey={copiedKey}
                    isDuplicate={duplicateIds.has(pedido.id)}
                    isGhost={ghostIds.has(pedido.id)}
                    onDeletePedido={handleDeletePedido}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PENDIENTES */}
      {activeTab === "pendientes" && (
        <div key="panel-pendientes" className="mobile1-panel">
          {pendingCount > 0 && (
            <div className="mispedidos-notice-box">
              <div className="mispedidos-notice-content">
                <span className="mispedidos-notice-icon">⏳</span>
                <div className="mispedidos-notice-text">
                  <strong>Verificación en curso:</strong> Tu pedido está siendo revisado por nuestro equipo. Las transferencias y pagos manuales se validan y entregan en <strong>menos de 10 minutos</strong>.
                </div>
              </div>
              <a
                href="https://wa.me/56974751810?text=Hola!%20Tengo%20un%20pedido%20pendiente%20en%20PandaStore%20y%20quiero%20agilizar%20la%20entrega"
                target="_blank"
                rel="noopener noreferrer"
                className="mispedidos-notice-btn"
              >
                <span>⚡ Agilizar por WhatsApp</span>
              </a>
            </div>
          )}

          {currentTabUserPedidos.length === 0 ? (
            <div className="mispedidos-empty">
              <div className="mispedidos-empty-icon" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                <CheckCircle2 size={26} />
              </div>
              <h3 className="mispedidos-empty-title">¡No tienes pedidos pendientes!</h3>
              <p className="mispedidos-empty-sub">Todos tus pedidos han sido procesados y aprobados con éxito.</p>
            </div>
          ) : (
            currentTabUserPedidos.map(pedido => (
              <PedidoCard
                key={pedido.id}
                pedido={pedido}
                userId={pedido.uid || user?.uid}
                isAdmin={role === "admin"}
                setPedidos={setPedidos}
                onCopyKey={handleCopyKey}
                copiedKey={copiedKey}
                isDuplicate={duplicateIds.has(pedido.id)}
                isGhost={ghostIds.has(pedido.id)}
                onDeletePedido={handleDeletePedido}
              />
            ))
          )}
        </div>
      )}

      {/* TAB 3: ENTREGADOS */}
      {activeTab === "entregados" && (
        <div key="panel-entregados" className="mobile1-panel">
          {currentTabUserPedidos.length === 0 ? (
            <div className="mispedidos-empty">
              <div className="mispedidos-empty-icon"><CheckCircle2 size={26} /></div>
              <h3 className="mispedidos-empty-title">Sin pedidos entregados aún</h3>
              <p className="mispedidos-empty-sub">Cuando tu pago sea verificado, tus juegos y accesos se listarán aquí.</p>
            </div>
          ) : (
            currentTabUserPedidos.map(pedido => (
              <PedidoCard
                key={pedido.id}
                pedido={pedido}
                userId={pedido.uid || user?.uid}
                isAdmin={role === "admin"}
                setPedidos={setPedidos}
                onCopyKey={handleCopyKey}
                copiedKey={copiedKey}
                isDuplicate={duplicateIds.has(pedido.id)}
                isGhost={ghostIds.has(pedido.id)}
                onDeletePedido={handleDeletePedido}
              />
            ))
          )}
        </div>
      )}

      {/* TAB 4: CYBER VAULT - LICENCIAS & CLAVES */}
      {activeTab === "licencias" && (
        <div key="panel-licencias" className="mobile1-panel">
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 4px 0", color: "#00f5d4" }}>
              🔑 Bóveda Digital de Licencias & Accesos
            </h2>
            <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>
              Copia tus claves de PandaStore Launcher y Steam con un solo clic para activar tus juegos al instante.
            </p>
          </div>

          {allKeys.length === 0 ? (
            <div className="mispedidos-empty">
              <div className="mispedidos-empty-icon" style={{ background: "rgba(0,245,212,0.12)", color: "#00f5d4" }}>
                <KeyRound size={26} />
              </div>
              <h3 className="mispedidos-empty-title">Sin licencias registradas aún</h3>
              <p className="mispedidos-empty-sub">
                Tus claves de PandaStore Launcher o Steam aparecerán aquí en cuanto tu pedido sea confirmado.
              </p>
            </div>
          ) : (
            <div className="vault-grid">
              {allKeys.map(pedido => {
                const prodNames = Array.isArray(pedido.productos) && pedido.productos.length > 0
                  ? pedido.productos.map(p => p.name).join(", ")
                  : "PandaStore Launcher (Steam)";
                const isCopied = copiedKey === pedido.licenseKey;
                return (
                  <div key={pedido.id} className="vault-card">
                    <div className="vault-card-header">
                      <span className="vault-card-badge">
                        <Sparkles size={11} />
                        <span>Licencia Activa</span>
                      </span>
                      <span className="vault-card-date">{fmtFecha(pedido.fecha)}</span>
                    </div>

                    <h3 className="vault-game-name">{prodNames}</h3>

                    <div className="vault-key-box">
                      <span className="vault-key-code">{pedido.licenseKey}</span>
                      <button
                        type="button"
                        className="vault-copy-btn"
                        onClick={() => handleCopyKey(pedido.licenseKey)}
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{isCopied ? "¡Copiado!" : "Copiar"}</span>
                      </button>
                    </div>

                    <div className="vault-actions">
                      <Link to="/instalacion-activador" className="vault-action-btn">
                        <Download size={13} />
                        <span>Descargar Launcher</span>
                      </Link>
                      <a
                        href="https://wa.me/56974751810?text=Hola!%20Necesito%20ayuda%20para%20activar%20mi%20clave%20PandaStore"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vault-action-btn"
                      >
                        <Headphones size={13} />
                        <span>Soporte Técnico</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: SOPORTE & AYUDA */}
      {activeTab === "soporte" && (
        <div key="panel-soporte" className="mobile1-panel">
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 4px 0", color: "#a259ff" }}>
              🎧 Centro de Ayuda & Asistencia VIP
            </h2>
            <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>
              ¿Tienes dudas con tu pedido o la instalación de tus juegos? Estamos disponibles 24/7.
            </p>
          </div>

          <div className="support-grid">
            {/* WhatsApp Direct */}
            <div className="support-card support-card--highlight">
              <div className="support-icon-wrap" style={{ background: "rgba(37,211,102,0.15)", color: "#25d366" }}>
                💬
              </div>
              <h3 className="support-title">Soporte WhatsApp 24/7</h3>
              <p className="support-desc">
                Atención personalizada con un agente real. Resolución de pagos, activación de claves y dudas en menos de 5 minutos.
              </p>
              <a
                href="https://wa.me/56974751810?text=Hola%20PandaStore!%20Necesito%20ayuda%20con%20uno%20de%20mis%20pedidos"
                target="_blank"
                rel="noopener noreferrer"
                className="support-action-btn support-action-btn--wsp"
              >
                <span>Chatear por WhatsApp Oficial</span>
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Tutorial Steam */}
            <div className="support-card">
              <div className="support-icon-wrap" style={{ background: "rgba(123,47,242,0.15)", color: "#a259ff" }}>
                <Download size={22} />
              </div>
              <h3 className="support-title">Instalación PandaStore Launcher</h3>
              <p className="support-desc">
                Descarga el activador oficial para Steam PC, ingresa tu clave y disfruta de tu biblioteca completa al instante.
              </p>
              <Link to="/instalacion-activador" className="support-action-btn support-action-btn--ghost">
                <span>Ver Tutorial Launcher Steam</span>
                <ExternalLink size={14} />
              </Link>
            </div>

            {/* Tutorial Switch */}
            <div className="support-card">
              <div className="support-icon-wrap" style={{ background: "rgba(255,42,109,0.15)", color: "#ff2a6d" }}>
                🎮
              </div>
              <h3 className="support-title">Guía Nintendo Switch</h3>
              <p className="support-desc">
                Instrucciones paso a paso para vincular tu cuenta y descargar tus juegos directamente en tu consola Switch 1 o 2.
              </p>
              <Link to="/instalacion-nintendo" className="support-action-btn support-action-btn--ghost">
                <span>Ver Guía Nintendo Switch</span>
                <ExternalLink size={14} />
              </Link>
            </div>

            {/* Tutorial PS4/PS5 */}
            <div className="support-card">
              <div className="support-icon-wrap" style={{ background: "rgba(0,112,209,0.15)", color: "#60a5fa" }}>
                🕹️
              </div>
              <h3 className="support-title">Guía PlayStation (PS4 / PS5)</h3>
              <p className="support-desc">
                Aprende a activar tu cuenta principal o secundaria para jugar desde tu propio usuario con trofeos y guardado.
              </p>
              <Link to="/instalacion-playstation" className="support-action-btn support-action-btn--ghost">
                <span>Ver Guía PlayStation</span>
                <ExternalLink size={14} />
              </Link>
            </div>

            {/* FAQ & Garantía */}
            <div className="support-card">
              <div className="support-icon-wrap" style={{ background: "rgba(0,245,212,0.12)", color: "#00f5d4" }}>
                <ShieldCheck size={22} />
              </div>
              <h3 className="support-title">Garantía & Preguntas Frecuentes</h3>
              <p className="support-desc">
                Todos nuestros productos cuentan con garantía de funcionamiento y soporte continuo. Consulta los términos de compra.
              </p>
              <Link to="/terminos" className="support-action-btn support-action-btn--ghost">
                <span>Garantía & Términos</span>
                <BookOpen size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
