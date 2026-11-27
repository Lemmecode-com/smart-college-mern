import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import "./ParentPortal.css";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import Loading from "../../../components/Loading";
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
      <div className="parent-portal-wrapper parent-portal-wrapper--edit-profile">
        <div
          className="parent-portal-container parent-loading-container"
          style={{ minHeight: "70vh" }}
        >
          <Loading
            size="md"
            color="primary"
            text="Loading Profile Details..."
          />
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
        className="parent-portal-wrapper parent-portal-wrapper--edit-profile"
      >
        <div className="parent-portal-container">
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

          {/* ================= HEADER ================= */}
          <PageHeader
            icon={FaUserTie}
            title="Edit Parent Profile"
            subtitle="Update your display name and contact number below."
          />

          <div className="parent-edit-profile-layout">
            <div className="parent-profile-card parent-edit-profile-card">
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

                <form onSubmit={handleSubmit} noValidate className="parent-edit-profile-form">
                  <div className="parent-edit-form-grid">
                    {/* Left column */}
                    <div className="parent-edit-form-column">
                      <div className="parent-edit-form-field">
                        <label htmlFor="name" className="parent-edit-form-label">
                          <FaUserTie className="parent-edit-form-label-icon" /> Full Name
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

                      <div className="parent-edit-form-field">
                        <label htmlFor="mobileNumber" className="parent-edit-form-label">
                          <FaPhone className="parent-edit-form-label-icon parent-edit-form-label-icon--info" /> Mobile Number
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

                    {/* Right column */}
                    <div className="parent-edit-form-column">
                      <div className="parent-edit-form-field">
                        <label className="parent-edit-form-label">
                          <FaEnvelope className="parent-edit-form-label-icon parent-edit-form-label-icon--info" /> Email Address (read-only)
                        </label>
                        <input
                          type="email"
                          className="parent-form-input parent-form-input--readonly"
                          value={user?.email || ""}
                          readOnly
                          disabled
                        />
                        <div className="parent-edit-form-note">
                          <FaShieldAlt size={12} />
                          <span>
                            Change your email via the OTP flow in{" "}
                            <button
                              type="button"
                              className="parent-edit-form-link"
                              onClick={() => navigate("/dashboard/parent/profile")}
                            >
                              My Profile
                            </button>
                            .
                          </span>
                        </div>
                      </div>

                      <div className="parent-edit-form-field">
                        <label className="parent-edit-form-label">
                          <FaIdCard className="parent-edit-form-label-icon parent-edit-form-label-icon--info" /> Relation (set by college admin)
                        </label>
                        <input
                          type="text"
                          className="parent-form-input parent-form-input--readonly"
                          value={parent?.relation || "guardian"}
                          readOnly
                          disabled
                          style={{ textTransform: "capitalize" }}
                        />
                        <input type="hidden" name="relation" value={parent?.relation || "guardian"} />
                      </div>
                    </div>
                  </div>

                  <div className="parent-edit-form-actions">
                    <button
                      type="button"
                      onClick={() => navigate("/dashboard/parent/profile")}
                      disabled={submitting}
                      className="parent-btn-secondary"
                    >
                      <FaTimes /> Cancel
                    </button>
                    <motion.button
                      whileHover={!submitting ? { scale: 1.03 } : undefined}
                      whileTap={!submitting ? { scale: 0.97 } : undefined}
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
