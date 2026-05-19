import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { motion, AnimatePresence } from "framer-motion";
import "../College-Admin/Dashboard.css";

import {
  FaSave,
  FaArrowLeft,
  FaUserPlus,
  FaCheckCircle,
  FaSyncAlt,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash
} from "react-icons/fa";

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Fetch existing profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log("[EditStaffProfile] Fetching profile for userId:", actualUserId);
        setLoading(true);
        const res = await api.get(`/college/staff/profile/${actualUserId}`);
        console.log("[EditStaffProfile] API response:", res.data);
        const p = res.data.data || res.data;
        if (p) {
          setFormData({
            name: p.name || "",
            email: p.email || "",
            role: p.role || "",
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
        }
      } catch (err) {
        console.error("[EditStaffProfile] API error:", err);
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    if (actualUserId) fetchProfile();
  }, [actualUserId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        ...formData,
        experienceYears: formData.experienceYears ? Number(formData.experienceYears) : 0,
      };
      console.log("[EditStaffProfile] Submitting update for userId:", actualUserId, "payload:", payload);
      const res = await api.put(`/college/staff/profile/${actualUserId}`, payload);
      console.log("[EditStaffProfile] Update response:", res.data);
      setSuccess(true);
      setTimeout(() => navigate(`/staff/profile/${actualUserId}`), 1500);
    } catch (err) {
      console.error("[EditStaffProfile] Update error:", err);
      setError(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading fullScreen size="lg" text="Loading staff profile..." />;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="dashboard-wrapper"
      >
        <div className="dashboard-container-inner">
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
                        e.target.style.outline = '2px solid #1a4b6d';
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
              <div className="row g-3 g-md-4">
              {/* Basic Information */}
              <div className="col-12">
                <SectionCard
                  title="Basic Information"
                  icon={<FaUserPlus />}
                  subtitle="Core staff details and credentials"
                  color={BRAND_COLORS.primary.main}
                >
                  <div className="section-card-body">
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <FormField
                          label="Full Name"
                          required
                          icon={<FaUserPlus />}
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
                      <div className="col-12 col-md-6">
                        <FormField
                          label="Email Address"
                          required
                          icon={<FaUserPlus />}
                        >
                          <input
                            type="email"
                            name="email"
                            placeholder="Enter email address"
                            value={formData.email}
                            onChange={handleChange}
                            className="form-control"
                            required
                          />
                        </FormField>
                      </div>
                      <div className="col-12 col-md-4">
                        <FormField
                          label="Role"
                          required
                          icon={<FaUserPlus />}
                        >
                          <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="form-select"
                            required
                          >
                            <option value="">Select Role</option>
                            <option value="ACCOUNTANT">Accountant</option>
                            <option value="ADMISSION_OFFICER">Admission Officer</option>
                            <option value="PRINCIPAL">Principal</option>
                            <option value="HOD">Head of Department</option>
                            <option value="EXAM_COORDINATOR">Exam Coordinator</option>
                            <option value="PLATFORM_SUPPORT">Platform Support</option>
                          </select>
                        </FormField>
                      </div>
                      <div className="col-12 col-md-4">
                        <FormField
                          label="Mobile Number"
                          icon={<FaUserPlus />}
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
                      <div className="col-12 col-md-4">
                        <FormField
                          label="Designation"
                          icon={<FaUserPlus />}
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

              {/* Employment Information */}
              <div className="col-12 col-lg-6">
                <SectionCard
                  title="Employment Details"
                  icon={<FaUserPlus />}
                  subtitle="Work-related information"
                  color={BRAND_COLORS.info.main}
                >
                  <div className="section-card-body">
                    <div className="row g-3">
                      <div className="col-12">
                        <FormField
                          label="Employment Type"
                          icon={<FaUserPlus />}
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
                      <div className="col-12">
                        <FormField
                          label="Joining Date"
                          icon={<FaUserPlus />}
                        >
                          <input
                            type="date"
                            name="joiningDate"
                            value={formData.joiningDate}
                            onChange={handleChange}
                            className="form-control"
                          />
                        </FormField>
                      </div>
                      <div className="col-12">
                        <FormField
                          label="Experience (Years)"
                          icon={<FaUserPlus />}
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
                  icon={<FaUserPlus />}
                  subtitle="Additional personal details"
                  color={BRAND_COLORS.success.main}
                >
                  <div className="section-card-body">
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <FormField
                          label="Gender"
                          icon={<FaUserPlus />}
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
                          icon={<FaUserPlus />}
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
                          icon={<FaUserPlus />}
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
                          icon={<FaUserPlus />}
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
                  icon={<FaUserPlus />}
                  subtitle="Complete address details"
                  color={BRAND_COLORS.warning.main}
                >
                  <div className="section-card-body">
                    <div className="row g-3">
                      <div className="col-12">
                        <FormField
                          label="Address"
                          icon={<FaUserPlus />}
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
                          icon={<FaUserPlus />}
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
                          icon={<FaUserPlus />}
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
                          icon={<FaUserPlus />}
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
                  icon={<FaUserPlus />}
                  subtitle="Emergency contact information"
                  color={BRAND_COLORS.secondary.main}
                >
                  <div className="section-card-body">
                    <div className="row g-3">
                      <div className="col-12">
                        <FormField
                          label="Contact Name"
                          icon={<FaUserPlus />}
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
                          icon={<FaUserPlus />}
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
                          icon={<FaUserPlus />}
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
                    onClick={() => navigate(`/staff/profile/${actualUserId}`)}
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
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 2rem',
                      borderRadius: '0.5rem',
                      fontWeight: 600,
                      minHeight: '48px',
                      minWidth: '200px'
                    }}
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
            {error && (
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
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= FORM FIELD COMPONENT ================= */
function FormField({ label, required, icon, children }) {
  return (
    <div className="form-group">
      <label className="form-label d-flex align-items-center gap-2">
        {icon && <span style={{ color: BRAND_COLORS.primary.main, fontSize: '1rem' }}>{icon}</span>}
        {label}
        {required && <span style={{ color: BRAND_COLORS.danger.main }}>*</span>}
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
