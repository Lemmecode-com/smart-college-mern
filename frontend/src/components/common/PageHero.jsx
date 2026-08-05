import React from "react";
import { motion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa";
import "./PageHero.css";

const slideDownVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};


export default function PageHero({
  icon,
  title,
  description,
  onBack,
  backLabel = "Back",
  primaryAction,
  className = "",
}) {
  const hasLeftContent = icon || title || description;
  const hasRightContent = onBack || primaryAction;

  return (
    <motion.div
      variants={slideDownVariants}
      initial="hidden"
      animate="visible"
      className={`erp-page-hero ${className}`}
    >
      <div className="erp-page-hero__inner">
        {hasLeftContent && (
          <div className="erp-page-hero__start">
            {icon && <div className="erp-page-hero__icon">{icon}</div>}
            <div className="erp-page-hero__text">
              {title && (
                <h1 className="erp-page-hero__title">{title}</h1>
              )}
              {description && (
                <p className="erp-page-hero__description">{description}</p>
              )}
            </div>
          </div>
        )}

        {hasRightContent && (
          <div className="erp-page-hero__actions">
            {onBack && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="erp-page-hero__back-btn"
                type="button"
              >
                <FaArrowLeft className="erp-page-hero__back-icon" />
                {backLabel || "Back"}
              </motion.button>
            )}
            {primaryAction}
          </div>
        )}
      </div>
    </motion.div>
  );
}
