import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./ParentPortal.css";
import Breadcrumb from "../../../components/Breadcrumb";
import {
  FaArrowLeft,
  FaMoneyBillWave,
  FaCheckCircle,
  FaClock,
  FaRupeeSign,
  FaCreditCard,
  FaExclamationTriangle,
  FaSyncAlt,
  FaWallet,
  FaCalendarAlt
} from "react-icons/fa";
import api from "../../../api/axios";
import { formatDate, formatDateTime, formatINR, formatNumberIN } from "../../../utils/format";
import { toast } from "react-toastify";

// Brand Color Palette - Matching Application Theme
const BRAND_COLORS = {
  primary: {
    main: '#1a4b6d',
    dark: '#0f3a4a',
    light: '#2a6b8d',
    gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)'
  },
  success: {
    main: '#28a745',
    dark: '#218838',
    light: '#28a745',
    gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)'
  },
  info: {
    main: '#17a2b8',
    dark: '#138496',
    light: '#17a2b8',
    gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'
  },
  warning: {
    main: '#ffc107',
    dark: '#e0a800',
    light: '#ffc107',
    gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)'
  },
  danger: {
    main: '#dc3545',
    dark: '#c82333',
    light: '#dc3545',
    gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
  },
  secondary: {
    main: '#6c757d',
    dark: '#545b62',
    light: '#868e96',
    gradient: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)'
  }
};

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: "easeOut" }
  })
};

const slideDownVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const pulseVariants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const spinVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

