import { useState, useEffect } from "react";
import {
  FaExclamationTriangle,
  FaRedo,
  FaArrowLeft,
  FaClock,
  FaWifi,
  FaInfoCircle,
  FaServer,
} from "react-icons/fa";
import { motion } from "framer-motion";

/**
 * ApiError - Reusable component for API error states
 * Displays a beautiful error UI with retry functionality
 *
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {function} onRetry - Retry callback function
 * @param {function} onGoBack - Go back callback function
 * @param {number} retryCount - Current retry count
 * @param {number} maxRetry - Maximum retry attempts
 * @param {boolean} isRetryLoading - Loading state during retry
 */
export default function ApiError({
  title = "Loading Error",
  message = "Something went wrong while loading the data",
  statusCode,
  onRetry,
  onGoBack,
  retryCount = 0,
  maxRetry = 3,
  isRetryLoading = false,
}) {
  const [countdown, setCountdown] = useState(null);

  // Check if error is rate limit (429)
  const isRateLimit = statusCode === 429 || message.toLowerCase().includes("too many requests");

  // Extract wait time from message if available (e.g., "try again after 15 minutes")
  useEffect(() => {
    if (isRateLimit) {
      const timeMatch = message.match(/(\d+)\s*(minute|minutes|min)/i);
      if (timeMatch) {
        const minutes = parseInt(timeMatch[1], 10);
        setCountdown(minutes * 60); // Convert to seconds

        const timer = setInterval(() => {
          setCountdown((prev) => (prev > 0 ? prev - 1 : null));
        }, 1000);

        return () => clearInterval(timer);
      }
    }
  }, [isRateLimit, message]);

  // Format countdown time
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get appropriate icon based on error type
  const getErrorIcon = () => {
    if (statusCode === 401) return FaServer;
    if (statusCode === 403) return FaExclamationTriangle;
    if (statusCode === 404) return FaWifi;
    if (statusCode === 429 || isRateLimit) return FaClock;
    if (statusCode >= 500) return FaServer;
    return FaExclamationTriangle;
  };

  const ErrorIcon = getErrorIcon();

  // Get color based on error type
  const getIconColor = () => {
    if (statusCode === 401) return "#f59e0b";
    if (statusCode === 403) return "#ef4444";
    if (statusCode === 404) return "#3b82f6";
    if (statusCode === 429 || isRateLimit) return "#f59e0b";
    if (statusCode >= 500) return "#ef4444";
    return "#ef4444";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="api-error-container"
      style={styles.container}
    >
      <div style={styles.content}>
        {/* Animated Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", damping: 12 }}
          style={{ ...styles.iconWrapper, borderColor: getIconColor() }}
        >
          <ErrorIcon size={48} color={getIconColor()} />
          {isRateLimit && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={styles.ring}
            />
          )}
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={styles.title}
        >
          {title}
        </motion.h1>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={styles.message}
        >
          {message}
        </motion.p>

        {/* Rate Limit Countdown */}
        {isRateLimit && countdown !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            style={styles.countdown}
          >
            <FaClock size={20} color="#f59e0b" />
            <span>Wait time: {formatCountdown(countdown)}</span>
          </motion.div>
        )}

        {/* Retry Status */}
        {onRetry && retryCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={styles.retryStatus}
          >
            <FaRedo size={14} color="#64748b" />
            <span>
              Attempt {retryCount} of {maxRetry}
            </span>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={styles.actions}
        >
          {onGoBack && (
            <button
              onClick={onGoBack}
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

          {onRetry && (
            <button
              onClick={onRetry}
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
                  <motion.span
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
        </motion.div>

        {/* Additional Info */}
        {statusCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={styles.statusCode}
          >
            <FaInfoCircle size={12} />
            <span>Error Code: {statusCode}</span>
          </motion.div>
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
    </motion.div>
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
};
