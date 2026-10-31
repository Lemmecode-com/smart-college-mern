/**
 * useSidebar Hook - Enterprise SaaS Standard
 * Manages all sidebar state: collapsed, mobile, sections
 * 
 * Benefits:
 * - Centralized state management
 * - Automatic localStorage persistence
 * - Debounced resize handling
 * - Clean API for components
 */

import { useState, useCallback, useEffect } from 'react';
import {
  STORAGE_KEYS,
  SIDEBAR_WIDTH,
  ANIMATION_TIMING,
  getDefaultOpenSections
} from '../config/sidebar.constants';

/**
 * @typedef {Object} UseSidebarReturn
 * @property {boolean} isCollapsed - Sidebar collapsed state
 * @property {boolean} isMobileOpen - Mobile sidebar open state
 * @property {boolean} isMobileDevice - Whether device is mobile
 * @property {Object} openSections - Open/closed state of sections
 * @property {Function} toggleCollapse - Toggle collapsed state
 * @property {Function} setIsCollapsed - Set collapsed state directly
 * @property {Function} setIsMobileOpen - Set mobile open state
 * @property {Function} toggleSection - Toggle a section open/closed
 * @property {Function} expandAllSections - Expand all sections
 * @property {Function} collapseAllSections - Collapse all sections
 * @property {Function} setOpenSections - Set open sections directly
 */

/**
 * Custom hook for sidebar state management
 * @param {Object} initialState - Initial state configuration
 * @param {string} role - User role for default sections
 * @returns {UseSidebarReturn} Sidebar state and handlers
 */
export function useSidebar(initialState = {}, role = 'COLLEGE_ADMIN') {
  const collapsedStateKey = `${STORAGE_KEYS.COLLAPSED_STATE}-${role}`;

  // Initialize collapsed state from localStorage or default
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(collapsedStateKey);

      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (error) {
      // Failed to parse sidebar collapsed state from localStorage
    }

    return initialState.isCollapsed ?? role === 'EXAM_COORDINATOR';
  });

  const [isMobileOpen, setIsMobileOpen] = useState(
    initialState.isMobileOpen ?? false
  );

  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Initialize open sections with all sections collapsed
  const [openSections, setOpenSections] = useState(() => {
    const defaultSections = getDefaultOpenSections(role);

    const collapsedSections = Object.keys(defaultSections).reduce(
      (sections, sectionId) => {
        sections[sectionId] = false;
        return sections;
      },
      {}
    );

    return initialState.openSections ?? collapsedSections;
  });

  // Detect mobile device and handle resize with debounce
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let resizeTimer;

    const checkMobile = () => {
      const mobile = window.innerWidth < SIDEBAR_WIDTH.MOBILE_BREAKPOINT;

      setIsMobileDevice(mobile);

      if (!mobile && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };

    const handleResize = () => {
      clearTimeout(resizeTimer);

      resizeTimer = setTimeout(() => {
        checkMobile();

        // Add resizing class for smooth animation
        document.body.classList.add('sidebar-resizing');

        setTimeout(() => {
          document.body.classList.remove('sidebar-resizing');
        }, ANIMATION_TIMING.SLOW);
      }, ANIMATION_TIMING.DEBOUNCE_DELAY);
    };

    // Initial check
    checkMobile();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [isMobileOpen]);

  // Persist collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        collapsedStateKey,
        JSON.stringify(isCollapsed)
      );
    } catch (error) {
      // Failed to save sidebar collapsed state to localStorage
    }
  }, [collapsedStateKey, isCollapsed]);

  /**
   * Toggle sidebar collapsed state
   */
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  /**
   * Toggle a section open/closed
   * @param {string} sectionId - Section ID to toggle
   */
  const toggleSection = useCallback((sectionId) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  /**
   * Expand all sections
   */
  const expandAllSections = useCallback(() => {
    setOpenSections(prev => {
      const allExpanded = {};

      Object.keys(prev).forEach(key => {
        allExpanded[key] = true;
      });

      return allExpanded;
    });
  }, []);

  /**
   * Collapse all sections
   */
  const collapseAllSections = useCallback(() => {
    setOpenSections(prev => {
      const allCollapsed = {};

      Object.keys(prev).forEach(key => {
        allCollapsed[key] = false;
      });

      return allCollapsed;
    });
  }, []);

  return {
    isCollapsed,
    isMobileOpen,
    setIsMobileOpen,
    isMobileDevice,
    openSections,
    toggleCollapse,
    setIsCollapsed,
    toggleSection,
    expandAllSections,
    collapseAllSections,
    setOpenSections
  };
}

export default useSidebar;