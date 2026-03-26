import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import "./GlobalChatbot.css";
import chatbotAvatar from "../assets/logos/chatbot.png";

const CHAT_FLAG_IMAGES = {
  "🇨🇱": "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1e8-1f1f1.svg",
  "🇺🇸": "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1fa-1f1f8.svg",
};

const INITIAL_MESSAGES = [
  {
    from: "bot",
    text: "¡Hola! Soy el bot de Panda Store. Estoy en fase beta, asi que todavia puedo tener fallas o respuestas incompletas. Puedo ayudarte con juegos, suscripciones, streaming, promociones e instalacion. ¿Que necesitas?",
    quickReplies: [
      { type: "send_message", label: "Ver juegos", message: "que juegos venden" },
      { type: "send_message", label: "Promociones", message: "promociones" },
      { type: "send_message", label: "Instalación", message: "instalacion" },
      { type: "send_message", label: "Medios de pago", message: "medios de pago" },
      { type: "send_message", label: "Hablar con soporte", message: "quiero hablar con soporte" },
    ],
  },
];

const CHATBOT_API_BASE_URL = (process.env.REACT_APP_CHATBOT_API_URL || "http://localhost:5000").replace(/\/$/, "");

function getChatbotApiUrl() {
  try {
    return new URL(CHATBOT_API_BASE_URL, window.location.origin);
  } catch {
    return null;
  }
}

function chatbotApiRequiresLocalDeviceAccess() {
  if (typeof window === "undefined") return false;
  const apiUrl = getChatbotApiUrl();
  if (!apiUrl) return false;
  const frontendHost = window.location.hostname;
  const apiHost = apiUrl.hostname;
  const frontendIsLocal = ["localhost", "127.0.0.1"].includes(frontendHost);
  const apiIsLocal = ["localhost", "127.0.0.1"].includes(apiHost);
  return !frontendIsLocal && apiIsLocal;
}

const CHATBOT_CONFIGURATION_ERROR = "El chatbot no esta configurado correctamente en produccion. Intenta nuevamente mas tarde.";

function ChatbotIcon() {
  return <img src={chatbotAvatar} alt="Panda Store bot" className="panda-chatbot__fab-icon" />;
}

function renderChatInline(text) {
  return String(text)
    .split(/(🇨🇱|🇺🇸)/g)
    .map((part, index) => {
      const src = CHAT_FLAG_IMAGES[part];
      if (!src) return <React.Fragment key={index}>{part}</React.Fragment>;
      return (
        <img
          key={index}
          src={src}
          alt={part === "🇨🇱" ? "Chile" : "Estados Unidos"}
          style={{ width: 16, height: 16, display: "inline-block", verticalAlign: "text-bottom", marginRight: 4 }}
        />
      );
    });
}

function renderChatText(text) {
  const lines = String(text).split("\n");
  return lines.map((line, index) => (
    <React.Fragment key={index}>
      {renderChatInline(line)}
      {index < lines.length - 1 ? <br /> : null}
    </React.Fragment>
  ));
}

function ChatActionButtons({ actions, onAction }) {
  if (!Array.isArray(actions) || actions.length === 0) return null;
  return (
    <div className="panda-chatbot__actions">
      {actions.map((action, index) => (
        <button
          key={`${action.type || "action"}-${index}`}
          type="button"
          onClick={() => onAction(action)}
          className={`panda-chatbot__button panda-chatbot__button--${action.type === "open_route" || action.type === "open_url" ? "secondary" : "primary"}`}
        >
          {action.label || "Continuar"}
        </button>
      ))}
    </div>
  );
}

function ChatQuickReplies({ replies, onAction }) {
  if (!Array.isArray(replies) || replies.length === 0) return null;
  return (
    <div className="panda-chatbot__quick-replies">
      {replies.map((reply, index) => (
        <button
          key={`${reply.label || "reply"}-${index}`}
          type="button"
          onClick={() => onAction(reply)}
          className="panda-chatbot__chip"
        >
          {reply.label}
        </button>
      ))}
    </div>
  );
}

function ChatPlanSelector({ option, onAction }) {
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(null);
  const selectedPlan = selectedPlanIndex === null ? null : option.plans?.[selectedPlanIndex];

  return (
    <div className="panda-chatbot__plan-selector">
      <div>
        <div className="panda-chatbot__option-title">{option.title}</div>
        <div className="panda-chatbot__option-subtitle">{option.subtitle}</div>
      </div>
      <div className="panda-chatbot__selector-label">{option.selectorLabel || "Selecciona una opción"}</div>
      <div className="panda-chatbot__plan-pills">
        {(option.plans || []).map((plan, index) => {
          const isSelected = selectedPlanIndex === index;
          return (
            <button
              key={`${plan.label}-${index}`}
              type="button"
              onClick={() => setSelectedPlanIndex(index)}
              className={`panda-chatbot__chip ${isSelected ? "panda-chatbot__chip--selected" : ""}`}
            >
              {plan.label}
            </button>
          );
        })}
      </div>
      {selectedPlan ? (
        <>
          <div className="panda-chatbot__plan-price">{renderChatInline(selectedPlan.price)}</div>
          <ChatActionButtons actions={[...(selectedPlan.actions || []), ...(option.actions || [])]} onAction={onAction} />
        </>
      ) : null}
    </div>
  );
}

