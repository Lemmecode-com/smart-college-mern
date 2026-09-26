const Sentry = require("@sentry/node");

let isEnabled = false;

const initGlitchtip = () => {
  const glitchtipEnabled = process.env.GLITCHTIP_ENABLED === "true";
  const glitchtipDsnConfigured = !!process.env.GLITCHTIP_DSN;

  console.log(`GlitchTip enabled: ${glitchtipEnabled}`);
  console.log(`GlitchTip DSN configured: ${glitchtipDsnConfigured}`);

  if (!glitchtipDsnConfigured) {
    console.log("GlitchTip DSN not configured. Error tracking disabled.");
    return;
  }

  isEnabled = true;

  console.log(
    `✅ GlitchTip initialized: env=${process.env.NODE_ENV || "development"}, dsn=set`,
  );

  Sentry.init({
    dsn: process.env.GLITCHTIP_DSN,
    enabled: glitchtipEnabled,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0,
    debug: false,
    autoSessionTracking: false,

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

module.exports = { initGlitchtip, Sentry, isEnabled: () => isEnabled };
