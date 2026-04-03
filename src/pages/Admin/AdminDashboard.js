import React, { useEffect, useState, useMemo } from "react";
import { db, database } from "../../firebase";
import { collection, getDocs, collectionGroup } from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import { Link } from "react-router-dom";
import "./AdminDashboard.css";

/* ── helpers ── */
function parseDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (typeof val === "string") return new Date(val);
  if (typeof val === "number") return new Date(val);
  if (val.seconds) return new Date(val.seconds * 1000);
  return null;
}

function getRange(key) {
  const now = new Date();
  const start = new Date(now);
  switch (key) {
    case "hoy":
      start.setHours(0, 0, 0, 0);
      return start;
    case "semana":
      start.setDate(now.getDate() - 7);
      return start;
    case "mes":
      start.setMonth(now.getMonth() - 1);
      return start;
    case "3meses":
      start.setMonth(now.getMonth() - 3);
      return start;
    default:
      return null;
  }
}

const TIME_OPTIONS = [
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "7 días" },
  { key: "mes", label: "30 días" },
  { key: "3meses", label: "3 meses" },
  { key: "todo", label: "Todo" },
];

function fmtCurrency(val, currency) {
  if (currency === "USD")
    return val.toLocaleString("en-US", { style: "currency", currency: "USD" });
  return val.toLocaleString("es-CL", { style: "currency", currency: "CLP" });
}

