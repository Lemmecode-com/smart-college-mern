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

import { useEffect } from "react";
import { CSS_CLASSES } from "../config/sidebar.constants";

// Store original scroll position
let savedScrollPosition = 0;
// Track if we actually applied locks
let isLockApplied = false;

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
    if (typeof document === "undefined") return;

    const { body } = document;
    const originalOverflow = body.style.overflow || "";
    const originalPaddingRight = body.style.paddingRight || "";
    const originalPosition = body.style.position || "";
    const originalTop = body.style.top || "";
    const originalWidth = body.style.width || "";
    const originalScrollbarWidth = getScrollbarWidth();

    if (isLocked) {
      // Save current scroll position
      savedScrollPosition = window.scrollY;
      isLockApplied = true;

      // Add class for additional styling hooks
      body.classList.add(CSS_CLASSES.SIDEBAR_OPEN);

      // Lock scroll - use !important approach via style property
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.width = "100%";
      body.style.top = `-${savedScrollPosition}px`;

      // Prevent content shift by compensating for scrollbar width
      if (preventPadding && originalScrollbarWidth > 0) {
        body.style.paddingRight = `${originalScrollbarWidth}px`;
      }
    }

    return () => {
      // Restore styles if we actually applied locks
      if (isLockApplied) {
        isLockApplied = false;

        // Restore original styles
        body.classList.remove(CSS_CLASSES.SIDEBAR_OPEN);

        // Restore overflow
        if (originalOverflow) {
          body.style.overflow = originalOverflow;
        } else {
          body.style.removeProperty("overflow");
        }

        // Restore padding
        if (originalPaddingRight) {
          body.style.paddingRight = originalPaddingRight;
        } else {
          body.style.removeProperty("padding-right");
        }

        // Restore position-related properties
        if (originalPosition) {
          body.style.position = originalPosition;
        } else {
          body.style.removeProperty("position");
        }

        if (originalTop) {
          body.style.top = originalTop;
        } else {
          body.style.removeProperty("top");
        }

        if (originalWidth) {
          body.style.width = originalWidth;
        } else {
          body.style.removeProperty("width");
        }

        // Restore scroll position
        window.scrollTo(0, savedScrollPosition);
      }
    };
  }, [isLocked, preventPadding]);
}

/**
 * Get current scrollbar width
 * @returns {number} Scrollbar width in pixels
 */
function getScrollbarWidth() {
  if (typeof window === "undefined") return 0;

  // Create a temporary div to measure scrollbar
  const outer = document.createElement("div");
  outer.style.visibility = "hidden";
  outer.style.overflow = "scroll";
  outer.style.msOverflowStyle = "scrollbar";
  document.body.appendChild(outer);

  const inner = document.createElement("div");
  inner.style.width = "100%";
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
    if (typeof document === "undefined") return;

    const { body } = document;
    const originalOverflow = body.style.overflow;
    const originalPaddingRight = body.style.paddingRight;

    if (isLocked) {
      body.classList.add(CSS_CLASSES.SIDEBAR_OPEN);
      body.style.overflow = "hidden";
      body.style.paddingRight = "0";
    }

    return () => {
      body.classList.remove(CSS_CLASSES.SIDEBAR_OPEN);
      body.style.overflow = originalOverflow;
      body.style.paddingRight = originalPaddingRight;
    };
  }, [isLocked]);
}

export default useScrollLock;
