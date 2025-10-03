
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

export default function AdminSoporte() {
  const [tickets, setTickets] = useState([]);
  const [mensajes, setMensajes] = useState({}); // {ticketId: [mensajes]}
  const [respuestas, setRespuestas] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [finalizando, setFinalizando] = useState({});

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
  const res = await fetch("https://soportetickets-bdzwbdza3q-uc.a.run.app?admin=1");
      const data = await res.json();
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
      setLoading(false);
    }
    fetchTickets();
  }, [msg]);

  // Cargar historial de mensajes al seleccionar ticket
  const cargarMensajes = async (ticketId) => {
  const res = await fetch(`https://soportemensajes-bdzwbdza3q-uc.a.run.app?ticketId=${ticketId}`);
    const data = await res.json();
    setMensajes(m => ({...m, [ticketId]: data}));
  };

  const handleChange = (id, value) => {
    setRespuestas({ ...respuestas, [id]: value });
  };

  const responder = async (ticket) => {
    setMsg("");
    if (!respuestas[ticket.id]) return;
    // Agregar mensaje como admin
    await fetch("https://soportemensaje-bdzwbdza3q-uc.a.run.app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id, autor: "admin", texto: respuestas[ticket.id] })
    });
    // Enviar correo al cliente
    await fetch("https://soporteresponder-bdzwbdza3q-uc.a.run.app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ticket.email, respuesta: respuestas[ticket.id] })
    });
    setMsg("Respuesta enviada");
    setRespuestas({ ...respuestas, [ticket.id]: "" });
    cargarMensajes(ticket.id);
  };

  const finalizar = async (ticket) => {
    setFinalizando(f => ({...f, [ticket.id]: true}));
  await fetch("https://soportefinalizar-bdzwbdza3q-uc.a.run.app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id })
    });
    setMsg("Ticket finalizado");
    setFinalizando(f => ({...f, [ticket.id]: false}));
  };

  return (
    <div style={{maxWidth:900,margin:'40px auto',padding:24}}>
      <h1>Gestión Soporte</h1>
      {msg && <div style={{color:'green',marginBottom:12}}>{msg}</div>}
      {loading ? <p>Cargando...</p> : (
        <table style={{width:'100%',background:'#fafafa',borderRadius:8}}>
          <thead>
            <tr>
              <th>Nombre</th><th>Email</th><th>Estado</th><th>Mensajes</th><th>Responder</th><th>Finalizar</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id} style={{background:t.estado==="finalizado"?'#eee':'#fff'}}>
                <td>{t.nombre}</td>
                <td>{t.email}</td>
                <td>{t.estado||'abierto'}</td>
                <td>
                  <button onClick={()=>cargarMensajes(t.id)}>Ver mensajes</button>
                  {Array.isArray(mensajes[t.id]) && (
                    <div style={{maxHeight:120,overflowY:'auto',background:'#f4f4f4',marginTop:4,padding:4}}>
                      {mensajes[t.id].map(m=>(
                        <div key={m.id} style={{marginBottom:4}}>
                          <b>{m.autor}:</b> {m.texto} <span style={{fontSize:10,color:'#888'}}>{m.fecha && new Date(m.fecha.seconds*1000).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  {t.estado==="finalizado"
                    ? <span style={{color:'#888'}}>Ticket cerrado</span>
                    : <>
                        <textarea value={respuestas[t.id]||''} onChange={e=>handleChange(t.id,e.target.value)} rows={2} style={{width:120}} />
                        <button onClick={()=>responder(t)} disabled={!respuestas[t.id]}>Responder</button>
                      </>
                  }
                </td>
                <td>
                  {t.estado==="finalizado"
                    ? <span style={{color:'#888'}}>Finalizado</span>
                    : <button onClick={()=>finalizar(t)} disabled={finalizando[t.id]}>Finalizar</button>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
