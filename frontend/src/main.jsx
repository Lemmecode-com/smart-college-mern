import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
/*
 * Centralized responsive foundation (Phase 1).
 * Imported once, globally, for all roles. Loaded after the
 * Bootstrap base layer so the canonical --erp-* tokens and
 * opt-in erp-* utilities are available system-wide without
 * touching legacy/page-specific styles.
 */
import "./assets/styles/responsive-foundation.css";
Sentry.init({
  dsn: import.meta.env.VITE_GLITCHTIP_DSN,
  enabled: import.meta.env.VITE_GLITCHTIP_ENABLED === "true",
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
