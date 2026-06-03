import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { initSentry, ErrorBoundary } from "./lib/sentry.js";

// Initialize Sentry as early as possible so errors during the initial
// render (e.g., supabase client bootstrap) are captured. No-op in dev
// and when VITE_SENTRY_DSN isn't set.
initSentry();

// Error boundary fallback. Deliberately minimal: the soft-launch goal
// is "the page doesn't go blank and the user can recover", not a
// pixel-perfect error experience. Reload is the simplest escape hatch.
function ErrorFallback({ error }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#fefcf7",
        color: "#2e2a26",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 360 }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: "#7a6f67", marginBottom: 20 }}>
          Kiddaboo hit an unexpected error. Our team has been notified.
        </p>
        {error?.message && (
          <pre
            style={{
              textAlign: "left",
              fontSize: 11,
              color: "#b07a5b",
              background: "#fff",
              border: "1px solid #e5dccb",
              padding: 10,
              marginBottom: 20,
              maxHeight: 240,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.message}
            {error.stack ? "\n\n" + error.stack.split("\n").slice(0, 6).join("\n") : ""}
          </pre>
        )}
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "#8ba888",
            color: "white",
            border: "none",
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Reload the app
        </button>
      </div>
    </div>
  );
}

// Register service worker for push notifications
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.log("SW registration failed:", err));
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary fallback={({ error }) => <ErrorFallback error={error} />}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
