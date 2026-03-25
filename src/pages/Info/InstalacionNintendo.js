import React from "react";

// Importar imágenes desde assets/instalacionnintendo

import img1 from "../../assets/instalacionnintendo/1.png";
import img2 from "../../assets/instalacionnintendo/2.png";
import img3 from "../../assets/instalacionnintendo/3.png";
import img4 from "../../assets/instalacionnintendo/4.png";
import img5 from "../../assets/instalacionnintendo/5.png";
import img6 from "../../assets/instalacionnintendo/6.png";
import img7 from "../../assets/instalacionnintendo/7.png";
import img8 from "../../assets/instalacionnintendo/8.png";

export default function InstalacionNintendo() {
  return (
    <div style={{
      maxWidth:900,
      margin:'40px auto',
      padding:24,
      background:'#fff',
      borderRadius:18,
      boxShadow:'0 4px 32px #0002',
      border:'2px solid #a084e8',
      position:'relative',
      zIndex:2
    }}>
      {/* Título y sección de comunicación */}
      <h1 style={{
        fontSize:'2.8rem',
        textAlign:'center',
        marginBottom:10,
        letterSpacing:2,
        fontWeight:900,
        color:'#7b2ff2',
        textShadow:'0 2px 12px #fff, 0 1px 0 #a084e8'
      }}>INSTALACIÓN</h1>
      <p style={{
        textAlign:'center',
        fontSize:'1.18rem',
        marginBottom:22,
        color:'#222',
        fontWeight:500,
        textShadow:'0 1px 0 #fff'
      }}>
        Para la instalación, comunícate con nosotros a través de nuestras redes sociales:<br/>
        <a href="https://wa.me/56974751810" style={{color:'#25D366', fontWeight:700, marginRight:18, textDecoration:'none'}} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a href="https://t.me/NintendoChile2" style={{color:'#229ED9', fontWeight:700, marginRight:18, textDecoration:'none'}} target="_blank" rel="noopener noreferrer">Telegram</a>
        <a href="https://instagram.com/pandastore_gaming" style={{color:'#a084e8', fontWeight:700, textDecoration:'none'}} target="_blank" rel="noopener noreferrer">Instagram</a>
      </p>

      {/* Imágenes de instalación en una sola columna */}
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:32, margin:'32px 0'}}>
        {[img1, img2, img3, img4, img5, img6, img7, img8].map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`Paso ${idx + 1}`}
            style={{
              maxWidth: '98%',
              width: '700px',
              borderRadius: 14,
              boxShadow: '0 2px 18px #0003',
              background:'#fff',
              border:'1.5px solid #e0e0e0',
              margin:'0 auto',
              display:'block'
            }}
          />
        ))}
      </div>

      {/* Bloque de advertencias/modo de uso */}
      <div style={{background:'#fff', color:'#222', borderRadius:18, boxShadow:'0 4px 24px #0002', padding:'28px 24px', maxWidth:650, margin:'40px auto 0 auto', border:'2px solid #a084e8'}}>
        <div style={{fontWeight:900, fontSize:'1.25rem', marginBottom:12, display:'flex', alignItems:'center', gap:8}}>
          <span role="img" aria-label="warning">⚠️</span> IMPORTANTE PARA TODOS LOS CLIENTES <span role="img" aria-label="warning">⚠️</span>
        </div>
        <ul style={{paddingLeft:22, fontSize:'1.08rem', lineHeight:1.7, marginBottom:0}}>
          <li><span role="img" aria-label="candado">🔒</span> <b>NO CAMBIES</b> ningún dato de la cuenta que te entregamos.</li>
          <li><span role="img" aria-label="prohibido">🚫</span> <b>NO intentes volver a ingresar</b> a la cuenta después de descargar los juegos.</li>
          <li><span role="img" aria-label="usuario">👤</span> <b>DURACION</b> estos juegos no son permanente duran tiempo indefinido.</li>
          <li><span role="img" aria-label="usuario">👤</span> <b>SIEMPRE JUEGA</b> desde tu perfil personal (el tuyo, no el que te damos).</li>
          <li><span role="img" aria-label="cruz">❌</span> Si no sigues estas reglas, pierdes la garantía y la cuenta puede ser bloqueada por Nintendo.</li>
          <li><span role="img" aria-label="check">✅</span> <b>Garantía solo 1 semana</b></li>
        </ul>
        <div style={{marginTop:14, fontWeight:600, color:'#7b2ff2'}}>
          <span role="img" aria-label="estrella">🪄</span> ¡Sigue bien los pasos y disfruta tus juegos sin problemas!
        </div>
      </div>
    </div>
  );
}
