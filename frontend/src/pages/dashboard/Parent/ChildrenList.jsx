// Children List - Shows all children linked to parent account
import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import "../College-Admin/Dashboard.css";

import {
  FaUsers,
  FaEye,
  FaCalendarCheck,
  FaRupeeSign,
  FaSearch,
  FaFilter,
  FaChild,
  FaArrowRight,
  FaExclamationTriangle,
  FaSyncAlt
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

export default function ChildrenList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [filteredChildren, setFilteredChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "PARENT_GUARDIAN") {
    return <Navigate to="/dashboard" replace />;
  }

  /* ================= DATA FETCHING ================= */
  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    filterChildren();
  }, [children, searchTerm, statusFilter]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await api.get("/parent/children");
      setChildren(response.data.children || []);
    } catch (error) {
      toast.error("Failed to load children information");
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterChildren = () => {
    let filtered = children;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(child =>
        child.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        child.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(child => child.status === statusFilter);
    }

    setFilteredChildren(filtered);
  };

  const getStatusClass = (status) => {
    const statusClasses = {
      APPROVED: "parent-status-approved",
      PENDING: "parent-status-pending",
      REJECTED: "parent-status-rejected",
      DEACTIVATED: "parent-status-deactivated",
    };
    return statusClasses[status] || "parent-status-deactivated";
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      APPROVED: "Active Student",
      PENDING: "Application Pending",
      REJECTED: "Application Rejected",
      DEACTIVATED: "Account Inactive",
    };
    return statusLabels[status] || status;
  };

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading your children..." />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="dashboard-wrapper"
      >
        <div         className="dashboard-container-inner">
          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="dashboard-header"
          >
            {/* Hero Section */}
            <div             className="dashboard-header-hero">
              <div className="row g-3 g-sm-4 align-items-center">
                <div className="col-12 col-md-7 col-lg-8">
                  <div className="d-flex align-items-center gap-3">
                    <motion.div
                      variants={pulseVariants}
                      initial="initial"
                      animate="pulse"
                      className="header-icon-wrapper"
                    >
                      <FaUsers />
                    </motion.div>
                    <div                     className="header-title-section">
                      <h1                       className="header-title">
                        My Children
                      </h1>
                      <p                       className="header-subtitle">
                        View and manage all your children's academic information.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-5 col-lg-4">
                  <div className="d-flex align-items-center justify-content-center justify-content-md-end">
                    <Breadcrumb
                      items={[
                        { label: "Dashboard", path: "/dashboard/parent" },
                        { label: "My Children", path: "/dashboard/parent/children" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ================= SEARCH AND FILTERS ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="card"
          >
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div                 className="input-group">
                  <FaSearch className="parent-search-icon" />
                  <input
                    type="text"
                    className="parent-search-input"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-12 col-md-3">
                <select
                  className="parent-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Status</option>
                  <option value="APPROVED">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="DEACTIVATED">Inactive</option>
                </select>
              </div>
              <div className="col-12 col-md-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="parent-clear-filters-btn w-100"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("ALL");
                  }}
                >
                  <FaFilter className="me-1" />
                  Clear Filters
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ================= CHILDREN TABLE ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
          >
            <div className="parent-table-container">
              <div className="parent-table-header">
                <h3 className="parent-table-title">
                  <FaChild className="parent-table-icon" />
                  Children Overview
                </h3>
                <div className="parent-table-count">
                  Showing {filteredChildren.length} of {children.length}
                </div>
              </div>

              <div className="parent-table-responsive">
                {filteredChildren.length === 0 ? (
                  <EmptyState
                    icon={<FaChild style={{ color: BRAND_COLORS.primary.main }} />}
                    title={children.length === 0 ? "No Children Found" : "No Children Match Your Search"}
                    message={
                      children.length === 0
                        ? "No student accounts are linked to your parent account yet."
                        : "Try adjusting your search or filter criteria."
                    }
                    success={false}
                  />
                ) : (
                  <table className="parent-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Class</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredChildren.map((child, idx) => (
                        <motion.tr
                          key={child._id}
                          variants={fadeInVariants}
                          custom={idx}
                          initial="hidden"
                          animate="visible"
                        >
                          <td>
                            <div className="parent-student-info">
                              <div className="parent-student-avatar">
                                {child.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div className="parent-student-details">
                                <div className="parent-student-name">{child.fullName}</div>
                                <div className="parent-student-email">{child.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="parent-course-info">
                              <div className="parent-course-name">{child.course_id?.name}</div>
                              <div className="parent-course-semester">
                                Semester {child.currentSemester}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`parent-status-badge ${getStatusClass(child.status)}`}>
                              {getStatusLabel(child.status)}
                            </span>
                          </td>
                          <td>
                            <div className="parent-action-buttons">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="parent-btn-view"
                                onClick={() => navigate(`/dashboard/parent/child/${child._id}`)}
                                title="View Details"
                              >
                                <FaEye />
                                View
                              </motion.button>
                              {child.status === "APPROVED" && (
                                <>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="parent-btn-attendance"
                                    onClick={() => navigate(`/dashboard/parent/child/${child._id}/attendance`)}
                                    title="View Attendance"
                                  >
                                    <FaCalendarCheck />
                                    Attendance
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="parent-btn-fees"
                                    onClick={() => navigate(`/dashboard/parent/child/${child._id}/fees`)}
                                    title="View Fees"
                                  >
                                    <FaRupeeSign />
                                    Fees
                                  </motion.button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
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