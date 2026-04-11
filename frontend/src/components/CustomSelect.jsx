import { useState, useRef, useEffect } from "react";
import { FaChevronDown, FaCheck } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

/* ================= CUSTOM DROPDOWN COMPONENT ================= */
/* Prevents mobile overflow issues with native select dropdowns */

const dropdownVariants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.15,
      ease: "easeIn",
    },
  },
};

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  className = "",
  style = {},
  "aria-label": ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    // Close dropdown when scrolling
    const handleScroll = () => {
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleSelect = (optionValue) => {
    onChange({ target: { value: optionValue } });
    setIsOpen(false);
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  // Dropdown menu content
  const dropdownMenu = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={dropdownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            position: "fixed",
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxWidth: "100vw",
            backgroundColor: "white",
            border: "2px solid #e2e8f0",
            borderRadius: "10px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
            zIndex: 99999,
            overflow: "hidden",
            maxHeight: "280px",
            overflowY: "auto",
          }}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "none",
                borderBottom:
                  index < options.length - 1 ? "1px solid #f1f5f9" : "none",
                backgroundColor:
                  value === option.value ? "#1a4b6d" : "transparent",
                color: value === option.value ? "white" : "#1e293b",
                fontSize: "0.95rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (value !== option.value) {
                  e.target.style.backgroundColor = "#f8fafc";
                }
              }}
              onMouseLeave={(e) => {
                if (value !== option.value) {
                  e.target.style.backgroundColor = "transparent";
                }
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  fontWeight: value === option.value ? 600 : 400,
                }}
              >
                {option.label}
              </span>
              {value === option.value && (
                <FaCheck
                  style={{
                    fontSize: "0.85rem",
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      ref={dropdownRef}
      className={`custom-select-wrapper ${className}`}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        ...style,
      }}
    >
      {/* Select Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        style={{
          width: "100%",
          padding: "0.75rem 2.5rem 0.75rem 1rem",
          border: "2px solid #e2e8f0",
          borderRadius: "10px",
          fontSize: "0.95rem",
          backgroundColor: "white",
          cursor: "pointer",
          transition: "all 0.3s ease",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          textAlign: "left",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#1a4b6d";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#e2e8f0";
        }}
      >
        <span
          style={{
            color: value ? "#1e293b" : "#64748b",
            fontWeight: value ? 500 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {displayText}
        </span>
        <FaChevronDown
          style={{
            fontSize: "0.75rem",
            color: "#64748b",
            transition: "transform 0.2s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown Menu via Portal */}
      {typeof window !== "undefined"
        ? createPortal(dropdownMenu, document.body)
        : null}
    </div>
  );
}
