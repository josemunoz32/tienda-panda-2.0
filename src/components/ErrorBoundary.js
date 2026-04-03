import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#c4b5fd",
          fontFamily: "'Poppins', sans-serif",
          textAlign: "center",
          padding: 32,
        }}>
          <span style={{ fontSize: "3rem", marginBottom: 16 }}>😿</span>
          <h2 style={{ color: "#fff", margin: "0 0 10px" }}>Algo salió mal</h2>
          <p style={{ maxWidth: 400, lineHeight: 1.6, marginBottom: 20 }}>
            Ocurrió un error inesperado. Intenta recargar la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 32px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #7b2ff2, #a259ff)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
