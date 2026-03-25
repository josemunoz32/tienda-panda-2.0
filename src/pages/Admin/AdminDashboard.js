import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, collectionGroup, query, orderBy, limit } from "firebase/firestore";
import { Link } from "react-router-dom";

const cardIcons = {
  'Usuarios': '👤',
  'Productos': '🛒',
  'Pedidos': '📦',
  'Reseñas': '⭐',
  'Reseñas ocultas': '🚫',
  'Ventas USD': '💵',
  'Ventas CLP': '💰',
};

const styles = {
  container: {
    maxWidth: 1200,
    margin: '40px auto',
    padding: 32,
    background: 'none',
    borderRadius: 18,
    boxShadow: 'none',
    border: 'none',
    fontFamily: 'Montserrat, sans-serif',
    position: 'relative',
    zIndex: 1,
  },
  h1: {
    fontWeight: 900,
    fontSize: 44,
    color: '#a084e8',
    marginBottom: 32,
    letterSpacing: 1,
    textAlign: 'center',
    textShadow: '0 4px 24px #7b2ff299, 0 1.5px 0 #fff',
  },
  cards: {
    display: 'flex',
    gap: 24,
    flexWrap: 'wrap',
    marginBottom: 32,
    justifyContent: 'center',
  },
  tables: {
    display: 'flex',
    gap: 32,
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '100vw',
    paddingBottom: 8,
    marginBottom: 8,
  },
  quick: {
    marginTop: 40,
    background: 'rgba(24,18,43,0.82)',
    borderRadius: 14,
    padding: 18,
    boxShadow: '0 2px 18px #7b2ff222',
    border: '1.5px solid #a084e8',
    backdropFilter: 'blur(1.5px)',
    WebkitBackdropFilter: 'blur(1.5px)',
  },
  ul: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    gap: 18,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  li: {
    fontWeight: 600,
    fontSize: 16,
    margin: 0,
  },
  link: {
    color: '#38bdf8',
    textDecoration: 'none',
    transition: 'all 0.18s',
    fontWeight: 900,
    fontSize: 18,
    letterSpacing: 0.2,
    textShadow: '0 1px 8px #38bdf822',
    padding: '4px 12px',
    borderRadius: 8,
    boxShadow: '0 1px 8px #38bdf822',
    background: 'rgba(56,189,248,0.08)',
    border: '1.5px solid #38bdf8',
  },
  linkHover: {
    color: '#fff',
    background: 'linear-gradient(90deg,#38bdf8 0%,#a084e8 100%)',
    textShadow: '0 1px 12px #38bdf8',
    border: '1.5px solid #a084e8',
    boxShadow: '0 2px 16px #38bdf8aa',
  },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    usuarios: 0,
    productos: 0,
    pedidos: 0,
    resenas: 0,
    resenasOcultas: 0,
    ventasUSD: 0,
    ventasCLP: 0,
    ultimosUsuarios: [],
    ultimosPedidos: [],
    ultimasResenas: []
  });
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      // Usuarios
      const usuariosSnap = await getDocs(collection(db, "users"));
      // Productos
      const productosSnap = await getDocs(collection(db, "products"));
      // Pedidos
      const pedidosSnap = await getDocs(collection(db, "orders"));
      // Reseñas (collectionGroup)
      const resenasSnap = await getDocs(collectionGroup(db, "reviews"));
      // Ventas por moneda
      let ventasUSD = 0, ventasCLP = 0;
      let ultimosPedidos = [];
      pedidosSnap.forEach(doc => {
        const d = doc.data();
        if (d.total && d.moneda) {
          if (d.moneda === "USD") ventasUSD += Number(d.total);
          if (d.moneda === "CLP") ventasCLP += Number(d.total);
        }
        ultimosPedidos.push({ id: doc.id, ...d });
      });
      ultimosPedidos = ultimosPedidos.sort((a,b) => (b.fecha || 0) - (a.fecha || 0)).slice(0,5);
  // Reseñas ocultas
  let resenasOcultas = 0;
      let ultimasResenas = [];
      resenasSnap.forEach(doc => {
        const d = doc.data();
        if (d.visible === false) resenasOcultas++;
        ultimasResenas.push({ id: doc.id, ...d });
      });
      ultimasResenas = ultimasResenas.sort((a,b) => (b.date || 0) - (a.date || 0)).slice(0,5);
      // Últimos usuarios
      let ultimosUsuarios = [];
      usuariosSnap.forEach(doc => {
        ultimosUsuarios.push({ id: doc.id, ...doc.data() });
      });
      ultimosUsuarios = ultimosUsuarios.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0,5);
      setStats({
        usuarios: usuariosSnap.size,
        productos: productosSnap.size,
        pedidos: pedidosSnap.size,
        resenas: resenasSnap.size,
        resenasOcultas,
        ventasUSD,
        ventasCLP,
        ultimosUsuarios,
        ultimosPedidos,
        ultimasResenas
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.h1}>Dashboard Admin</h1>
      {loading ? <p style={{textAlign:'center', color:'#0ea5e9', fontWeight:600}}>Cargando...</p> : (
        <>
          <div style={styles.cards}>
            <Card title="Usuarios" value={stats.usuarios} color="#1976d2" />
            <Card title="Productos" value={stats.productos} color="#43a047" />
            <Card title="Pedidos" value={stats.pedidos} color="#fbc02d" />
            <Card title="Reseñas" value={stats.resenas} color="#8e24aa" />
            <Card title="Reseñas ocultas" value={stats.resenasOcultas} color="#e53935" />
            <Card title="Ventas USD" value={stats.ventasUSD.toLocaleString('en-US', {style:'currency',currency:'USD'})} color="#1565c0" />
            <Card title="Ventas CLP" value={stats.ventasCLP.toLocaleString('es-CL', {style:'currency',currency:'CLP'})} color="#388e3c" />
          </div>
          <div style={styles.tables}>
            <Table title="Últimos usuarios" data={stats.ultimosUsuarios} columns={["email","Nombre"]} linkBase="/admin/usuarios" />
            <Table title="Últimos pedidos" data={stats.ultimosPedidos} columns={["total","moneda","fecha"]} linkBase="/admin/usuarios" />
            <Table title="Últimas reseñas" data={stats.ultimasResenas} columns={["userName","comment","date"]} linkBase="/admin/resenas" />
          </div>
          <div style={styles.quick}>
            <h3 style={{marginBottom:10, color:'#1e293b'}}>Accesos rápidos</h3>
            <ul style={styles.ul}>
              <li style={styles.li}><Link style={hovered==='usuarios'?{...styles.link,...styles.linkHover}:styles.link} onMouseEnter={()=>setHovered('usuarios')} onMouseLeave={()=>setHovered(null)} to="/admin/usuarios">Gestión de Usuarios</Link></li>
              <li style={styles.li}><Link style={hovered==='resenas'?{...styles.link,...styles.linkHover}:styles.link} onMouseEnter={()=>setHovered('resenas')} onMouseLeave={()=>setHovered(null)} to="/admin/resenas">Gestión de Reseñas</Link></li>
              <li style={styles.li}><Link style={hovered==='cupones'?{...styles.link,...styles.linkHover}:styles.link} onMouseEnter={()=>setHovered('cupones')} onMouseLeave={()=>setHovered(null)} to="/admin/cupones">Gestión de Cupones</Link></li>
              <li style={styles.li}><Link style={hovered==='categorias'?{...styles.link,...styles.linkHover}:styles.link} onMouseEnter={()=>setHovered('categorias')} onMouseLeave={()=>setHovered(null)} to="/categorias">CRUD Categorías</Link></li>
              <li style={styles.li}><Link style={hovered==='productos'?{...styles.link,...styles.linkHover}:styles.link} onMouseEnter={()=>setHovered('productos')} onMouseLeave={()=>setHovered(null)} to="/productos">CRUD Productos</Link></li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, value, color }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${color}33 0%, #18122b 100%)`,
        color: color,
        border: `2.5px solid ${color}`,
        borderRadius: 22,
        padding: hover ? '30px 44px' : '26px 38px',
        minWidth: 180,
        textAlign: 'center',
        boxShadow: hover
          ? `0 8px 40px ${color}77, 0 2px 16px #fff3`
          : `0 4px 32px ${color}44, 0 1.5px 0 #fff2`,
        fontFamily: 'Montserrat, sans-serif',
        transition: 'all 0.22s cubic-bezier(.4,2,.6,1)',
        fontWeight: 700,
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        marginBottom: 8,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{
        fontSize: 38,
        marginBottom: 2,
        filter: hover ? 'drop-shadow(0 0 12px #fff8)' : 'none',
        transition: 'filter 0.18s',
      }}>{cardIcons[title] || '✨'}</div>
      <div style={{fontSize: 22, fontWeight: 900, marginBottom: 10, letterSpacing: 0.5, textShadow: `0 2px 12px ${color}44`}}>{title}</div>
      <div style={{fontSize: 38, fontWeight: 900, textShadow: `0 2px 12px ${color}44`}}>{value}</div>
      {hover && <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 60% 30%,${color}22 0,#18122b00 80%)`,zIndex:0}}></div>}
    </div>
  );
}

