import { Link } from "react-router-dom";
import "./Breadcrumb.css";

export default function Breadcrumb({ items = [], className = "", variant = "box" }) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      className={`erp-breadcrumb erp-breadcrumb--${variant} ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="erp-breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const hasPath = item.path && !isLast;

          return (
            <li key={index} className="erp-breadcrumb-item">
              {hasPath ? (
                <Link
                  to={item.path}
                  className="erp-breadcrumb-link"
                >
                  {item.icon && (
                    <span className="erp-breadcrumb-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </Link>
              ) : (
                <span
                  className="erp-breadcrumb-current"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.icon && (
                    <span className="erp-breadcrumb-icon">{item.icon}</span>
                  )}
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className="erp-breadcrumb-separator" aria-hidden="true">
                  <ChevronRightIcon />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
