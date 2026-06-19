import { useState, useRef, useEffect } from "react";
import { FaChevronDown, FaSearch, FaTimes, FaCheck } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

const MotionDiv = motion.div;

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

export default function SearchableSelect({
   value,
   onChange,
   fetchOptions,
   placeholder = "Select...",
   searchPlaceholder = "Search...",
   className = "",
   style = {},
   "aria-label": ariaLabel,
   name,
 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    if (isOpen && fetchOptions) {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
      const searchTimer = setTimeout(async () => {
        setLoading(true);
        try {
          const results = await fetchOptions(searchQuery);
          setOptions(results || []);
        } catch (err) {
          console.error("Failed to fetch options:", err);
          setOptions([]);
        } finally {
          setLoading(false);
        }
      }, 300);
      return () => clearTimeout(searchTimer);
    }
  }, [isOpen, searchQuery, fetchOptions]);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

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
    onChange({ target: { value: optionValue, name } });
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ target: { value: "" } });
    setSearchQuery("");
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  const filteredOptions = searchQuery
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : options;

  const dropdownMenu = (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
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
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
            zIndex: 99999,
            overflow: "hidden",
            maxHeight: "320px",
          }}
        >
          <div style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ position: "relative" }}>
              <FaSearch
                size={14}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={ariaLabel ? `${ariaLabel} search` : "Search options"}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <FaTimes size={12} />
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              maxHeight: "240px",
              overflowY: "auto",
            }}
          >
            {loading ? (
              <div
                style={{
                  padding: "16px",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: "0.9rem",
                }}
              >
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: "0.9rem",
                }}
              >
                No results found
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    border: "none",
                    borderBottom:
                      index < filteredOptions.length - 1
                        ? "1px solid #f1f5f9"
                        : "none",
                    backgroundColor:
                      value === option.value ? "#f0f9ff" : "transparent",
                    color: "#1e293b",
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
                        color: "#1a4b6d",
                      }}
                    />
                  )}
                </button>
              ))
            )}
          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );

  return (
    <div
      ref={dropdownRef}
      className={`searchable-select-wrapper ${className}`}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        ...style,
      }}
    >
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
          minHeight: "44px",
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
        {value && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              padding: "4px",
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              marginRight: "4px",
            }}
          >
            <FaTimes size={12} />
          </button>
        )}
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

{typeof window !== "undefined"
         ? createPortal(dropdownMenu, document.body)
         : null}
     </div>
   );
 }