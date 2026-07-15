import { useState, useEffect } from "react";
import {
  FaExclamationTriangle,
  FaRedo,
  FaArrowLeft,
  FaClock,
  FaWifi,
  FaInfoCircle,
  FaServer,
  FaLock,
  FaUserSlash,
} from "react-icons/fa";
import { motion as Motion } from "framer-motion";

/**
 * Centralized error configuration.
 *
 * The UI is determined exclusively from `errorCode` / `statusCode`.
 * Each entry maps:
 *   errorCode | statusCode  ->  { title, message, icon, color, variant, buttons }
 *
 * `buttons` is an ordered array of: "signIn" | "goBack" | "retry".
 *
 * Friendly messages only. Backend technical messages (err.message,
 * Mongo/JWT/Axios errors, stack traces) are NEVER shown to end users.
 * Developers keep full technical details via logger.js in the pages.
 */
const SESSION_BUTTONS = ["signIn"];

const ERROR_CONFIG = {
  // ----- Authentication / Session error codes -----
  TOKEN_EXPIRED: {
    title: "Session Expired",
    message: "Your session has expired.\nPlease sign in again to continue.",
    icon: FaLock,
    color: "#0f3a4a",
    variant: "session",
    buttons: SESSION_BUTTONS,
  },
  TOKEN_MISSING: {
    title: "Session Expired",
    message: "Please sign in again.",
    icon: FaLock,
    color: "#0f3a4a",
    variant: "session",
    buttons: SESSION_BUTTONS,
  },
  INVALID_TOKEN: {
    title: "Session Expired",
    message: "Your session is no longer valid.\nPlease sign in again.",
    icon: FaLock,
    color: "#0f3a4a",
    variant: "session",
    buttons: SESSION_BUTTONS,
  },
  TOKEN_BLACKLISTED: {
    title: "Session Expired",
    message: "Your session has been invalidated.\nPlease sign in again.",
    icon: FaLock,
    color: "#0f3a4a",
    variant: "session",
    buttons: SESSION_BUTTONS,
  },
  TOKEN_INVALIDATED: {
    title: "Session Expired",
    message: "Your session has expired.\nPlease sign in again.",
    icon: FaLock,
    color: "#0f3a4a",
    variant: "session",
    buttons: SESSION_BUTTONS,
  },
  UNAUTHORIZED: {
    title: "Session Expired",
    message: "Please sign in to continue.",
    icon: FaLock,
    color: "#0f3a4a",
    variant: "session",
    buttons: SESSION_BUTTONS,
  },
  ACCOUNT_DEACTIVATED: {
    title: "Account Deactivated",
    message:
      "Your account has been deactivated by your administrator.\nPlease contact your administrator.",
    icon: FaUserSlash,
    color: "#ef4444",
    variant: "standard",
    // No "signIn" button for deactivated accounts.
    buttons: ["goBack"],
  },
  USER_NOT_FOUND: {
    title: "Account Not Found",
    message: "Your account could not be found.\nPlease contact your administrator.",
    icon: FaUserSlash,
    color: "#ef4444",
    variant: "standard",
    buttons: ["goBack"],
  },
  NETWORK_ERROR: {
    title: "Connection Problem",
    message: "Unable to connect to the server.\nCheck your internet connection.",
    icon: FaWifi,
    color: "#f59e0b",
    variant: "standard",
    buttons: ["retry"],
  },

  // ----- HTTP status codes -----
  "403": {
    title: "Access Denied",
    message: "You don't have permission to access this page.",
    icon: FaLock,
    color: "#ef4444",
    variant: "standard",
    buttons: ["goBack"],
  },
  "404": {
    title: "Page Not Found",
    message: "The requested resource could not be found.",
    icon: FaInfoCircle,
    color: "#3b82f6",
    variant: "standard",
    buttons: ["goBack"],
  },
  "429": {
    title: "Too Many Requests",
    message: "Please wait before trying again.",
    icon: FaClock,
    color: "#f59e0b",
    variant: "standard",
    buttons: ["retry"],
  },
  "500": {
    title: "Server Error",
    message: "Something went wrong.\nPlease try again later.",
    icon: FaServer,
    color: "#ef4444",
    variant: "standard",
    buttons: ["retry"],
  },
};

