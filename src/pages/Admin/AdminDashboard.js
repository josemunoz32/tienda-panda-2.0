import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";
import { onValue, ref } from "firebase/database";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { auth, db, database } from "../../firebase";
import "./AdminDashboard.css";
import { useMoneda } from "../../context/MonedaContext";
import { slugify } from "../../utils/slugify";
import steamImportData from "../../assets/steam_import_data.json";

const PERIODS = [["hoy", "Hoy"], ["semana", "7 días"], ["mes", "30 días"], ["3meses", "3 meses"], ["todo", "Todo"]];
const PAID = new Set(["exitoso", "completado", "aprobado", "pagado", "paid", "completed", "approved"]);
const dateOf = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? null : result;
};
const isPaid = (order) => order.entregado === true || order.pagoConfirmado === true || PAID.has(String(order.estado || order.status || order.paymentStatus || "").toLowerCase());
const orderDate = (order) => dateOf(order.fecha || order.createdAt || order.timestamp);
const itemsOf = (order) => [order.productos, order.items, order.cart, order.products].find(Array.isArray) || [];
// Firestore debería guardar montos como número, pero los pedidos antiguos pueden
// traer "$ 10.000" o "10,000". Se normalizan sin asumir ni redondear valores.
const numberValue = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const raw = value.trim().replace(/[^0-9,.-]/g, "");
  if (!raw) return 0;
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalized = raw;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    normalized = raw.replace(decimal === "," ? /\./g : /,/g, "").replace(decimal, ".");
  } else if (lastComma >= 0) normalized = /,\d{1,2}$/.test(raw) ? raw.replace(",", ".") : raw.replace(/,/g, "");
  else if (/\.\d{3}(\.\d{3})+$/.test(raw) || /\.\d{3}$/.test(raw)) normalized = raw.replace(/\./g, "");
  const result = Number(normalized);
  return Number.isFinite(result) ? result : 0;
};
const money = (amount, currency = "CLP") => new Intl.NumberFormat(currency === "USD" ? "en-US" : "es-CL", { style: "currency", currency, maximumFractionDigits: currency === "CLP" ? 0 : 2 }).format(numberValue(amount));
const displayName = (item) => item?.name || item?.nombre || item?.title || item?.productName || "Producto sin nombre";
const eventDate = (event) => dateOf(event.timestamp || event.createdAt);

