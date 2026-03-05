import { Link } from "react-router-dom";

/**
 * Reusable Breadcrumb Component
 * @param {Array} items - Array of breadcrumb items with { label, path? }
 * @returns {JSX.Element} Breadcrumb navigation
 */
export default function Breadcrumb({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      style={styles.breadcrumbNav}
      aria-label="Breadcrumb"
    >
      <ol style={styles.breadcrumbList}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const hasPath = item.path && !isLast;

          return (
            <li key={index} style={styles.breadcrumbItem}>
              {hasPath ? (
                <Link
                  to={item.path}
                  style={styles.breadcrumbLink}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#e2e8f0";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <span style={styles.breadcrumbCurrent}>{item.label}</span>
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
/* Matches NOVAA dashboard theme - Primary: #1a4b6d */
const styles = {
  breadcrumbNav: {
    marginBottom: "1.25rem",
    padding: "0",
  },
  breadcrumbList: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.5rem",
    listStyle: "none",
    margin: 0,
    padding: "14px 20px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e2e8f0",
  },
  breadcrumbItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.95rem",
  },
  breadcrumbLink: {
    display: "inline-flex",
    alignItems: "center",
    color: "#1a4b6d",
    textDecoration: "none",
    fontWeight: "500",
    padding: "0.35rem 0.65rem",
    borderRadius: "8px",
    transition: "all 0.2s ease",
    backgroundColor: "transparent",
  },
  breadcrumbCurrent: {
    display: "inline-flex",
    alignItems: "center",
    color: "#1a4b6d",
    fontWeight: "600",
    padding: "0.35rem 0.65rem",
    fontSize: "1rem",
  },
  separator: {
    color: "#94a3b8",
    fontWeight: "400",
    marginLeft: "0.25rem",
    marginRight: "0.25rem",
  },
};