function ChatProductOptions({ options, onAction }) {
  if (!Array.isArray(options) || options.length === 0) return null;
  return (
    <div className="panda-chatbot__options">
      {options.map((option, index) => (
        <div
          key={`${option.title || "option"}-${index}`}
          className={`panda-chatbot__option-card ${option.plans ? "panda-chatbot__option-card--plans" : ""}`}
        >
          {option.plans ? (
            <ChatPlanSelector option={option} onAction={onAction} />
          ) : (
            <>
              <div className="panda-chatbot__option-copy">
                <div className="panda-chatbot__option-title">{option.title}</div>
                <div className="panda-chatbot__option-subtitle">{option.subtitle}</div>
                <div className="panda-chatbot__option-price">{renderChatInline(option.price)}</div>
              </div>
              <button
                type="button"
                onClick={() => onAction(option.action)}
                aria-label={`Agregar ${option.title} al carrito`}
                className="panda-chatbot__plus"
              >
                +
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default function GlobalChatbot({ user }) {
  const navigate = useNavigate();
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState(INITIAL_MESSAGES);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const storageKey = useMemo(() => `panda-store-chat:${user?.uid || "guest"}`, [user?.uid]);

  useEffect(() => {
    try {
      const navigationEntry = typeof window !== "undefined" && window.performance?.getEntriesByType
        ? window.performance.getEntriesByType("navigation")[0]
        : null;
      const isReload = navigationEntry?.type === "reload";

      if (isReload) {
        localStorage.removeItem(storageKey);
        setChatMessages(INITIAL_MESSAGES);
        return;
      }

      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setChatMessages(INITIAL_MESSAGES);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setChatMessages(parsed);
      } else {
        setChatMessages(INITIAL_MESSAGES);
      }
    } catch {
      setChatMessages(INITIAL_MESSAGES);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(chatMessages));
    } catch {
      // ignore localStorage write errors
    }
  }, [chatMessages, storageKey]);

  useEffect(() => {
    const clearStoredChat = () => {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore localStorage removal errors
      }
    };

    window.addEventListener("beforeunload", clearStoredChat);
    return () => {
      window.removeEventListener("beforeunload", clearStoredChat);
    };
  }, [storageKey]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, showChatbot, chatLoading]);

  const sendTelemetry = async (event, metadata = {}) => {
    if (chatbotApiRequiresLocalDeviceAccess()) {
      return;
    }
    try {
      await fetch(`${CHATBOT_API_BASE_URL}/chat/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, metadata }),
      });
    } catch {
      // telemetry is best-effort only
    }
  };

  const sendMessage = async (overrideMessage) => {
    const msg = String(overrideMessage ?? chatInput).trim();
    if (!msg) return;

    if (chatbotApiRequiresLocalDeviceAccess()) {
      const userMessage = { from: "user", text: msg };
      setChatMessages((prev) => [...prev, userMessage, { from: "bot", text: CHATBOT_CONFIGURATION_ERROR, options: [], actions: [] }]);
      if (overrideMessage === undefined) {
        setChatInput("");
      }
      return;
    }

    const userMessage = { from: "user", text: msg };
    const historial = [...chatMessages, userMessage].slice(-12);
    setChatMessages((prev) => [...prev, userMessage]);
    if (overrideMessage === undefined) {
      setChatInput("");
    }
    setChatLoading(true);
    try {
      const res = await fetch(`${CHATBOT_API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: msg, historial }),
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, { from: "bot", text: data.respuesta, actions: data.acciones || [], options: data.opciones || [] }]);
    } catch {
      setChatMessages((prev) => [...prev, { from: "bot", text: "Ocurrió un error al conectar con el bot. Intenta de nuevo.", options: [], actions: [] }]);
    }
    setChatLoading(false);
  };

  const handleChatAction = async (action) => {
    if (!action || !action.type) return;
    if (action.type === "send_message") {
      if (!chatLoading && action.message) {
        await sendMessage(action.message);
      }
      return;
    }
    if (action.type === "open_route") {
      if (action.route) {
        setShowChatbot(false);
        navigate(action.route);
      }
      return;
    }
    if (action.type === "open_url") {
      if (action.url) {
        setShowChatbot(false);
        window.open(action.url, "_blank", "noopener,noreferrer");
      }
      return;
    }
    if (action.type === "buy") {
      await sendTelemetry("buy_now", { productId: action.producto?.id || null, name: action.producto?.name || null });
      if (!user) {
        setShowChatbot(false);
        navigate("/registro");
        return;
      }
      setShowChatbot(false);
      navigate("/comprar-ahora", { state: { producto: action.producto } });
      return;
    }
    if (action.type === "add_to_cart") {
      await sendTelemetry("add_to_cart", { productId: action.producto?.id || null, name: action.producto?.name || null });
      if (!user) {
        setShowChatbot(false);
        navigate("/registro");
        return;
      }
      const producto = action.producto;
      const cartRef = doc(db, `users/${user.uid}/cart`, producto.id);
      await setDoc(cartRef, {
        productId: producto.id,
        name: producto.name,
        imageUrl: producto.imageUrl || null,
        cantidad: 1,
        variante: producto.variante || null,
        meses: producto.meses || null,
        priceCLP: producto.priceCLP || null,
        priceUSD: producto.priceUSD || null,
      });
      setChatMessages((prev) => [...prev, { from: "bot", text: "Producto agregado al carrito.\n\nSi quieres, puedes seguir agregando juegos o ir al carrito para finalizar tu compra." }]);
      return;
    }
    if (action.type === "go_to_cart") {
      await sendTelemetry("go_to_cart");
      if (!user) {
        setShowChatbot(false);
        navigate("/registro");
        return;
      }
      setShowChatbot(false);
      navigate("/checkoutcarrito");
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <div className="panda-chatbot__fab-wrap">
        <button
          type="button"
          onClick={() => setShowChatbot(true)}
          className="panda-chatbot__fab-trigger"
          aria-label="Abrir soporte de Panda Store"
        >
          <span className="panda-chatbot__fab-copy">
            <span className="panda-chatbot__fab-label-title">Soporte</span>
            <span className="panda-chatbot__fab-label-subtitle">Habla con nosotros</span>
          </span>
          <span className="panda-chatbot__fab">
            <span className="panda-chatbot__fab-avatar-shell">
              <span className="panda-chatbot__fab-ring" aria-hidden="true" />
              <ChatbotIcon />
              <span className="panda-chatbot__fab-status" aria-hidden="true" />
            </span>
          </span>
        </button>
      </div>

      {showChatbot && (
        <div
          onClick={() => setShowChatbot(false)}
          className="panda-chatbot__backdrop"
        />
      )}

      {showChatbot && (
        <div
          className="panda-chatbot__panel"
        >
          <div className="panda-chatbot__panel-glow" aria-hidden="true" />
          <div className="panda-chatbot__header">
            <div className="panda-chatbot__header-copy">
              <img src={chatbotAvatar} alt="Panda Store bot" className="panda-chatbot__header-avatar" />
              <span className="panda-chatbot__title">Chat Panda Store</span>
              <span className="panda-chatbot__subtitle">Juegos, suscripciones y streaming</span>
            </div>
            <button onClick={() => setShowChatbot(false)} className="panda-chatbot__close" aria-label="Cerrar chat">×</button>
          </div>
          <div className="panda-chatbot__body">
            <div className="panda-chatbot__thread">
              {chatMessages.map((msg, i) => (
                (() => {
                  const hasText = Boolean(String(msg.text || "").trim());
                  return (
                    <div
                      key={i}
                      className={`panda-chatbot__message panda-chatbot__message--${msg.from === "user" ? "user" : "bot"} ${hasText ? "" : "panda-chatbot__message--compact"}`}
                    >
                      {hasText ? renderChatText(msg.text) : null}
                      {msg.from === "bot" ? <ChatQuickReplies replies={msg.quickReplies} onAction={handleChatAction} /> : null}
                      {msg.from === "bot" ? <ChatProductOptions options={msg.options} onAction={handleChatAction} /> : null}
                      {msg.from === "bot" ? <ChatActionButtons actions={msg.actions} onAction={handleChatAction} /> : null}
                    </div>
                  );
                })()
              ))}
              {chatLoading && (
                <div className="panda-chatbot__message panda-chatbot__message--bot panda-chatbot__typing">
                  <span className="panda-chatbot__typing-dot" />
                  <span className="panda-chatbot__typing-dot" />
                  <span className="panda-chatbot__typing-dot" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="panda-chatbot__composer">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Escribe tu mensaje..."
              className="panda-chatbot__input"
              disabled={chatLoading}
            />
            <button
              type="submit"
              className="panda-chatbot__send"
              disabled={chatLoading || !chatInput.trim()}
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}