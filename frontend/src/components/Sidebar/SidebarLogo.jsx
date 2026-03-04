import { Link } from "react-router-dom";

/**
 * SidebarLogo - Brand logo and user role display
 * Enterprise SaaS Standard:
 * - Collapsed state support (icon-only mode)
 * - Consistent spacing hierarchy
 * - Proper ARIA labels for accessibility
 * - Clickable logo - redirects to role dashboard
 * - Vertical stacking: Logo Image → Role
 */
export default function SidebarLogo({ role, isCollapsed = false }) {
  // Dashboard routes based on role
  const getDashboardRoute = (userRole) => {
    const routes = {
      college_admin: "/admin/dashboard",
      teacher: "/teacher/dashboard",
      student: "/student/dashboard",
      admin: "/admin/dashboard",
    };
    return routes[userRole?.toLowerCase()] || "/dashboard";
  };

  const dashboardRoute = getDashboardRoute(role);

  return (
    <Link to={dashboardRoute} className="sidebar-logo-link" role="banner">
      <div className="logo-container">
        {/* Logo Image - Primary brand element */}
        <img
          src="/novaa.png"
          alt="NOVAA Logo"
          className="logo-image"
          loading="lazy"
        />
        {!isCollapsed && (
          <span
            className="logo-role"
            aria-label={`User role: ${role?.replace("_", " ") || "User"}`}
          >
            {role?.replace("_", " ")}
          </span>
        )}
      </div>
    </Link>
  );
}
