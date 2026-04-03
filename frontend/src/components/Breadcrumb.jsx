import { useNavigate } from "react-router-dom";

/**
 * Enterprise-level Reusable Breadcrumb Component
 * @param {Array} items - Array of breadcrumb items with { label, path?, icon? }
 * @returns {JSX.Element} Breadcrumb navigation
 *
 * Features:
 * - Full width of content container
 * - Consistent height (~60px desktop, auto on mobile)
 * - Flex layout for vertical centering
 * - Consistent padding and margin
 * - Responsive design
 * - Modern SaaS dashboard UI
 */
export default function Breadcrumb({ items = [] }) {
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  const handleBreadcrumbClick = (e, path) => {
    e.preventDefault();
    if (path) {
      navigate(path);
    }
  };

  return (
    <nav style={styles.breadcrumbNav} aria-label="Breadcrumb">
      <ol style={styles.breadcrumbList}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const hasPath = item.path && !isLast;

          return (
            <li key={index} style={styles.breadcrumbItem}>
              {hasPath ? (
                <a
                  href={item.path}
                  style={styles.breadcrumbLink}
                  onClick={(e) => handleBreadcrumbClick(e, item.path)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                    e.currentTarget.style.color = "#0f2f4a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#1a4b6d";
                  }}
                >
                  {item.icon && <span style={styles.icon}>{item.icon}</span>}
                  {item.label}
                </a>
              ) : (
                <span style={styles.breadcrumbCurrent}>
                  {item.icon && <span style={styles.icon}>{item.icon}</span>}
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span style={styles.separator} aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ================= INLINE STYLES ================= */
/* Enterprise-level consistent styling for SaaS dashboard */
/* Primary theme color: #1a4b6d */

const styles = {
  breadcrumbNav: {
    width: "100%",
    height: "60px",
    marginBottom: "1.5rem",
    boxSizing: "border-box",
  },
  breadcrumbList: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.5rem",
    listStyle: "none",
    margin: 0,
    padding: "0 1.25rem",
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e2e8f0",
    boxSizing: "border-box",
  },
  breadcrumbItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.95rem",
    whiteSpace: "nowrap",
  },
  breadcrumbLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    color: "#1a4b6d",
    textDecoration: "none",
    fontWeight: "500",
    padding: "0.35rem 0.65rem",
    borderRadius: "8px",
    transition: "all 0.2s ease",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
  },
  breadcrumbCurrent: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    color: "#1a4b6d",
    fontWeight: "600",
    padding: "0.35rem 0.65rem",
    fontSize: "0.95rem",
  },
  separator: {
    color: "#94a3b8",
    fontWeight: "400",
    marginLeft: "0.25rem",
    marginRight: "0.25rem",
    userSelect: "none",
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "1rem",
  },
};

/* ================= RESPONSIVE STYLES ================= */
/* Note: For production, extract to CSS file with @media queries */
/* Inline responsive overrides can be applied via window.innerWidth checks */

const getResponsiveStyles = () => {
  if (typeof window === "undefined") return {};

  const isMobile = window.innerWidth <= 480;
  const isTablet = window.innerWidth <= 768;

  if (isMobile) {
    return {
      breadcrumbNav: {
        height: "auto",
        minHeight: "50px",
        marginBottom: "0.75rem",
      },
      breadcrumbList: { padding: "0.625rem 0.875rem", borderRadius: "8px" },
      breadcrumbItem: { fontSize: "0.8125rem" },
      breadcrumbLink: { padding: "0.2rem 0.4rem", fontSize: "0.8125rem" },
      breadcrumbCurrent: { padding: "0.2rem 0.4rem", fontSize: "0.8125rem" },
      separator: { marginLeft: "0.125rem", marginRight: "0.125rem" },
    };
  }

  if (isTablet) {
    return {
      breadcrumbNav: {
        height: "auto",
        minHeight: "50px",
        marginBottom: "1rem",
      },
      breadcrumbList: { padding: "0.75rem 1rem" },
      breadcrumbItem: { fontSize: "0.875rem" },
      breadcrumbLink: { padding: "0.25rem 0.5rem", fontSize: "0.875rem" },
      breadcrumbCurrent: { padding: "0.25rem 0.5rem", fontSize: "0.875rem" },
    };
  }

  return {};
};

// Merge responsive styles (call within component for dynamic resizing)
const responsiveStyles = getResponsiveStyles();
Object.keys(responsiveStyles).forEach((key) => {
  if (styles[key]) {
    styles[key] = { ...styles[key], ...responsiveStyles[key] };
  }
});
