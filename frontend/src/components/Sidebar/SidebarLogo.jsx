import { FaGraduationCap } from "react-icons/fa";

/**
 * SidebarLogo - Brand logo and user role display
 * Enterprise SaaS Standard:
 * - Collapsed state support (icon-only mode)
 * - Consistent spacing hierarchy
 * - Proper ARIA labels for accessibility
 * - Vertical stacking: Icon → Logo Text → Role
 */
export default function SidebarLogo({ role, isCollapsed = false }) {
  return (
    <div className="sidebar-logo" role="banner">
      <div className="logo-container">
        <div className="logo-icon" aria-hidden="true">
          <FaGraduationCap size={isCollapsed ? 28 : 20} />
        </div>
        {!isCollapsed && (
          <>
            <h4 className="logo-text">NOVAA</h4>
            <span
              className="logo-role"
              aria-label={`User role: ${role?.replace("_", " ") || "User"}`}
            >
              {role?.replace("_", " ")}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
