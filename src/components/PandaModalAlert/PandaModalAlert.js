import React from "react";
import "./PandaModalAlert.css";
import { AlertCircle, CheckCircle2, AlertTriangle, HelpCircle, Info } from "lucide-react";

/**
 * PandaModalAlert - Replaces intrusive browser `alert(...)` and `confirm(...)`
 * Provides a high-end dark gamer theme with neon borders and smooth transitions.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {string} props.type - "error" | "success" | "warning" | "info" | "confirm"
 * @param {string} props.title - Title text
 * @param {string} props.message - Message content
 * @param {function} props.onConfirm - Action when confirming/accepting
 * @param {function} [props.onCancel] - Optional action when canceling (for confirms)
 * @param {string} [props.confirmText="Aceptar"]
 * @param {string} [props.cancelText="Cancelar"]
 * @param {boolean} [props.danger=false] - Whether primary action is destructive
 */
export default function PandaModalAlert({
  isOpen,
  type = "info",
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  danger = false,
}) {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case "error":
        return <AlertCircle size={32} />;
      case "success":
        return <CheckCircle2 size={32} />;
      case "warning":
        return <AlertTriangle size={32} />;
      case "confirm":
        return danger ? <AlertCircle size={32} /> : <HelpCircle size={32} />;
      case "info":
      default:
        return <Info size={32} />;
    }
  };

  const isConfirm = type === "confirm" || Boolean(onCancel);

  return (
    <div
      className="panda-modal-overlay"
      onClick={() => {
        if (onCancel) onCancel();
        else if (onConfirm) onConfirm();
      }}
    >
      <div
        className="panda-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={`panda-modal-icon-wrap ${type}`}>
          {renderIcon()}
        </div>

        {title && <h3 className="panda-modal-title">{title}</h3>}
        {message && <p className="panda-modal-message">{message}</p>}

        <div className="panda-modal-actions">
          {isConfirm && (
            <button
              type="button"
              className="panda-modal-btn cancel"
              onClick={onCancel}
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            className={`panda-modal-btn ${danger ? "danger" : "primary"}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