export default function ChildFees() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!childId) {
      setError("Invalid child ID");
      setLoading(false);
      return;
    }

    const fetchFees = async () => {
      try {
        const res = await api.get(`/parent/student/${childId}/fees`);
        const feeData = res.data?.data || res.data;
        setFeeData(feeData);
      } catch (err) {
        console.error("ChildFees: Error:", err);
        setError(err.response?.data?.message || "Failed to load fee details");
      } finally {
        setLoading(false);
      }
    };
    fetchFees();
  }, [childId]);

  if (loading) {
    return (
      <div className="parent-portal-wrapper">
        <div className="parent-portal-container parent-loading-container" style={{ minHeight: '50vh' }}>
          <div className="parent-loading-state">
            <motion.div
              variants={spinVariants}
              animate="animate"
              className="parent-loading-spinner"
              style={{ fontSize: '3rem', color: 'var(--parent-primary)', borderTopColor: 'var(--parent-primary)' }}
            >
              <FaSyncAlt />
            </motion.div>
            <h4 className="parent-loading-text" style={{ color: 'var(--parent-primary)' }}>Loading Fee Details...</h4>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="parent-portal-wrapper">
        <div className="parent-portal-container">
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="parent-dashboard-header"
          >
            <div className="parent-dashboard-header-hero">
              <div className="parent-header-content">
                <motion.div
                  variants={pulseVariants}
                  initial="initial"
                  animate="pulse"
                  className="parent-header-icon-wrapper"
                >
                  <FaExclamationTriangle />
                </motion.div>
                <div className="parent-header-title-section">
                  <h1 className="parent-header-title">Error Loading Fees</h1>
                  <p className="parent-header-subtitle">{error}</p>
                </div>
              </div>
              <div className="parent-header-meta">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="parent-btn-primary"
                  onClick={() => navigate("/dashboard/parent")}
                >
                  <FaArrowLeft className="parent-me-2" />
                  Back to Dashboard
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const handlePayInstallment = async (installmentName) => {
    try {
      const res = await api.post(`/parent/student/${childId}/payments/create-order`, {
        installmentName,
      });
      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        toast.error("Failed to initiate payment. Please try again.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment initiation failed");
    }
  };

  if (!feeData) {
    return (
      <div className="parent-portal-wrapper">
        <div className="parent-portal-container">
          <EmptyState
            icon={<FaMoneyBillWave style={{ color: BRAND_COLORS.warning.main }} />}
            title="No Fee Record Available"
            message="Fee information is not yet available for this student."
            success={false}
          />
        </div>
      </div>
    );
  }

  const { totalFee, paidAmount, installments } = feeData;
  const pendingAmount = totalFee - paidAmount;
  const paymentProgress = totalFee > 0 ? Math.round((paidAmount / totalFee) * 100) : 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="parent-portal-wrapper erp-viewport-min-100"
      >
        <div className="parent-portal-container">
          {/* ================= BREADCRUMB ================= */}
          <Breadcrumb
            items={[
              { label: "Home", path: "/dashboard/parent" },
              { label: "My Children", path: "/dashboard/parent/children" },
              { label: "Fees", path: `/dashboard/parent/child/${childId}/fees` },
            ]}
          />

          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="parent-dashboard-header"
          >
            {/* Hero Section */}
            <div className="parent-dashboard-header-hero">
              <div className="parent-header-content">
                <motion.div
                  variants={pulseVariants}
                  initial="initial"
                  animate="pulse"
                  className="parent-header-icon-wrapper"
                >
                  <FaMoneyBillWave />
                </motion.div>
                <div className="parent-header-title-section">
                  <h1 className="parent-header-title">
                    Fee Details & Payments
                  </h1>
                  <p className="parent-header-subtitle">
                    Track your child's fee payments and outstanding amounts
                  </p>
                </div>
              </div>
              <div className="parent-header-meta">
              </div>
            </div>
          </motion.div>

          {/* ================= FEE SUMMARY CARDS ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="parent-section-grid"
          >
            <FeeStatCard
              icon={FaWallet}
              label="Total Fee"
              value={{formatINR(totalFee)}`}
              color={BRAND_COLORS.primary.main}
              gradient={BRAND_COLORS.primary.gradient}
            />
            <FeeStatCard
              icon={FaCheckCircle}
              label="Paid Amount"
              value={{formatINR(paidAmount)}`}
              color={BRAND_COLORS.success.main}
              gradient={BRAND_COLORS.success.gradient}
            />
            <FeeStatCard
              icon={FaClock}
              label="Pending Amount"
              value={{formatINR(pendingAmount)}`}
              color={BRAND_COLORS.warning.main}
              gradient={BRAND_COLORS.warning.gradient}
            />
            <FeeStatCard
              icon={FaRupeeSign}
              label="Payment Progress"
              value={`${paymentProgress}%`}
              color={BRAND_COLORS.info.main}
              gradient={BRAND_COLORS.info.gradient}
              showProgress={true}
              progressValue={paymentProgress}
            />
          </motion.div>

          {/* ================= PAYMENT PROGRESS ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
          >
            <div className="parent-fee-card">
              <div className="parent-fee-header">
                <div className="parent-fee-icon" style={{ background: `linear-gradient(135deg, ${BRAND_COLORS.primary.main}20, ${BRAND_COLORS.primary.main}10)` }}>
                  <FaCreditCard style={{ color: BRAND_COLORS.primary.main }} />
                </div>
                <div>
                  <h3 className="parent-fee-title">Payment Progress</h3>
                </div>
              </div>
              <div className="parent-fee-card-body">
                <div style={{ marginBottom: "1rem" }}>
                  <div className="parent-fee-progress-header">
                    <span className="parent-fee-progress-label">Payment Completion</span>
                    <span className="parent-fee-progress-value" style={{ color: BRAND_COLORS.primary.main }}>
                      {paymentProgress}%
                    </span>
                  </div>
                  <div className="parent-fee-progress-track">
                    <div
                      className="parent-fee-progress-bar"
                      role="progressbar"
                      style={{
                        width: `${paymentProgress}%`,
                        background: BRAND_COLORS.primary.gradient,
                      }}
                      aria-valuenow={paymentProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
                <div className="parent-fee-progress-stats">
                  <div className="parent-fee-progress-stat">
                    <div className="parent-fee-progress-stat-value" style={{ color: "#28a745" }}>{formatINR(paidAmount)}</div>
                    <div className="parent-fee-progress-stat-label">Paid</div>
                  </div>
                  <div className="parent-fee-progress-stat">
                    <div className="parent-fee-progress-stat-value" style={{ color: "#ffc107" }}>{formatINR(pendingAmount)}</div>
                    <div className="parent-fee-progress-stat-label">Pending</div>
                  </div>
                  <div className="parent-fee-progress-stat">
                    <div className="parent-fee-progress-stat-value" style={{ color: "#1a4b6d" }}>{formatINR(totalFee)}</div>
                    <div className="parent-fee-progress-stat-label">Total</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ================= INSTALLMENT HISTORY ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={2}
            initial="hidden"
            animate="visible"
            className="dashboard-section"
          >
            <div className="parent-fee-card">
              <div className="parent-fee-header">
                <div className="parent-fee-icon" style={{ background: `linear-gradient(135deg, ${BRAND_COLORS.success.main}20, ${BRAND_COLORS.success.main}10)` }}>
                  <FaCalendarAlt style={{ color: BRAND_COLORS.success.main }} />
                </div>
                <div>
                  <h3 className="parent-fee-title">Installment History</h3>
                </div>
              </div>
              <div className="parent-fee-card-body">
                {installments?.length === 0 ? (
                  <EmptyState
                    icon={<FaCreditCard style={{ color: BRAND_COLORS.secondary.main }} />}
                    title="No Installments Found"
                    message="No installment records are available yet."
                    success={false}
                  />
                ) : (
                  <div className="parent-installment-list">
                    {installments?.map((installment, idx) => (
                      <motion.div
                        key={idx}
                        className="parent-installment-item"
                        variants={fadeInVariants}
                        custom={idx}
                        initial="hidden"
                        animate="visible"
                      >
                        <div className="parent-installment-header">
                          <div>
                            <div className="parent-installment-title">{installment.name}</div>
                            <div className="parent-installment-due">
                              Due: {new Date(installment.dueDate).formatDate, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                          <span className={`parent-status-badge ${
                            installment.status === 'PAID' ? 'parent-status-approved' :
                            installment.status === 'PENDING' ? 'parent-status-pending' :
                            'parent-status-secondary'
                          }`}>
                            {installment.status}
                          </span>
                        </div>
                        <div className="parent-installment-body">
                          <div className="parent-installment-amount">
                            <div className="parent-installment-amount-value">{formatINR(installment.amount)}</div>
                            {installment.paidAt && (
                              <div className="parent-installment-meta">
                                Paid on {formatDateTime(installment.paidAt)}
                              </div>
                            )}
                          </div>
                          {installment.status === 'PENDING' && (
                            <button
                              className="parent-installment-pay-btn"
                              onClick={() => handlePayInstallment(installment.name)}
                            >
                              Pay Now
                            </button>
                          )}
                          {installment.mode && (
                            <div className="parent-installment-meta">
                              Mode: {installment.mode}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= FEE STAT CARD ================= */
function FeeStatCard({ icon: Icon, label, value, color, gradient, showProgress = false, progressValue = 0 }) {
  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)' }}
      whileTap={{ scale: 0.98 }}
      className="parent-stat-card"
      tabIndex={0}
      role="region"
      aria-label={`${label}: ${value}`}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.outline = '2px solid #1a4b6d';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.outline = 'none';
      }}
    >
      <div className="parent-stat-card-icon" style={{ background: gradient }}>
        <Icon />
      </div>
      <div className="parent-stat-card-content">
        <div className="parent-card-label">{label}</div>
        <div className="parent-card-value">{value}</div>
        {showProgress && (
          <div className="parent-mt-2">
            <div className="parent-fee-progress-track" style={{ height: '4px' }}>
              <div
                className="parent-fee-progress-bar"
                style={{
                  width: `${progressValue}%`,
                  background: gradient,
                  borderRadius: '2px'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ icon, title, message, success = false }) {
  return (
    <div className="parent-empty-state">
      <div className="parent-empty-icon" style={{ opacity: success ? 0.9 : 0.6, color: success ? BRAND_COLORS.success.main : '#e2e8f0' }}>
        {icon}
      </div>
      <h4 className="parent-empty-title">{title}</h4>
      <p className="parent-empty-message">{message}</p>
    </div>
  );
}
