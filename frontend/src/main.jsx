import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";

Sentry.init({
  dsn: "https://307cf5e6f3bb4876a249d0d81073e8ae@errors.restromonitor.com/7",
  tracesSampleRate: 0,
  autoSessionTracking: false,
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
