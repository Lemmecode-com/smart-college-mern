import React, { useState, useEffect, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import ChangeEmailModal from "../../../components/ChangeEmailModal";
import { logger } from "../../../utils/logger";
import { motion, AnimatePresence } from "framer-motion"; // eslint-disable-line no-unused-vars
import "../College-Admin/Dashboard.css";

import {
  FaSave,
  FaArrowLeft,
  FaUserPlus,
  FaCheckCircle,
  FaSyncAlt,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaUser,
  FaEnvelope,
  FaIdCard,
  FaMobileAlt,
  FaBriefcase,
  FaCalendarAlt,
  FaClock,
  FaVenusMars,
  FaBirthdayCake,
  FaTint,
  FaGraduationCap,
  FaHome,
  FaCity,
  FaMapMarkerAlt,
  FaPhone,
  FaHeartbeat,
  FaBuilding,
} from "react-icons/fa";

// Brand Color Palette - NOVAA Dark Teal Theme
const BRAND_COLORS = {
  primary: {
    main: '#0E3746',
    dark: '#0A2832',
    light: '#164E63',
    gradient: 'linear-gradient(135deg, #0E3746 0%, #164E63 100%)'
  },
  teal: {
    main: '#145A73',
    light: '#1D7A9B',
    lighter: '#E8F4F8',
    border: '#DCE6EF'
  },
  success: {
    main: '#28a745',
    dark: '#218838',
    gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)'
  },
  info: {
    main: '#17a2b8',
    dark: '#138496',
    gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'
  },
  warning: {
    main: '#ffc107',
    dark: '#e0a800',
    gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)'
  },
  danger: {
    main: '#dc3545',
    dark: '#c82333',
    gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
  },
  secondary: {
    main: '#6c757d',
    dark: '#545b62',
    gradient: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)'
  }
};

// Section icon mapping for consistent visual identity
const SECTION_ICONS = {
  basic: FaUser,
  employment: FaBriefcase,
  personal: FaIdCard,
  address: FaHome,
  emergency: FaHeartbeat,
  teaching: FaGraduationCap,
};

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: "easeOut" }
  })
};

const slideDownVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

const pulseVariants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.03, 1],
    transition: {
      duration: 2.5,
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

// Staff roles selectable by a College Admin when editing a staff profile
const STAFF_ROLE_OPTIONS = [
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "ADMISSION_OFFICER", label: "Admission Officer" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "HOD", label: "Head of Department" },
  { value: "EXAM_COORDINATOR", label: "Exam Coordinator" },
  { value: "PLATFORM_SUPPORT", label: "Platform Support" },
  { value: "TEACHER", label: "Teacher" },
];

