/**
 * SeoPages — vistas interactivas de las páginas generadas por scripts/generate-seo-pages.js.
 * El HTML estático (indexable) lo sirve Hosting; al montar React, estas vistas muestran la misma
 * información desde /seo-data/*.json, con precios en la moneda del visitante.
 */
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMoneda } from "../../context/MonedaContext";
import { optimizeImageUrl } from "../../utils/optimizeImage";
import "./SeoPages.css";

const cache = new Map();
function useSeoData(path) {
  const [state, setState] = useState(() => (cache.has(path) ? { data: cache.get(path), error: false } : { data: null, error: false }));
  useEffect(() => {
    let active = true;
    if (cache.has(path)) { setState({ data: cache.get(path), error: false }); return undefined; }
    setState({ data: null, error: false });
    fetch(path)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((data) => { cache.set(path, data); if (active) setState({ data, error: false }); })
      .catch(() => active && setState({ data: null, error: true }));
    return () => { active = false; };
  }, [path]);
  return state;
}

function usePageMeta(title, description) {
  useEffect(() => {
    if (!title) return;
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && description) meta.setAttribute("content", description);
  }, [title, description]);
}

function Breadcrumbs({ trail }) {
  return (
    <nav className="seo-crumbs" aria-label="Ruta de navegación">
      {trail.map(([label, to], i) => (
        <span key={label}>
          {i > 0 && <span className="seo-crumbs-sep">›</span>}
          {to ? <Link to={to}>{label}</Link> : <span>{label}</span>}
        </span>
      ))}
    </nav>
  );
}

