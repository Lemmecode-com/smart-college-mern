import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./ParentPortal.css";
import Breadcrumb from "../../../components/Breadcrumb";
import ChangeEmailModal from "../../../components/ChangeEmailModal";
import {
  FaArrowLeft,
  FaUserTie,
  FaEnvelope,
  FaPhone,
  FaEdit,
  FaSyncAlt,
  FaExclamationTriangle,
  FaUsers,
  FaGraduationCap,
  FaIdCard,
  FaShieldAlt,
  FaClock,
  FaCalendarAlt,
} from "react-icons/fa";
import api from "../../../api/axios";
import { logger } from "../../../utils/logger";

// ---- Small presentational helpers ----

function ProfileItem({ icon, iconBg, iconColor, label, children }) {
  return (
    <div className="parent-profile-item">
      <div
        className="parent-profile-icon"
        style={iconBg ? { background: iconBg, color: iconColor } : undefined}
      >
        {icon}
      </div>
      <div className="parent-profile-content">
        <div className="parent-profile-label">{label}</div>
        <div className="parent-profile-value">{children}</div>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, subtitle, variant = "default", children, className = "" }) {
  const headerClass =
    variant === "accent" ? "parent-section-card-header parent-section-card-header--accent" : "parent-section-card-header";

  return (
    <div className={`parent-section-card ${className}`}>
      <div className={headerClass}>
        <h2 className="parent-section-card-title">
          <span className="parent-section-card-icon">{icon}</span>
          {title}
        </h2>
        {subtitle && <span className="parent-section-card-subtitle">{subtitle}</span>}
      </div>
      <div className="parent-section-card-body">{children}</div>
    </div>
  );
}