export default function EditStaffProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // If no param, editing own profile
  const actualUserId = userId || currentUser?.id;

  // Auth check
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    const isSelf = currentUser.id === actualUserId;
    const isCollegeAdmin = currentUser.role === "COLLEGE_ADMIN";
    if (!isSelf && !isCollegeAdmin) {
      navigate("/dashboard");
    }
  }, [currentUser, actualUserId, navigate]);

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
    role: "",
    // Profile fields
    mobileNumber: "",
    designation: "",
    employmentType: "FULL_TIME",
    joiningDate: "",
    gender: "",
    dateOfBirth: "",
    bloodGroup: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyRelation: "",
    qualification: "",
    experienceYears: "",
  });

  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [previousSubjectId, setPreviousSubjectId] = useState("");
  const [isCurrentlyHOD, setIsCurrentlyHOD] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const isSelfEdit = currentUser && actualUserId === currentUser.id;
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);

  // Fetch existing profile
  const fetchProfile = useCallback(async () => {
    try {
      logger.log("[EditStaffProfile] Fetching profile for userId:", actualUserId);
      setLoading(true);
      const res = await api.get(`/college/staff/profile/${actualUserId}`);
      logger.log("[EditStaffProfile] API response:", res.data);
      const raw = res.data?.data ?? res.data;
      const p = raw || {};
      // Support both response shapes:
      //  - flat:          { name, email, role, ... }
      //  - populated:     { user_id: { name, email, role }, ... }  (Issue #312-class compatibility)
      const u = p.user_id || {};
      const currentRole = p.role || u.role || "";
      const isCurrentlyHOD = currentRole === "HOD";

      if (raw) {
        setFormData({
          name: p.name || u.name || "",
          email: p.email || u.email || "",
          role: currentRole,
          mobileNumber: p.mobileNumber || "",
          designation: p.designation || "",
          employmentType: p.employmentType || "FULL_TIME",
          joiningDate: p.joiningDate ? new Date(p.joiningDate).toISOString().split('T')[0] : "",
          gender: p.gender || "",
          dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : "",
          bloodGroup: p.bloodGroup || "",
          address: p.address || "",
          city: p.city || "",
          state: p.state || "",
          pincode: p.pincode || "",
          emergencyContactName: p.emergencyContactName || "",
          emergencyContactPhone: p.emergencyContactPhone || "",
          emergencyRelation: p.emergencyRelation || "",
          qualification: p.qualification || "",
          experienceYears: p.experienceYears?.toString() || "",
        });

        // Load HOD teaching data if applicable
        if (isCurrentlyHOD && p.teacher && !isSelfEdit) {
          const teacher = p.teacher;
          setSelectedCourse(teacher.courses?.[0]?._id || teacher.courses?.[0] || "");
          const currentSubject = teacher.subjects?.[0];
          setSelectedSubject(currentSubject?._id || "");
          setPreviousSubjectId(currentSubject?._id || "");

          // Fetch courses for HOD's department
          if (teacher.departmentId) {
            api.get(`/courses/department/${teacher.departmentId}`)
              .then(res => {
                const coursesData = Array.isArray(res.data?.courses) ? res.data.courses :
                                    Array.isArray(res.data) ? res.data : [];
                setCourses(coursesData);
              })
              .catch(() => setCourses([]));
          }
        }
      }
      setIsCurrentlyHOD(isCurrentlyHOD);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))
        ? "Authentication error occurred."
        : backendMessage || "Failed to load profile";

      logger.error("Error fetching staff profile:", statusCode, errorCode);
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

  // Fetch subjects when course changes (HOD admin edit only)
  useEffect(() => {
    if (formData.role === "HOD" && selectedCourse && !isSelfEdit) {
      api.get(`/subjects/course/${selectedCourse}`)
        .then(res => {
          const subjectsData = Array.isArray(res.data) ? res.data : [];
          setSubjects(subjectsData);
        })
        .catch(() => setSubjects([]));
    } else {
      setSubjects([]);
    }
    setSelectedSubject("");
  }, [formData.role, selectedCourse, isSelfEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    if (e.target.name === "course") {
      setSelectedCourse(e.target.value);
      setSelectedSubject("");
    }
    if (e.target.name === "subject") {
      setSelectedSubject(e.target.value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    // ─── Joining date validation ───
    if (
      formData.joiningDate &&
      new Date(formData.joiningDate + "T00:00:00") > new Date()
    ) {
      setError("Joining Date cannot be a future date");
      setSaving(false);
      return;
    }

    // ─── HOD teaching assignment validation ───
    if (formData.role === "HOD" && !isSelfEdit) {
      if (selectedSubject && !selectedCourse) {
        setError("Please select a course before assigning a subject.");
        setSaving(false);
        return;
      }
    }

    try {
      const { email: _email, ...profileData } = formData;
      const payload = {
        ...profileData,
        experienceYears: profileData.experienceYears ? Number(profileData.experienceYears) : 0,
      };

      // Include HOD teaching assignments for admin edits
      if (formData.role === "HOD" && !isSelfEdit) {
        payload.courseId = selectedCourse || undefined;
        payload.subjectId = selectedSubject || undefined;
        payload.previousSubjectId = previousSubjectId || undefined;
      }

      logger.log("[EditStaffProfile] Submitting update for userId:", actualUserId, "payload:", payload);
      const res = await api.put(`/college/staff/profile/${actualUserId}`, payload);
      logger.log("[EditStaffProfile] Update response:", res.data);
      setSuccess(true);
      setTimeout(() => navigate(`/staff/profile/${actualUserId}`), 1500);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        logger.error("Auth error updating staff profile:", statusCode, errorCode);
        setError({
          message: "Authentication error occurred.",
          statusCode,
          errorCode,
        });
      } else {
        logger.error("[EditStaffProfile] Update error:", err);
        setError(err.response?.data?.message || "Update failed");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="parent-portal-wrapper">
        <div
          className="parent-portal-container parent-loading-container"
          style={{ minHeight: "70vh" }}
        >
          <Loading
            size="md"
            color="primary"
            text="Loading Staff Profile..."
          />
        </div>
      </div>
    );
  }

  if (error && typeof error === 'object') {
    return (
      <ApiError
        title="Staff Profile Loading Error"
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
        className="dashboard-wrapper edit-profile-page"
      >
        <div className="dashboard-container-inner">
        {/* ================= BREADCRUMB ================= */}
           <div className="edit-profile-breadcrumb">
            <Breadcrumb
              items={[
                { label: "Dashboard", path: "/dashboard" },
                { label: "Staff Management", path: "/college/staff" },
                { label: "Edit Profile" },
              ]}
            />
          </div>

          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="dashboard-header"
          >
            {/* Hero Section */}
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
                      <FaSave />
                    </motion.div>
                    <div className="header-title-section">
                      <h1 className="header-title">
                        Edit Staff Profile
                      </h1>
                      <p className="header-subtitle">
                        Update staff member information and credentials
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-5 col-lg-4">
                  <div className="d-flex align-items-center justify-content-center justify-content-md-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/staff/profile/${actualUserId}`)}
                      className="dashboard-btn btn-profile"
                      onFocus={(e) => {
                        e.target.style.outline = '2px solid #0E3746';
                        e.target.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.target.style.outline = 'none';
                      }}
                    >
                      <FaArrowLeft className="me-1" />
                      <span className="btn-text">Back to Profile</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ================= FORM CONTENT ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
          >
            <form onSubmit={handleSubmit}>
              <div className="row g-3 g-md-4 form-grid">
              {/* Basic Information */}
              <div className="col-12">
                <SectionCard
                  title="Basic Information"
                  icon={<SECTION_ICONS.basic />}
                  subtitle="Core staff details and credentials"
                  color={BRAND_COLORS.primary.main}
                >
                  <div className="section-card-body">
                    <div className="row g-3 field-grid">
                      <div className="col-12 col-lg-6">
                        <FormField
                          label="Full Name"
                          required
                          icon={<FaUser />}
                        >
                          <input
                            type="text"
                            name="name"
                            placeholder="Enter full name"
                            value={formData.name}
                            onChange={handleChange}
                            className="form-control"
                            required
                          />
                        </FormField>
                      </div>
                      <div className="col-12 col-lg-6">
                        <FormField
                          label="Email Address"
                          required
                          icon={<FaEnvelope />}
                        >
                          <div className="email-input-wrapper">
                            <input
                              type="email"
                              name="email"
                              placeholder="Enter email address"
                              value={formData.email}
                              onChange={isSelfEdit ? handleChange : undefined}
                              className={`form-control${isSelfEdit ? "" : " bg-light"}`}
                              required
                              readOnly={!isSelfEdit}
                              disabled={!isSelfEdit}
                            />
                            {isSelfEdit ? (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={() => setShowChangeEmailModal(true)}
                                className="btn btn-teal-outline"
                                title="Change Email"
                              >
                                <FaShieldAlt className="me-1" />
                                <span>Change Email</span>
                              </motion.button>
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                className="btn btn-secondary-outline"
                                title="Email changes require secure verification"
                                disabled
                              >
                                <FaShieldAlt className="me-1" />
                                <span>Secure Change</span>
                              </motion.button>
                            )}
                          </div>
                          {!isSelfEdit && (
                            <div className="field-hint">
                              Email changes require secure verification and cannot be edited directly.
                            </div>
                          )}
                        </FormField>
                      </div>
                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          label="Role"
                          required
                          icon={<FaIdCard />}
                        >
                          <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="form-select"
                            required
                          >
                          <option value="">Select Role</option>
                          {STAFF_ROLE_OPTIONS
                            .filter((opt) => isCurrentlyHOD || opt.value !== "HOD")
                            .map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          {!isCurrentlyHOD && formData.role === "HOD" && (
                            <option value="HOD" disabled>
                              Head of Department (not allowed — use Create Staff)
                            </option>
                          )}
                          {/* Preserve a persisted role that is not in the standard list (avoids blank selection) */}
                          {formData.role &&
                            !STAFF_ROLE_OPTIONS.some((o) => o.value === formData.role) && (
                              <option value={formData.role}>
                                {formData.role.replace("_", " ")}
                              </option>
                            )}
                        </select>
                        {!isCurrentlyHOD && (
                          <div className="field-hint">
                            HOD role can only be assigned during Staff Creation.
                          </div>
                        )}
                        </FormField>
                      </div>
                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          label="Mobile Number"
                          icon={<FaMobileAlt />}
                        >
                          <input
                            type="tel"
                            name="mobileNumber"
                            placeholder="10-digit mobile number"
                            value={formData.mobileNumber}
                            onChange={handleChange}
                            className="form-control"
                          />
                        </FormField>
                      </div>
                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          label="Designation"
                          icon={<FaBriefcase />}
                        >
                          <input
                            type="text"
                            name="designation"
                            placeholder="e.g., Senior Accountant"
                            value={formData.designation}
                            onChange={handleChange}
                            className="form-control"
                          />
                        </FormField>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* HOD Teaching Assignment (Admin only) */}
              {formData.role === "HOD" && !isSelfEdit && (
                <div className="col-12">
                  <SectionCard
                    title="Teaching Assignment"
                    icon={<SECTION_ICONS.teaching />}
                    subtitle="Assign course and subject for HOD teaching responsibilities"
                    color={BRAND_COLORS.info.main}
                  >
                    <div className="section-card-body">
                      <div className="row g-3 field-grid">
                        <div className="col-12 col-md-6">
                          <FormField
                            label="Course"
                            icon={<FaGraduationCap />}
                          >
                            <select
                              name="course"
                              value={selectedCourse}
                              onChange={handleChange}
                              className="form-select"
                            >
                              <option value="">Select Course</option>
                              {courses.map((c) => (
                                <option key={c._id} value={c._id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </FormField>
                        </div>
                        <div className="col-12 col-md-6">
                          <FormField
                            label="Subject"
                            icon={<FaGraduationCap />}
                          >
                            <select
                              name="subject"
                              value={selectedSubject}
                              onChange={handleChange}
                              className="form-select"
                              disabled={!selectedCourse}
                            >
                              <option value="">
                                {selectedCourse ? "Select Subject" : "Select a course first"}
                              </option>
                              {subjects.map((s) => (
                                <option key={s._id} value={s._id}>
                                  {s.name} ({s.code})
                                </option>
                              ))}
                            </select>
                          </FormField>
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* Employment Information */}
              <div className="col-12 col-lg-6">
                <SectionCard
                  title="Employment Details"
                  icon={<SECTION_ICONS.employment />}
                  subtitle="Work-related information"
                  color={BRAND_COLORS.info.main}
                >
                  <div className="section-card-body">
                    <div className="row g-3 field-grid">
                      <div className="col-12">
                        <FormField
                          label="Employment Type"
                          icon={<FaBriefcase />}
                        >
                          <select
                            name="employmentType"
                            value={formData.employmentType}
                            onChange={handleChange}
                            className="form-select"
                          >
                            <option value="FULL_TIME">Full Time</option>
                            <option value="PART_TIME">Part Time</option>
                            <option value="CONTRACT">Contract</option>
                            <option value="INTERN">Intern</option>
                          </select>
                        </FormField>
                      </div>
                      <div className="col-12 col-md-6">
                        <FormField
                          label="Joining Date"
                          icon={<FaCalendarAlt />}
                        >
                          <input
                            type="date"
                            name="joiningDate"
                            value={formData.joiningDate}
                            onChange={handleChange}
                            className="form-control"
                            max={new Date().toISOString().split("T")[0]}
                          />
                        </FormField>
                      </div>
                      <div className="col-12 col-md-6">
                        <FormField
                          label="Experience (Years)"
                          icon={<FaClock />}
                        >
                          <input
                            type="number"
                            name="experienceYears"
                            placeholder="0"
                            min="0"
                            value={formData.experienceYears}
                            onChange={handleChange}
                            className="form-control"
                          />
                        </FormField>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Personal Information */}
              <div className="col-12 col-lg-6">
                <SectionCard
                  title="Personal Information"
                  icon={<SECTION_ICONS.personal />}
                  subtitle="Additional personal details"
                  color={BRAND_COLORS.success.main}
                >
                  <div className="section-card-body">
                    <div className="row g-3 field-grid">
                      <div className="col-12 col-md-6">
                        <FormField
                          label="Gender"
                          icon={<FaVenusMars />}
                        >
                          <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="form-select"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </FormField>
                      </div>
                      <div className="col-12 col-md-6">
                        <FormField
                          label="Date of Birth"
                          icon={<FaBirthdayCake />}
                        >
                          <input
                            type="date"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleChange}
                            className="form-control"
                          />
                        </FormField>
                      </div>
                      <div className="col-12 col-md-6">
                        <FormField
                          label="Blood Group"
                          icon={<FaTint />}
                        >
                          <select
                            name="bloodGroup"
                            value={formData.bloodGroup}
                            onChange={handleChange}
                            className="form-select"
                          >
                            <option value="">Select Blood Group</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </select>
                        </FormField>
                      </div>
                      <div className="col-12 col-md-6">
                        <FormField
                          label="Qualification"
                          icon={<FaGraduationCap />}
                        >
                          <input
                            type="text"
                            name="qualification"
                            placeholder="e.g., B.Com, MCA"
                            value={formData.qualification}
                            onChange={handleChange}
                            className="form-control"
                          />
                        </FormField>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Address Information */}
              <div className="col-12 col-lg-6">
                <SectionCard
                  title="Address Information"
                  icon={<SECTION_ICONS.address />}
                  subtitle="Complete address details"
                  color={BRAND_COLORS.warning.main}
                >
                  <div className="section-card-body">
                    <div className="row g-3 field-grid">
                      <div className="col-12">
                        <FormField
                          label="Address"
                          icon={<FaMapMarkerAlt />}
                        >
                          <textarea
                            rows={3}
                            name="address"
                            placeholder="Full address"
                            value={formData.address}
                            onChange={handleChange}
                            className="form-control"
                          />
                        </FormField>
                      </div>
                      <div className="col-12 col-md-4">
                        <FormField
                          label="City"
                          icon={<FaCity />}
                        >
                          <input
                            type="text"
                            name="city"
                            placeholder="City"
                            value={formData.city}
                            onChange={handleChange}
                            className="form-control"
                          />
                        </FormField>
                      </div>
                      <div className="col-12 col-md-4">
                        <FormField
                          label="State"
                          icon={<FaMapMarkerAlt />}
                        >
                          <input
                            type="text"
                            name="state"
                            placeholder="State"
                            value={formData.state}
                            onChange={handleChange}
                            className="form-control"
                          />
                        </FormField>
                      </div>
                      <div className="col-12 col-md-4">
                        <FormField
                          label="Pincode"
                          icon={<FaBuilding />}
                        >
                          <input
                            type="text"
                            name="pincode"
                            placeholder="PIN"
                            value={formData.pincode}
                            onChange={handleChange}
                            className="form-control"
                          />
                        </FormField>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Emergency Contact */}
              <div className="col-12 col-lg-6">
                <SectionCard
                  title="Emergency Contact"
                  icon={<SECTION_ICONS.emergency />}
                  subtitle="Emergency contact information"
                  color={BRAND_COLORS.danger.main}
                >
                  <div className="section-card-body">
                    <div className="row g-3 field-grid">
                      <div className="col-12">
                        <FormField
                          label="Contact Name"
                          icon={<FaUser />}
                        >
                          <input
                            type="text"
                            name="emergencyContactName"
                            placeholder="Emergency contact person"
                            value={formData.emergencyContactName}
                            onChange={handleChange}
                            className="form-control"
                          />
                        </FormField>
                      </div>
                      <div className="col-12 col-md-6">
                        <FormField
                          label="Contact Phone"
                          icon={<FaPhone />}
                        >
                          <input
                            type="tel"
                            name="emergencyContactPhone"
                            placeholder="Phone number"
                            value={formData.emergencyContactPhone}
                            onChange={handleChange}
                            className="form-control"
                          />
                        </FormField>
                      </div>
                      <div className="col-12 col-md-6">
                        <FormField
                          label="Relation"
                          icon={<FaHeartbeat />}
                        >
                          <input
                            type="text"
                            name="emergencyRelation"
                            placeholder="e.g., Father, Spouse"
                            value={formData.emergencyRelation}
                            onChange={handleChange}
                            className="form-control"
                          />
                        </FormField>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Submit Section */}
              <div className="col-12 form-actions">
                <motion.div
                  variants={fadeInVariants}
                  custom={2}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/staff/profile/${actualUserId}`)}
                    className="dashboard-btn btn-secondary"
                  >
                    <FaArrowLeft className="me-2" />
                    <span>Cancel</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={saving}
                    className="dashboard-btn btn-primary"
                  >
                    {saving ? (
                      <>
                        <motion.div variants={spinVariants} animate="animate" style={{ display: 'inline-block' }}>
                          <FaSyncAlt />
                        </motion.div>
                        <span className="ms-2">Updating...</span>
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" />
                        Update Profile
                      </>
                    )}
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </form>
          </motion.div>

          {/* ================= SUCCESS MESSAGE ================= */}
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
                  style={{ borderRadius: '0.75rem' }}
                >
                  <div
                    className="flex-shrink-0 d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: '40px',
                      height: '40px',
                      background: BRAND_COLORS.success.gradient,
                      color: 'white'
                    }}
                  >
                    <FaCheckCircle />
                  </div>
                  <div className="flex-grow-1">
                    <strong>Success!</strong> Staff profile updated successfully.
                    <div className="mt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(`/staff/profile/${actualUserId}`)}
                        className="btn btn-sm"
                        style={{
                          background: BRAND_COLORS.success.main,
                          color: 'white',
                          border: 'none'
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

          {/* ================= ERROR DISPLAY ================= */}
          <AnimatePresence>
            {error && typeof error === 'string' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-4"
              >
                <ErrorDisplay message={error} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ================= CHANGE EMAIL MODAL ================= */}
          {isSelfEdit && (
            <ChangeEmailModal
              show={showChangeEmailModal}
              onClose={() => setShowChangeEmailModal(false)}
              userRole={currentUser?.role}
              currentEmail={formData.email}
            />
          )}
        </div>
      </motion.div>

      <style>{`
/* =========================================
   EDIT PROFILE PAGE - NOVAA DESIGN SYSTEM
========================================= */

.edit-profile-page {
  width: 100%;
  padding-right: clamp(12px, 1vw, 24px);
  padding-left: clamp(12px, 1vw, 24px);
}

.edit-profile-page .dashboard-container-inner {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 0 0 48px;
}

/* Breadcrumb */
.edit-profile-page .edit-profile-breadcrumb {
  width: 100%;
  margin: 8px 0 28px;
}

/* Header */
.edit-profile-page .dashboard-header {
  margin-bottom: 32px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(14, 55, 70, 0.08);
  background: #fff;
  border: 1px solid #DCE6EF;
}

.edit-profile-page .dashboard-header-hero {
  padding: 32px 36px;
  background: linear-gradient(135deg, #0E3746 0%, #164E63 100%);
  border-radius: 0;
}

.edit-profile-page .header-icon-wrapper {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.edit-profile-page .header-title {
  margin-bottom: 6px;
  line-height: 1.2;
  color: #fff;
  font-size: 1.625rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.edit-profile-page .header-subtitle {
  margin-bottom: 0;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.9375rem;
  font-weight: 400;
}

/* Profile button in header */
.edit-profile-page .btn-profile {
  background: #fff;
  color: #0E3746;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.875rem;
  box-shadow: 0 4px 16px rgba(14, 55, 70, 0.2);
  transition: all 0.2s ease;
  min-height: 46px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-profile-page .btn-profile:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(14, 55, 70, 0.3);
}

.edit-profile-page .btn-profile:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

/* Form Grid Layout */
.edit-profile-page .form-grid {
  --bs-gutter-x: 20px;
  --bs-gutter-y: 20px;
}

.edit-profile-page .field-grid {
  --bs-gutter-x: 16px;
  --bs-gutter-y: 16px;
}

/* Section Cards */
.edit-profile-page .section-card {
  height: 100%;
  overflow: hidden;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #DCE6EF;
  box-shadow: 0 2px 12px rgba(14, 55, 70, 0.04);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.edit-profile-page .section-card:hover {
  border-color: #CADFE5;
  box-shadow: 0 8px 28px rgba(14, 55, 70, 0.08);
}

/* Section Header */
.edit-profile-page .section-card-header {
  min-height: 84px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  background: linear-gradient(180deg, #F8FAFC 0%, #F0F5F8 100%);
  border-bottom: 1px solid #E2EDF2;
}

.edit-profile-page .section-card-heading {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.edit-profile-page .section-card-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  color: #0E3746;
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.3;
}

.edit-profile-page .section-card-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(20, 90, 115, 0.10);
  color: #145A73;
  font-size: 1.125rem;
}

.edit-profile-page .section-card-subtitle {
  display: block;
  margin-left: 50px;
  color: #718096;
  font-size: 0.8rem;
  line-height: 1.4;
  font-weight: 400;
}

/* Card Body */
.edit-profile-page .section-card-body {
  padding: 20px;
}

.edit-profile-page .section-card-body > .row {
  --bs-gutter-x: 16px;
  --bs-gutter-y: 16px;
}

/* Form Fields */
.edit-profile-page .form-group {
  width: 100%;
}

.edit-profile-page .form-label {
  margin-bottom: 8px;
  color: #263746;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-profile-page .form-label svg {
  color: #145A73;
  font-size: 1rem;
  flex-shrink: 0;
}

.edit-profile-page .form-label .required-indicator {
  color: #DC3545;
  font-size: 0.875rem;
  margin-left: 2px;
}

.edit-profile-page .form-control,
.edit-profile-page .form-select {
  width: 100%;
  min-height: 46px;
  height: 46px;
  padding: 10px 14px;
  border: 1px solid #DCE6EF;
  border-radius: 10px;
  background-color: #ffffff;
  color: #263746;
  font-size: 0.9375rem;
  box-shadow: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.edit-profile-page .form-control:hover,
.edit-profile-page .form-select:hover {
  border-color: #B9CCD7;
}

.edit-profile-page .form-control:focus,
.edit-profile-page .form-select:focus {
  border-color: #145A73;
  box-shadow: 0 0 0 3px rgba(20, 90, 115, 0.12);
  outline: none;
}

.edit-profile-page .form-control::placeholder,
.edit-profile-page .form-select::placeholder {
  color: #A0AEBB;
}

.edit-profile-page .form-control.bg-light,
.edit-profile-page .form-select.bg-light {
  background-color: #F8FAFC !important;
  cursor: not-allowed;
}

.edit-profile-page textarea.form-control {
  min-height: 100px;
  height: auto;
  resize: vertical;
  line-height: 1.5;
}

.edit-profile-page select.form-select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-position: right 12px center;
  background-size: 16px 12px;
  background-repeat: no-repeat;
  padding-right: 40px;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

/* Email Input Wrapper */
.edit-profile-page .email-input-wrapper {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: stretch;
}

.edit-profile-page .email-input-wrapper .form-control {
  min-width: 0;
}

.edit-profile-page .email-input-wrapper .btn {
  min-width: 140px;
  white-space: nowrap;
  border-radius: 10px;
  font-size: 0.8125rem;
  font-weight: 600;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0 16px;
}

/* Button Variants */
.edit-profile-page .btn-teal-outline {
  color: #145A73;
  border: 1.5px solid #145A73;
  background: transparent;
  transition: all 0.2s ease;
}

.edit-profile-page .btn-teal-outline:hover:not(:disabled) {
  background: #145A73;
  color: #fff;
  border-color: #145A73;
}

.edit-profile-page .btn-teal-outline:focus-visible {
  outline: 2px solid #145A73;
  outline-offset: 2px;
}

.edit-profile-page .btn-secondary-outline {
  color: #718096;
  border: 1.5px solid #DCE6EF;
  background: #F8FAFC;
  transition: all 0.2s ease;
  cursor: not-allowed;
}

.edit-profile-page .btn-primary {
  background: linear-gradient(135deg, #0E3746 0%, #164E63 100%);
  color: #fff;
  border: none;
  min-width: 180px;
  box-shadow: 0 4px 16px rgba(14, 55, 70, 0.25);
}

.edit-profile-page .btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(14, 55, 70, 0.35);
}

.edit-profile-page .btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.edit-profile-page .btn-secondary {
  background: #fff;
  color: #145A73;
  border: 1.5px solid #DCE6EF;
  min-width: 140px;
  transition: all 0.2s ease;
}

.edit-profile-page .btn-secondary:hover:not(:disabled) {
  background: #F8FAFC;
  border-color: #B9CCD7;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(14, 55, 70, 0.1);
}

/* Dashboard button base */
.edit-profile-page .dashboard-btn {
  min-height: 46px;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0 20px;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.edit-profile-page .dashboard-btn:focus-visible {
  outline: 2px solid #0E3746;
  outline-offset: 2px;
}

/* Form Actions */
.edit-profile-page .form-actions {
  padding-top: 8px;
}

.edit-profile-page .form-actions > div {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* Field Hint Text */
.edit-profile-page .field-hint {
  margin-top: 6px;
  color: #7B8794;
  font-size: 0.75rem;
  line-height: 1.4;
  display: block;
}

/* Help text */
.edit-profile-page .text-muted {
  color: #7B8794 !important;
  font-size: 0.75rem;
  line-height: 1.4;
}

/* Alert styling */
.edit-profile-page .alert {
  border: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.edit-profile-page .alert-success {
  background: #F0FDF4;
  border-left: 4px solid #28A745;
}

.edit-profile-page .alert-danger {
  background: #FEF2F2;
  border-left: 4px solid #DC3545;
}

/* =========================================
   RESPONSIVE BREAKPOINTS
========================================= */

/* Tablet: 768px - 1023px */
@media (max-width: 1023px) {
  .edit-profile-page .dashboard-container-inner {
    padding: 0 0 40px;
  }

  .edit-profile-page .dashboard-header-hero {
    padding: 28px 32px;
  }

  .edit-profile-page .header-title {
    font-size: 1.5rem;
  }

  .edit-profile-page .header-subtitle {
    font-size: 0.875rem;
  }

  .edit-profile-page .section-card-header {
    min-height: 80px;
    padding: 18px 22px;
  }

  .edit-profile-page .section-card-title {
    font-size: 1.0625rem;
  }

  .edit-profile-page .section-card-icon {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }

  .edit-profile-page .section-card-subtitle {
    margin-left: 48px;
    font-size: 0.78rem;
  }

  .edit-profile-page .section-card-body {
    padding: 22px;
  }

  .edit-profile-page .form-grid {
    --bs-gutter-x: 20px;
    --bs-gutter-y: 20px;
  }

  .edit-profile-page .field-grid {
    --bs-gutter-x: 16px;
    --bs-gutter-y: 16px;
  }
}

/* Mobile: <= 767px */
@media (max-width: 767px) {
  .edit-profile-page .dashboard-container-inner {
    padding: 0 0 32px;
  }

  .edit-profile-page .edit-profile-breadcrumb {
    margin-bottom: 20px;
  }

  .edit-profile-page .dashboard-header {
    margin-bottom: 24px;
    border-radius: 14px;
  }

  .edit-profile-page .dashboard-header-hero {
    padding: 24px 20px;
  }

  .edit-profile-page .dashboard-header-hero .row {
    --bs-gutter-x: 0;
    --bs-gutter-y: 16px;
  }

  .edit-profile-page .dashboard-header-hero .row > .col-md-7,
  .edit-profile-page .dashboard-header-hero .row > .col-md-5 {
    width: 100%;
    max-width: 100%;
    flex: 0 0 100%;
  }

  .edit-profile-page .dashboard-header-hero .d-flex.align-items-center.gap-3 {
    flex-direction: row;
    align-items: flex-start;
    gap: 12px !important;
  }

  .edit-profile-page .header-icon-wrapper {
    width: 48px;
    height: 48px;
    min-width: 48px;
    border-radius: 10px;
    font-size: 1.25rem;
  }

  .edit-profile-page .header-title {
    font-size: 1.25rem;
    line-height: 1.25;
  }

  .edit-profile-page .header-subtitle {
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .edit-profile-page .btn-profile {
    width: 100%;
    min-height: 44px;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    justify-content: center;
  }

  .edit-profile-page .section-card {
    border-radius: 14px;
  }

  .edit-profile-page .section-card-header {
    min-height: auto;
    padding: 16px 20px;
  }

  .edit-profile-page .section-card-title {
    font-size: 1rem;
    gap: 10px;
  }

  .edit-profile-page .section-card-icon {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    font-size: 1rem;
  }

  .edit-profile-page .section-card-subtitle {
    margin-left: 44px;
    font-size: 0.72rem;
  }

  .edit-profile-page .section-card-body {
    padding: 20px;
  }

  .edit-profile-page .form-grid {
    --bs-gutter-x: 16px;
    --bs-gutter-y: 16px;
  }

  .edit-profile-page .field-grid {
    --bs-gutter-x: 0;
    --bs-gutter-y: 16px;
  }

  .edit-profile-page .form-label {
    font-size: 0.8125rem;
    margin-bottom: 6px;
  }

  .edit-profile-page .form-control,
  .edit-profile-page .form-select {
    min-height: 44px;
    height: 44px;
    padding: 9px 12px;
    font-size: 0.9375rem;
    border-radius: 9px;
  }

  .edit-profile-page textarea.form-control {
    min-height: 90px;
  }

  .edit-profile-page .email-input-wrapper {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .edit-profile-page .email-input-wrapper .btn {
    width: 100%;
    min-width: 0;
  }

  .edit-profile-page .form-actions > div {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .edit-profile-page .form-actions .dashboard-btn {
    width: 100%;
    min-width: 0;
    justify-content: center;
  }

  .edit-profile-page .field-hint {
    font-size: 0.7rem;
  }
}

/* Small Mobile: <= 480px */
@media (max-width: 480px) {
  .edit-profile-page .dashboard-container-inner {
    padding: 0 12px 28px;
  }

  .edit-profile-page .dashboard-header-hero {
    padding: 20px 16px;
  }

  .edit-profile-page .header-title {
    font-size: 1.125rem;
  }

  .edit-profile-page .section-card-body {
    padding: 18px;
  }

  .edit-profile-page .form-control,
  .edit-profile-page .form-select {
    min-height: 42px;
    height: 42px;
    padding: 8px 11px;
    font-size: 0.875rem;
  }
}

/* Print styles */
@media print {
  .edit-profile-page .dashboard-header-hero,
  .edit-profile-page .form-actions,
  .edit-profile-page .btn-profile {
    display: none;
  }
  .edit-profile-page .section-card {
    break-inside: avoid;
    box-shadow: none;
    border: 1px solid #DCE6EF;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .edit-profile-page *,
  .edit-profile-page *::before,
  .edit-profile-page *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`}</style>
    </AnimatePresence>
  );
}

/* ================= FORM FIELD COMPONENT ================= */
function FormField({ label, required, icon, children }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {icon && <span aria-hidden="true">{icon}</span>}
        {label}
        {required && <span className="required-indicator" aria-hidden="true">*</span>}
      </label>
      {children}
    </div>
  );
}

/* ================= SECTION CARD COMPONENT ================= */
function SectionCard({ title, icon, subtitle, color, children }) {
  return (
    <div className="section-card">
      <div className="section-card-header">
        <div className="section-card-heading">
          <h3 className="section-card-title">
            <span className="section-card-icon" style={{ color }}>{icon}</span>
            {title}
          </h3>
          {subtitle && (
            <span className="section-card-subtitle">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ================= ERROR DISPLAY COMPONENT ================= */
function ErrorDisplay({ message }) {
  return (
    <div
      className="alert alert-danger d-flex align-items-center gap-3"
      style={{ borderRadius: '0.75rem' }}
    >
      <div
        className="flex-shrink-0 d-flex align-items-center justify-content-center rounded-circle"
        style={{
          width: '40px',
          height: '40px',
          background: BRAND_COLORS.danger.gradient,
          color: 'white'
        }}
      >
        <FaExclamationTriangle />
      </div>
      <div className="flex-grow-1">
        <strong>Error:</strong> {message}
      </div>
    </div>
  );
}