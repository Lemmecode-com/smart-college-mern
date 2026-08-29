import { useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
} from "react-icons/fa";

const COLORS = {
  primary: "#3db5e6",
  primaryDark: "#1a4b6d",
  text: "#1e293b",
  textMuted: "#64748b",
  border: "#cbd5e1",
  track: "#e2e8f0",
  bg: "#f8fafc",
  white: "#ffffff",
  shadowInset: "rgba(0, 0, 0, 0.04)",
};

const pageBtnBase = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "44px",
  minHeight: "44px",
  padding: "8px 12px",
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1,
  borderRadius: "10px",
  border: `1px solid ${COLORS.border}`,
  background: COLORS.white,
  color: COLORS.text,
  boxShadow: `0 1px 2px ${COLORS.shadowInset}`,
  transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
  cursor: "pointer",
  outline: "none",
  userSelect: "none",
};

const btnStyle = ({ isCurrent, isDisabled, hovered, focused }) => {
  if (isDisabled) {
    return {
      ...pageBtnBase,
      opacity: 0.45,
      cursor: "not-allowed",
      transform: "none",
    };
  }

  const interactive = hovered || focused;

  if (isCurrent) {
    return {
      ...pageBtnBase,
      background: COLORS.primary,
      color: COLORS.white,
      borderColor: COLORS.primary,
      fontWeight: 600,
      boxShadow: interactive
        ? `0 0 0 3px ${COLORS.primary}44`
        : `0 2px 6px ${COLORS.primary}33`,
    };
  }

  return {
    ...pageBtnBase,
    ...(hovered
      ? {
          transform: "translateY(-1px)",
          borderColor: COLORS.primary,
          color: COLORS.primaryDark,
          boxShadow: `0 4px 12px ${COLORS.primary}22`,
        }
      : {}),
    ...(focused
      ? {
          boxShadow: `0 0 0 3px ${COLORS.primary}33, 0 1px 2px ${COLORS.shadowInset}`,
        }
      : {}),
  };
};

const ellipsisStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "44px",
  minHeight: "44px",
  fontSize: "14px",
  fontWeight: 600,
  color: COLORS.textMuted,
  cursor: "default",
  userSelect: "none",
};

const containerStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  justifyContent: "center",
  alignItems: "center",
  padding: "12px 16px",
  margin: "20px 0",
  borderRadius: "14px",
  background: COLORS.bg,
  border: `1px solid ${COLORS.track}`,
};

const pageRowStyle = {
  display: "inline-flex",
  flexWrap: "wrap",
  gap: "6px",
  alignItems: "center",
};

const infoStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  marginLeft: "8px",
  padding: "6px 14px",
  borderRadius: "20px",
  background: COLORS.white,
  border: `1px solid ${COLORS.border}`,
  color: COLORS.textMuted,
  fontSize: "13px",
  fontWeight: 600,
};

function NavButton({
  id,
  icon,
  label,
  onClick,
  isCurrent,
  isDisabled,
  hovered,
  focused,
  onHover,
  onFocus,
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={isDisabled}
      aria-current={isCurrent ? "page" : undefined}
      style={btnStyle({
        isCurrent,
        isDisabled,
        hovered: hovered === id,
        focused: focused === id,
      })}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onFocus(id)}
      onBlur={() => onFocus(null)}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

export default function Pagination({ page, totalPages, setPage }) {
  const [hovered, setHovered] = useState(null);
  const [focused, setFocused] = useState(null);

  // Generate page numbers to display with ellipsis logic
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (page > 3) {
        pages.push("...");
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
    }
  };

  const pageNumbers = getPageNumbers();

  // No pagination needed for single page
  if (totalPages <= 1) return null;

  return (
    <div
      className="erp-pagination"
      role="navigation"
      aria-label="Pagination"
      style={containerStyle}
    >
      {/* First page button */}
      <NavButton
        id="first"
        label="First page"
        icon={<FaAngleDoubleLeft size={14} />}
        isDisabled={page === 1}
        onClick={() => handlePageChange(1)}
        hovered={hovered}
        focused={focused}
        onHover={setHovered}
        onFocus={setFocused}
      />

      {/* Previous page button */}
      <NavButton
        id="prev"
        label="Previous page"
        icon={<FaChevronLeft size={14} />}
        isDisabled={page === 1}
        onClick={() => handlePageChange(page - 1)}
        hovered={hovered}
        focused={focused}
        onHover={setHovered}
        onFocus={setFocused}
      />

      {/* Page numbers */}
      <div className="erp-pagination__pages" style={pageRowStyle}>
        {pageNumbers.map((pageNum, index) =>
          pageNum === "..." ? (
            <span
              key={`ellipsis-${index}`}
              aria-hidden="true"
              style={ellipsisStyle}
            >
              &#8230;
            </span>
          ) : (
            <NavButton
              key={pageNum}
              id={`page-${pageNum}`}
              label={`Page ${pageNum}`}
              icon={<span>{pageNum}</span>}
              isCurrent={pageNum === page}
              onClick={() => handlePageChange(pageNum)}
              hovered={hovered}
              focused={focused}
              onHover={setHovered}
              onFocus={setFocused}
            />
          ),
        )}
      </div>

      {/* Next page button */}
      <NavButton
        id="next"
        label="Next page"
        icon={<FaChevronRight size={14} />}
        isDisabled={page === totalPages}
        onClick={() => handlePageChange(page + 1)}
        hovered={hovered}
        focused={focused}
        onHover={setHovered}
        onFocus={setFocused}
      />

      {/* Last page button */}
      <NavButton
        id="last"
        label="Last page"
        icon={<FaAngleDoubleRight size={14} />}
        isDisabled={page === totalPages}
        onClick={() => handlePageChange(totalPages)}
        hovered={hovered}
        focused={focused}
        onHover={setHovered}
        onFocus={setFocused}
      />

      {/* Page info badge */}
      <span style={infoStyle}>
        Page {page} of {totalPages}
      </span>
    </div>
  );
}
