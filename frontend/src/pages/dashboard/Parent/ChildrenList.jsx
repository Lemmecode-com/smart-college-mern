// Children List - Shows all children linked to parent account
import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import StandardListView from "../../../components/StandardListView/StandardListView";
import PageHeader from "../../../components/PageHeader";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import "./ParentPortal.css";

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

    // Apply status filter - "ALL" shows all students including PENDING
    if (statusFilter === "ACTIVE") {
      filtered = filtered.filter(child =>
        ["APPROVED", "ENROLLED"].includes(child.status)
      );
    } else if (statusFilter === "PENDING") {
      filtered = filtered.filter(child => child.status === "PENDING");
    } else if (statusFilter === "APPROVED") {
      filtered = filtered.filter(child => child.status === "APPROVED");
    } else if (statusFilter === "ENROLLED") {
      filtered = filtered.filter(child => child.status === "ENROLLED");
    }
    // statusFilter === "ALL" shows all students (no filtering)

    setFilteredChildren(filtered);
  };

  const getStatusClass = (status) => {
    const statusClasses = {
      APPROVED: "parent-status-approved",
      ENROLLED: "parent-status-approved",
      PENDING: "parent-status-pending",
      REJECTED: "parent-status-rejected",
      DEACTIVATED: "parent-status-deactivated",
    };
    return statusClasses[status] || "parent-status-deactivated";
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      APPROVED: "Approved",
      ENROLLED: "Enrolled",
      PENDING: "Pending",
      REJECTED: "Rejected",
      DEACTIVATED: "Deactivated",
    };
    return statusLabels[status] || status;
  };

  
const columns = [
  {
    key: "student",
    label: "Student",
    sortable: true,
    width: "280px",
    render: (child) => (
      <div className="parent-student-info">
        <div className="parent-student-avatar">
          {(child.fullName || "?").charAt(0).toUpperCase()}
        </div>

        <div className="parent-student-details">
          <div className="parent-student-name">
            {child.fullName}
          </div>
          <div className="parent-student-email">
            {child.email}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "course",
    label: "Class",
    sortable: true,
    width: "260px",
    render: (child) => (
      <div className="parent-course-info">
        <div className="parent-course-name">
          {child.course_id?.name || "—"}
        </div>
        <div className="parent-course-semester">
          Semester {child.currentSemester ?? "—"}
        </div>
      </div>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    width: "150px",
    render: (child) => (
      <span
        className={`parent-status-badge ${getStatusClass(
          child.status
        )}`}
      >
        {getStatusLabel(child.status)}
      </span>
    ),
  },
];

const tableActions = {
  label: "Actions",
  width: "320px",
  items: [
    {
      key: "view",
      label: "View",
      text: "View",
      icon: FaEye,
      // className: "view-btn",
      style: {
        minWidth: "80px",
        gap: "5px",
        fontWeight: 600,
        // backgroundColor: "#005f82",
        background: "linear-gradient(to right, #005f82, #1d8bb7)",
      },
      onClick: (child) =>
        navigate(`/dashboard/parent/child/${child._id}`),
    },
    {
      key: "attendance",
      label: "Attendance",
      text: "Attendance",
      icon: FaCalendarCheck,
      className: "attendance-btn",
      style: {
        minWidth: "110px",
        gap: "5px",
        fontWeight: 600,
        background: "linear-gradient(to right, #27b9cc, #0184b4)",
      },
      show: (child) =>
        ["APPROVED", "ENROLLED"].includes(child.status),
      onClick: (child) =>
        navigate(
          `/dashboard/parent/child/${child._id}/attendance`
        ),
    },
    {
      key: "fees",
      label: "Fees",
      text: "Fees",
      icon: FaRupeeSign,
      // className: "fees-btn",
      style: {
        minWidth: "80px",
        gap: "5px",
        fontWeight: 600,
        background: "linear-gradient(to right, #f0ad4e, #f7c873)",
      },
      show: (child) =>
        ["APPROVED", "ENROLLED"].includes(child.status),
      onClick: (child) =>
        navigate(`/dashboard/parent/child/${child._id}/fees`),
    },
  ],
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
          text="Loading Your Children..."
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
        className="parent-portal-wrapper"
      >
        <div className="parent-portal-container">
          {/* ================= BREADCRUMB ================= */}
          <Breadcrumb
            items={[
              { label: "Home", path: "/dashboard/parent" },
              { label: "My Children", path: "/dashboard/parent/children" },
            ]}
          />

          {/* ================= HEADER ================= */}
<PageHeader
  icon={FaUsers}
  title="My Children"
  subtitle="View and manage all your children's academic information."
/>

          {/* ================= SEARCH AND FILTERS ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="parent-search-container"
          >
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 250px", minWidth: "220px" }}>
                <div className="parent-search-input-group">
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
              <div style={{ flex: "0 1 200px", minWidth: "160px" }}>
                <select
                  className="parent-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="ENROLLED">Enrolled</option>
                </select>
              </div>
              <div style={{ flex: "0 1 160px", minWidth: "130px" }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="parent-clear-filters-btn"
                  style={{ width: "100%" }}
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("ALL");
                  }}
                >
                  <FaFilter className="parent-me-1" />
                  Clear Filters
                </motion.button>
              </div>
            </div>
          </motion.div>


{/* ================= CHILDREN STANDARD LIST ================= */}
<motion.div
  variants={fadeInVariants}
  custom={1}
  initial="hidden"
  animate="visible"
>
  <StandardListView
    className="parent-children-list"
    title="Children Overview"
    icon={FaChild}
    count={filteredChildren.length}
    columns={columns}
    data={filteredChildren}
    loading={false}
    emptyState={{
      icon: FaChild,
      title:
        children.length === 0
          ? "No Children Found"
          : "No Children Match Your Search",
      description:
        children.length === 0
          ? "No student accounts are linked to your parent account yet."
          : "Try adjusting your search or filter criteria.",
    }}
    actions={tableActions}
  />
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