const formatSlug = (slug) => {
  if (!slug) return "";
  return slug
    .replace(/^ryuu_/, "")
    .replace(/--[a-zA-Z0-9_-]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const resolveCategoryName = (catSlug) => {
  if (!catSlug) return "General";
  const clean = String(catSlug).toLowerCase().trim();
  const known = {
    "juegos-steam": "Juegos Steam",
    "steam": "Juegos Steam",
    "nintendo-switch": "Nintendo Switch",
    "switch": "Nintendo Switch",
    "playstation": "PlayStation",
    "playstation-4": "PlayStation 4",
    "playstation-5": "PlayStation 5",
    "ps4": "PlayStation 4",
    "ps5": "PlayStation 5",
    "streaming": "Streaming",
    "cuentas-streaming": "Cuentas Streaming",
    "suscripciones": "Suscripciones",
    "packs-nintendo": "Packs Nintendo",
    "promos": "Promociones",
    "ofertas": "Ofertas",
    "emprendedores": "Emprendedores",
    "consolas": "Consolas",
  };
  if (known[clean]) return known[clean];
  return formatSlug(clean);
};

const getProductTitleFromPage = (page, products = []) => {
  if (!page || !page.startsWith("/producto/")) return null;
  const rawParam = decodeURIComponent(page.replace("/producto/", "").replace(/\?.*/, "")).trim();
  if (!rawParam) return null;

  const idFromParam = rawParam.includes("--") ? rawParam.split("--").pop() : rawParam;
  const slugPart = rawParam.includes("--") ? rawParam.split("--")[0] : rawParam;

  // 1. Buscar en productos de la tienda (Firestore)
  if (Array.isArray(products) && products.length > 0) {
    const found = products.find((p) => {
      if (!p) return false;
      if (p.id === idFromParam || p.id === rawParam) return true;
      if (p.slug && (p.slug === rawParam || p.slug === slugPart)) return true;
      const pName = (p.name || p.nombre || p.title || "").trim();
      if (pName && (slugify(pName) === slugPart || slugify(pName) === rawParam)) return true;
      return false;
    });
    if (found) return found.name || found.nombre || found.title;
  }

  // 2. Buscar en steamImportData
  const numId = idFromParam.replace(/^ryuu_/, "");
  if (numId && /^\d+$/.test(numId)) {
    const sMatch = steamImportData.find((s) => String(s.app_id || s.id) === numId);
    if (sMatch && sMatch.name) return sMatch.name;
  }
  const sByName = steamImportData.find((s) => s.name && slugify(s.name) === slugPart);
  if (sByName && sByName.name) return sByName.name;

  // 3. Fallback: formatear el slug amigablemente
  return formatSlug(slugPart);
};

const pageLabel = (page, products = []) => {
  const clean = String(page || "/").replace(/\?.*/, "");
  const known = {
    "/home": "Inicio",
    "/productos": "Catálogo de Productos",
    "/promos": "Promociones",
    "/checkoutcarrito": "Carrito de Compras",
    "/comprar-ahora": "Checkout / Pago",
    "/iniciar-sesion": "Inicio de Sesión",
    "/packs-nintendo": "Packs Nintendo Switch",
    "/categorias": "Categorías",
    "/descargar-launcher": "Descargar Launcher",
    "/mis-pedidos": "Mis Pedidos",
  };
  if (known[clean]) return known[clean];

  if (clean.startsWith("/producto/")) {
    const title = getProductTitleFromPage(clean, products);
    return title ? `Ficha: ${title}` : "Ficha de producto";
  }

  if (clean.startsWith("/categoria/")) {
    const catSlug = decodeURIComponent(clean.replace("/categoria/", "")).trim();
    const catName = resolveCategoryName(catSlug);
    return `Categoría: ${catName}`;
  }

  return clean === "/" ? "Inicio" : clean;
};

const eventSummary = (event, products = []) => {
  if (event.event === "page_view") return `Vio ${pageLabel(event.page, products)}`;
  if (event.event === "view_item") return `Vio el juego: ${event.productName || "sin nombre"}`;
  if (event.event === "add_to_cart") return `Agregó al carrito: ${event.productName || "producto"}`;
  if (event.event === "remove_from_cart") return `Quitó del carrito: ${event.productName || "producto"}`;
  if (event.event === "begin_checkout") return "Inició el checkout";
  if (event.event === "purchase") return "Registró una compra";
  if (event.event === "search") return `Buscó: ${event.searchTerm || event.query || "sin término"}`;
  if (event.event === "click_whatsapp") return "Abrió WhatsApp";
  if (event.event === "click_instagram") return "Abrió Instagram";
  if (event.event === "login") return "Inició sesión";
  if (event.event === "sign_up") return "Creó una cuenta";
  return event.event || "Actividad registrada";
};
const eventTime = (event) => {
  const date = eventDate(event);
  return date ? date.toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Pendiente";
};
const orderCurrency = (order) => {
  const raw = String(order.moneda || order.currency || order.monedaLocal || "").trim().toUpperCase();
  if (raw.includes("USD") || raw.includes("US$") || raw.includes("DOLAR")) return "USD";
  // Algunos registros antiguos sólo tenían el total USD, sin el campo moneda.
  if (!raw && order.totalUSD !== undefined && order.totalUSD !== null && (order.totalCLP === undefined || order.totalCLP === null)) return "USD";
  return "CLP";
};
const orderAmount = (order, currency = orderCurrency(order)) => numberValue(currency === "USD"
  ? order.totalUSD ?? order.totalUsd ?? order.total ?? order.amount ?? order.monto
  : order.totalCLP ?? order.totalClp ?? order.total ?? order.totalPrice ?? order.amount ?? order.monto);

function cutOff(period) {
  if (period === "todo") return null;
  const result = new Date();
  if (period === "hoy") result.setHours(0, 0, 0, 0);
  if (period === "semana") result.setDate(result.getDate() - 7);
  if (period === "mes") result.setMonth(result.getMonth() - 1);
  if (period === "3meses") result.setMonth(result.getMonth() - 3);
  return result;
}

function Empty({ children }) { return <div className="adm-table-empty">{children}</div>; }
function RankedList({ items, empty, value }) {
  return items.length ? <div className="adm-event-feed">{items.map((item, index) => <div className="adm-event-row" key={item.key || item.name || item.term}><span className="adm-event-badge">#{index + 1}</span><span className="adm-event-prod" title={item.name || item.term}>{item.name || item.term}</span><b className="adm-event-val">{value(item)}</b></div>)}</div> : <Empty>{empty}</Empty>;
}

export default function AdminDashboard() {
  const { valorDolar } = useMoneda();
  const [store, setStore] = useState(null);
  const [events, setEvents] = useState([]);
  const [online, setOnline] = useState({ total: 0, guests: 0, users: 0, visitors: [], checkedAt: null });
  const [period, setPeriod] = useState("todo");
  const [selectedVisitorKey, setSelectedVisitorKey] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all(["users", "products", "orders"].map(async (name) => {
      const snapshot = await getDocs(collection(db, name));
      return [name, snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))];
    })).then((entries) => active && setStore(Object.fromEntries(entries))).catch(() => active && setLoadError("No fue posible cargar parte de los datos de la tienda."));
    return () => { active = false; };
  }, []);

  // No limit here: the daily totals and peak/low days must use all recorded
  // events, not an arbitrary sample of the latest records.
  useEffect(() => {
    if (!database) return;
    return onValue(ref(database, "presence"), (snapshot) => {
    const cutoff = Date.now() - 90000;
    const visitors = [];
    Object.entries(snapshot.val() || {}).forEach(([identity, entry]) => {
      // The current format stores one child per browser tab. Support the old
      // flat format while stale clients finish upgrading.
      const tabs = entry?.online ? [["legacy", entry]] : Object.entries(entry || {});
      const activeTabs = tabs
        .map(([tabId, value]) => ({ tabId, ...value }))
        .filter((tab) => tab.online && typeof tab.lastSeen === "number" && tab.lastSeen >= cutoff)
        .sort((a, b) => b.lastSeen - a.lastSeen);
      if (!activeTabs.length) return;
      const latest = activeTabs[0];
      const signedIn = latest.uid && latest.uid !== "anon";
      visitors.push({
        id: identity,
        kind: signedIn ? "Cuenta" : "Invitado",
        isSelf: signedIn && latest.uid === auth.currentUser?.uid,
        page: pageLabel(latest.page, store?.products),
        path: latest.page || "/",
        tabs: activeTabs.length,
        lastSeen: latest.lastSeen,
      });
    });
    visitors.sort((a, b) => b.lastSeen - a.lastSeen);
    setOnline({
      total: visitors.length,
      guests: visitors.filter((visitor) => visitor.kind === "Invitado").length,
      users: visitors.filter((visitor) => visitor.kind === "Cuenta").length,
      visitors,
      checkedAt: new Date(),
    });
  });
  }, []);

  const model = useMemo(() => {
    if (!store) return null;
    const from = cutOff(period);
    const within = (date) => !from || Boolean(date && date >= from);
    const allOrders = store.orders;
    const orders = allOrders.filter((order) => within(orderDate(order)));
    const paidOrders = orders.filter(isPaid);
    const periodEvents = events.filter((event) => within(eventDate(event)));
    const productIndex = new Map();
    store.products.forEach((product) => [product.id, product.name, product.nombre, product.title].filter(Boolean).forEach((key) => productIndex.set(String(key).trim().toLowerCase(), product)));
    const monthly = new Map();
    let revenueCLP = 0; let revenueUSD = 0; let profit = 0; let profitOrders = 0;
    const sold = new Map();
    // Revenue and sold products are strictly based on confirmed payments.
    paidOrders.forEach((order) => {
      const currency = orderCurrency(order);
      const total = orderAmount(order, currency);
      if (currency === "USD") revenueUSD += total; else revenueCLP += total;
      const date = orderDate(order);
      if (date) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const bucket = monthly.get(key) || { key, name: date.toLocaleDateString("es-CL", { month: "short", year: "2-digit" }), ingresosCLP: 0, ingresosUSD: 0, ganancia: 0, pedidosConCosto: 0 };
        if (currency === "USD") bucket.ingresosUSD += total; else bucket.ingresosCLP += total;
        monthly.set(key, bucket);
      }
      const items = itemsOf(order);
      let orderProfit = 0; let costComplete = currency !== "USD" && items.length > 0;
      items.forEach((item) => {
        const product = productIndex.get(String(item.id || item.productId || displayName(item)).trim().toLowerCase());
        const rawCost = product?.costo_clp ?? product?.costCLP;
        const cost = numberValue(rawCost);
        const quantity = Math.max(1, numberValue(item.quantity ?? item.cantidad ?? 1));
        const rawUnit = item.precio ?? item.priceCLP ?? item.price ?? (items.length === 1 ? total : null);
        const unit = numberValue(rawUnit);
        if (rawCost === undefined || rawCost === null || rawUnit === undefined || rawUnit === null) costComplete = false;
        else orderProfit += (unit - cost) * quantity;
        const key = String(item.id || item.productId || displayName(item)).toLowerCase();
        const entry = sold.get(key) || { key, name: displayName(item), quantity: 0 };
        entry.quantity += quantity; sold.set(key, entry);
      });
      if (costComplete && date) {
        profit += orderProfit; profitOrders += 1;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const bucket = monthly.get(key); bucket.ganancia += orderProfit; bucket.pedidosConCosto += 1;
      }
    });
    const group = (filter, key, name) => {
      const result = new Map();
      periodEvents.filter(filter).forEach((event) => { const raw = String(key(event) || "").trim(); if (!raw) return; const normalized = raw.toLowerCase(); const entry = result.get(normalized) || { key: normalized, name: name(event, raw), count: 0 }; entry.count += 1; result.set(normalized, entry); });
      return [...result.values()].sort((a, b) => b.count - a.count).slice(0, 8);
    };
    const pageViews = periodEvents.filter((event) => event.event === "page_view");
    const productViews = group((event) => event.event === "view_item", (event) => event.productId || event.productName, (event, fallback) => event.productName || fallback);
    const cartAdds = group((event) => event.event === "add_to_cart", (event) => event.productId || event.productName, (event, fallback) => event.productName || fallback);
    const searches = group((event) => event.event === "search", (event) => event.searchTerm || event.query, (_, fallback) => fallback);
    const pages = group((event) => event.event === "page_view", (event) => pageLabel(event.page, store.products), (_, fallback) => fallback);
    const roles = store.users.reduce((result, user) => { const role = String(user.role || "cliente").trim().toLowerCase() || "cliente"; result.set(role, (result.get(role) || 0) + 1); return result; }, new Map());
    const stockSet = store.products.filter((product) => product.stock !== undefined && product.stock !== null);
    const stateCounts = orders.reduce((result, order) => { const state = isPaid(order) ? "confirmado" : String(order.estado || order.status || "sin estado").toLowerCase(); result.set(state, (result.get(state) || 0) + 1); return result; }, new Map());
    const visitorOwners = new Map();
    const signedUsers = new Set();
    periodEvents.forEach((event) => {
      if (event.visitorId && event.userId) visitorOwners.set(event.visitorId, event.userId);
      if (event.userId) signedUsers.add(event.userId);
    });
    const identityOf = (event) => {
      if (event.visitorId) return visitorOwners.has(event.visitorId) ? `user:${visitorOwners.get(event.visitorId)}` : `guest:${event.visitorId}`;
      if (event.userId) return `user:${event.userId}`;
      return event.sessionId ? `legacy:${event.sessionId}` : null;
    };
    const visitors = new Set(pageViews.map(identityOf).filter(Boolean));
    const guests = new Set([...visitors].filter((identity) => identity.startsWith("guest:") || identity.startsWith("legacy:")));
    const daily = new Map();
    pageViews.forEach((event) => {
      const date = eventDate(event); if (!date) return;
      const key = date.toLocaleDateString("en-CA");
      const row = daily.get(key) || { key, label: date.toLocaleDateString("es-CL", { day: "2-digit", month: "short" }), views: 0, visitors: new Set() };
      row.views += 1;
      const identity = identityOf(event);
      if (identity) row.visitors.add(identity);
      daily.set(key, row);
    });
    const dailyRows = [...daily.values()].map((row) => ({ ...row, visitors: row.visitors.size, guests: [...row.visitors].filter((identity) => identity.startsWith("guest:") || identity.startsWith("legacy:")).length, users: new Set([...row.visitors].filter((identity) => identity.startsWith("user:"))).size })).sort((a, b) => b.key.localeCompare(a.key));
    const busiestDay = [...dailyRows].sort((a, b) => b.visitors - a.visitors || b.views - a.views)[0] || null;
    const quietestDay = [...dailyRows].sort((a, b) => a.visitors - b.visitors || a.views - b.views)[0] || null;
    const usersById = new Map(store.users.map((user) => [String(user.id || user.uid), user]));
    const activityByVisitor = new Map();
    periodEvents.forEach((event) => {
      const key = identityOf(event);
      if (!key) return;
      const row = activityByVisitor.get(key) || { key, events: [], pages: new Map(), products: new Map(), lastDate: null };
      row.events.push(event);
      const date = eventDate(event);
      if (date && (!row.lastDate || date > row.lastDate)) row.lastDate = date;
      if (event.event === "page_view") {
        const page = pageLabel(event.page, store.products);
        row.pages.set(page, (row.pages.get(page) || 0) + 1);
        if (event.page && event.page.startsWith("/producto/")) {
          const prodTitle = getProductTitleFromPage(event.page, store.products);
          if (prodTitle) {
            row.products.set(prodTitle, (row.products.get(prodTitle) || 0) + 1);
          }
        }
      }
      if (event.event === "view_item" && event.productName) row.products.set(event.productName, (row.products.get(event.productName) || 0) + 1);
      activityByVisitor.set(key, row);
    });
    const visitorActivity = [...activityByVisitor.values()].map((row) => {
      const isUser = row.key.startsWith("user:");
      const rawId = row.key.slice(row.key.indexOf(":") + 1);
      const user = isUser ? usersById.get(rawId) : null;
      const label = isUser
        ? (user?.displayName || user?.nombre || user?.name || user?.email || "Cliente con cuenta")
        : `Invitado #${rawId.slice(-6).toUpperCase()}`;
      const pagesSeen = [...row.pages.entries()].sort((a, b) => b[1] - a[1]);
      const productsSeen = [...row.products.entries()].sort((a, b) => b[1] - a[1]);
      return {
        ...row,
        kind: isUser ? "Cliente" : "Invitado",
        label,
        pageViews: row.events.filter((event) => event.event === "page_view").length,
        pagesSeen,
        productsSeen,
        latestPage: pagesSeen[0]?.[0] || "Sin páginas registradas",
        timeline: [...row.events].sort((a, b) => (eventDate(b)?.getTime() || 0) - (eventDate(a)?.getTime() || 0)).slice(0, 80),
      };
    }).sort((a, b) => (b.lastDate?.getTime() || 0) - (a.lastDate?.getTime() || 0));
    return { orders, paidOrders, revenueCLP, revenueUSD, profit, profitOrders, monthly: [...monthly.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-12), sold: [...sold.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8), productViews, cartAdds, searches, pages, roles: [...roles.entries()].sort((a, b) => b[1] - a[1]), stockSet, noStock: stockSet.filter((product) => numberValue(product.stock) <= 0).length, stateCounts: [...stateCounts.entries()].sort((a, b) => b[1] - a[1]), visitors: visitors.size, guests: guests.size, signedUsers: signedUsers.size, pageViews: pageViews.length, purchases: periodEvents.filter((event) => event.event === "purchase").length, dailyRows, busiestDay, quietestDay, visitorActivity };
  }, [store, events, period]);

  if (!model) return <div className="adm-dash"><div className="adm-loading"><div className="adm-loading-spinner" /><div className="adm-loading-text">Cargando datos reales de la tienda…</div></div></div>;
  const label = PERIODS.find(([key]) => key === period)?.[1];
  const cardStyle = { background: "rgba(15,23,42,.72)", border: "1px solid rgba(148,163,184,.18)", borderRadius: 16, padding: 18 };
  const selectedVisitor = model.visitorActivity.find((visitor) => visitor.key === selectedVisitorKey) || model.visitorActivity[0] || null;
  return <div className="adm-dash">
    <header className="adm-dash-header"><div><h1 className="adm-dash-title">Tablero <span>Analítico</span></h1><p className="adm-dash-subtitle">Datos registrados por PandaStore · período: {label}. Sin proyecciones ni cifras inventadas.</p></div><div className="adm-time-filter">{PERIODS.map(([key, name]) => <button key={key} className={`adm-time-btn${period === key ? " active" : ""}`} onClick={() => setPeriod(key)}>{name}</button>)}</div></header>
    {loadError && <div className="adm-event-empty" style={{ marginBottom: 16 }}>{loadError}</div>}
    <section className="adm-kpi-grid">
      <Metric icon="●" label="En línea ahora" value={online.total} detail={`${online.users} con cuenta · ${online.guests} invitados · activo ≤ 90 s`} color="#4ade80" />
      <Metric icon="◉" label="Visitantes únicos" value={model.visitors} detail={`${model.signedUsers} con cuenta · ${model.guests} invitados`} color="#c084fc" />
      <Metric icon="✓" label="Pedidos confirmados" value={model.paidOrders.length} color="#60a5fa" />
      <Metric icon="$" label="Ingresos cobrados CLP" value={money(model.revenueCLP)} detail="Sólo pedidos confirmados" color="#38bdf8" />
      <Metric icon="$" label="Ingresos cobrados USD" value={money(model.revenueUSD, "USD")} detail="Sólo pedidos confirmados" color="#4ade80" />
      <Metric icon="↗" label="Margen verificable CLP" value={model.profitOrders ? money(model.profit) : "Sin costo registrado"} detail={`${model.profitOrders} pedido(s) con costo completo`} color="#fbbf24" />
      <Metric icon="💵" label="Dólar Web Fijado" value={`$${(valorDolar || 900).toLocaleString("es-CL")} CLP`} color="#10b981" />
    </section>
    <section className="adm-live-visitors-section">
      <Panel title="Visitantes en línea ahora" source="Un visitante único por navegador o cuenta · actividad ≤ 90 s"><LiveVisitors visitors={online.visitors} /></Panel>
    </section>
    <section className="adm-visitor-analysis-section">
      <Panel title="Recorrido de cada visitante" source={`Actividad individual del período: ${label} · selecciona una persona para ver todo su recorrido`}><VisitorJourney visitors={model.visitorActivity} selected={selectedVisitor} onSelect={setSelectedVisitorKey} products={store?.products} /></Panel>
    </section>
    <section style={{ ...cardStyle, marginBottom: 18 }}><div className="adm-card-head"><div><h2 className="adm-section-title" style={{ margin: 0 }}>Ingresos y margen mensual</h2><p className="adm-dash-subtitle">Sólo cobros confirmados. El margen se muestra únicamente cuando el costo real del producto está registrado.</p></div></div>{model.monthly.length ? <ResponsiveContainer width="100%" height={270}><AreaChart data={model.monthly} margin={{ top: 15, right: 15, left: 0, bottom: 0 }}><defs><linearGradient id="revenue" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity=".42"/><stop offset="95%" stopColor="#38bdf8" stopOpacity="0"/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" vertical={false}/><XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }}/><YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} width={72}/><Tooltip contentStyle={{ background: "#141126", border: "1px solid #4c3d70", borderRadius: 10 }} formatter={(value, name) => [money(value), name]}/><Area type="monotone" dataKey="ingresosCLP" name="Cobrado CLP" stroke="#38bdf8" fill="url(#revenue)" strokeWidth={2.5}/><Area type="monotone" dataKey="ganancia" name="Margen verificable CLP" stroke="#4ade80" fill="none" strokeWidth={2.2}/></AreaChart></ResponsiveContainer> : <Empty>No hay pedidos confirmados con fecha disponible para graficar.</Empty>}<div className="adm-event-empty" style={{ marginTop: 8 }}>Cobros en USD del período: {money(model.revenueUSD, "USD")}. No se convierten ni mezclan monedas para evitar una ganancia ficticia.</div></section>
    <section className="adm-tables-grid" style={{ marginBottom: 18 }}>
      <Panel title="Tráfico diario real" source="Eventos page_view registrados"><DailyTraffic rows={model.dailyRows} /></Panel>
      <Panel title="Días destacados" source="Visitantes únicos por día"><div className="adm-event-feed"><div className="adm-event-row"><span className="adm-event-prod">Mayor tráfico</span><b>{model.busiestDay ? `${model.busiestDay.label}: ${model.busiestDay.visitors}` : "Sin datos"}</b></div><div className="adm-event-row"><span className="adm-event-prod">Menor tráfico</span><b>{model.quietestDay ? `${model.quietestDay.label}: ${model.quietestDay.visitors}` : "Sin datos"}</b></div><div className="adm-event-row"><span className="adm-event-prod">Vistas de página</span><b>{model.pageViews}</b></div></div></Panel>
      <Panel title="Audiencia del período" source="Sesiones de visitas"><div className="adm-event-feed"><div className="adm-event-row"><span className="adm-event-prod">Ingresaron como invitados</span><b>{model.guests}</b></div><div className="adm-event-row"><span className="adm-event-prod">Ingresaron con usuario</span><b>{model.signedUsers}</b></div><div className="adm-event-row"><span className="adm-event-prod">Sesiones únicas totales</span><b>{model.visitors}</b></div></div></Panel>
    </section>
    <section className="adm-tables-grid" style={{ marginBottom: 18 }}>
      <Panel title="Páginas con más tráfico" source="Eventos page_view"><RankedList items={model.pages} empty="No hay visitas de página registradas para este período." value={(item) => `${item.count} vistas`} /></Panel>
      <Panel title="Juegos más visitados" source="Eventos view_item"><RankedList items={model.productViews} empty="No hay visitas de productos registradas para este período." value={(item) => `${item.count} vistas`} /></Panel>
      <Panel title="Juegos más agregados al carrito" source="Eventos add_to_cart"><RankedList items={model.cartAdds} empty="No hay adiciones al carrito registradas para este período." value={(item) => `${item.count} veces`} /></Panel>
      <Panel title="Juegos más buscados" source="Eventos search"><RankedList items={model.searches} empty="No hay búsquedas registradas para este período." value={(item) => `${item.count} búsquedas`} /></Panel>
    </section>
    <section className="adm-tables-grid">
      <Panel title="Productos más vendidos" source="Ítems de pedidos confirmados"><RankedList items={model.sold} empty="Los pedidos confirmados no tienen ítems detallados en este período." value={(item) => `${item.quantity} unidades`} /></Panel>
      <Panel title="Pedidos y embudo" source="Pedidos confirmados y eventos"><div className="adm-event-feed"><div className="adm-event-row"><span className="adm-event-prod">Pedidos creados</span><b>{model.orders.length}</b></div><div className="adm-event-row"><span className="adm-event-prod">Pedidos confirmados</span><b>{model.paidOrders.length}</b></div><div className="adm-event-row"><span className="adm-event-prod">Sesiones únicas</span><b>{model.visitors}</b></div><div className="adm-event-row"><span className="adm-event-prod">Páginas vistas</span><b>{model.pageViews}</b></div><div className="adm-event-row"><span className="adm-event-prod">Compras registradas por evento</span><b>{model.purchases}</b></div></div></Panel>
      <Panel title="Clientes y roles" source="Usuarios actuales"><div className="adm-event-feed">{model.roles.map(([role, count]) => <div className="adm-event-row" key={role}><span className="adm-event-prod">{role}</span><b>{count}</b></div>)}</div></Panel>
      <Panel title="Inventario y estados" source="Catálogo y pedidos"><div className="adm-event-feed"><div className="adm-event-row"><span className="adm-event-prod">Productos con stock informado</span><b>{model.stockSet.length}</b></div><div className="adm-event-row"><span className="adm-event-prod">Productos sin stock</span><b>{model.noStock}</b></div>{model.stateCounts.map(([state, count]) => <div className="adm-event-row" key={state}><span className="adm-event-prod">Pedidos: {state}</span><b>{count}</b></div>)}</div></Panel>
    </section>
  </div>;
}

