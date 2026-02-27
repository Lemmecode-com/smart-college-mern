import { NavLink, useLocation } from "react-router-dom";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";

/**
 * SidebarSection - Collapsible navigation section with submenu
 * Enterprise SaaS Standard:
 * - Full row clickability (button element)
 * - Visible keyboard focus state
 * - Smooth caret rotation animation
 * - Proper active state inheritance from child routes
 */
export default function SidebarSection({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  sectionId,
  children,
  ariaLabel,
  isActive = false,
  isCollapsed = false
}) {
  const location = useLocation();

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div className={`sidebar-section-wrapper ${isActive ? 'section-active' : ''}`}>
      {/* Full row clickable button */}
      <button
        type="button"
        className={`sidebar-section-title ${isOpen ? "open" : ""} ${isActive ? "active-section" : ""}`}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-controls={`${sectionId}-menu`}
        aria-label={ariaLabel || title}
        disabled={isCollapsed}
      >
        <div className="section-title-content">
          {Icon && <span className="section-icon"><Icon aria-hidden="true" /></span>}
          <span className="section-title-text">{title}</span>
        </div>
        <span 
          className={`section-caret ${isOpen ? "caret-open" : ""}`} 
          aria-hidden="true"
        >
          <FaChevronRight size={12} />
        </span>
      </button>

      <div
        id={`${sectionId}-menu`}
        className={`submenu ${isOpen ? "open" : ""}`}
        role="group"
        aria-label={`${title} submenu`}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * SidebarSubItem - Submenu navigation link
 * Enterprise SaaS Standard:
 * - Proper active route matching with partial path support
 * - Full row clickability
 * - Visible focus state
 * - Consistent indentation
 */
export function SidebarSubItem({ to, icon: Icon, label, ariaLabel, onClick }) {
  const location = useLocation();

  // Check if current route matches or is a child of the target path
  const isActive = location.pathname === to ||
                   location.pathname.startsWith(to + '/') ||
                   (to.includes(':') && isDynamicRouteMatch(to, location.pathname));

  return (
    <NavLink
      to={to}
      className={({ isActive: linkIsActive }) =>
        `sub-link ${linkIsActive || isActive ? "active-sublink" : ""}`
      }
      role="menuitem"
      aria-label={ariaLabel || label}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
    >
      {Icon && <span className="sub-link-icon"><Icon aria-hidden="true" /></span>}
      <span className="sub-link-text">{label}</span>
    </NavLink>
  );
}

/**
 * Helper: Check if a dynamic route pattern matches the current path
 * e.g., /subjects/course/:courseId matches /subjects/course/123
 */
function isDynamicRouteMatch(pattern, pathname) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) return false;

  return patternParts.every((part, index) => {
    // Dynamic segment (starts with :) matches anything
    if (part.startsWith(':')) return true;
    // Static segment must match exactly
    return part === pathParts[index];
  });
}
