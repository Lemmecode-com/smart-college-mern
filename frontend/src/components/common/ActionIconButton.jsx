import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import "./ActionIconButton.css";

/**
 * Reusable Icon-only Action Button with Portal-rendered Tooltip
 *
 * Supports hover, pointer, focus, and tap interactions.
 * Portal-rendered tooltip prevents clipping inside overflow:hidden containers.
 */
export default function ActionIconButton({
  icon: Icon,
  iconClassName = "",
  trailingIcon: TrailingIcon,
  trailingIconClassName = "",
  badge,
  badgeClassName = "",
  className = "",
  style,
  ariaLabel,
  ariaExpanded,
  ariaHasPopup,
  tooltip,
  to,
  onClick,
  disabled = false,
  tooltipClassName = "erp-staff-tooltip",
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, isBottom: false });
  const buttonRef = useRef(null);
  const tooltipRef = useRef(null);
  const tooltipId = useMemo(
    () => `tip-${Math.random().toString(36).substring(2, 9)}`,
    []
  );
  const ButtonComponent = to ? Link : "button";
  const buttonProps = to ? { to } : { type: "button" };

  const updateCoords = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    const tooltipHeight = tooltipRect?.height || 36;
    const tooltipWidth = tooltipRect?.width || 130;
    const isBottom = rect.top < tooltipHeight + 12;
    const top = isBottom ? rect.bottom + 8 : rect.top - 8;
    let left = rect.left + rect.width / 2;
    const horizontalPadding = 8;
    const availableHalfWidth = Math.max(
      0,
      (window.innerWidth - horizontalPadding * 2) / 2
    );
    const minLeft =
      Math.min(tooltipWidth / 2, availableHalfWidth) + horizontalPadding;
    const maxLeft = window.innerWidth - minLeft;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      isBottom,
    });
  }, []);

  const handleMouseEnter = () => {
    if (disabled) return;
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleFocus = () => {
    if (disabled) return;
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

  useLayoutEffect(() => {
    if (showTooltip) updateCoords();
  }, [showTooltip, tooltip, updateCoords]);

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
      <ButtonComponent
        {...buttonProps}
        ref={buttonRef}
        className={`standard-action-btn ${className}`}
        style={style}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
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
        {Icon && (
          <Icon
            className={iconClassName}
            aria-hidden="true"
          />
        )}
        {badge != null && badge !== false && (
          <span className={badgeClassName}>{badge}</span>
        )}
        {TrailingIcon && (
          <TrailingIcon
            className={trailingIconClassName}
            aria-hidden="true"
          />
        )}
      </ButtonComponent>

      {showTooltip &&
        !disabled &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tooltipRef}
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
