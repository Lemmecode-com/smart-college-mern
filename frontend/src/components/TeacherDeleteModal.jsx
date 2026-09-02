import { motion, AnimatePresence } from "framer-motion";
import {
  FaExclamationTriangle,
  FaTimes,
  FaTrash,
  FaSpinner,
} from "react-icons/fa";

/**
 * TeacherDeleteModal
 *
 * Confirmation modal shown before hard-deleting a teacher.
 * Replaces the native window.confirm() so the action is testable and
 * consistent with the Deactivate flow.
 */
export default function TeacherDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  teacherName,
  loading = false,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="teacher-delete-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={loading ? undefined : onClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete teacher"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "20px",
              maxWidth: "480px",
              width: "100%",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
            }}
          >
            {/* HEADER */}
            <div
              style={{
                background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
                padding: "2rem",
                textAlign: "center",
                position: "relative",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                aria-label="Close"
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  background: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <FaTimes style={{ color: "#64748b" }} />
              </button>
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
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                }}
              >
                <FaExclamationTriangle
                  style={{ width: "40px", height: "40px", color: "#dc3545" }}
                />
              </motion.div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#1e293b",
                }}
              >
                Delete Teacher
              </h3>
            </div>

            {/* BODY */}
            <div style={{ padding: "1.5rem 2rem", textAlign: "center" }}>
              <p
                style={{
                  margin: 0,
                  color: "#475569",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                }}
              >
                Are you sure you want to delete{" "}
                <strong style={{ color: "#1e293b" }}>
                  {teacherName || "this teacher"}
                </strong>
                ? This action cannot be undone.
              </p>
            </div>

            {/* FOOTER */}
            <div
              style={{
                padding: "1.5rem 2rem",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                gap: "1rem",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                aria-label="Cancel delete"
                style={{
                  flex: 1,
                  padding: "0.875rem 1.5rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  background: "white",
                  color: "#64748b",
                  fontWeight: 600,
                  fontSize: "1rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                aria-label="Confirm delete"
                data-testid="confirm-delete-teacher"
                style={{
                  flex: 1,
                  padding: "0.875rem 1.5rem",
                  border: "none",
                  borderRadius: "12px",
                  background: loading
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #dc3545 0%, #b91c1c 100%)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "1rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading
                    ? "none"
                    : "0 4px 15px rgba(220, 53, 69, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                {loading ? (
                  <span>
                    <FaSpinner
                      className="spin-animation"
                      style={{ marginRight: "0.5rem" }}
                    />
                    Deleting...
                  </span>
                ) : (
                  <span>
                    <FaTrash style={{ marginRight: "0.5rem" }} />
                    Delete
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