function fmtDate(val) {
  const d = parseDate(val);
  if (!d || isNaN(d)) return "-";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtShortDate(val) {
  const d = parseDate(val);
  if (!d || isNaN(d)) return "-";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

function buildDailyBuckets(items, dateField, valueField, days) {
  const now = new Date();
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    let total = 0;
    items.forEach((it) => {
      const d = parseDate(it[dateField]);
      if (d && d >= day && d < nextDay) total += Number(it[valueField]) || 0;
    });
    buckets.push({ date: new Date(day), total });
  }
  return buckets;
}

/* ── component ── */
export default function AdminDashboard() {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("todo");
  const [activeUsers, setActiveUsers] = useState(0);

  /* Listen to presence node in Realtime Database — count unique UIDs */
  useEffect(() => {
    const presenceRef = ref(database, "presence");
    const unsub = onValue(presenceRef, (snap) => {
      const val = snap.val();
      if (!val) { setActiveUsers(0); return; }
      const uniqueUids = new Set();
      Object.values(val).forEach((entry) => {
        if (entry && entry.online) uniqueUids.add(entry.uid || "anon");
      });
      setActiveUsers(uniqueUids.size);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [usersSnap, productsSnap, ordersSnap, reviewsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "orders")),
        getDocs(collectionGroup(db, "reviews")),
      ]);
      const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const reviews = reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRawData({ users, products, orders, reviews });
      setLoading(false);
    }
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    if (!rawData) return null;
    const cutoff = getRange(timeFilter);
    const inRange = (item, field) => {
      if (!cutoff) return true;
      const d = parseDate(item[field]);
      return d && d >= cutoff;
    };
    const users = cutoff ? rawData.users.filter((u) => inRange(u, "createdAt")) : rawData.users;
    const orders = cutoff ? rawData.orders.filter((o) => inRange(o, "fecha")) : rawData.orders;
    const reviews = cutoff ? rawData.reviews.filter((r) => inRange(r, "date")) : rawData.reviews;

    let ventasUSD = 0, ventasCLP = 0, resenasOcultas = 0;
    orders.forEach((o) => {
      if (o.total && o.moneda === "USD") ventasUSD += Number(o.total);
      if (o.total && o.moneda === "CLP") ventasCLP += Number(o.total);
    });
    reviews.forEach((r) => { if (r.visible === false) resenasOcultas++; });

    const sortedUsers = [...users].sort((a, b) => {
      const da = parseDate(a.createdAt), db2 = parseDate(b.createdAt);
      return (db2 || 0) - (da || 0);
    }).slice(0, 6);
    const sortedOrders = [...orders].sort((a, b) => {
      const da = parseDate(a.fecha), db2 = parseDate(b.fecha);
      return (db2 || 0) - (da || 0);
    }).slice(0, 6);
    const sortedReviews = [...reviews].sort((a, b) => {
      const da = parseDate(a.date), db2 = parseDate(b.date);
      return (db2 || 0) - (da || 0);
    }).slice(0, 6);

    const ordersUSD = rawData.orders.filter((o) => o.moneda === "USD");
    const ordersCLP = rawData.orders.filter((o) => o.moneda === "CLP");
    const barDays = timeFilter === "hoy" ? 1 : timeFilter === "semana" ? 7 : timeFilter === "mes" ? 30 : timeFilter === "3meses" ? 14 : 14;
    const barsUSD = buildDailyBuckets(ordersUSD, "fecha", "total", barDays);
    const barsCLP = buildDailyBuckets(ordersCLP, "fecha", "total", barDays);

    // Previous period comparison
    let prevOrders = rawData.orders;
    let prevUsers = rawData.users;
    if (cutoff) {
      const duration = Date.now() - cutoff.getTime();
      const prevCutoff = new Date(cutoff.getTime() - duration);
      prevOrders = rawData.orders.filter((o) => {
        const d = parseDate(o.fecha);
        return d && d >= prevCutoff && d < cutoff;
      });
      prevUsers = rawData.users.filter((u) => {
        const d = parseDate(u.createdAt);
        return d && d >= prevCutoff && d < cutoff;
      });
    }
    let prevUSD = 0, prevCLP = 0;
    prevOrders.forEach((o) => {
      if (o.total && o.moneda === "USD") prevUSD += Number(o.total);
      if (o.total && o.moneda === "CLP") prevCLP += Number(o.total);
    });

    return {
      totalUsers: rawData.users.length,
      totalProducts: rawData.products.length,
      users: users.length,
      orders: orders.length,
      reviews: reviews.length,
      resenasOcultas,
      ventasUSD,
      ventasCLP,
      prevUSD,
      prevCLP,
      prevOrders: prevOrders.length,
      prevUsers: cutoff ? prevUsers.length : null,
      sortedUsers,
      sortedOrders,
      sortedReviews,
      barsUSD,
      barsCLP,
    };
  }, [rawData, timeFilter]);

  if (loading || !filtered) {
    return (
      <div className="adm-dash">
        <div className="adm-loading">
          <div className="adm-loading-spinner" />
          <div className="adm-loading-text">Cargando dashboard...</div>
        </div>
      </div>
    );
  }

  const pctChange = (curr, prev) => {
    if (!prev || prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const usdChange = pctChange(filtered.ventasUSD, filtered.prevUSD);
  const clpChange = pctChange(filtered.ventasCLP, filtered.prevCLP);
  const ordersChange = pctChange(filtered.orders, filtered.prevOrders);
  const usersChange = filtered.prevUsers !== null ? pctChange(filtered.users, filtered.prevUsers) : null;

  return (
    <div className="adm-dash">
      {/* HEADER */}
      <div className="adm-dash-header">
        <div>
          <h1 className="adm-dash-title">Panel <span>Administrativo</span></h1>
          <p className="adm-dash-subtitle">
            Resumen general · {filtered.totalUsers} usuarios · {filtered.totalProducts} productos
          </p>
        </div>
        <div className="adm-live-users">
          <span className="adm-live-dot" />
          <span className="adm-live-count">{activeUsers}</span>
          <span className="adm-live-label">en línea ahora</span>
        </div>
        <div className="adm-time-filter">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`adm-time-btn${timeFilter === opt.key ? " active" : ""}`}
              onClick={() => setTimeFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="adm-kpi-grid">
        <KpiCard
          icon="👥" label="Usuarios" value={filtered.users}
          change={usersChange}
          color="#8b5cf6" bg="rgba(139,92,246,0.12)"
        />
        <KpiCard
          icon="📦" label="Pedidos" value={filtered.orders}
          change={ordersChange}
          color="#f59e0b" bg="rgba(245,158,11,0.12)"
        />
        <KpiCard
          icon="⭐" label="Reseñas" value={filtered.reviews}
          change={null}
          color="#22c55e" bg="rgba(34,197,94,0.12)"
        />
        <KpiCard
          icon="🚫" label="Reseñas Ocultas" value={filtered.resenasOcultas}
          change={null}
          color="#ef4444" bg="rgba(239,68,68,0.12)"
        />
      </div>

      {/* REVENUE CARDS */}
      <div className="adm-revenue-row">
        <RevenueCard
          label="Ventas USD"
          amount={fmtCurrency(filtered.ventasUSD, "USD")}
          change={usdChange}
          bars={filtered.barsUSD}
          barColor="#22c55e"
          badgeBg="rgba(34,197,94,0.12)"
          badgeColor="#22c55e"
        />
        <RevenueCard
          label="Ventas CLP"
          amount={fmtCurrency(filtered.ventasCLP, "CLP")}
          change={clpChange}
          bars={filtered.barsCLP}
          barColor="#38bdf8"
          badgeBg="rgba(56,189,248,0.12)"
          badgeColor="#38bdf8"
        />
      </div>

      {/* TABLES */}
      <div className="adm-tables-grid">
        <div className="adm-table-card">
          <div className="adm-table-header">
            <h3 className="adm-table-title">
              <span className="adm-table-title-icon" style={{ background: "rgba(139,92,246,0.15)" }}>👥</span>
              Últimos Usuarios
            </h3>
            <span className="adm-table-count">{filtered.users}</span>
          </div>
          <div className="adm-table-scroll">
            {filtered.sortedUsers.length === 0 ? (
              <div className="adm-table-empty">Sin datos en este período</div>
            ) : (
              <table className="adm-table">
                <thead><tr><th>Email</th><th>Nombre</th><th>Registro</th></tr></thead>
                <tbody>
                  {filtered.sortedUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="adm-table-email">{u.email || "-"}</td>
                      <td>{u.displayName || u.nombre || "-"}</td>
                      <td>{fmtDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="adm-table-card">
          <div className="adm-table-header">
            <h3 className="adm-table-title">
              <span className="adm-table-title-icon" style={{ background: "rgba(245,158,11,0.15)" }}>📦</span>
              Últimos Pedidos
            </h3>
            <span className="adm-table-count">{filtered.orders}</span>
          </div>
          <div className="adm-table-scroll">
            {filtered.sortedOrders.length === 0 ? (
              <div className="adm-table-empty">Sin datos en este período</div>
            ) : (
              <table className="adm-table">
                <thead><tr><th>Total</th><th>Moneda</th><th>Fecha</th></tr></thead>
                <tbody>
                  {filtered.sortedOrders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <span className={`adm-money-badge ${o.moneda === "USD" ? "adm-money-usd" : "adm-money-clp"}`}>
                          {o.moneda === "USD"
                            ? Number(o.total).toLocaleString("en-US", { minimumFractionDigits: 2 })
                            : Number(o.total).toLocaleString("es-CL")}
                        </span>
                      </td>
                      <td>{o.moneda || "-"}</td>
                      <td>{fmtDate(o.fecha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="adm-table-card">
          <div className="adm-table-header">
            <h3 className="adm-table-title">
              <span className="adm-table-title-icon" style={{ background: "rgba(34,197,94,0.15)" }}>⭐</span>
              Últimas Reseñas
            </h3>
            <span className="adm-table-count">{filtered.reviews}</span>
          </div>
          <div className="adm-table-scroll">
            {filtered.sortedReviews.length === 0 ? (
              <div className="adm-table-empty">Sin datos en este período</div>
            ) : (
              <table className="adm-table">
                <thead><tr><th>Usuario</th><th>Comentario</th><th>Fecha</th></tr></thead>
                <tbody>
                  {filtered.sortedReviews.map((r) => (
                    <tr key={r.id}>
                      <td>{r.userName || "-"}</td>
                      <td title={r.comment}>{r.comment ? (r.comment.length > 40 ? r.comment.slice(0, 40) + "…" : r.comment) : "-"}</td>
                      <td>{fmtDate(r.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="adm-quick-section">
        <div className="adm-quick-label">Accesos Rápidos</div>
        <div className="adm-quick-grid">
          <Link to="/admin/usuarios" className="adm-quick-btn">
            <span className="adm-quick-icon" style={{ background: "rgba(139,92,246,0.15)" }}>👥</span>
            <span className="adm-quick-text">Gestión Usuarios</span>
          </Link>
          <Link to="/admin/resenas" className="adm-quick-btn">
            <span className="adm-quick-icon" style={{ background: "rgba(34,197,94,0.15)" }}>⭐</span>
            <span className="adm-quick-text">Gestión Reseñas</span>
          </Link>
          <Link to="/admin/cupones" className="adm-quick-btn">
            <span className="adm-quick-icon" style={{ background: "rgba(245,158,11,0.15)" }}>🎟️</span>
            <span className="adm-quick-text">Gestión Cupones</span>
          </Link>
          <Link to="/admin/preguntas" className="adm-quick-btn">
            <span className="adm-quick-icon" style={{ background: "rgba(99,102,241,0.15)" }}>💬</span>
            <span className="adm-quick-text">Gestión Preguntas</span>
          </Link>
          <Link to="/categorias" className="adm-quick-btn">
            <span className="adm-quick-icon" style={{ background: "rgba(56,189,248,0.15)" }}>📂</span>
            <span className="adm-quick-text">Categorías</span>
          </Link>
          <Link to="/productos" className="adm-quick-btn">
            <span className="adm-quick-icon" style={{ background: "rgba(236,72,153,0.15)" }}>🛍️</span>
            <span className="adm-quick-text">Productos</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── KPI Card ── */
function KpiCard({ icon, label, value, change, color, bg }) {
  const cls = change > 0 ? "up" : change < 0 ? "down" : "neutral";
  return (
    <div className="adm-kpi-card" style={{ "--kpi-color": color }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "18px 18px 0 0", background: color, opacity: 0.7 }} />
      <div className="adm-kpi-top">
        <div className="adm-kpi-icon" style={{ background: bg }}>
          {icon}
        </div>
        {change !== null && (
          <span className={`adm-kpi-change ${cls}`}>
            {change > 0 ? "↑" : change < 0 ? "↓" : "—"} {change !== null ? `${Math.abs(change)}%` : ""}
          </span>
        )}
      </div>
      <div className="adm-kpi-value">{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="adm-kpi-label">{label}</div>
    </div>
  );
}

/* ── Revenue Card ── */
function RevenueCard({ label, amount, change, bars, barColor, badgeBg, badgeColor }) {
  const max = Math.max(...bars.map((b) => b.total), 1);
  const cls = change > 0 ? "up" : change < 0 ? "down" : "neutral";
  return (
    <div className="adm-revenue-card">
      <div className="adm-revenue-header">
        <span className="adm-revenue-label">{label}</span>
        {change !== null && (
          <span className={`adm-kpi-change ${cls}`} style={{ fontSize: "0.78rem" }}>
            {change > 0 ? "↑" : change < 0 ? "↓" : "—"} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="adm-revenue-amount">{amount}</div>
      <div className="adm-revenue-bars">
        {bars.map((b, i) => (
          <div
            key={i}
            className="adm-revenue-bar"
            style={{
              height: `${Math.max((b.total / max) * 100, 6)}%`,
              background: b.total > 0 ? barColor : "rgba(162,89,255,0.1)",
              opacity: b.total > 0 ? (0.4 + (b.total / max) * 0.6) : 0.3,
            }}
          >
            {b.total > 0 && (
              <span className="adm-bar-tooltip">{fmtShortDate(b.date)}: {b.total.toLocaleString()}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
