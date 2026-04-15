import { FaSignOutAlt, FaSpinner } from "react-icons/fa";

/**
 * SidebarFooter - Logout button container
 * Enterprise SaaS Standard:
 * - Proper bottom spacing for visual hierarchy
 * - Visible keyboard focus state for accessibility
 * - Full row clickability
 * - Collapsed state support (icon-only)
 */
export default function SidebarFooter({ 
  loggingOut, 
  onLogout,
  isCollapsed = false 
}) {
  return (
    <div className="sidebar-logout" role="navigation" aria-label="Logout">
      <button
        type="button"
        onClick={onLogout}
        className="logout-btn btn btn-danger w-100 d-flex align-items-center justify-content-center gap-2"
        disabled={loggingOut}
        aria-label={loggingOut ? "Logging out..." : "Logout"}
        aria-busy={loggingOut}
      >
        {loggingOut ? (
          <>
            <FaSpinner className="spinner-icon" aria-hidden="true" />
            {!isCollapsed && <span>Logging out...</span>}
          </>
        ) : (
          <>
            <FaSignOutAlt aria-hidden="true" />
            {!isCollapsed && <span>Logout</span>}
          </>
        )}
      </button>
    </div>
  );
}