/**
 * Resolve the friendly error configuration from the error identity.
 *
 * Priority:
 *   1. errorCode (case-insensitive)
 *   2. statusCode
 *   3. Backward-compatible fallback to the explicit props passed by pages.
 *
 * When a mapping exists, the friendly title/message/buttons from the map
 * are used and any technical `message`/`errorCode` supplied by the page
 * is intentionally ignored (not displayed).
 */
const resolveError = ({ errorCode, statusCode, title, message }) => {
  const codeKey = errorCode ? String(errorCode).toUpperCase() : null;
  const statusKey = statusCode != null ? String(statusCode) : null;

  const mapped =
    (codeKey && ERROR_CONFIG[codeKey]) || (statusKey && ERROR_CONFIG[statusKey]);

  if (mapped) {
    return { ...mapped, isMapped: true };
  }

  // No mapping: preserve existing behavior for explicit props.
  return {
    title: title || "Loading Error",
    message: message || "Something went wrong while loading the data",
    icon: FaExclamationTriangle,
    color: "#ef4444",
    variant: "standard",
    buttons: [],
    isMapped: false,
  };
};

/**
 * ApiError - Reusable, centralized error component for NOVAA ERP.
 *
 * Displays a consistent, user-friendly error screen based on errorCode /
 * statusCode. Technical backend messages are never rendered.
 *
 * @param {string} title - Fallback title (used only when no mapping exists)
 * @param {string} message - Fallback message (used only when no mapping exists)
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Backend error code (e.g., TOKEN_EXPIRED, UNAUTHORIZED)
 * @param {function} onRetry - Retry callback function
 * @param {function} onGoBack - Go back callback function
 * @param {number} retryCount - Current retry count
 * @param {number} maxRetry - Maximum retry attempts
 * @param {boolean} isRetryLoading - Loading state during retry
 * @param {number} retryAfter - Seconds to wait before retry (rate limit)
 */
