import React, { useState, useEffect } from "react";
import { auth } from "../../firebase";

export default function SoporteCliente() {
  const [form, setForm] = useState({ nombre: "", email: "", mensaje: "" });
  // Autocompletar email si el usuario está autenticado
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.email) {
        setForm((f) => ({ ...f, email: user.email, nombre: user.displayName || f.nombre }));
      }
    });
    return () => unsubscribe();
  }, []);
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState([]);
  const [mensajes, setMensajes] = useState({}); // {ticketId: [mensajes]}
  const [respuestas, setRespuestas] = useState({});
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState("");

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Cargar tickets del usuario (por email)
  const fetchTickets = async () => {
    if (!form.email) return;
    setMsg("");
    try {
  const res = await fetch("https://soportetickets-bdzwbdza3q-uc.a.run.app?email=" + encodeURIComponent(form.email));
      if (!res.ok) {
        setError("Error al cargar tickets (" + res.status + ")");
        setTickets([]);
        return;
      }
      let data;
      try {
        data = await res.json();
      } catch (e) {
        setError("Respuesta inválida del servidor");
        setTickets([]);
        return;
      }
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch (e) {
      setError("Error de red o servidor");
      setTickets([]);
    }
  };

  // Cargar mensajes de un ticket
  const cargarMensajes = async (ticketId) => {
  const res = await fetch(`https://soportemensajes-bdzwbdza3q-uc.a.run.app?ticketId=${ticketId}`);
    const data = await res.json();
    setMensajes(m => ({...m, [ticketId]: data}));
  };

  // Enviar nuevo mensaje
  const responder = async (ticket) => {
    if (!respuestas[ticket.id]) return;
    setError("");
    setMsg("");
    try {
      const response = await fetch("https://soportemensaje-bdzwbdza3q-uc.a.run.app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, autor: "cliente", texto: respuestas[ticket.id] })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Error al enviar el mensaje.");
        return;
      }
      setMsg("Mensaje enviado");
      setRespuestas({ ...respuestas, [ticket.id]: "" });
      cargarMensajes(ticket.id);
    } catch (e) {
      setError("Error de red o servidor");
    }
  };

  // Crear ticket
  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    if (!form.nombre || !form.email || !form.mensaje) {
      setError("Completa todos los campos.");
      return;
    }
    try {
  const res = await fetch("https://soporte-bdzwbdza3q-uc.a.run.app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setMsg("Ticket enviado");
        setForm({ ...form, mensaje: "" });
        fetchTickets();
      } else setError("Error al enviar. Intenta más tarde.");
    } catch {
      setError("Error de red. Intenta más tarde.");
    }
  };


  // Buscar tickets automáticamente si hay email
  useEffect(() => {
    if (form.email && form.email.includes("@")) fetchTickets();
    // eslint-disable-next-line
  }, [form.email, msg]);

  return (
    <div style={{
      maxWidth: 420,
      margin: '48px auto',
      padding: '32px 0',
      borderRadius: 18,
      background: "rgba(34,34,44,0.98)",
      boxShadow: "0 4px 32px #7b2ff244, 0 1.5px 0 #a084e8",
      border: "2px solid #393053",
      fontFamily: "Poppins, Montserrat, Segoe UI, Arial, sans-serif",
      color: "#fff",
      minHeight: 400,
      position: "relative",
      zIndex: 2,
      width: "98vw",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <h1 style={{
        textAlign: "center",
        color: "#FFD600",
        fontWeight: 800,
        fontSize: 28,
        letterSpacing: "0.03em",
        textShadow: "0 2px 12px #7b2ff244, 0 1px 0 #18122B",
        marginBottom: 24,
        width: "100%"
      }}>Soporte</h1>
      <form onSubmit={handleSubmit} style={{
        background: "rgba(44,19,80,0.18)",
        borderRadius: 14,
        border: "1.5px solid #a084e8",
        boxShadow: "0 2px 12px #7b2ff244",
        padding: "18px 18px 14px 18px",
        marginBottom: 32,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        maxWidth: 340,
        width: "100%",
        alignItems: "center"
      }}>
        <div style={{width:"100%"}}>
          <label style={{ fontWeight: 600, color: "#FFD600", fontSize: 15, marginBottom: 2 }}>Nombre</label>
          <input name="nombre" value={form.nombre} onChange={handleChange}
            style={{
              width: '100%',
              borderRadius: 8,
              border: '1.5px solid #a084e8',
              background: '#18122B',
              color: '#fff',
              fontSize: '1rem',
              padding: '8px 10px',
              marginTop: 2,
              marginBottom: 2,
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border 0.18s'
            }} />
        </div>
        <div style={{width:"100%"}}>
          <label style={{ fontWeight: 600, color: "#FFD600", fontSize: 15, marginBottom: 2 }}>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange}
            style={{
              width: '100%',
              borderRadius: 8,
              border: '1.5px solid #a084e8',
              background: '#18122B',
              color: '#fff',
              fontSize: '1rem',
              padding: '8px 10px',
              marginTop: 2,
              marginBottom: 2,
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border 0.18s'
            }} />
        </div>
        <div style={{width:"100%"}}>
          <label style={{ fontWeight: 600, color: "#FFD600", fontSize: 15, marginBottom: 2 }}>Mensaje</label>
          <textarea name="mensaje" value={form.mensaje} onChange={handleChange}
            style={{
              width: '100%',
              borderRadius: 8,
              border: '1.5px solid #a084e8',
              background: '#18122B',
              color: '#fff',
              fontSize: '1rem',
              padding: '8px 10px',
              marginTop: 2,
              minHeight: 60,
              resize: "vertical",
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border 0.18s'
            }} rows={4} />
        </div>
        {error && <div style={{ color: '#d32f2f', marginBottom: 8, fontWeight: 600 }}>{error}</div>}
        <button type="submit" style={{
          background: 'linear-gradient(90deg, #7b2ff2 0%, #f357a8 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '8px 0',
          width: 120,
          alignSelf: "center",
          fontWeight: 700,
          fontSize: '1rem',
          boxShadow: '0 2px 8px #7b2ff244',
          cursor: 'pointer',
          marginTop: 8,
          transition: 'background 0.18s, box-shadow 0.18s, transform 0.15s'
        }}>Enviar ticket</button>
      </form>
      {msg && <div style={{ color: '#4caf50', margin: '16px 0', textAlign: "center", fontWeight: 600 }}>{msg}</div>}
      <hr style={{ margin: '32px 0', borderColor: "#a084e8", opacity: 0.3 }} />
      <h2 style={{
        color: "#FFD600",
        fontWeight: 700,
        fontSize: 22,
        marginBottom: 16,
        textAlign: "center"
      }}>Mis tickets</h2>
      {tickets.length === 0 ? <p style={{ color: "#a084e8", textAlign: "center" }}>No tienes tickets aún.</p> : (
        <div style={{
          background: "rgba(44,19,80,0.18)",
          borderRadius: 14,
          border: "1.5px solid #a084e8",
          boxShadow: "0 2px 12px #7b2ff244",
          padding: "12px 8px 8px 8px",
          marginBottom: 24
        }}>
          <table style={{
            width: '100%',
            background: 'transparent',
            borderRadius: 8,
            color: "#fff"
          }}>
            <thead>
              <tr>
                <th style={{ color: "#FFD600", fontWeight: 700, fontSize: 16, padding: 6 }}>Asunto</th>
                <th style={{ color: "#FFD600", fontWeight: 700, fontSize: 16, padding: 6 }}>Estado</th>
                <th style={{ color: "#FFD600", fontWeight: 700, fontSize: 16, padding: 6 }}>Ver</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id} style={{
                  background: t.estado === "finalizado" ? 'rgba(160,132,232,0.08)' : 'rgba(255,255,255,0.03)'
                }}>
                  <td style={{ padding: 6 }}>{t.mensaje?.slice(0, 40) || '-'}</td>
                  <td style={{ padding: 6 }}>{t.estado || 'abierto'}</td>
                  <td style={{ padding: 6 }}>
                    <button onClick={() => { setSelected(t.id); cargarMensajes(t.id); }}
                      style={{
                        background: "#a084e8",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 18px",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "1rem"
                      }}>Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div style={{
          marginTop: 24,
          padding: 16,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 12,
          border: "1.5px solid #a084e8",
          boxShadow: "0 2px 12px #7b2ff244",
          color: "#222"
        }}>
          <button onClick={() => setSelected(null)} style={{
            float: 'right',
            background: "#d32f2f",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "6px 18px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "1rem"
          }}>Cerrar</button>
          <h3 style={{ color: "#7b2ff2", fontWeight: 700, marginBottom: 10 }}>Mensajes del ticket</h3>
          {Array.isArray(mensajes[selected]) && mensajes[selected].length > 0 ? (
            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
              {mensajes[selected].map(m => (
                <div key={m.id} style={{
                  marginBottom: 8,
                  background: m.autor === "cliente" ? "#e0e7ff" : "#fffbe6",
                  color: "#222",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 15,
                  boxShadow: "0 1px 4px #7b2ff211"
                }}>
                  <b style={{ color: "#7b2ff2" }}>{m.autor}:</b> {m.texto} <span style={{ fontSize: 10, color: '#888', float: "right" }}>
                    {
                      m.fecha
                        ? (m.fecha.seconds
                          ? new Date(m.fecha.seconds * 1000).toLocaleString()
                          : (typeof m.fecha === 'string' || m.fecha instanceof Date)
                            ? new Date(m.fecha).toLocaleString()
                            : "")
                        : ""
                    }
                  </span>
                </div>
              ))}
            </div>
          ) : <p style={{ color: "#888" }}>No hay mensajes aún.</p>}
          {tickets.find(t => t.id === selected)?.estado !== "finalizado" && (
            <div style={{ marginTop: 12 }}>
              <textarea value={respuestas[selected] || ''} onChange={e => setRespuestas(r => ({ ...r, [selected]: e.target.value }))
                }
                rows={2}
                style={{
                  width: '100%',
                  maxWidth: 300,
                  borderRadius: 8,
                  border: '1.5px solid #a084e8',
                  background: '#fff',
                  color: '#222',
                  fontSize: '0.98rem',
                  padding: '7px 8px',
                  marginBottom: 8,
                  resize: "vertical",
                  boxSizing: 'border-box'
                }}
                placeholder="Escribe tu respuesta..." />
              <button onClick={() => responder(tickets.find(t => t.id === selected))}
                disabled={!respuestas[selected]}
                style={{
                  background: 'linear-gradient(90deg, #7b2ff2 0%, #f357a8 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 18px',
                  fontWeight: 700,
                  fontSize: '1.01rem',
                  boxShadow: '0 2px 8px #7b2ff244',
                  cursor: 'pointer',
                  transition: 'background 0.18s, box-shadow 0.18s, transform 0.15s'
                }}>Enviar respuesta</button>
            </div>
          )}
          {tickets.find(t => t.id === selected)?.estado === "finalizado" && <div style={{ color: '#888', marginTop: 8 }}>Este ticket está finalizado y no admite más respuestas.</div>}
        </div>
      )}
      <style>
        {`
        @media (max-width: 500px) {
          .soporte-form, .soporte-tickets, .soporte-mensajes {
            padding: 6px 2vw !important;
            max-width: 99vw !important;
          }
          form, .soporte-form {
            max-width: 99vw !important;
            width: 100% !important;
          }
          form input, form textarea, form button {
            font-size: 0.97rem !important;
            padding: 7px 7px !important;
          }
          form button {
            width: 100px !important;
            font-size: 0.97rem !important;
          }
        }
        `}
      </style>
    </div>
  );
}
