/**
 * Sidebar Component Index
 * Enterprise SaaS Standard - Clean Architecture
 * 
 * Usage:
 * import { Sidebar, SidebarNav, SidebarSection } from '@/components/Sidebar';
 */

export { default as Sidebar } from './Sidebar';
export { default as SidebarContainer } from './SidebarContainer';
export { default as SidebarNav } from './SidebarNav';
export { default as SidebarSection, SidebarSubItem } from './SidebarSection';
export { default as SidebarLogo } from './SidebarLogo';
export { default as SidebarFooter } from './SidebarFooter';
export { default as SidebarCollapseToggle } from './SidebarCollapseToggle';
export { default as SidebarMobileBackdrop } from './SidebarMobileBackdrop';

// Hooks
export { useSidebar } from './hooks/useSidebar';
export { useScrollLock } from './hooks/useScrollLock';

// Config
export { navigationConfig, getDashboardPath } from './config/navigation.config';
export { rolePermissions, hasAccess, canCreate, canEdit, canDelete } from './config/rolePermissions';
export { getDefaultOpenSections } from './config/sidebar.constants';
