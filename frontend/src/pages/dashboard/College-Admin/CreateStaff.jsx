import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaSave,
  FaArrowLeft,
  FaUserPlus,
  FaCheckCircle,
  FaSyncAlt,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaCopy,
  FaArrowRight
} from "react-icons/fa";
import api from "../../../api/axios";
import "./Dashboard.css";

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

export default function CreateStaff() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
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
    experienceYears: 0,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const allowedRoles = [
    "ACCOUNTANT",
    "ADMISSION_OFFICER",
    "PRINCIPAL",
    "HOD",
    "EXAM_COORDINATOR",
    "PLATFORM_SUPPORT",
  ];

  const validateForm = () => {
    if (!formData.name.trim()) return "Full name is required";
    if (!formData.email.trim()) return "Email is required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return "Invalid email format";

    if (!formData.role) return "Role is required";

    if (formData.mobileNumber && !/^\d{10}$/.test(formData.mobileNumber)) {
      return "Mobile number must be 10 digits";
    }

    if (
      formData.emergencyContactPhone &&
      !/^\d{10}$/.test(formData.emergencyContactPhone)
    ) {
      return "Emergency phone must be 10 digits";
    }

    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "experienceYears" ? Number(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/college/staff", formData);

      setResult(res.data);
      toast.success("Staff account created successfully!");

      setFormData({
        name: "",
        email: "",
        role: "",
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
        experienceYears: 0,
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.temporaryPassword) {
      navigator.clipboard.writeText(result.temporaryPassword);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="dashboard-wrapper"
      >
        <div className="dashboard-container-inner">
          <ToastContainer position="top-right" />

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
                      <h1 className="header-title">
                        Create Staff Account
                      </h1>
                      <p className="header-subtitle">
                        Add new staff members to the college system with complete profile information
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-5 col-lg-4">
                  <div className="d-flex align-items-center justify-content-center justify-content-md-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate("/college/staff")}
                      className="dashboard-btn btn-profile"
                      onFocus={(e) => {
                        e.target.style.outline = '2px solid #1a4b6d';
                        e.target.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.target.style.outline = 'none';
                      }}
                    >
                      <FaArrowRight className="me-1" />
                      <span className="btn-text">Staff List</span>
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
                  <SectionCard
                    title="Basic Information"
                    icon={<FaUserPlus />}
                    subtitle="Essential staff details and credentials"
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
                            >
                              <option value="">Select Role</option>
                              {allowedRoles.map((r) => (
                                <option key={r} value={r}>
                                  {r.replaceAll("_", " ")}
                                </option>
                              ))}
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
                              onChange={(e) => setFormData({ ...formData, experienceYears: parseInt(e.target.value) || 0 })}
                              className="form-control"
                            />
                          </FormField>
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                </div>

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
                      onClick={() => navigate("/college/staff")}
                      className="dashboard-btn btn-outline"
                    >
                      <FaArrowLeft className="me-1" />
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
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
                      {loading ? (
                        <>
                          <motion.div variants={spinVariants} animate="animate" style={{ display: 'inline-block' }}>
                            <FaSyncAlt />
                          </motion.div>
                          <span className="ms-2">Creating...</span>
                        </>
                      ) : (
                        <>
                          <FaUserPlus className="me-1" />
                          Create Account
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                </div>
              </div>
            </form>
          </motion.div>

          <AnimatePresence>
            {result && (
              <SuccessModal
                result={result}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                onCopy={handleCopy}
                onNavigate={() => navigate("/college/staff")}
              />
            )}
          </AnimatePresence>

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

function SuccessModal({ result, showPassword, setShowPassword, onCopy, onNavigate }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1050
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-white rounded-3 p-4 shadow-lg"
        style={{ maxWidth: '500px', width: '90%' }}
      >
        <div className="text-center mb-4">
          <div
            className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
            style={{
              width: '60px',
              height: '60px',
              background: BRAND_COLORS.success.gradient,
              color: 'white'
            }}
          >
            <FaCheckCircle size={30} />
          </div>
          <h4 className="mb-2" style={{ color: BRAND_COLORS.success.main }}>
            Staff Account Created Successfully!
          </h4>
          <p className="text-muted mb-0">Account details are shown below</p>
        </div>

        <div className="mb-4">
          <div className="row g-3">
            <div className="col-12">
              <div className="p-3 bg-light rounded-2">
                <div className="row">
                  <div className="col-4 text-muted">Name:</div>
                  <div className="col-8 fw-semibold">{result.user.name}</div>
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="p-3 bg-light rounded-2">
                <div className="row">
                  <div className="col-4 text-muted">Email:</div>
                  <div className="col-8 fw-semibold">{result.user.email}</div>
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="p-3 bg-light rounded-2">
                <div className="row">
                  <div className="col-4 text-muted">Role:</div>
                  <div className="col-8 fw-semibold">{result.user.role?.replace('_', ' ')}</div>
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="p-3 bg-light rounded-2">
                <div className="row align-items-center">
                  <div className="col-4 text-muted">Password:</div>
                  <div className="col-8">
                    <div className="d-flex align-items-center gap-2">
                      <code className="bg-white px-2 py-1 rounded border">
                        {showPassword ? result.temporaryPassword : '••••••••••••'}
                      </code>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowPassword(!showPassword)}
                        className="btn btn-sm btn-outline-secondary"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onCopy}
                        className="btn btn-sm btn-outline-primary"
                        title="Copy password"
                      >
                        <FaCopy />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="alert alert-warning py-2 mb-4">
          <small>
            <strong>Security Notice:</strong> Share the temporary password securely.
            User must change it on first login.
          </small>
        </div>

        <div className="d-flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNavigate}
            className="btn flex-fill"
            style={{
              background: BRAND_COLORS.success.gradient,
              color: 'white',
              border: 'none'
            }}
          >
            <FaArrowRight className="me-1" />
            Go to Staff List
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

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