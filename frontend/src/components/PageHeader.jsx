import React from "react";
import { FaArrowLeft } from "react-icons/fa";

export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  children,
  actions,
  onBack,
  backLabel = "Back",
  className = "",
}) {
  return (
    <div className={`standard-page-header ${className}`}>
      <div className="standard-page-header-content">

        {/* LEFT */}
        <div className="standard-page-header-main">

          {Icon && (
            <div className="standard-page-header-icon">
              <Icon />
            </div>
          )}

          <div className="standard-page-header-text">
            <h2 className="standard-page-header-title">
              {title}
            </h2>

            {subtitle && (
              <p className="standard-page-header-subtitle">
                {subtitle}
              </p>
            )}

            {children && (
              <div className="standard-page-header-meta">
                {children}
              </div>
            )}
          </div>

        </div>

        

        {/* RIGHT */}
        {(onBack || actions) && (
          <div className="standard-page-header-actions">

            {onBack && (
              <button
                type="button"
                className="standard-page-header-back"
                onClick={onBack}
              >
                <FaArrowLeft />
                <span>{backLabel}</span>
              </button>
            )}

            {actions}

          </div>
        )}

      </div>
       <style>{`
  .standard-page-header {
    width: 100%;
    min-height: 104px;
    background: #0E3746;
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
    color: #ffffff;
    margin-bottom: 20px;
  }

  .standard-page-header-content {
    min-height: 104px;
    padding: 22px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .standard-page-header-main {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .standard-page-header-icon {
    width: 52px;
    height: 52px;
    min-width: 52px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.14);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 24px;
  }

  .standard-page-header-text {
    min-width: 0;
  }

  .standard-page-header-title {
    margin: 0;
    color: #ffffff;
    font-size: 24px;
    line-height: 1.2;
    font-weight: 700;
  }

  .standard-page-header-subtitle {
    margin: 5px 0 0;
    color: rgba(255, 255, 255, 0.75);
    font-size: 14px;
    line-height: 1.4;
    font-weight: 400;
  }

  .standard-page-header-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 8px;
  }

  .standard-page-header-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    flex-shrink: 0;
  }

  .standard-page-header-back {
    min-height: 48px;
    padding: 0 20px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .standard-page-header-back:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.18);
    box-shadow: 0 5px 12px rgba(0, 0, 0, 0.12);
  }

  .standard-page-header-back svg {
    font-size: 15px;
  }

  @media (max-width: 768px) {
    .standard-page-header-content {
      padding: 18px 20px;
      flex-wrap: wrap;
    }

    .standard-page-header-main {
      width: 100%;
    }

    .standard-page-header-actions {
      width: 100%;
      justify-content: flex-start;
    }

    .standard-page-header-title {
      font-size: 24px;
    }

    .standard-page-header-icon {
      width: 48px;
      height: 48px;
      min-width: 48px;
    }
  }
`}</style>
    </div>
  );

 
}