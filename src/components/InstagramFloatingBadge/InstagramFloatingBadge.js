import React, { useState } from "react";
import "./InstagramFloatingBadge.css";
import logoIg from "../../assets/logos/logoig.webp";

export default function InstagramFloatingBadge() {
  const [closed, setClosed] = useState(false);

  if (closed) return null;

  return (
    <div className="panda-ig-fab-wrap" role="complementary" aria-label="Instagram PandaStore">
      <div className="panda-ig-fab-container">
        <button
          className="panda-ig-fab-close"
          onClick={() => setClosed(true)}
          title="Ocultar"
          aria-label="Cerrar notificación de Instagram"
        >
          ✕
        </button>

        <a
          href="https://www.instagram.com/panda_storegamingcl/"
          target="_blank"
          rel="noopener noreferrer"
          className="panda-ig-fab-trigger"
          title="Visítanos en Instagram @panda_storegamingcl"
        >
          <div className="panda-ig-fab-shell-wrap">
            <div className="panda-ig-fab-ring" />
            <div className="panda-ig-fab-shell">
              <img
                src={logoIg}
                alt="Instagram @panda_storegamingcl"
                className="panda-ig-fab-icon"
                width="48"
                height="48"
                decoding="async"
              />
            </div>
          </div>

          <div className="panda-ig-fab-copy">
            <span className="panda-ig-fab-label-title">¡Síguenos en Instagram!</span>
            <span className="panda-ig-fab-label-subtitle">@panda_storegamingcl</span>
          </div>
        </a>
      </div>
    </div>
  );
}