export default function ApiError({
  title = "Loading Error",
  message = "Something went wrong while loading the data",
  statusCode,
  errorCode,
  onRetry,
  onGoBack,
  retryCount = 0,
  maxRetry = 3,
  isRetryLoading = false,
  retryAfter,
}) {
  const [countdown, setCountdown] = useState(null);

  const config = resolveError({ errorCode, statusCode, title, message });
  const { icon: ErrorIcon, color, variant, buttons, isMapped } = config;

  // Determine which buttons to render.
  let showSignIn = buttons.includes("signIn");
  let showGoBack = buttons.includes("goBack");
  let showRetry = buttons.includes("retry");

  if (!isMapped) {
    // Backward-compatible: derive from provided callbacks.
    showGoBack = !!onGoBack;
    showRetry = !!onRetry;
  }

  const handleSignIn = () => {
    window.location.href = "/login";
  };

  const handleSessionGoBack = () => {
    if (onGoBack) {
      onGoBack();
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/login";
    }
  };

  const handleGoBack = onGoBack || handleSessionGoBack;
  const handleRetry = onRetry || (() => window.location.reload());

  // Rate limit countdown (429) - derived from `retryAfter` seconds.
  useEffect(() => {
    if (statusCode === 429 && retryAfter) {
      setCountdown(Number(retryAfter));
      const timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timer);
    }
    setCountdown(null);
  }, [statusCode, retryAfter]);

  // Format countdown time
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Render friendly multi-line message.
  const renderMessage = (text) =>
    String(text)
      .split("\n")
      .map((line, i) => (
        <span key={i}>
          {line}
          {i < String(text).split("\n").length - 1 && <br />}
        </span>
      ));

  // ----- Session (auth) variant -----
  if (variant === "session") {
    return (
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="api-error-container"
        style={styles.container}
      >
        <div style={styles.sessionCard}>
          <Motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", damping: 12 }}
            style={styles.sessionIconWrapper}
          >
            <FaLock size={72} color="#0f3a4a" />
          </Motion.div>

          <Motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={styles.sessionTitle}
          >
            {config.title}
          </Motion.h1>

          <Motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={styles.sessionMessage}
          >
            {renderMessage(config.message)}
          </Motion.p>

          <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={styles.sessionActions}
          >
            {showSignIn && (
              <button
                onClick={handleSignIn}
                style={{
                  ...styles.button,
                  ...styles.buttonPrimary,
                  ...styles.buttonSignIn,
                }}
                onMouseOver={(e) => {
                  e.target.style.background =
                    "linear-gradient(135deg, #0c4a6e, #0f3a4a)";
                  e.target.style.boxShadow =
                    "0 6px 20px rgba(15, 58, 74, 0.4)";
                  e.target.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.target.style.background =
                    "linear-gradient(135deg, #0f3a4a, #3db5e6)";
                  e.target.style.boxShadow =
                    "0 4px 12px rgba(15, 58, 74, 0.3)";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                Sign In
              </button>
            )}

            {showGoBack && (
              <button
                onClick={handleGoBack}
                style={{
                  ...styles.button,
                  ...styles.buttonOutline,
                }}
                onMouseOver={(e) => {
                  if (!isRetryLoading) {
                    e.target.style.background = "#f1f5f9";
                    e.target.style.transform = "translateY(-2px)";
                  }
                }}
                onMouseOut={(e) => {
                  if (!isRetryLoading) {
                    e.target.style.background = "transparent";
                    e.target.style.transform = "translateY(0)";
                  }
                }}
              >
                <FaArrowLeft size={14} style={{ marginRight: "8px" }} />
                Go Back
              </button>
            )}
          </Motion.div>
        </div>

        <style>{`
          .api-error-container {
            min-height: 60vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
        `}</style>
      </Motion.div>
    );
  }

  // ----- Standard variant -----
  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="api-error-container"
      style={styles.container}
    >
      <div style={styles.content}>
        <Motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", damping: 12 }}
          style={{ ...styles.iconWrapper, borderColor: color }}
        >
          <ErrorIcon size={48} color={color} />
          {statusCode === 429 && (
            <Motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={styles.ring}
            />
          )}
        </Motion.div>

        <Motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={styles.title}
        >
          {config.title}
        </Motion.h1>

        <Motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={styles.message}
        >
          {renderMessage(config.message)}
        </Motion.p>

        {statusCode === 429 && countdown !== null && (
          <Motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            style={styles.countdown}
          >
            <FaClock size={20} color="#f59e0b" />
            <span>Wait time: {formatCountdown(countdown)}</span>
          </Motion.div>
        )}

        {showRetry && onRetry && retryCount > 0 && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={styles.retryStatus}
          >
            <FaRedo size={14} color="#64748b" />
            <span>
              Attempt {retryCount} of {maxRetry}
            </span>
          </Motion.div>
        )}

        <Motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={styles.actions}
        >
          {showGoBack && (
            <button
              onClick={handleGoBack}
              disabled={isRetryLoading}
              style={{
                ...styles.button,
                ...styles.buttonOutline,
                ...(isRetryLoading ? styles.buttonDisabled : {}),
              }}
              onMouseOver={(e) => {
                if (!isRetryLoading) {
                  e.target.style.background = "#f1f5f9";
                  e.target.style.transform = "translateY(-2px)";
                }
              }}
              onMouseOut={(e) => {
                if (!isRetryLoading) {
                  e.target.style.background = "transparent";
                  e.target.style.transform = "translateY(0)";
                }
              }}
            >
              <FaArrowLeft size={14} style={{ marginRight: "8px" }} />
              Go Back
            </button>
          )}

          {showRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetryLoading || (countdown !== null && countdown > 0)}
              style={{
                ...styles.button,
                ...styles.buttonPrimary,
                ...(isRetryLoading || (countdown !== null && countdown > 0)
                  ? styles.buttonDisabled
                  : {}),
              }}
              onMouseOver={(e) => {
                if (!isRetryLoading && !(countdown !== null && countdown > 0)) {
                  e.target.style.background =
                    "linear-gradient(135deg, #0c4a6e, #0f3a4a)";
                  e.target.style.boxShadow =
                    "0 6px 20px rgba(15, 58, 74, 0.4)";
                  e.target.style.transform = "translateY(-2px)";
                }
              }}
              onMouseOut={(e) => {
                if (!isRetryLoading && !(countdown !== null && countdown > 0)) {
                  e.target.style.background =
                    "linear-gradient(135deg, #0f3a4a, #3db5e6)";
                  e.target.style.boxShadow =
                    "0 4px 12px rgba(15, 58, 74, 0.3)";
                  e.target.style.transform = "translateY(0)";
                }
              }}
            >
              {isRetryLoading ? (
                <>
                  <Motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "white",
                      borderRadius: "50%",
                      marginRight: "8px",
                    }}
                  />
                  Loading...
                </>
              ) : (
                <>
                  <FaRedo size={14} style={{ marginRight: "8px" }} />
                  Retry {retryCount > 0 && `(${retryCount}/${maxRetry})`}
                </>
              )}
            </button>
          )}
        </Motion.div>

        {isMapped === false && statusCode && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={styles.statusCode}
          >
            <FaInfoCircle size={12} />
            <span>Error Code: {statusCode}</span>
          </Motion.div>
        )}
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        .api-error-container {
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .api-error-container .content {
          text-align: center;
          max-width: 520px;
          background: white;
          padding: 3rem 2.5rem;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </Motion.div>
  );
}

