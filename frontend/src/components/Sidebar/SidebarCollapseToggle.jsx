import { FaChevronLeft } from 'react-icons/fa';
import { ARIA_LABELS } from './config/sidebar.constants';

/**
 * SidebarCollapseToggle - Floating collapse/expand button
 * Enterprise SaaS Standard (Linear, Vercel, Supabase style)
 * 
 * Features:
 * - Smooth chevron rotation animation
 * - Accessible with ARIA labels
 * - Hover scale effect
 * - Positioned between sidebar and content
 */
export default function SidebarCollapseToggle({ isCollapsed, onToggle }) {
  return (
    <button
      type="button"
      className="sidebar-collapse-toggle"
      onClick={onToggle}
      aria-label={ARIA_LABELS.COLLAPSE_TOGGLE(isCollapsed)}
      aria-expanded={!isCollapsed}
      aria-controls="sidebar-main"
    >
      <FaChevronLeft 
        className={`collapse-icon ${isCollapsed ? 'flipped' : ''}`}
        aria-hidden="true"
      />
    </button>
  );
}
