import { NavLink } from "react-router-dom";

export default function SidebarNavItem({ 
  to, 
  icon: Icon, 
  label, 
  ariaLabel,
  isActive 
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => 
        `nav-link ${isActive ? "active-link" : ""}`
      }
      role="menuitem"
      aria-label={ariaLabel || label}
      aria-current={isActive ? "page" : undefined}
    >
      {Icon && <Icon aria-hidden="true" />}
      <span>{label}</span>
    </NavLink>
  );
}
