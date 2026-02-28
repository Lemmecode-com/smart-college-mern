import { motion } from "framer-motion";
import { FaCheck, FaTimes } from "react-icons/fa";

export default function AttendanceToggle({
  studentId,
  status,
  onStatusChange,
  disabled = false
}) {
  const isPresent = status === "PRESENT";
  const isAbsent = status === "ABSENT";

  const handlePresentClick = () => {
    if (!disabled) {
      onStatusChange(studentId, "PRESENT");
    }
  };

  const handleAbsentClick = () => {
    if (!disabled) {
      onStatusChange(studentId, "ABSENT");
    }
  };

  const handleKeyDown = (e, action) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  return (
    <div
      className="attendance-toggle"
      style={{
        display: "flex",
        gap: "0.5rem",
        justifyContent: "center",
        alignItems: "center"
      }}
      role="group"
      aria-label={`Attendance status for student ${studentId}`}
    >
      {/* Present Button */}
      <motion.button
        type="button"
        onClick={handlePresentClick}
        onKeyDown={(e) => handleKeyDown(e, handlePresentClick)}
        disabled={disabled}
        aria-pressed={isPresent}
        aria-label="Mark present"
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        style={{
          padding: "0.625rem 1.25rem",
          border: isPresent ? "2px solid #28a745" : "2px solid #e2e8f0",
          borderRadius: "10px",
          background: isPresent
            ? "linear-gradient(135deg, #28a745 0%, #218838 100%)"
            : "white",
          color: isPresent ? "white" : "#64748b",
          fontWeight: 600,
          fontSize: "0.9rem",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          boxShadow: isPresent ? "0 4px 12px rgba(40, 167, 69, 0.3)" : "none",
          minWidth: "90px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.375rem",
          opacity: disabled ? 0.5 : 1
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isPresent) {
            e.target.style.borderColor = "#28a745";
            e.target.style.backgroundColor = "#f0fdf4";
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isPresent) {
            e.target.style.borderColor = "#e2e8f0";
            e.target.style.backgroundColor = "white";
          }
        }}
      >
        <FaCheck style={{ fontSize: "0.85rem" }} />
        <span>Present</span>
      </motion.button>

      {/* Absent Button */}
      <motion.button
        type="button"
        onClick={handleAbsentClick}
        onKeyDown={(e) => handleKeyDown(e, handleAbsentClick)}
        disabled={disabled}
        aria-pressed={isAbsent}
        aria-label="Mark absent"
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        style={{
          padding: "0.625rem 1.25rem",
          border: isAbsent ? "2px solid #dc3545" : "2px solid #e2e8f0",
          borderRadius: "10px",
          background: isAbsent
            ? "linear-gradient(135deg, #dc3545 0%, #c82333 100%)"
            : "white",
          color: isAbsent ? "white" : "#64748b",
          fontWeight: 600,
          fontSize: "0.9rem",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          boxShadow: isAbsent ? "0 4px 12px rgba(220, 53, 69, 0.3)" : "none",
          minWidth: "90px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.375rem",
          opacity: disabled ? 0.5 : 1
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isAbsent) {
            e.target.style.borderColor = "#dc3545";
            e.target.style.backgroundColor = "#fef2f2";
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isAbsent) {
            e.target.style.borderColor = "#e2e8f0";
            e.target.style.backgroundColor = "white";
          }
        }}
      >
        <FaTimes style={{ fontSize: "0.85rem" }} />
        <span>Absent</span>
      </motion.button>
    </div>
  );
}