// Inline styles
const styles = {
  container: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  content: {
    position: "relative",
  },
  iconWrapper: {
    width: "96px",
    height: "96px",
    margin: "0 auto 1.5rem",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "white",
    borderWidth: "3px",
    borderStyle: "solid",
    position: "relative",
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
    borderColor: "#f59e0b",
  },
  ring: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    border: "3px solid #f59e0b",
    animation: "pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "0.75rem",
    lineHeight: "1.3",
  },
  message: {
    color: "#64748b",
    fontSize: "1rem",
    lineHeight: "1.7",
    marginBottom: "1.5rem",
  },
  countdown: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    background: "linear-gradient(135deg, #fef3c7, #fde68a)",
    color: "#92400e",
    padding: "0.75rem 1.5rem",
    borderRadius: "12px",
    marginBottom: "1rem",
    fontWeight: "600",
    fontSize: "0.95rem",
    border: "1px solid #fcd34d",
  },
  retryStatus: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    color: "#64748b",
    fontSize: "0.875rem",
    marginBottom: "1.5rem",
  },
  actions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: "1.5rem",
  },
  button: {
    display: "flex",
    alignItems: "center",
    padding: "0.875rem 1.75rem",
    borderRadius: "12px",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    border: "none",
    outline: "none",
  },
  buttonOutline: {
    background: "transparent",
    color: "#475569",
    border: "2px solid #e2e8f0",
  },
  buttonPrimary: {
    background: "linear-gradient(135deg, #0f3a4a, #3db5e6)",
    color: "white",
    boxShadow: "0 4px 12px rgba(15, 58, 74, 0.3)",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    transform: "none !important",
  },
  statusCode: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    color: "#94a3b8",
    fontSize: "0.75rem",
    fontWeight: "500",
  },
  sessionCard: {
    textAlign: "center",
    maxWidth: "520px",
    width: "100%",
    background: "white",
    padding: "3.5rem 2.5rem",
    borderRadius: "24px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08)",
    border: "1px solid rgba(0, 0, 0, 0.05)",
  },
  sessionIconWrapper: {
    width: "120px",
    height: "120px",
    margin: "0 auto 1.5rem",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
    border: "3px solid #e0f2fe",
    boxShadow: "0 8px 30px rgba(15, 58, 74, 0.15)",
  },
  sessionTitle: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "0.75rem",
    lineHeight: "1.3",
  },
  sessionMessage: {
    color: "#64748b",
    fontSize: "1.05rem",
    lineHeight: "1.7",
    marginBottom: "2rem",
    maxWidth: "480px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  sessionActions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  buttonSignIn: {
    minWidth: "140px",
    justifyContent: "center",
  },
};
