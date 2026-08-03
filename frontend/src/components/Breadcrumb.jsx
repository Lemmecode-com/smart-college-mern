import { useNavigate } from "react-router-dom";

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
    <nav className="erp-breadcrumb" aria-label="Breadcrumb">
      <ol className="erp-breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const hasPath = item.path && !isLast;

          return (
            <li key={index} className="erp-breadcrumb-item">
              {hasPath ? (
                <a
                  href={item.path}
                  className="erp-breadcrumb-link"
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
                  {item.icon && <span className="erp-breadcrumb-icon">{item.icon}</span>}
                  {item.label}
                </a>
              ) : (
                <span className="erp-breadcrumb-current">
                  {item.icon && <span className="erp-breadcrumb-icon">{item.icon}</span>}
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className="erp-breadcrumb-separator" aria-hidden="true">
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
