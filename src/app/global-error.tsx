"use client";

/** Último recurso: si falla el diseño raíz del sitio. Estilos propios en línea porque aquí no hay CSS cargado. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es-UY">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#faf8f5",
          color: "#0b0b0b",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div>
          <h1 style={{ fontWeight: 300, fontSize: "2rem", margin: "0 0 1rem" }}>Maitena Joyas</h1>
          <p style={{ margin: "0 0 1.5rem", color: "#6b665f" }}>Algo salió mal. Probá de nuevo en un momento.</p>
          <button
            type="button"
            onClick={reset}
            style={{ background: "#0b0b0b", color: "#faf8f5", border: 0, padding: "0.9rem 2rem", cursor: "pointer" }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
