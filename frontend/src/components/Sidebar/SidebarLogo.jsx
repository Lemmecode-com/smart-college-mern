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
  // Note: Roles are in UPPERCASE format (COLLEGE_ADMIN, TEACHER, STUDENT, SUPER_ADMIN)
  const getDashboardRoute = (userRole) => {
    const routes = {
      COLLEGE_ADMIN: "/dashboard",
      TEACHER: "/teacher/dashboard",
      STUDENT: "/student/dashboard",
      SUPER_ADMIN: "/super-admin/dashboard",
    };
    return routes[userRole] || "/dashboard";
  };

  const dashboardRoute = getDashboardRoute(role);

  return (
    <Link to={dashboardRoute} className="sidebar-logo-link" role="banner">
      <div className="logo-container">
        {/* Logo Image - Primary brand element */}
        <img
          src="/novaaa.png"
          alt="NOVAA Logo"
          className="logo-image"
          // No loading="lazy" - this image is above the fold and visible on page load
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