function ChildCard({ child }) {
  // Generate initials from full name
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div className="parent-child-card">
      <div className="parent-child-avatar">{getInitials(child.fullName)}</div>
      <div className="parent-child-info">
        <div className="parent-child-name">{child.fullName}</div>
        {child.enrollmentNumber && (
          <div className="parent-child-details">
            <FaIdCard size={12} />
            <span>ID: {child.enrollmentNumber}</span>
          </div>
        )}
        {child.course_id?.name && (
          <div className="parent-child-course-badge">
            <FaGraduationCap size={11} />
            {child.course_id.name}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveTimeDisplay() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeString = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateString = now.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="parent-header-meta">
      <div className="parent-time-display">
        <div className="parent-time-label">
          <FaClock style={{ marginRight: "0.25rem" }} />
          Time
        </div>
        <div className="parent-time-value">{timeString}</div>
      </div>
      <div className="parent-date-display">
        <div className="parent-date-label">
          <FaCalendarAlt style={{ marginRight: "0.25rem" }} />
          Date
        </div>
        <div className="parent-date-value">{dateString}</div>
      </div>
    </div>
  );
}

export default function ParentProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get("/parent/my-profile");
        const user = res.data?.user || null;
        const parent = res.data?.parent || null;
        setProfile({ user, parent });
      } catch (err) {
        const statusCode = err.response?.status;
        const errorCode = err.response?.data?.code;
        const backendMessage = err.response?.data?.message;

        logger.error("Parent profile load error:", {
          statusCode,
          errorCode,
          backendMessage,
          page: "ParentProfile",
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

  // ================= LOADING STATE =================
  if (loading) {
    return (
      <div className="parent-portal-wrapper">
        <div className="parent-portal-container">
          <div className="parent-breadcrumb-wrapper">
            <Breadcrumb
              items={[
                { label: "Dashboard", path: "/dashboard/parent" },
                { label: "My Profile", path: "" },
              ]}
            />
          </div>

          <div className="parent-dashboard-header">
            <div className="parent-dashboard-header-hero">
              <div className="parent-header-content">
                <div className="parent-header-icon-wrapper">
                  <FaUserTie size={28} color="white" />
                </div>
                <div className="parent-header-title-section">
                  <h1 className="parent-header-title">My Profile</h1>
                  <p className="parent-header-subtitle">Loading your profile details...</p>
                </div>
              </div>
            </div>
          </div>

          <div className="parent-loading-state">
            <div className="parent-loading-spinner" />
            <div className="parent-loading-text">Fetching your information...</div>
          </div>
        </div>
      </div>
    );
  }

  // ================= ERROR STATE =================
  if (error) {
    return (
      <div className="parent-portal-wrapper">
        <div className="parent-portal-container">
          <div className="parent-breadcrumb-wrapper">
            <Breadcrumb
              items={[
                { label: "Dashboard", path: "/dashboard/parent" },
                { label: "My Profile", path: "" },
              ]}
            />
          </div>

          <div className="parent-dashboard-header">
            <div className="parent-dashboard-header-hero">
              <div className="parent-header-content">
                <div className="parent-header-icon-wrapper">
                  <FaUserTie size={28} color="white" />
                </div>
                <div className="parent-header-title-section">
                  <h1 className="parent-header-title">My Profile</h1>
                  <p className="parent-header-subtitle">Something went wrong loading your profile.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="parent-error-state">
            <div className="parent-error-icon">
              <FaExclamationTriangle size={32} />
            </div>
            <h2 className="parent-error-title">Unable to Load Profile</h2>
            <p className="parent-error-message">{error.message}</p>
            <div className="parent-error-actions">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="parent-btn-primary"
              >
                <FaSyncAlt /> Try Again
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard/parent")}
                className="parent-btn-secondary"
              >
                <FaArrowLeft /> Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const { user, parent } = profile;
  const children = parent?.students || [];
  const relation = parent?.relation || "guardian";

  // Generate initials for the user avatar
  const getUserInitials = () => {
    if (!user?.name) return "P";
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="parent-portal-wrapper"
      >
        <div className="parent-portal-container">
          {/* ================= BREADCRUMB ================= */}
          <div className="parent-breadcrumb-wrapper">
            <Breadcrumb
              items={[
                { label: "Dashboard", path: "/dashboard/parent" },
                { label: "My Profile", path: "" },
              ]}
            />
          </div>

          {/* ================= HEADER HERO ================= */}
          <motion.div
            className="parent-dashboard-header"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="parent-dashboard-header-hero">
              <div className="parent-header-content">
                <div className="parent-header-icon-wrapper">
                  <span style={{ fontWeight: 700, fontSize: "1.5rem", letterSpacing: "0.5px" }}>
                    {getUserInitials()}
                  </span>
                </div>
                <div className="parent-header-title-section">
                  <motion.h1
                    className="parent-header-title"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {user?.name || "Parent"}
                  </motion.h1>
                  <p className="parent-header-subtitle">
                    Manage your account details and linked children.
                  </p>
                </div>
              </div>
              <LiveTimeDisplay />
            </div>
          </motion.div>

          {/* ================= MAIN CONTENT ================= */}
          <div className="parent-content-grid">
            {/* ================= ACCOUNT DETAILS ================= */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <SectionCard
                title="Account Details"
                subtitle="Your personal and contact information"
                icon={<FaUserTie />}
              >
                <ProfileItem
                  icon={<FaUserTie />}
                  iconBg="rgba(26, 75, 109, 0.1)"
                  iconColor="#1a4b6d"
                  label="Full Name"
                >
                  {user?.name}
                </ProfileItem>

                <ProfileItem
                  icon={<FaEnvelope />}
                  iconBg="rgba(23, 162, 184, 0.1)"
                  iconColor="#17a2b8"
                  label="Email Address"
                >
                  <div className="parent-profile-value--email">
                    <span>{user?.email}</span>
                    <button
                      type="button"
                      onClick={() => setShowEmailModal(true)}
                      className="parent-change-btn"
                      aria-label="Change email address"
                      title="Change email address"
                    >
                      <FaShieldAlt size={11} /> Change
                    </button>
                  </div>
                </ProfileItem>

                <ProfileItem
                  icon={<FaPhone />}
                  iconBg="rgba(108, 117, 125, 0.1)"
                  iconColor="#6c757d"
                  label="Mobile Number"
                >
                  {user?.mobileNumber || "Not set"}
                </ProfileItem>

                <ProfileItem
                  icon={<FaIdCard />}
                  iconBg="rgba(23, 162, 184, 0.1)"
                  iconColor="#138496"
                  label="Relation"
                >
                  <span style={{ textTransform: "capitalize" }}>{relation}</span>
                </ProfileItem>

                <ProfileItem
                  icon={<FaShieldAlt />}
                  iconBg="rgba(40, 167, 69, 0.1)"
                  iconColor="#28a745"
                  label="Role"
                >
                  {user?.role}
                </ProfileItem>
              </SectionCard>

              {/* ================= ACTION BUTTONS ================= */}
              <div className="parent-actions-container">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/dashboard/parent/profile/edit")}
                  className="parent-btn-primary"
                >
                  <FaEdit /> Edit Profile
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/dashboard/parent")}
                  className="parent-btn-secondary"
                >
                  <FaArrowLeft /> Back to Dashboard
                </motion.button>
              </div>
            </motion.div>

            {/* ================= LINKED CHILDREN ================= */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <SectionCard
                title="Linked Children"
                subtitle={`${children.length} ${children.length === 1 ? "child" : "children"} linked to your account`}
                icon={<FaUsers />}
                variant="accent"
              >
                {children.length === 0 ? (
                  <div className="parent-empty-state">
                    <FaUsers className="parent-empty-icon" />
                    <p className="parent-empty-message">
                      No children linked to your account yet.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {children.map((child) => (
                      <ChildCard key={child._id} child={child} />
                    ))}
                  </div>
                )}
              </SectionCard>
            </motion.div>
          </div>

          <ChangeEmailModal
            show={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            userRole="PARENT_GUARDIAN"
            currentEmail={user?.email}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}