function Metric({ icon, label, value, detail, color }) { return <div className="adm-kpi-card" style={{ "--kpi-color": color }}><div className="adm-kpi-top"><div className="adm-kpi-icon" style={{ color, background: `${color}1f` }}>{icon}</div></div><div className="adm-kpi-value">{value}</div><div className="adm-kpi-label">{label}</div>{detail && <small className="adm-kpi-detail">{detail}</small>}</div>; }
function Panel({ title, source, children }) { return <div className="adm-table-card"><div className="adm-table-header"><div><h3 className="adm-table-title">{title}</h3><small style={{ color: "#94a3b8" }}>{source}</small></div></div>{children}</div>; }
function DailyTraffic({ rows }) { return rows.length ? <div className="adm-daily-traffic"><div className="adm-daily-head"><span>Día</span><span>Visitas</span><span>Inv.</span><span>Usuario</span></div>{rows.slice(0, 14).map((row) => <div className="adm-daily-row" key={row.key}><span>{row.label}</span><b>{row.visitors}</b><span>{row.guests}</span><span>{row.users}</span></div>)}</div> : <Empty>No hay visitas registradas para este período.</Empty>; }
function LiveVisitors({ visitors }) { return visitors.length ? <div className="adm-live-visitors">{visitors.map((visitor) => <div className="adm-live-visitor" key={visitor.id}><span className={`adm-live-kind ${visitor.kind === "Cuenta" ? "is-user" : "is-guest"}`}>{visitor.isSelf ? "Tu cuenta" : visitor.kind}</span><span className="adm-live-page" title={visitor.path}>Viendo: <b>{visitor.page}</b></span><span className="adm-live-tabs">{visitor.tabs > 1 ? `${visitor.tabs} pestañas` : "1 pestaña"}</span></div>)}</div> : <Empty>No hay visitantes activos en los últimos 90 segundos.</Empty>; }
function VisitorJourney({ visitors, selected, onSelect, products = [] }) { return visitors.length ? <div className="adm-journey"><div className="adm-journey-list">{visitors.map((visitor) => <button type="button" className={`adm-journey-person${selected?.key === visitor.key ? " active" : ""}`} key={visitor.key} onClick={() => onSelect(visitor.key)}><span className={`adm-live-kind ${visitor.kind === "Cliente" ? "is-user" : "is-guest"}`}>{visitor.kind}</span><span className="adm-journey-name">{visitor.label}</span><small>{visitor.pageViews} páginas · {visitor.productsSeen.length} juegos</small></button>)}</div>{selected && <div className="adm-journey-detail"><div className="adm-journey-summary"><div><span className={`adm-live-kind ${selected.kind === "Cliente" ? "is-user" : "is-guest"}`}>{selected.kind}</span><h4>{selected.label}</h4><p>Última actividad: {selected.lastDate ? selected.lastDate.toLocaleString("es-CL") : "sin fecha"}</p></div><div className="adm-journey-stats"><b>{selected.pageViews}</b><span>páginas vistas</span><b>{selected.events.length}</b><span>acciones</span></div></div><div className="adm-journey-interest"><b>Vio:</b> {selected.pagesSeen.slice(0, 5).map(([page, count]) => <span key={page}>{page} · {count}</span>) || "Sin páginas"}</div>{selected.productsSeen.length > 0 && <div className="adm-journey-interest"><b>Juegos revisados:</b> {selected.productsSeen.slice(0, 5).map(([product, count]) => <span key={product}>{product} · {count}</span>)}</div>}<div className="adm-journey-timeline">{selected.timeline.map((event) => <div className="adm-journey-event" key={event.id}><time>{eventTime(event)}</time><span>{eventSummary(event, products)}</span></div>)}</div></div>}</div> : <Empty>Aún no hay actividad individual para este período.</Empty>; }
