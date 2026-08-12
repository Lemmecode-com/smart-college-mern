import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./ParentPortal.css";
import Breadcrumb from "../../../components/Breadcrumb";
import {
  FaUserTie,
  FaEnvelope,
  FaPhone,
  FaIdCard,
  FaSave,
  FaTimes,
  FaSyncAlt,
  FaShieldAlt,
  FaExclamationTriangle,
} from "react-icons/fa";
import api from "../../../api/axios";
import { logger } from "../../../utils/logger";

const BRAND_COLORS = {
  primary: {
    main: "#1a4b6d",
    dark: "#0f3a4a",
    light: "#2a6b8d",
    gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
  },
  info: {
    main: "#17a2b8",
    dark: "#138496",
  },
  danger: {
    main: "#dc3545",
    dark: "#c82333",
  },
  secondary: {
    main: "#6c757d",
  },
};

export default function EditParentProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [parent, setParent] = useState(null);
  const [formData, setFormData] = useState({ name: "", mobileNumber: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get("/parent/my-profile");
        const fetchedUser = res.data?.user || null;
        const fetchedParent = res.data?.parent || null;
        setUser(fetchedUser);
        setParent(fetchedParent);
        setFormData({
          name: fetchedUser?.name || "",
          mobileNumber: fetchedUser?.mobileNumber || "",
        });
      } catch (err) {
        const statusCode = err.response?.status;
        const backendMessage = err.response?.data?.message;
        const errorCode = err.response?.data?.code;

        logger.error("Parent profile load (edit) error:", {
          statusCode,
          errorCode,
          backendMessage,
          page: "EditParentProfile",
        });

        setError({
          message: "Failed to load profile data. Please try again.",
          statusCode,
          errorCode,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess("");

    try {
      const res = await api.put("/parent/update-my-profile", {
        name: formData.name.trim(),
        mobileNumber: formData.mobileNumber.trim(),
      });

      setSuccess(res.data?.message || "Profile updated successfully.");
      setTimeout(() => {
        navigate("/dashboard/parent/profile");
      }, 1500);
    } catch (err) {
      const statusCode = err.response?.status;
      const backendMessage = err.response?.data?.message;
      const errorCode = err.response?.data?.code;

      logger.error("Parent profile update failed:", {
        statusCode,
        errorCode,
        backendMessage,
      });

      setError({
        message: backendMessage || "Failed to update profile. Please try again.",
        statusCode,
        errorCode,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="parent-portal-wrapper">
        <div className="parent-dashboard-header">
          <div className="parent-portal-container">
            <div className="parent-header-content">
              <div className="parent-header-icon-wrapper">
                <FaUserTie size={28} color="white" />
              </div>
              <div>
                <h1 className="parent-header-title">Edit Profile</h1>
                <p className="parent-header-subtitle">Loading your profile details...</p>
              </div>
            </div>
          </div>
        </div>
        <div className="parent-portal-container">
          <div className="parent-loading-state">
            <FaSyncAlt size={32} className="parent-loading-spinner" style={{ borderTopColor: "var(--brand-secondary)" }} />
            <div className="parent-loading-text">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="parent-portal-wrapper"
      >
        {/* ================= BREADCRUMB ================= */}
        <div className="parent-breadcrumb-wrapper">
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/dashboard/parent" },
              { label: "My Profile", path: "/dashboard/parent/profile" },
              { label: "Edit Profile", path: "" },
            ]}
          />
        </div>

        {/* ================= HEADER HERO ================= */}
        <div className="parent-dashboard-header">
          <div className="parent-portal-container">
            <div className="parent-header-content">
              <div className="parent-header-icon-wrapper">
                <FaUserTie size={28} color="white" />
              </div>
              <div>
                <motion.h1
                  className="parent-header-title"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  Edit Parent Profile
                </motion.h1>
                <p className="parent-header-subtitle">
                  Update your display name and contact number below.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="parent-portal-container">
          <div className="parent-content-grid">
            <div className="parent-profile-card">
              <div className="parent-profile-header">
                <h2 className="parent-profile-title">
                  <FaUserTie /> Edit Account Details
                </h2>
                <p className="parent-profile-subtitle">
                  Email address can only be changed via the secure OTP flow.
                </p>
              </div>

              <div className="parent-profile-body">
                {error && (
                  <div className="parent-alert parent-alert-danger">
                    <FaExclamationTriangle />
                    <span>{error.message}</span>
                  </div>
                )}

                {success && (
                  <div className="parent-alert parent-alert-success">
                    <FaSyncAlt />
                    <span>{success}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="parent-profile-item" style={{ borderBottom: "none", padding: 0 }}>
                    <div className="parent-profile-icon" style={{ marginTop: 0 }}>
                      <FaUserTie />
                    </div>
                    <div className="parent-profile-content" style={{ flex: 1, marginTop: 0 }}>
                      <label
                        htmlFor="name"
                        className="parent-profile-label"
                        style={{ marginBottom: "0.35rem", display: "block" }}
                      >
                        Full Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        className="parent-form-input"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        required
                        maxLength={100}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="parent-profile-item" style={{ borderBottom: "none", padding: 0, marginTop: "1rem" }}>
                    <div className="parent-profile-icon" style={{ marginTop: 0, background: "rgba(23, 162, 184, 0.1)", color: BRAND_COLORS.info.main }}>
                      <FaPhone />
                    </div>
                    <div className="parent-profile-content" style={{ flex: 1, marginTop: 0 }}>
                      <label
                        htmlFor="mobileNumber"
                        className="parent-profile-label"
                        style={{ marginBottom: "0.35rem", display: "block" }}
                      >
                        Mobile Number
                      </label>
                      <input
                        id="mobileNumber"
                        name="mobileNumber"
                        type="tel"
                        className="parent-form-input"
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        placeholder="Enter your mobile number"
                        maxLength={20}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Read-only email reminder (not editable here) */}
                  <div className="parent-profile-item" style={{ borderBottom: "none", padding: 0, marginTop: "1rem" }}>
                    <div className="parent-profile-icon" style={{ marginTop: 0, background: "rgba(23, 162, 184, 0.1)", color: BRAND_COLORS.info.main }}>
                      <FaEnvelope />
                    </div>
                    <div className="parent-profile-content" style={{ flex: 1, marginTop: 0 }}>
                      <label className="parent-profile-label" style={{ marginBottom: "0.35rem", display: "block" }}>
                        Email Address (read-only)
                      </label>
                      <input
                        type="email"
                        className="parent-form-input"
                        value={user?.email || ""}
                        readOnly
                        disabled
                        style={{
                          backgroundColor: "#f8fafc",
                          color: "#64748b",
                        }}
                      />
                      <div
                        className="parent-table-cell-inline"
                        style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#64748b" }}
                      >
                        <FaShieldAlt size={12} style={{ color: BRAND_COLORS.info.dark }} />
                        Change your email via the OTP flow in{" "}
                        <span
                          style={{ color: BRAND_COLORS.info.main, cursor: "pointer", textDecoration: "underline" }}
                          onClick={() => navigate("/dashboard/parent/profile")}
                        >
                          My Profile
                        </span>
                        .
                      </div>
                    </div>
                  </div>

                  <div
                    className="parent-profile-item"
                    style={{
                      borderBottom: "none",
                      padding: 0,
                      marginTop: "1rem",
                      paddingTop: "1rem",
                      borderTop: "1px solid #f1f5f9",
                    }}
                  >
                    <div className="parent-profile-icon" style={{ marginTop: 0, background: "rgba(13, 170, 255, 0.1)", color: BRAND_COLORS.info.dark }}>
                      <FaIdCard />
                    </div>
                    <div className="parent-profile-content" style={{ flex: 1, marginTop: 0 }}>
                      <label className="parent-profile-label" style={{ marginBottom: "0.35rem", display: "block" }}>
                        Relation (set by college admin)
                      </label>
                      <input
                        type="text"
                        className="parent-form-input"
                        value={parent?.relation || "guardian"}
                        readOnly
                        disabled
                        style={{
                          backgroundColor: "#f8fafc",
                          color: "#64748b",
                          textTransform: "capitalize",
                        }}
                      />
                      <input type="hidden" name="relation" value={parent?.relation || "guardian"} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => navigate("/dashboard/parent/profile")}
                      disabled={submitting}
                      className="parent-btn-secondary"
                    >
                      <FaTimes /> Cancel
                    </button>
                    <motion.button
                      whileHover={!submitting && { scale: 1.03 }}
                      whileTap={!submitting && { scale: 0.97 }}
                      type="submit"
                      disabled={submitting}
                      className="parent-btn-primary"
                      style={{ opacity: submitting ? 0.7 : 1 }}
                    >
                      {submitting ? (
                        <>
                          <FaSyncAlt className="spinner-icon" /> Saving...
                        </>
                      ) : (
                        <>
                          <FaSave /> Save Changes
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
