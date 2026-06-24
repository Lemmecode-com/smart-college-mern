import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "../../../components/Loading";
import "./Dashboard.css";
import {
  FaUser,
  FaKey,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaEdit,
  FaUserPlus,
  FaSearch,
  FaFilter,
  FaArrowLeft,
  FaExclamationTriangle,
  FaSyncAlt,
  FaArrowRight
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

export default function StaffList() {
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get("/college/staff");
        setStaff(res.data || []);
        setFilteredStaff(res.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load staff list");
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  useEffect(() => {
    let filtered = staff;

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.designation.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter) {
      filtered = filtered.filter(s => s.role === roleFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(s => statusFilter === "active" ? s.isActive : !s.isActive);
    }

    setFilteredStaff(filtered);
  }, [staff, searchTerm, roleFilter, statusFilter]);

  if (loading) return <Loading fullScreen size="lg" text="Loading staff data..." />;
  if (error) return <Alert variant="danger">{error}</Alert>;

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
                      <FaUser />
                    </motion.div>
                    <div className="header-title-section">
                      <h1 className="header-title">
                        Staff Accounts
                      </h1>
                      <p className="header-subtitle">
                        Manage all staff members and their account information
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-5 col-lg-4">
                  <div className="d-flex align-items-center justify-content-center justify-content-md-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate("/college/staff/create")}
                      className="dashboard-btn"
                      style={{
                        background: BRAND_COLORS.primary.gradient,
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      <FaUserPlus className="me-1" />
                      <span className="btn-text">Add New Staff</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ================= SEARCH AND FILTER ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="mb-4"
          >
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <div className="form-group">
                  <label className="form-label">Search Staff</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaSearch />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by name, email, or designation..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-3">
                <div className="form-group">
                  <label className="form-label">Filter by Role</label>
                  <select
                    className="form-select"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="">All Roles</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="ADMISSION_OFFICER">Admission Officer</option>
                    <option value="PRINCIPAL">Principal</option>
                    <option value="HOD">Head of Department</option>
                    <option value="EXAM_COORDINATOR">Exam Coordinator</option>
                    <option value="PLATFORM_SUPPORT">Platform Support</option>
                  </select>
                </div>
              </div>
              <div className="col-12 col-md-3">
                <div className="form-group">
                  <label className="form-label">Filter by Status</label>
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="col-12 col-md-2 d-flex align-items-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("");
                    setStatusFilter("");
                  }}
                  className="btn btn-outline-secondary w-100"
                  disabled={!searchTerm && !roleFilter && !statusFilter}
                >
                  <FaSyncAlt className="me-1" />
                  Clear
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ================= STAFF TABLE ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
          >
            <div className="parent-table-container">
              <div className="parent-table-header">
                <h3 className="parent-table-title">
                  <FaUser className="parent-table-icon" />
                  Staff Overview
                </h3>
                <div className="parent-table-count">
                  Showing: {filteredStaff.length} of {staff.length} staff members
                </div>
              </div>

              {loading ? (
                <div className="d-flex align-items-center justify-content-center p-5">
                  <motion.div
                    variants={spinVariants}
                    animate="animate"
                    style={{ fontSize: '2rem', color: BRAND_COLORS.primary.main }}
                  >
                    <FaSyncAlt />
                  </motion.div>
                  <span className="ms-3" style={{ color: BRAND_COLORS.primary.main }}>
                    Loading staff data...
                  </span>
                </div>
              ) : error ? (
                <ErrorDisplay message={error} />
              ) : (
                <div className="parent-table-responsive">
                  {filteredStaff.length === 0 ? (
                    <EmptyState
                      icon={<FaUser style={{ color: BRAND_COLORS.secondary.main }} />}
                      title="No Staff Members Found"
                      message={staff.length === 0 ? "No staff accounts have been created yet." : "No staff members match your search criteria."}
                      success={false}
                    />
                  ) : (
                    <table className="parent-table">
                      <thead>
                        <tr>
                          <th>Staff Member</th>
                          <th>Role</th>
                          <th>Contact</th>
                          <th>Employment</th>
                          <th>Status</th>
                          <th>Account</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStaff.map((s, idx) => (
                          <motion.tr
                            key={s.id}
                            variants={fadeInVariants}
                            custom={idx}
                            initial="hidden"
                            animate="visible"
                          >
                            <td>
                              <div className="parent-student-info">
                                <div className="parent-student-avatar">
                                  {s.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="parent-student-details">
                                  <div className="parent-student-name">{s.name}</div>
                                  <div className="parent-student-email">
                                    {s.designation && `${s.designation}`}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="parent-status-badge parent-status-secondary">
                                {s.role?.replace("_", " ")}
                              </span>
                            </td>
                            <td>
                              <div>
                                <div className="fw-semibold">{s.email}</div>
                                <small className="text-muted">
                                  {s.mobileNumber || "No phone"}
                                </small>
                              </div>
                            </td>
                             <td>
                               <div>
                                   <div className="fw-semibold">
                                     {s.employmentType?.replace("_", " ")}
                                   </div>
                                   <small className="text-muted">
                                     {s.joiningDate ? new Date(s.joiningDate).toLocaleDateString() : "Not set"}
                                   </small>
                               </div>
                             </td>
                            <td>
                              <span className={`parent-status-badge ${
                                s.isActive ? 'parent-status-approved' : 'parent-status-rejected'
                              }`}>
                                {s.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              {s.mustChangePassword ? (
                                <span className="parent-status-badge parent-status-pending">
                                  <FaKey /> Temp password
                                </span>
                              ) : (
                                <span className="parent-status-badge parent-status-approved">
                                  <FaCheckCircle /> Set
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="parent-action-buttons">
                                 <motion.button
                                   whileHover={{ scale: 1.05 }}
                                   whileTap={{ scale: 0.95 }}
                                   className="parent-btn-view text-black"
                                   onClick={() => {
                                     console.log("[StaffList] Navigating to view profile for id:", s.id);
                                     navigate(`/staff/profile/${s.id}`);
                                   }}
                                   title="View Profile"
                                 >
                                   <FaEye />
                                   View
                                 </motion.button>
                                 <motion.button
                                   whileHover={{ scale: 1.05 }}
                                   whileTap={{ scale: 0.95 }}
                                   className="parent-btn-attendance text-black"
                                   onClick={() => {
                                     console.log("[StaffList] Navigating to edit profile for id:", s.id);
                                     navigate(`/staff/profile/edit/${s.id}`);
                                   }}
                                   title="Edit Profile"
                                 >
                                   <FaEdit />
                                   Edit
                                 </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= ERROR DISPLAY COMPONENT ================= */
function ErrorDisplay({ message }) {
  return (
    <div
      className="alert alert-danger d-flex align-items-center gap-3 mx-4 mt-4"
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
