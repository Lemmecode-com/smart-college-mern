import { Component } from "react";
import { motion } from "framer-motion";
import {
  FaExclamationTriangle,
  FaRedo,
  FaHome,
  FaBug,
  FaCode,
} from "react-icons/fa";

/**
 * ErrorBoundary - Catches JavaScript errors anywhere in the component tree
 * Enterprise SaaS Standard:
 * - Logs errors for debugging
 * - Shows fallback UI instead of crashing
 * - Provides recovery actions
 * - Prevents white screen of death
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      hoverState: { goHome: false, retry: false },
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (in production, send to error tracking service)
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Log full error details
    this.setState({ errorInfo });

    // Call parent onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you could send to Sentry, LogRocket, etc.
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    // If parent provides onRetry, use it; otherwise just reset state
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  setHoverState = (button, isHovering) => {
    this.setState((prev) => ({
      hoverState: { ...prev.hoverState, [button]: isHovering },
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={styles.content}
          >
            {/* Animated Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 12 }}
              style={styles.iconWrapper}
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.2, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={styles.iconGlow}
              />
              <FaExclamationTriangle size={56} color="#ef4444" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={styles.title}
            >
              Something Went Wrong
            </motion.h1>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={styles.message}
            >
              We're sorry, but something unexpected went wrong. Please try
              again.
            </motion.p>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details style={styles.errorDetails}>
                <summary style={styles.errorSummary}>
                  <FaBug size={14} style={{ marginRight: "8px" }} />
                  Error Details (Development)
                </summary>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  style={styles.errorStackContainer}
                >
                  <div style={styles.errorStack}>
                    <FaCode size={12} style={{ marginRight: "6px" }} />
                    <pre style={styles.errorPre}>
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack && (
                        <div style={styles.errorComponentStack}>
                          {"\n\n"}Component Stack:
                          {this.state.errorInfo.componentStack}
                        </div>
                      )}
                    </pre>
                  </div>
                </motion.div>
              </details>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              style={styles.actions}
            >
              <button
                onClick={this.handleGoHome}
                style={{
                  ...styles.button,
                  ...styles.buttonOutline,
                  ...(this.state.hoverState.goHome
                    ? styles.buttonOutlineHover
                    : {}),
                }}
                onMouseEnter={() => this.setHoverState("goHome", true)}
                onMouseLeave={() => this.setHoverState("goHome", false)}
              >
                <FaHome size={16} style={{ marginRight: "8px" }} />
                Go Home
              </button>
              <button
                onClick={this.handleRetry}
                style={{
                  ...styles.button,
                  ...styles.buttonPrimary,
                  ...(this.state.hoverState.retry
                    ? styles.buttonPrimaryHover
                    : {}),
                }}
                onMouseEnter={() => this.setHoverState("retry", true)}
                onMouseLeave={() => this.setHoverState("retry", false)}
              >
                <FaRedo size={16} style={{ marginRight: "8px" }} />
                Try Again
              </button>
            </motion.div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inline styles
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)",
    padding: "2rem",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  content: {
    textAlign: "center",
    maxWidth: "520px",
    background: "white",
    padding: "3rem 2.5rem",
    borderRadius: "24px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)",
    border: "1px solid rgba(0, 0, 0, 0.05)",
  },
  iconWrapper: {
    width: "112px",
    height: "112px",
    margin: "0 auto 1.5rem",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "white",
    border: "3px solid #fee2e2",
    position: "relative",
    boxShadow: "0 8px 30px rgba(239, 68, 68, 0.15)",
  },
  iconGlow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)",
  },
  title: {
    fontSize: "1.875rem",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "0.75rem",
    lineHeight: "1.3",
  },
  message: {
    color: "#64748b",
    fontSize: "1rem",
    lineHeight: "1.7",
    marginBottom: "2rem",
  },
  errorDetails: {
    textAlign: "left",
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "1rem 1.25rem",
    marginBottom: "1.5rem",
    fontSize: "0.875rem",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
  },
  errorSummary: {
    color: "#475569",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    marginBottom: "0.75rem",
    listStyle: "none",
  },
  errorStackContainer: {
    overflow: "hidden",
  },
  errorStack: {
    background: "#1e293b",
    color: "#f8fafc",
    padding: "1rem",
    borderRadius: "8px",
    overflowX: "auto",
    fontSize: "0.75rem",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxHeight: "300px",
    overflowY: "auto",
    display: "flex",
    alignItems: "flex-start",
  },
  errorPre: {
    margin: 0,
    flex: 1,
    fontFamily: "'Consolas', 'Monaco', monospace",
  },
  errorComponentStack: {
    marginTop: "1rem",
    paddingTop: "1rem",
    borderTop: "1px solid #334155",
    color: "#94a3b8",
  },
  actions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
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
    minWidth: "130px",
  },
  buttonOutline: {
    background: "transparent",
    color: "#475569",
    border: "2px solid #e2e8f0",
  },
  buttonOutlineHover: {
    background: "#f1f5f9",
    transform: "translateY(-2px)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
  },
  buttonPrimary: {
    background: "linear-gradient(135deg, #0f3a4a, #3db5e6)",
    color: "white",
    boxShadow: "0 4px 12px rgba(15, 58, 74, 0.3)",
  },
  buttonPrimaryHover: {
    background: "linear-gradient(135deg, #0c4a6e, #0f3a4a)",
    boxShadow: "0 6px 20px rgba(15, 58, 74, 0.4)",
    transform: "translateY(-2px)",
  },
};

export default ErrorBoundary;
