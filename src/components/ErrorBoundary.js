import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    // If it's a dynamic import failure (chunk load error), clear cache flag
    if (error && error.name === 'ChunkLoadError') {
      try {
        sessionStorage.removeItem('panda_chunk_retry');
      } catch (e) {}
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/home';
    }
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#c4b5fd",
          fontFamily: "'Poppins', sans-serif",
          textAlign: "center",
          padding: 32,
          background: "radial-gradient(circle at center, #1b0f38 0%, #0d0722 100%)",
          borderRadius: 16,
          margin: "20px auto",
          maxWidth: 600,
          border: "1px solid rgba(162, 89, 255, 0.2)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
        }}>
          <span style={{ fontSize: "3.5rem", marginBottom: 16 }}>🐼⚡</span>
          <h2 style={{ color: "#fff", margin: "0 0 10px", fontSize: "1.6rem", fontWeight: 800 }}>
            Algo no cargó correctamente
          </h2>
          <p style={{ maxWidth: 440, lineHeight: 1.6, marginBottom: 24, fontSize: "0.95rem", color: "#94a3b8" }}>
            Pudo deberse a un microcorte de conexión en tu celular o a una actualización reciente de la tienda.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: "12px 28px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #7b2ff2, #a259ff)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(123, 47, 242, 0.4)"
              }}
            >
              🔄 Reintentar
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: "12px 28px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer"
              }}
            >
              🏠 Ir al Inicio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
