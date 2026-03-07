/**
 * useScrollLock Hook - Enterprise SaaS Standard
 * Manages body scroll lock when mobile sidebar is open
 * 
 * Benefits:
 * - Prevents background scroll when mobile sidebar is open
 * - Prevents content shift by managing padding
 * - Automatic cleanup on unmount
 * - Handles edge cases (iOS Safari)
 */

import { useEffect } from 'react';
import { CSS_CLASSES } from '../config/sidebar.constants';

/**
 * @typedef {Object} UseScrollLockOptions
 * @property {boolean} shouldLock - Whether scroll should be locked
 * @property {boolean} preventPadding - Whether to prevent content shift
 */

/**
 * Custom hook to lock body scroll
 * @param {boolean} isLocked - Whether to lock scroll
 * @param {UseScrollLockOptions} options - Configuration options
 */
export function useScrollLock(isLocked, options = {}) {
  const { preventPadding = true } = options;

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const { body } = document;
    const originalOverflow = body.style.overflow;
    const originalPaddingRight = body.style.paddingRight;
    const originalScrollbarWidth = getScrollbarWidth();

    if (isLocked) {
      // Add class for additional styling hooks
      body.classList.add(CSS_CLASSES.SIDEBAR_OPEN);
      
      // Lock scroll
      body.style.overflow = 'hidden';
      
      // Prevent content shift by compensating for scrollbar width
      if (preventPadding && originalScrollbarWidth > 0) {
        body.style.paddingRight = `${originalScrollbarWidth}px`;
      }
      
      // iOS Safari fix: prevent rubber band scrolling
      body.style.position = 'fixed';
      body.style.width = '100%';
      body.style.top = `-${window.scrollY}px`;
    }

    return () => {
      // Restore original styles
      body.classList.remove(CSS_CLASSES.SIDEBAR_OPEN);
      body.style.overflow = originalOverflow;
      body.style.paddingRight = originalPaddingRight;
      body.style.position = '';
      body.style.width = '';
      body.style.top = '';
      
      // Restore scroll position (iOS fix)
      if (isLocked) {
        const scrollY = body.style.top;
        body.style.top = '';
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    };
  }, [isLocked, preventPadding]);
}

/**
 * Get current scrollbar width
 * @returns {number} Scrollbar width in pixels
 */
function getScrollbarWidth() {
  if (typeof window === 'undefined') return 0;
  
  // Create a temporary div to measure scrollbar
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll';
  outer.style.msOverflowStyle = 'scrollbar';
  document.body.appendChild(outer);

  const inner = document.createElement('div');
  inner.style.width = '100%';
  outer.appendChild(inner);

  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
  outer.parentNode.removeChild(outer);

  return scrollbarWidth;
}

/**
 * Simplified hook for basic scroll lock without padding compensation
 * @param {boolean} isLocked - Whether to lock scroll
 */
export function useSimpleScrollLock(isLocked) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const { body } = document;
    const originalOverflow = body.style.overflow;
    const originalPaddingRight = body.style.paddingRight;

    if (isLocked) {
      body.classList.add(CSS_CLASSES.SIDEBAR_OPEN);
      body.style.overflow = 'hidden';
      body.style.paddingRight = '0';
    }

    return () => {
      body.classList.remove(CSS_CLASSES.SIDEBAR_OPEN);
      body.style.overflow = originalOverflow;
      body.style.paddingRight = originalPaddingRight;
    };
  }, [isLocked]);
}

export default useScrollLock;
