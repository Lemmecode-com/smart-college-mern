import React, { useState, useEffect, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import { motion, AnimatePresence } from "framer-motion";
import "../College-Admin/Dashboard.css";
import {
  FaSave,
  FaArrowLeft,
  FaUserPlus,
  FaSyncAlt,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";

const BRAND_COLORS = {
  primary: {
    main: "#1a4b6d",
    dark: "#0f3a4a",
    light: "#2a6b8d",
    gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
  },
  success: { main: "#28a745", dark: "#218838", light: "#28a745", gradient: "linear-gradient(135deg, #28a745 0%, #218838 100%)" },
  info: { main: "#17a2b8", dark: "#138496", light: "#17a2b8", gradient: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)" },
  warning: { main: "#ffc107", dark: "#e0a800", light: "#ffc107", gradient: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)" },
  danger: { main: "#dc3545", dark: "#c82333", light: "#dc3545", gradient: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)" },
  secondary: { main: "#6c757d", dark: "#545b62", light: "#868e96", gradient: "linear-gradient(135deg, #6c757d 0%, #545b62 100%)" },
};

const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: "easeOut" },
  }),
};

const slideDownVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const pulseVariants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

const spinVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" },
  },
};

export default function EditParent() {
  const { userId } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const actualUserId = userId || currentUser?.id;

  useEffect(() => {
    if (!currentUser || currentUser.role !== "COLLEGE_ADMIN") {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  const AUTH_ERROR_CODES = new Set([
    "TOKEN_MISSING",
    "TOKEN_EXPIRED",
    "INVALID_TOKEN",
    "TOKEN_BLACKLISTED",
    "TOKEN_INVALIDATED",
    "USER_NOT_FOUND",
    "ACCOUNT_DEACTIVATED",
    "UNAUTHORIZED",
  ]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      logger.log("[EditParent] Fetching profile for userId:", actualUserId);
      setLoading(true);
      const res = await api.get(`/college/parents/${actualUserId}`);
      logger.log("[EditParent] API response:", res.data);
      const raw = res.data?.data ?? res.data;
      const p = raw || {};
      if (raw) {
        setFormData({
          name: p.name || "",
          email: p.email || "",
          isActive: typeof p.isActive === "boolean" ? p.isActive : true,
        });
      }
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage =
        statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))
          ? "Authentication error occurred."
          : backendMessage || "Failed to load profile";

      logger.error("Error fetching parent profile:", statusCode, errorCode);
      setError({
        message: errorMessage,
        statusCode,
        errorCode,
      });
    } finally {
      setLoading(false);
    }
  }, [actualUserId]);

  useEffect(() => {
    if (actualUserId) fetchProfile();
  }, [actualUserId, fetchProfile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        name: formData.name,
      };
      logger.log("[EditParent] Submitting update for userId:", actualUserId, "payload:", payload);
      const res = await api.put(`/college/parents/${actualUserId}`, payload);
      logger.log("[EditParent] Update response:", res.data);
      setSuccess(true);
      setTimeout(() => navigate(`/college/parents/${actualUserId}`), 1500);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        logger.error("Auth error updating parent profile:", statusCode, errorCode);
        setError({
          message: "Authentication error occurred.",
          statusCode,
          errorCode,
        });
      } else {
        logger.error("[EditParent] Update error:", err);
        setError(err.response?.data?.message || "Update failed");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading fullScreen size="lg" text="Loading parent profile..." />;

  if (error && typeof error === "object") {
    return (
      <ApiError
        title="Parent Profile Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchProfile}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="dashboard-wrapper"
      >
        <div className="dashboard-container-inner">
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="dashboard-header"
          >
            <div className="dashboard-header-hero">
              <div className="row g-3 g-sm-4 align-items-center">
                <div className="col-12 col-md-7 col-lg-8">
                  <div className="d-flex align-items-center gap-3">
                    <motion.div
                      variants={pulseVariants}
                      initial="initial"
                      animate="pulse"
                      className="header-icon-wrapper"
                    >
                      <FaUserPlus />
                    </motion.div>
                    <div className="header-title-section">
                      <h1 className="header-title">Edit Parent Profile</h1>
                      <p className="header-subtitle">
                        Update parent or guardian information
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-5 col-lg-4">
                  <div className="d-flex align-items-center justify-content-center justify-content-md-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/college/parents/${actualUserId}`)}
                      className="dashboard-btn btn-outline"
                    >
                      <FaArrowLeft className="me-1" />
                      <span className="btn-text">Back to Profile</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
          >
            <form onSubmit={handleSubmit}>
              <div className="row g-3 g-md-4">
                <div className="col-12">
                  <div className="section-card">
                    <div className="section-card-header">
                      <h3 className="section-card-title">
                        <span className="section-card-icon" style={{ color: BRAND_COLORS.primary.main }}>
                          <FaUserPlus />
                        </span>
                        Parent Information
                      </h3>
                      <span className="section-card-subtitle">
                        Core parent details
                      </span>
                    </div>
                    <div className="section-card-body">
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <div className="form-group">
                            <label className="form-label d-flex align-items-center gap-2">
                              <span style={{ color: BRAND_COLORS.primary.main, fontSize: "1rem" }}>
                                <FaUserPlus />
                              </span>
                              Full Name
                              <span style={{ color: BRAND_COLORS.danger.main }}>*</span>
                            </label>
                            <input
                              type="text"
                              name="name"
                              placeholder="Enter full name"
                              value={formData.name}
                              onChange={handleChange}
                              className="form-control"
                              required
                            />
                          </div>
                        </div>
                        <div className="col-12 col-md-6">
                          <div className="form-group">
                            <label className="form-label d-flex align-items-center gap-2">
                              <span style={{ color: BRAND_COLORS.primary.main, fontSize: "1rem" }}>
                                <FaUserPlus />
                              </span>
                              Email Address
                              <span style={{ color: BRAND_COLORS.danger.main }}>*</span>
                            </label>
                            <input
                              type="email"
                              name="email"
                              placeholder="Email address (read-only)"
                              value={formData.email}
                              readOnly
                              className="form-control"
                              style={{ backgroundColor: "#e9ecef", cursor: "not-allowed" }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <motion.div
                    variants={fadeInVariants}
                    custom={2}
                    initial="hidden"
                    animate="visible"
                    className="d-flex justify-content-end gap-3"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/college/parents/${actualUserId}`)}
                      className="dashboard-btn btn-outline"
                    >
                      <FaArrowLeft className="me-1" />
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={saving}
                      className="dashboard-btn"
                      style={{
                        background: BRAND_COLORS.primary.gradient,
                        color: "white",
                        border: "none",
                        padding: "0.75rem 2rem",
                        borderRadius: "0.5rem",
                        fontWeight: 600,
                        minHeight: "48px",
                        minWidth: "200px",
                      }}
                    >
                      {saving ? (
                        <>
                          <motion.div variants={spinVariants} animate="animate" style={{ display: "inline-block" }}>
                            <FaSyncAlt />
                          </motion.div>
                          <span className="ms-2">Updating...</span>
                        </>
                      ) : (
                        <>
                          <FaSave className="me-1" />
                          Update Profile
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                </div>
              </div>
            </form>
          </motion.div>

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-4"
              >
                <div
                  className="alert alert-success d-flex align-items-center gap-3"
                  style={{ borderRadius: "0.75rem" }}
                >
                  <div
                    className="flex-shrink-0 d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: "40px",
                      height: "40px",
                      background: BRAND_COLORS.success.gradient,
                      color: "white",
                    }}
                  >
                    <FaCheckCircle />
                  </div>
                  <div className="flex-grow-1">
                    <strong>Success!</strong> Parent profile updated successfully.
                    <div className="mt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(`/college/parents/${actualUserId}`)}
                        className="btn btn-sm"
                        style={{
                          background: BRAND_COLORS.success.main,
                          color: "white",
                          border: "none",
                        }}
                      >
                        View Updated Profile
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && typeof error === "string" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-4"
              >
                <div
                  className="alert alert-danger d-flex align-items-center gap-3"
                  style={{ borderRadius: "0.75rem" }}
                >
                  <div
                    className="flex-shrink-0 d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: "40px",
                      height: "40px",
                      background: BRAND_COLORS.danger.gradient,
                      color: "white",
                    }}
                  >
                    <FaExclamationTriangle />
                  </div>
                  <div className="flex-grow-1">
                    <strong>Error:</strong> {error}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
