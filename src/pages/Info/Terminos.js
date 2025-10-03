import React from "react";
import "./Terminos.css";

const iconoScroll = <span className="terminos-icon" role="img" aria-label="Terminos">📜</span>;
const iconoCarrito = <span className="terminos-icon" role="img" aria-label="Carrito">🛒</span>;
const iconoNintendo = <span className="terminos-icon" role="img" aria-label="Nintendo">🎮</span>;
const iconoPS = <span className="terminos-icon" role="img" aria-label="PlayStation">🎮</span>;
const iconoCheck = <span className="terminos-icon" role="img" aria-label="Check">✅</span>;
const iconoProhibido = <span className="terminos-icon" role="img" aria-label="Prohibido">🚫</span>;
const iconoAlerta = <span className="terminos-icon" role="img" aria-label="Alerta">⚠️</span>;
const iconoPc = <span className="terminos-icon" role="img" aria-label="PC">💻</span>;
const iconoPin = <span className="terminos-icon" role="img" aria-label="Pin">📌</span>;

export default function Terminos() {
  return (
    <div className="terminos-root">
      <h1 className="terminos-title">{iconoScroll} Términos y Condiciones Generales</h1>
      <div className="terminos-section" style={{marginBottom: 24}}>
        <div style={{fontWeight:600, color:'#fff', fontSize:'1.1rem', marginBottom:8}}>{iconoCarrito} Al comprar en nuestra tienda aceptas nuestros Términos y Condiciones.</div>
      </div>

      <div className="terminos-section">
        <h2>{iconoNintendo} Nintendo Switch (Juegos Digitales)</h2>
        <div style={{fontWeight:600, color:'#a084e8', marginBottom:6}}>Naturaleza del Producto</div>
        <p>Al comprar un juego de Nintendo Switch en nuestra tienda, recibirás una cuenta externa de Nintendo con el juego ya adquirido y listo para instalar en tu consola.</p>
        <ul>
          <li>{iconoProhibido} Esta cuenta no debe modificarse, compartirse ni revenderse.</li>
        </ul>
        <div style={{fontWeight:600, color:'#a084e8', margin:'18px 0 6px 0'}}>Modo de Uso</div>
        <ul>
          <li>{iconoCheck} Añadir la cuenta proporcionada a tu consola.</li>
          <li>{iconoCheck} Instalar el juego y luego jugarlo desde tu usuario personal.</li>
          <li>{iconoProhibido} Prohibido modificar la contraseña o eliminar la cuenta antes de activar el juego.</li>
        </ul>
        <div style={{fontWeight:600, color:'#a084e8', margin:'18px 0 6px 0'}}>Condiciones y Riesgos</div>
        <ul>
          <li>Nintendo permite múltiples cuentas en una misma consola, pero el mal uso o violación de sus políticas puede ocasionar:</li>
          <li style={{marginLeft:18}}>- Bloqueo de la cuenta.</li>
          <li style={{marginLeft:18}}>- Pérdida de acceso si se manipulan las credenciales.</li>
        </ul>
        <div style={{fontWeight:600, color:'#a084e8', margin:'18px 0 6px 0'}}>{iconoAlerta} Riesgos importantes a considerar:</div>
        <ul>
          <li>Nintendo puede detectar actividad sospechosa.</li>
          <li>Si se cierra sesión en la cuenta, es posible perder acceso al juego.</li>
        </ul>
        <div style={{fontWeight:600, color:'#a084e8', margin:'18px 0 6px 0'}}>Requisitos Técnicos</div>
        <ul>
          <li>Mantener la cuenta activa en la consola para poder jugar.</li>
          <li>Requerir conexión a internet ocasional para validar la licencia.</li>
        </ul>
      </div>

      <div className="terminos-section">
        <h2>{iconoPS} PlayStation (PS4 / PS5 – Juegos y Suscripciones)</h2>
        <div style={{fontWeight:600, color:'#a084e8', marginBottom:6}}>Naturaleza del Producto</div>
        <p>Al comprar un juego de PlayStation en nuestra tienda, recibirás acceso mediante una cuenta de PlayStation Network (PSN), en modalidad Principal o Secundaria, según lo adquirido.<br/>También ofrecemos suscripciones digitales como PlayStation Plus (PS Plus) y otras membresías, entregadas de manera legal y segura.</p>
        <div style={{fontWeight:600, color:'#a084e8', margin:'18px 0 6px 0'}}>Modo de Uso</div>
        <ul>
          <li>{iconoCheck} El cliente recibirá credenciales de acceso (usuario y contraseña) de la cuenta PSN correspondiente.</li>
          <li>{iconoCheck} Dependiendo de la modalidad:</li>
          <li style={{marginLeft:18}}>- Cuenta Principal: podrás jugar desde tu usuario personal con conexión total a internet.</li>
          <li style={{marginLeft:18}}>- Cuenta Secundaria: deberás ingresar siempre con la cuenta entregada para acceder al contenido.</li>
          <li>{iconoProhibido} Está estrictamente prohibido modificar, cambiar la contraseña o revender la cuenta entregada.</li>
        </ul>
        <div style={{fontWeight:600, color:'#a084e8', margin:'18px 0 6px 0'}}>Condiciones y Riesgos</div>
        <ul>
          <li>Las cuentas PSN que entregamos son legales, adquiridas de manera oficial.</li>
          <li>Sony permite compartir juegos en una misma consola mediante la modalidad principal/secundaria.</li>
          <li>El mal uso (cambio de credenciales, compartir fuera de lo permitido) puede generar suspensión de la cuenta.</li>
        </ul>
        <div style={{fontWeight:600, color:'#a084e8', margin:'18px 0 6px 0'}}>{iconoAlerta} Riesgos importantes a considerar:</div>
        <ul>
          <li>En cuentas secundarias, si se cierra sesión, se puede perder acceso al juego.</li>
          <li>Es responsabilidad del cliente mantener la cuenta configurada según las instrucciones entregadas.</li>
        </ul>
        <div style={{fontWeight:600, color:'#a084e8', margin:'18px 0 6px 0'}}>Requisitos Técnicos</div>
        <ul>
          <li>Conexión a internet estable para validar licencias y actualizaciones.</li>
          <li>Respetar la modalidad adquirida (Principal o Secundaria).</li>
        </ul>
      </div>

      <div className="terminos-section">
        <h2>{iconoPc} Política de Reembolso</h2>
        <ul>
          <li>Dado que se trata de productos digitales con entrega inmediata, no se aceptan devoluciones ni reembolsos, salvo que:</li>
          <li style={{marginLeft:18}}>- Las credenciales entregadas sean incorrectas.</li>
          <li style={{marginLeft:18}}>- El acceso no funcione por errores atribuibles a nuestra tienda.</li>
        </ul>
      </div>

      <div className="terminos-section" style={{marginBottom:0}}>
        <div style={{fontWeight:600, color:'#fff', fontSize:'1.1rem', marginBottom:8}}>{iconoPin} Al confirmar tu compra, aceptas plenamente estas condiciones tanto para productos de Nintendo Switch como de PlayStation (PS4 / PS5).</div>
      </div>
    </div>
  );
}
