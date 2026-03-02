import { motion } from "framer-motion";

export default function Loading({
  size = "md",
  color = "primary",
  text,
  fullScreen = false,
  variant = "spinner", // "spinner" | "dots" | "pulse"
}) {
  const sizeClasses = {
    sm: "spinner-border-sm",
    md: "",
    lg: "spinner-border-lg",
  };

  const colorClasses = {
    primary: "text-primary",
    success: "text-success",
    info: "text-info",
    warning: "text-warning",
    danger: "text-danger",
  };

  const spinnerClass = `spinner-border ${sizeClasses[size]} ${colorClasses[color] || colorClasses.primary}`;

  const content = (
    <div className="text-center py-5">
      {/* Animated Spinner with Glow Effect */}
      <div className="position-relative d-inline-block">
        <div
          className={spinnerClass}
          role="status"
          aria-hidden="true"
          style={{
            width: size === "lg" ? "5rem" : size === "sm" ? "2rem" : "3rem",
            height: size === "lg" ? "5rem" : size === "sm" ? "2rem" : "3rem",
            borderWidth: "3px",
            filter: "drop-shadow(0 0 8px rgba(26, 75, 109, 0.3))",
          }}
        />
        {/* Pulsing Center Dot */}
        <motion.div
          className="position-absolute top-50 start-50 translate-middle"
          style={{
            width: size === "lg" ? "12px" : size === "sm" ? "6px" : "8px",
            height: size === "lg" ? "12px" : size === "sm" ? "6px" : "8px",
            backgroundColor: "var(--bs-primary)",
            borderRadius: "50%",
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Loading Text */}
      {text && (
        <motion.p
          className="mt-4 mb-0 fw-semibold"
          style={{
            color: "#1a4b6d",
            fontSize: size === "lg" ? "1.25rem" : size === "sm" ? "0.9rem" : "1rem",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          aria-live="polite"
        >
          {text}
        </motion.p>
      )}

      {/* Progress Dots */}
      <div className="d-flex justify-content-center gap-2 mt-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "var(--bs-primary)",
              borderRadius: "50%",
              opacity: 0.5,
            }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Screen Reader Only Text */}
      <span className="visually-hidden">Loading...</span>
    </div>
  );

  if (fullScreen) {
    return (
      <motion.div
        className="d-flex justify-content-center align-items-center vh-100"
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Decorative Background Elements */}
        <div className="position-absolute w-100 h-100 overflow-hidden">
          <motion.div
            className="position-absolute"
            style={{
              width: "300px",
              height: "300px",
              background: "radial-gradient(circle, rgba(26, 75, 109, 0.05) 0%, transparent 70%)",
              top: "10%",
              left: "10%",
              borderRadius: "50%",
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="position-absolute"
            style={{
              width: "200px",
              height: "200px",
              background: "radial-gradient(circle, rgba(26, 75, 109, 0.05) 0%, transparent 70%)",
              bottom: "10%",
              right: "10%",
              borderRadius: "50%",
            }}
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.8, 0.5, 0.8],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Loading Content */}
        <div className="position-relative" style={{ zIndex: 1 }}>
          {content}
        </div>
      </motion.div>
    );
  }

  return content;
}
