const Sentry = require("@sentry/node");

let isEnabled = false;

const initGlitchtip = () => {
  if (process.env.NODE_ENV === "production") {
    console.log("GlitchTip is disabled in production.");
    return;
  }

  if (!process.env.GLITCHTIP_DSN) {
    console.log("GlitchTip DSN not configured. Error tracking disabled.");
    return;
  }

  isEnabled = true;

  Sentry.init({
    dsn: process.env.GLITCHTIP_DSN,
    enabled: process.env.GLITCHTIP_ENABLED === "true",
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0,
    debug: false,

    beforeSend(event, hint) {
      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers.Authorization;
          delete event.request.headers.Cookie;
        }
        if (event.request.cookies) {
          delete event.request.cookies.token;
          delete event.request.cookies.refreshToken;
        }
      }
      if (hint && hint.originalException) {
        const message = hint.originalException.message || "";
        const lower = message.toLowerCase();
        if (
          /password\s*[:=]/.test(lower) ||
          /secret\s*[:=]/.test(lower) ||
          /bearer\s+\w+/.test(lower)
        ) {
          return null;
        }
      }
      return event;
    },
  });
};

module.exports = { initGlitchtip, Sentry, isEnabled };