function Table({ title, data, columns, linkBase }) {
  // Custom render for 'Nombre' column in 'Últimos usuarios'
  const renderCell = (row, col) => {
    if (title === "Últimos usuarios" && col === "Nombre") {
      return row.displayName || "Sin campo";
    }
    return row[col] || "-";
  };
  return (
    <div style={{
      minWidth: 260,
      maxWidth: 370,
      flex: 1,
      background: 'rgba(24,18,43,0.92)',
      borderRadius: 18,
      boxShadow: '0 4px 24px #a084e844',
      padding: 18,
      marginBottom: 22,
      border: '2px solid #a084e8',
      backdropFilter: 'blur(2.5px)',
      WebkitBackdropFilter: 'blur(2.5px)',
      marginLeft: 0,
      marginRight: 0,
    }}>
      <h3 style={{marginBottom:12, color:'#a084e8', fontWeight:900, fontSize:20, letterSpacing:0.5, textShadow:'0 2px 12px #7b2ff244'}}>{title}</h3>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%', minWidth:220, borderCollapse:'collapse', background:'none', borderRadius:10}}>
          <thead>
            <tr>
              {columns.map(col => <th key={col} style={{textAlign:'left', padding:8, fontWeight:900, color:'#38bdf8', fontSize:15, borderBottom:'2.5px solid #bae6fd', textShadow:'0 1px 8px #38bdf822', letterSpacing:0.2}}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((row,i) => (
              <tr key={i} style={{background: i%2===0 ? 'rgba(160,132,232,0.11)' : 'rgba(24,18,43,0.0)'}}>
                {columns.map(col => <td key={col} style={{padding:8, fontSize:15, color:'#e0e7ef', textShadow:'0 1px 4px #0008', fontWeight:600}}>{renderCell(row, col)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
