import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import "./ActionIconButton.css";

/**
 * Reusable Icon-only Action Button with Portal-rendered Tooltip
 *
 * Supports hover, pointer, focus, and tap interactions.
 * Portal-rendered tooltip prevents clipping inside overflow:hidden containers.
 */
export default function ActionIconButton({
  icon: Icon,
  className = "",
  style,
  ariaLabel,
  tooltip,
  onClick,
  disabled = false,
  tooltipClassName = "erp-staff-tooltip",
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, isBottom: false });
  const buttonRef = useRef(null);
  const tooltipId = useMemo(
    () => `tip-${Math.random().toString(36).substring(2, 9)}`,
    []
  );

  const updateCoords = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const isNearTop = rect.top < 65;
    const top = isNearTop ? rect.bottom + 8 : rect.top - 8;
    let left = rect.left + rect.width / 2;

    const windowWidth =
      typeof window !== "undefined" ? window.innerWidth : 800;
    const minLeft = 130;
    const maxLeft = windowWidth - 130;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      isBottom: isNearTop,
    });
  }, []);

  const handleMouseEnter = () => {
    if (disabled) return;
    updateCoords();
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleFocus = () => {
    if (disabled) return;
    updateCoords();
    setShowTooltip(true);
  };

  const handleBlur = () => {
    setShowTooltip(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowTooltip(false);
    }
  };

  useEffect(() => {
    if (!showTooltip) return;
    const handleScrollOrResize = () => {
      setShowTooltip(false);
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [showTooltip]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`standard-action-btn ${className}`}
        style={style}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={showTooltip ? tooltipId : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseOver={handleMouseEnter}
        onPointerEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseOut={handleMouseLeave}
        onPointerLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      >
        {Icon && <Icon aria-hidden="true" />}
      </button>

      {showTooltip &&
        !disabled &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            id={tooltipId}
            className={`${tooltipClassName} ${
              coords.isBottom ? `${tooltipClassName}--bottom` : ""
            }`}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
          >
            {tooltip}
          </div>,
          document.body
        )}
    </>
  );
}
