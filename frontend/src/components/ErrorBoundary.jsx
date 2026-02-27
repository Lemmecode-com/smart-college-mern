import { Component } from "react";
import { FaExclamationTriangle, FaRedo, FaHome } from "react-icons/fa";

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
    
    // In production, you could send to Sentry, LogRocket, etc.
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-content">
            <div className="error-icon-wrapper">
              <FaExclamationTriangle className="error-icon" size={56} />
            </div>
            <h1 className="error-title">Something Went Wrong</h1>
            <p className="error-message">
              We're sorry, but something unexpected went wrong. Please try again.
            </p>
            
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack && (
                    <div className="error-component-stack">
                      {"\n\nComponent Stack:"}
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </pre>
              </details>
            )}
            
            <div className="error-actions">
              <button
                className="btn btn-outline-secondary"
                onClick={this.handleGoHome}
              >
                <FaHome className="me-2" aria-hidden="true" />
                Go Home
              </button>
              <button
                className="btn btn-primary"
                onClick={this.handleRetry}
              >
                <FaRedo className="me-2" aria-hidden="true" />
                Try Again
              </button>
            </div>
          </div>
          
          <style>{`
            .error-boundary-fallback {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
              padding: 2rem;
            }
            
            .error-boundary-content {
              text-align: center;
              max-width: 500px;
              background: white;
              padding: 3rem 2rem;
              border-radius: 20px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            }
            
            .error-icon-wrapper {
              margin-bottom: 1.5rem;
            }
            
            .error-icon {
              color: #dc3545;
              animation: shake 0.5s ease-in-out;
            }
            
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
              20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            
            .error-title {
              font-size: 1.75rem;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 0.75rem;
            }
            
            .error-message {
              color: #64748b;
              font-size: 1rem;
              line-height: 1.6;
              margin-bottom: 2rem;
            }
            
            .error-details {
              text-align: left;
              background: #f8fafc;
              border-radius: 12px;
              padding: 1rem;
              margin-bottom: 1.5rem;
              font-size: 0.875rem;
            }
            
            .error-details summary {
              cursor: pointer;
              color: #64748b;
              font-weight: 500;
              margin-bottom: 0.75rem;
            }
            
            .error-stack {
              background: #1e293b;
              color: #f8fafc;
              padding: 1rem;
              border-radius: 8px;
              overflow-x: auto;
              font-size: 0.75rem;
              white-space: pre-wrap;
              word-break: break-word;
              max-height: 300px;
              overflow-y: auto;
            }
            
            .error-component-stack {
              margin-top: 1rem;
              padding-top: 1rem;
              border-top: 1px solid #334155;
              color: #94a3b8;
            }
            
            .error-actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              flex-wrap: wrap;
            }
            
            .error-actions .btn {
              min-width: 120px;
            }
            
            @media (max-width: 480px) {
              .error-boundary-content {
                padding: 2rem 1.5rem;
              }
              
              .error-title {
                font-size: 1.5rem;
              }
              
              .error-actions {
                flex-direction: column;
              }
              
              .error-actions .btn {
                width: 100%;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
