import { motion, AnimatePresence } from "framer-motion";
import { FaExclamationTriangle, FaQuestionCircle, FaInfoCircle } from "react-icons/fa";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  type = "warning", // warning, danger, info
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false
}) {
  const typeConfig = {
    warning: {
      icon: FaExclamationTriangle,
      iconColor: "#ffc107",
      confirmBtnClass: "btn-warning",
      bgGradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)"
    },
    danger: {
      icon: FaExclamationTriangle,
      iconColor: "#dc3545",
      confirmBtnClass: "btn-danger",
      bgGradient: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)"
    },
    info: {
      icon: FaQuestionCircle,
      iconColor: "#17a2b8",
      confirmBtnClass: "btn-info",
      bgGradient: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)"
    },
    success: {
      icon: FaInfoCircle,
      iconColor: "#28a745",
      confirmBtnClass: "btn-success",
      bgGradient: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)"
    }
  };

  const config = typeConfig[type] || typeConfig.warning;
  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="confirm-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem"
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "20px",
              maxWidth: "500px",
              width: "calc(100% - 2rem)",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.2)",
              overflow: "hidden"
            }}
          >
            {/* Header with gradient */}
            <div
              style={{
                background: config.bgGradient,
                padding: "2rem",
                textAlign: "center"
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                style={{
                  width: "80px",
                  height: "80px",
                  margin: "0 auto 1rem",
                  background: "white",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)"
                }}
              >
                <IconComponent
                  style={{
                    width: "40px",
                    height: "40px",
                    color: config.iconColor
                  }}
                />
              </motion.div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#1e293b"
                }}
              >
                {title}
              </h3>
            </div>

            {/* Message */}
            <div style={{ padding: "2rem" }}>
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "1.05rem",
                  lineHeight: 1.6,
                  textAlign: "center"
                }}
              >
                {message}
              </p>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  marginTop: "2rem"
                }}
              >
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: "0.875rem 1.5rem",
                    border: "2px solid #e2e8f0",
                    borderRadius: "12px",
                    background: "white",
                    color: "#64748b",
                    fontWeight: 600,
                    fontSize: "1rem",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    transition: "all 0.3s ease",
                    opacity: isLoading ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.target.style.borderColor = "#94a3b8";
                      e.target.style.backgroundColor = "#f8fafc";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.backgroundColor = "white";
                    }
                  }}
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`btn ${config.confirmBtnClass}`}
                  style={{
                    flex: 1,
                    padding: "0.875rem 1.5rem",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: 600,
                    fontSize: "1rem",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: isLoading ? "none" : "0 4px 15px rgba(0, 0, 0, 0.1)",
                    opacity: isLoading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.15)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.1)";
                    }
                  }}
                >
                  {isLoading ? (
                    <span>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Processing...
                    </span>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
