import React, { useEffect, useState } from "react";
import { trackClickWhatsapp } from "../utils/analytics";
import wspLogo from "../assets/logos/logowsp.png";

export default function WhatsappButton() {
  const phone = "56974751810";
  const whatsappUrl = `https://wa.me/${phone}`;
  const [extraBottom, setExtraBottom] = useState(0);

  useEffect(() => {
    const update = () => {
      // Only relevant on mobile viewports
      if (window.innerWidth > 768) { setExtraBottom(0); return; }
      const tabBar = document.querySelector(".mobile1-tab-bar-wrapper");
      if (!tabBar) { setExtraBottom(0); return; }
      const cs = window.getComputedStyle(tabBar);
      if (cs.position === "fixed") {
        const h = tabBar.getBoundingClientRect().height;
        setExtraBottom(h + 12); // 12px gap above the bar
      } else {
        setExtraBottom(0);
      }
    };

    update();
    window.addEventListener("resize", update);
    // Observe DOM so we react when navigating to/from MisPedidos
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: false });
    return () => {
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, []);

  const handleClick = () => {
    try {
      trackClickWhatsapp("floating_button");
    } catch (_) {}
  };

  return (
    <div className="panda-wsp-fab-wrap" style={extraBottom > 0 ? { bottom: `${18 + extraBottom}px` } : undefined}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="panda-wsp-fab-trigger"
        aria-label="Contactar por WhatsApp"
      >
        <span className="panda-wsp-fab-copy">
          <span className="panda-wsp-fab-label-title">WhatsApp</span>
          <span className="panda-wsp-fab-label-subtitle">+56 9 7475 1810</span>
        </span>
        <span className="panda-wsp-fab">
          <span className="panda-wsp-fab-avatar-shell">
            <span className="panda-wsp-fab-ring" aria-hidden="true" />
            <img
              src={wspLogo}
              alt="WhatsApp"
              className="panda-wsp-fab-icon"
            />
          </span>
        </span>
      </a>

      <style>{`
        .panda-wsp-fab-wrap {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
        }

        .panda-wsp-fab-trigger {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(20, 20, 30, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1.5px solid rgba(37, 211, 102, 0.4);
          border-radius: 40px;
          padding: 6px 6px 6px 18px;
          text-decoration: none;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(37, 211, 102, 0.25);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          cursor: pointer;
        }

        .panda-wsp-fab-trigger:hover {
          transform: translateY(-4px) scale(1.03);
          border-color: rgba(37, 211, 102, 0.8);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(37, 211, 102, 0.45);
          background: rgba(25, 25, 40, 0.95);
        }

        .panda-wsp-fab-copy {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          user-select: none;
        }

        .panda-wsp-fab-label-title {
          font-size: 13px;
          font-weight: 800;
          color: #25D366;
          letter-spacing: 0.3px;
          line-height: 1.2;
        }

        .panda-wsp-fab-label-subtitle {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.2;
        }

        .panda-wsp-fab {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .panda-wsp-fab-avatar-shell {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(37, 211, 102, 0.4);
        }

        .panda-wsp-fab-icon {
          width: 32px;
          height: 32px;
          object-fit: contain;
          border-radius: 8px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }

        .panda-wsp-fab-ring {
          position: absolute;
          inset: -4px;
          border-radius: 14px;
          border: 2px solid rgba(37, 211, 102, 0.6);
          animation: panda-wsp-pulse 2s infinite;
          pointer-events: none;
        }

        @keyframes panda-wsp-pulse {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
          }
          70% {
            transform: scale(1.25);
            opacity: 0;
          }
          100% {
            transform: scale(0.95);
            opacity: 0;
          }
        }

        @media (max-width: 600px) {
          .panda-wsp-fab-wrap {
            bottom: 18px;
            right: 18px;
          }

          .panda-wsp-fab-copy {
            display: none;
          }

          .panda-wsp-fab-trigger {
            padding: 4px;
            border-radius: 14px;
            background: transparent;
            border: none;
            box-shadow: none;
          }

          .panda-wsp-fab-avatar-shell {
            width: 52px;
            height: 52px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 20px rgba(37, 211, 102, 0.5);
          }

          .panda-wsp-fab-icon {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </div>
  );
}
