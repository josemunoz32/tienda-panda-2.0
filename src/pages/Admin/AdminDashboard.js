import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, collectionGroup, query, orderBy, limit } from "firebase/firestore";
import { Link } from "react-router-dom";

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
    <div style={{maxWidth:1200, margin:'40px auto', padding:24}}>
      <h1>Dashboard Admin</h1>
      {loading ? <p>Cargando...</p> : (
        <>
          <div style={{display:'flex', gap:24, flexWrap:'wrap', marginBottom:32}}>
            <Card title="Usuarios" value={stats.usuarios} color="#1976d2" />
            <Card title="Productos" value={stats.productos} color="#43a047" />
            <Card title="Pedidos" value={stats.pedidos} color="#fbc02d" />
            <Card title="Reseñas" value={stats.resenas} color="#8e24aa" />
            <Card title="Reseñas ocultas" value={stats.resenasOcultas} color="#e53935" />
            <Card title="Ventas USD" value={stats.ventasUSD.toLocaleString('en-US', {style:'currency',currency:'USD'})} color="#1565c0" />
            <Card title="Ventas CLP" value={stats.ventasCLP.toLocaleString('es-CL', {style:'currency',currency:'CLP'})} color="#388e3c" />
          </div>
          <div style={{display:'flex', gap:32, flexWrap:'wrap'}}>
            <Table title="Últimos usuarios" data={stats.ultimosUsuarios} columns={["email","displayName"]} linkBase="/admin/usuarios" />
            <Table title="Últimos pedidos" data={stats.ultimosPedidos} columns={["total","moneda","fecha"]} linkBase="/admin/usuarios" />
            <Table title="Últimas reseñas" data={stats.ultimasResenas} columns={["userName","comment","date"]} linkBase="/admin/resenas" />
          </div>
          <div style={{marginTop:40}}>
            <h3>Accesos rápidos</h3>
            <ul>
              <li><Link to="/admin/usuarios">Gestión de Usuarios</Link></li>
              <li><Link to="/admin/resenas">Gestión de Reseñas</Link></li>
              <li><Link to="/admin/cupones">Gestión de Cupones</Link></li>
              <li><Link to="/categorias">CRUD Categorías</Link></li>
              <li><Link to="/productos">CRUD Productos</Link></li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div style={{background:color, color:'#fff', borderRadius:10, padding:'18px 28px', minWidth:160, textAlign:'center', boxShadow:'0 2px 8px #0001'}}>
      <div style={{fontSize:18, fontWeight:600, marginBottom:6}}>{title}</div>
      <div style={{fontSize:28, fontWeight:700}}>{value}</div>
    </div>
  );
}

function Table({ title, data, columns, linkBase }) {
  return (
    <div style={{minWidth:320, flex:1}}>
      <h3>{title}</h3>
      <table style={{width:'100%', borderCollapse:'collapse', background:'#fafafa', borderRadius:8}}>
        <thead>
          <tr>
            {columns.map(col => <th key={col} style={{textAlign:'left', padding:6, fontWeight:600}}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row,i) => (
            <tr key={i}>
              {columns.map(col => <td key={col} style={{padding:6}}>{row[col] || '-'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