function ProductGrid({ items, currency }) {
  const { formatearPrecio } = useMoneda();
  return (
    <div className="seo-grid">
      {items.map((p) => (
        <Link to={p.url} className="seo-card" key={p.id}>
          <div className="seo-card-img"><img src={optimizeImageUrl(p.image, 400)} alt={`${p.name} ${p.platform}`} loading="lazy" decoding="async" /></div>
          <div className="seo-card-body">
            <span className="seo-card-platform">{p.platform}</span>
            <h3 className="seo-card-name">{p.name}</h3>
            <div className="seo-card-foot">
              <b>{currency === "USD" && p.priceUSD ? `US$${Number(p.priceUSD).toFixed(2)}` : p.priceCLP ? formatearPrecio(p.priceCLP) : ""}</b>
              <span className="seo-card-cta">Ver y comprar</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Faq({ faq }) {
  if (!faq?.length) return null;
  return (
    <section className="seo-faq">
      <h2>Preguntas frecuentes</h2>
      {faq.map(([q, a]) => (
        <details key={q}><summary>{q}</summary><p>{a}</p></details>
      ))}
    </section>
  );
}

function Loading({ error, back }) {
  return (
    <div className="seo-page">
      <div className="seo-status">{error ? <>No encontramos esta página. <Link to={back}>Volver</Link></> : "Cargando juegos…"}</div>
    </div>
  );
}

export function SeoLanding() {
  const { slug } = useParams();
  const { data, error } = useSeoData(`/seo-data/juegos/${slug}.json`);
  const [sort, setSort] = useState("destacados");
  const [platform, setPlatform] = useState("");
  usePageMeta(data?.title, data?.description);
  if (!data) return <Loading error={error} back="/juegos" />;
  const platforms = [...new Set(data.items.map((p) => p.platform))];
  let items = platform ? data.items.filter((p) => p.platform === platform) : data.items;
  if (sort === "precio-asc") items = [...items].sort((a, b) => (a.priceCLP || 9e9) - (b.priceCLP || 9e9));
  if (sort === "precio-desc") items = [...items].sort((a, b) => (b.priceCLP || 0) - (a.priceCLP || 0));
  if (sort === "nombre") items = [...items].sort((a, b) => a.name.localeCompare(b.name, "es"));
  return (
    <div className="seo-page">
      <Breadcrumbs trail={[["Inicio", "/"], ["Juegos", "/juegos"], [data.h1]]} />
      <header className="seo-hero">
        <h1>{data.h1}</h1>
        <p className="seo-lead">{data.intro[0]}</p>
        <div className="seo-chips"><span>{data.total} juegos</span><span>Soporte por WhatsApp</span><span>{data.country ? `Compras desde ${data.country}` : "Precios en pesos chilenos"}</span></div>
      </header>
      <div className="seo-toolbar">
        {platforms.length > 1 && (
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Plataforma">
            <option value="">Todas las plataformas</option>
            {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar">
          <option value="destacados">Destacados</option>
          <option value="precio-asc">Menor precio</option>
          <option value="precio-desc">Mayor precio</option>
          <option value="nombre">Nombre A-Z</option>
        </select>
        <span className="seo-count">{items.length} de {data.total}</span>
      </div>
      <ProductGrid items={items} currency={data.currency} />
      <section className="seo-text">
        {data.intro.slice(1).map((t) => <p key={t}>{t}</p>)}
      </section>
      <Faq faq={data.faq} />
      {data.related?.length > 0 && (
        <section className="seo-related">
          <h2>También te puede interesar</h2>
          <div className="seo-links">{data.related.map((r) => <Link key={r.slug} to={`/juegos/${r.slug}`}>{r.h1}</Link>)}</div>
        </section>
      )}
    </div>
  );
}

export function SeoHub() {
  const { data, error } = useSeoData("/seo-data/juegos/index.json");
  const [q, setQ] = useState("");
  usePageMeta("Juegos digitales por plataforma, género y saga | PandaStore", "Explora los juegos digitales de PandaStore por plataforma, género, saga, precio y país.");
  if (!data) return <Loading error={error} back="/" />;
  const term = q.trim().toLowerCase();
  return (
    <div className="seo-page">
      <Breadcrumbs trail={[["Inicio", "/"], ["Juegos"]]} />
      <header className="seo-hero">
        <h1>Todos los juegos digitales por plataforma, género y saga</h1>
        <p className="seo-lead">Explora el catálogo organizado en {data.total} listas de Steam, Nintendo Switch, PS5 y PS4.</p>
        <input className="seo-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: terror, Mario, PS5, cooperativo…" aria-label="Buscar listas" />
      </header>
      {data.groups.map((g) => {
        const pages = term ? g.pages.filter((p) => p.h1.toLowerCase().includes(term)) : g.pages;
        if (!pages.length) return null;
        return (
          <section className="seo-related" key={g.family}>
            <h2>{g.title}</h2>
            <div className="seo-links">{pages.map((p) => <Link key={p.slug} to={`/juegos/${p.slug}`}>{p.h1} <small>({p.n})</small></Link>)}</div>
          </section>
        );
      })}
    </div>
  );
}

export function GuiasHub() {
  const { data, error } = useSeoData("/seo-data/guias/index.json");
  usePageMeta("Guías para comprar y activar juegos digitales | PandaStore", "Guías de PandaStore para comprar y activar juegos digitales en Chile y Latinoamérica.");
  if (!data) return <Loading error={error} back="/" />;
  return (
    <div className="seo-page">
      <Breadcrumbs trail={[["Inicio", "/"], ["Guías"]]} />
      <header className="seo-hero"><h1>Guías de juegos digitales</h1><p className="seo-lead">Todo lo que necesitas saber para comprar, activar y disfrutar tus juegos.</p></header>
      <div className="seo-guides">
        {data.map((g) => (
          <Link className="seo-guide-card" key={g.slug} to={`/guias/${g.slug}`}><h2>{g.title}</h2><p>{g.description}</p></Link>
        ))}
      </div>
    </div>
  );
}

export function GuiaPage() {
  const { slug } = useParams();
  const { data, error } = useSeoData(`/seo-data/guias/${slug}.json`);
  usePageMeta(data ? `${data.title} | PandaStore` : null, data?.description);
  if (!data) return <Loading error={error} back="/guias" />;
  return (
    <div className="seo-page seo-article">
      <Breadcrumbs trail={[["Inicio", "/"], ["Guías", "/guias"], [data.title]]} />
      <article>
        <h1>{data.title}</h1>
        <p className="seo-lead">{data.description}</p>
        {data.sections.map(([h, ps]) => (
          <section key={h}><h2>{h}</h2>{ps.map((t) => <p key={t}>{t}</p>)}</section>
        ))}
        {data.items?.length > 0 && <section><h2>{data.dynamic.title}</h2><ProductGrid items={data.items} currency="CLP" /></section>}
        <Faq faq={data.faq} />
        {data.links?.length > 0 && (
          <section className="seo-related"><h2>Enlaces útiles</h2><div className="seo-links">{data.links.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}</div></section>
        )}
      </article>
    </div>
  );
}

// Enlaces internos desde la ficha de un producto hacia sus listas (sagas, géneros, precio…)
export function RelatedLandings({ productId, name }) {
  const { data } = useSeoData("/seo-data/product-links.json");
  const links = data && productId ? data[productId] : null;
  if (!links?.length) return null;
  return (
    <section className="seo-related seo-related--product">
      <h2>Más juegos como {name}</h2>
      <div className="seo-links">{links.map((l) => <Link key={l.slug} to={`/juegos/${l.slug}`}>{l.h1}</Link>)}</div>
    </section>
  );
}
