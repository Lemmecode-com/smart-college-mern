import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./ParentPortal.css";
import {
  FaArrowLeft,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaIdCard,
  FaCalendarAlt,
  FaSchool,
  FaHome,
  FaExclamationTriangle,
  FaSyncAlt,
  FaCheckCircle
} from "react-icons/fa";
import api from "../../../api/axios";

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

export default function ChildProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/parent/student/${studentId}/profile`);
        setStudent(res.data.data || res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [studentId]);

  if (loading) {
    return (
      <div className="parent-portal-wrapper">
        <div className="parent-portal-container d-flex align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
          <div className="text-center">
            <motion.div
              variants={spinVariants}
              animate="animate"
              style={{ fontSize: '3rem', color: BRAND_COLORS.primary.main }}
            >
              <FaSyncAlt />
            </motion.div>
            <h4 className="mt-3" style={{ color: BRAND_COLORS.primary.main }}>Loading Profile...</h4>
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
              <div className="row g-3 g-sm-4 align-items-center">
                <div className="col-12 col-md-7 col-lg-8">
                  <div className="d-flex align-items-center gap-3">
                    <motion.div
                      variants={pulseVariants}
                      initial="initial"
                      animate="pulse"
                      className="parent-header-icon-wrapper"
                    >
                      <FaExclamationTriangle />
                    </motion.div>
                    <div className="parent-header-title-section">
                      <h1 className="parent-header-title">Error Loading Profile</h1>
                      <p className="parent-header-subtitle">{error}</p>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-5 col-lg-4">
                  <div className="d-flex align-items-center justify-content-center justify-content-md-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="parent-btn-primary"
                      onClick={() => navigate("/dashboard/parent")}
                    >
                      <FaArrowLeft className="me-2" />
                      Back to Dashboard
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="parent-portal-wrapper">
        <div className="parent-portal-container">
          <EmptyState
            icon={<FaUser style={{ color: BRAND_COLORS.secondary.main }} />}
            title="Profile Not Found"
            message="The requested student profile could not be found."
            success={false}
          />
        </div>
      </div>
    );
  }

  const {
    firstName,
    lastName,
    email,
    mobileNumber,
    phone,
    dateOfBirth,
    gender,
    addressLine,
    city,
    state,
    pincode,
    department_id,
    course_id,
    enrollmentNo,
    status,
    currentSemester,
    admissionYear,
    category,
    bloodGroup,
    fatherName,
    motherName,
    fatherMobile,
    motherMobile
  } = student;

  const fullName = `${firstName} ${lastName}`;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="parent-portal-wrapper"
      >
        <div className="parent-portal-container">
          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="parent-dashboard-header"
          >
            {/* Hero Section */}
            <div className="parent-dashboard-header-hero">
              <div className="row g-3 g-sm-4 align-items-center">
                <div className="col-12 col-md-7 col-lg-8">
                  <div className="d-flex align-items-center gap-3">
                    <motion.div
                      variants={pulseVariants}
                      initial="initial"
                      animate="pulse"
                      className="parent-header-icon-wrapper"
                    >
                      <FaUser />
                    </motion.div>
                    <div className="parent-header-title-section">
                      <h1 className="parent-header-title">
                        {fullName}'s Profile
                      </h1>
                      <p className="parent-header-subtitle">
                        Complete student information and academic details
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-5 col-lg-4">
                  <div className="d-flex align-items-center justify-content-center justify-content-md-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="parent-btn-outline"
                      onClick={() => navigate("/dashboard/parent")}
                    >
                      <FaArrowLeft className="me-2" />
                      Back to Dashboard
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ================= PROFILE STATUS ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="dashboard-section"
          >
            <div className="row g-3 g-md-4">
              <div className="col-12 col-sm-6 col-lg-4">
                <div className="parent-stat-card">
                  <div className="parent-stat-card-icon" style={{ background: BRAND_COLORS.primary.gradient }}>
                    <FaIdCard />
                  </div>
                  <div className="parent-stat-card-content">
                    <div className="parent-card-label">Enrollment Number</div>
                    <div className="parent-card-value">{enrollmentNo || "N/A"}</div>
                    <div className="parent-card-subtitle">Student ID</div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-lg-4">
                <div className="parent-stat-card">
                  <div className="parent-stat-card-icon" style={{
                    background: status === 'APPROVED' ? BRAND_COLORS.success.gradient :
                               status === 'PENDING' ? BRAND_COLORS.warning.gradient :
                               BRAND_COLORS.danger.gradient
                  }}>
                    {status === 'APPROVED' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                  </div>
                  <div className="parent-stat-card-content">
                    <div className="parent-card-label">Account Status</div>
                    <div className="parent-card-value">
                      <span className={`parent-status-badge ${
                        status === 'APPROVED' ? 'parent-status-approved' :
                        status === 'PENDING' ? 'parent-status-pending' :
                        'parent-status-rejected'
                      }`}>
                        {status === 'APPROVED' ? 'Active Student' :
                         status === 'PENDING' ? 'Application Pending' :
                         'Account Inactive'}
                      </span>
                    </div>
                    <div className="parent-card-subtitle">Current status</div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-lg-4">
                <div className="parent-stat-card">
                  <div className="parent-stat-card-icon" style={{ background: BRAND_COLORS.secondary.gradient }}>
                    <FaCalendarAlt />
                  </div>
                  <div className="parent-stat-card-content">
                    <div className="parent-card-label">Academic Year</div>
                    <div className="parent-card-value">{admissionYear || "N/A"}</div>
                    <div className="parent-card-subtitle">Year of admission</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ================= PROFILE INFORMATION ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
          >
            <div className="row g-3 g-md-4">
              <div className="col-12 col-lg-6">
                <ProfileCard
                  title="Personal Information"
                  icon={<FaUser />}
                  color={BRAND_COLORS.primary.main}
                >
                  <div className="parent-profile-item">
                    <div className="parent-profile-icon">
                      <FaUser />
                    </div>
                    <div className="parent-profile-content">
                      <div className="parent-profile-label">Full Name</div>
                      <div className="parent-profile-value">{fullName}</div>
                    </div>
                  </div>
                  <div className="parent-profile-item">
                    <div className="parent-profile-icon">
                      <FaEnvelope />
                    </div>
                    <div className="parent-profile-content">
                      <div className="parent-profile-label">Email Address</div>
                      <div className="parent-profile-value">
                        <a href={`mailto:${email}`} className="text-decoration-none">
                          {email}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="parent-profile-item">
                    <div className="parent-profile-icon">
                      <FaPhone />
                    </div>
                    <div className="parent-profile-content">
                      <div className="parent-profile-label">Mobile Number</div>
                      <div className="parent-profile-value">
                        <a href={`tel:${mobileNumber || phone}`} className="text-decoration-none">
                          {mobileNumber || phone || "Not provided"}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="parent-profile-item">
                    <div className="parent-profile-icon">
                      <FaCalendarAlt />
                    </div>
                    <div className="parent-profile-content">
                      <div className="parent-profile-label">Date of Birth</div>
                      <div className="parent-profile-value">
                        {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : "Not provided"}
                      </div>
                    </div>
                  </div>
                  <div className="parent-profile-item">
                    <div className="parent-profile-icon">
                      <FaUser />
                    </div>
                    <div className="parent-profile-content">
                      <div className="parent-profile-label">Gender</div>
                      <div className="parent-profile-value">{gender || "Not specified"}</div>
                    </div>
                  </div>
                  {bloodGroup && (
                    <div className="parent-profile-item">
                      <div className="parent-profile-icon">
                        <FaCheckCircle />
                      </div>
                      <div className="parent-profile-content">
                        <div className="parent-profile-label">Blood Group</div>
                        <div className="parent-profile-value">{bloodGroup}</div>
                      </div>
                    </div>
                  )}
                </ProfileCard>
              </div>

              <div className="col-12 col-lg-6">
                <ProfileCard
                  title="Academic Information"
                  icon={<FaGraduationCap />}
                  color={BRAND_COLORS.success.main}
                >
                  <div className="parent-profile-item">
                    <div className="parent-profile-icon">
                      <FaGraduationCap />
                    </div>
                    <div className="parent-profile-content">
                      <div className="parent-profile-label">Course</div>
                      <div className="parent-profile-value">{course_id?.name || "Not assigned"}</div>
                    </div>
                  </div>
                  <div className="parent-profile-item">
                    <div className="parent-profile-icon">
                      <FaSchool />
                    </div>
                    <div className="parent-profile-content">
                      <div className="parent-profile-label">Department</div>
                      <div className="parent-profile-value">{department_id?.name || "Not assigned"}</div>
                    </div>
                  </div>
                  <div className="parent-profile-item">
                    <div className="parent-profile-icon">
                      <FaIdCard />
                    </div>
                    <div className="parent-profile-content">
                      <div className="parent-profile-label">Current Semester</div>
                      <div className="parent-profile-value">{currentSemester || "Not specified"}</div>
                    </div>
                  </div>
                  <div className="parent-profile-item">
                    <div className="parent-profile-icon">
                      <FaCalendarAlt />
                    </div>
                    <div className="parent-profile-content">
                      <div className="parent-profile-label">Admission Year</div>
                      <div className="parent-profile-value">{admissionYear || "Not specified"}</div>
                    </div>
                  </div>
                  {category && (
                    <div className="parent-profile-item">
                      <div className="parent-profile-icon">
                        <FaCheckCircle />
                      </div>
                      <div className="parent-profile-content">
                        <div className="parent-profile-label">Category</div>
                        <div className="parent-profile-value">{category}</div>
                      </div>
                    </div>
                  )}
                </ProfileCard>
              </div>

              <div className="col-12 col-lg-6">
                <ProfileCard
                  title="Address Information"
                  icon={<FaMapMarkerAlt />}
                  color={BRAND_COLORS.warning.main}
                >
                  <div className="parent-profile-item">
                    <div className="parent-profile-icon">
                      <FaHome />
                    </div>
                    <div className="parent-profile-content">
                      <div className="parent-profile-label">Address</div>
                      <div className="parent-profile-value">
                        {addressLine ? (
                          <>
                            {addressLine}
                            {city && state && pincode && (
                              <><br />{city}, {state} - {pincode}</>
                            )}
                          </>
                        ) : (
                          "Address not provided"
                        )}
                      </div>
                    </div>
                  </div>
                </ProfileCard>
              </div>

              <div className="col-12 col-lg-6">
                <ProfileCard
                  title="Family Information"
                  icon={<FaUser />}
                  color={BRAND_COLORS.info.main}
                >
                  <div className="parent-profile-item">
                    <div className="parent-profile-icon">
                      <FaUser />
                    </div>
                    <div className="parent-profile-content">
                      <div className="parent-profile-label">Father's Name</div>
                      <div className="parent-profile-value">
                        {fatherName || "Not provided"}
                        {fatherMobile && (
                          <span className="ms-2">
                            <a href={`tel:${fatherMobile}`} className="text-decoration-none">
                              <FaPhone className="me-1" />
                              {fatherMobile}
                            </a>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="parent-profile-item">
                    <div className="parent-profile-icon">
                      <FaUser />
                    </div>
                    <div className="parent-profile-content">
                      <div className="parent-profile-label">Mother's Name</div>
                      <div className="parent-profile-value">
                        {motherName || "Not provided"}
                        {motherMobile && (
                          <span className="ms-2">
                            <a href={`tel:${motherMobile}`} className="text-decoration-none">
                              <FaPhone className="me-1" />
                              {motherMobile}
                            </a>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </ProfileCard>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= PROFILE CARD ================= */
function ProfileCard({ title, icon, color, children }) {
  return (
    <div className="parent-profile-card">
      <div className="parent-profile-header">
        <h3 className="parent-profile-title">
          <span className="me-2" style={{ color: 'white', fontSize: '1.1rem' }}>{icon}</span>
          {title}
        </h3>
      </div>
      <div className="parent-profile-body">
        {children}
      </div>
    </div>
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