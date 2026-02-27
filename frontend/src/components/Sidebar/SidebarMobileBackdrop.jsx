export default function SidebarMobileBackdrop({ isMobileOpen, isMobileDevice, onClose }) {
  if (!isMobileOpen || !isMobileDevice) return null;

  return (
    <div
      className="sidebar-backdrop"
      onClick={onClose}
      aria-hidden="true"
    />
  );
}
