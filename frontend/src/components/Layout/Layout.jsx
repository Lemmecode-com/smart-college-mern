import { useState, useCallback, useEffect } from "react";
import Sidebar from "../Sidebar/SidebarContainer";
import NavbarComponent from "../Navbar";
import "./Layout.css";

export default function Layout({ children, isMobileOpen, setIsMobileOpen }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const wasMobile = isMobile;
      const nowMobile = window.innerWidth < 768;
      setIsMobile(nowMobile);
      
      // Auto-expand on mobile transition
      if (wasMobile !== nowMobile && nowMobile && isCollapsed) {
        setIsCollapsed(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isCollapsed, isMobile]);

  // Toggle sidebar collapse with transition lock
  const handleToggleCollapse = useCallback(() => {
    setIsTransitioning(true);
    setIsCollapsed((prev) => !prev);
    
    // Lock transitions during animation
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, []);

  // Sync body class for global styles
  useEffect(() => {
    // Remove all layout classes first
    document.body.classList.remove("sidebar-collapsed", "has-sidebar", "layout-mobile", "layout-transitioning");
    
    // Add appropriate classes
    if (!isMobile) {
      document.body.classList.add("has-sidebar");
      if (isCollapsed) {
        document.body.classList.add("sidebar-collapsed");
      }
    } else {
      document.body.classList.add("layout-mobile");
    }
    
    if (isTransitioning) {
      document.body.classList.add("layout-transitioning");
    }
  }, [isCollapsed, isMobile, isTransitioning]);

  return (
    <div className={`layout-wrapper ${isCollapsed ? "layout-collapsed" : ""} ${isMobile ? "layout-mobile" : ""}`}>
      {/* Sidebar */}
      <Sidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content Area */}
      <div className="layout-main">
        <NavbarComponent
          onToggleSidebar={() => setIsMobileOpen((prev) => !prev)}
          onToggleCollapse={handleToggleCollapse}
          isSidebarCollapsed={isCollapsed}
          isMobile={isMobile}
        />
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}
