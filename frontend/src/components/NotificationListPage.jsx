import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import api from "../api/axios";
import Loading from "../components/Loading";
import ApiError from "../components/ApiError";
import ConfirmModal from "../components/ConfirmModal";
import Pagination from "../components/Pagination";
import Breadcrumb from "../components/Breadcrumb";
import NotificationCard from "../components/NotificationCard";
import {
  FaBell,
  FaUserTie,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaClock,
  FaTrash,
  FaEdit,
  FaSyncAlt,
  FaExclamationTriangle,
  FaArrowLeft,
  FaInfoCircle,
  FaSearch,
  FaFilter,
  FaGraduationCap,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaUserCheck,
  FaBullhorn,
  FaClipboardList,
  FaEye,
  FaStar,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/* ================= ROLE-BASED CONFIGURATION ================= */
const ROLE_CONFIG = {
  "college-admin": {
    apiEndpoint: "/notifications/admin/read",
    deleteEndpoint: "/notifications/delete-note/",
    primaryNotesKey: "myNotifications",
    secondaryNotesKey: "staffNotifications",
    primaryLabel: "My Notifications",
    secondaryLabel: "Staff Notifications",
    primaryIcon: FaUserTie,
    secondaryIcon: FaUserGraduate,
    createRoute: "/notification/create",
    editRoute: "/notification/edit/",
    viewRoute: "/notification/view/",
    dashboardRoute: "/dashboard",
    canCreate: true,
    showStats: false,
  },
  teacher: {
    apiEndpoint: "/notifications/teacher/read",
    deleteEndpoint: "/notifications/delete-note/",
    primaryNotesKey: "myNotifications",
    secondaryNotesKey: "adminNotifications",
    primaryLabel: "My Notifications",
    secondaryLabel: "Admin Notifications",
    primaryIcon: FaChalkboardTeacher,
    secondaryIcon: FaUserTie,
    createRoute: "/teacher/notifications/create",
    editRoute: "/teacher/notifications/edit/",
    viewRoute: "/teacher/notifications/view/",
    dashboardRoute: "/teacher/dashboard",
    canCreate: true,
    showStats: true,
  },
  student: {
    apiEndpoint: "/notifications/student/read",
    deleteEndpoint: null, // Students can't delete
    primaryNotesKey: "adminNotifications",
    secondaryNotesKey: "teacherNotifications",
    primaryLabel: "From College Admin",
    secondaryLabel: "From Teachers",
    primaryIcon: FaUserTie,
    secondaryIcon: FaChalkboardTeacher,
    createRoute: null,
    editRoute: null,
    viewRoute: "/notification/view/",
    dashboardRoute: "/student/dashboard",
    canCreate: false,
    showStats: false,
  },
};

/* ================= ANIMATION VARIANTS ================= */
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.6, ease: "easeOut" },
  }),
};

const slideDownVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const pulseVariants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

/* ================= BRAND COLORS ================= */
const BRAND_COLORS = {
  primary: {
    main: "#1a4b6d",
    gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
  },
  success: { main: "#28a745" },
  info: { main: "#17a2b8" },
  warning: { main: "#ffc107" },
  danger: { main: "#dc3545" },
  notificationTypes: {
    GENERAL: { icon: FaInfoCircle, color: "#3b82f6", bg: "#dbeafe" },
    ACADEMIC: { icon: FaGraduationCap, color: "#8b5cf6", bg: "#ede9fe" },
    EXAM: { icon: FaCalendarAlt, color: "#ec4899", bg: "#fce7f3" },
    FEE: { icon: FaMoneyBillWave, color: "#f59e0b", bg: "#ffedd5" },
    ATTENDANCE: { icon: FaUserCheck, color: "#10b981", bg: "#dcfce7" },
    EVENT: { icon: FaBullhorn, color: "#ef4444", bg: "#fee2e2" },
    ASSIGNMENT: { icon: FaClipboardList, color: "#6366f1", bg: "#eef2ff" },
    URGENT: { icon: FaExclamationTriangle, color: "#dc2626", bg: "#fee2e2" },
  },
  priorities: {
    LOW: { color: "#64748b", bg: "#f1f5f9", icon: FaStar },
    NORMAL: { color: "#1e40af", bg: "#dbeafe", icon: FaInfoCircle },
    HIGH: { color: "#b91c1c", bg: "#fee2e2", icon: FaClock },
    URGENT: { color: "#dc2626", bg: "#fecaca", icon: FaExclamationTriangle },
  },
};

/* ================= CONFIGURATION ================= */
const CONFIG = {
  ITEMS_PER_PAGE: 9,
  AUTO_REFRESH_INTERVAL: 30000,
  TOAST: {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "colored",
  },
};

/* ================= MAIN COMPONENT ================= */
export default function NotificationListPage({ role = "college-admin" }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG["college-admin"];
  const navigate = useNavigate();

  const [primaryNotes, setPrimaryNotes] = useState([]);
  const [secondaryNotes, setSecondaryNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    noteId: null,
    noteTitle: "",
  });

  /* ================= FETCH NOTIFICATIONS ================= */
  const fetchNotes = useCallback(
    async (showRefreshToast = false) => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(config.apiEndpoint);

        const primaryData = (
          res.data[config.primaryNotesKey] ||
          res.data ||
          []
        ).map((note) => ({
          ...note,
          isOwner: config.primaryNotesKey === "myNotifications",
        }));

        const secondaryData = (res.data[config.secondaryNotesKey] || []).map(
          (note) => ({
            ...note,
            isOwner: false,
          }),
        );

        setPrimaryNotes(primaryData);
        setSecondaryNotes(secondaryData);

        if (showRefreshToast) {
          toast.success("Notifications refreshed!", CONFIG.TOAST);
        }
        setRetryCount(0);
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to load notifications";
        const statusCode = err.response?.status;
        setError({ message: errorMsg, statusCode });
        toast.error("Failed to load notifications", CONFIG.TOAST);
      } finally {
        setLoading(false);
      }
    },
    [config],
  );

  // Handle retry action
  const handleRetry = async () => {
    if (retryCount >= 3) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    await fetchNotes();
    setIsRetrying(false);
  };

  // Handle go back action
  const handleGoBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    fetchNotes();

    // Auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      fetchNotes(false);
    }, CONFIG.AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchNotes]);

  /* ================= DELETE HANDLER ================= */
  const handleDeleteClick = (id, title) => {
    if (!config.deleteEndpoint) return;
    setConfirmModal({
      isOpen: true,
      noteId: id,
      noteTitle: title,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmModal.noteId || !config.deleteEndpoint) return;

    try {
      setDeletingId(confirmModal.noteId);
      await api.delete(`${config.deleteEndpoint}${confirmModal.noteId}`);

      setPrimaryNotes((prev) =>
        prev.filter((note) => note._id !== confirmModal.noteId),
      );
      setSecondaryNotes((prev) =>
        prev.filter((note) => note._id !== confirmModal.noteId),
      );

      toast.success("Notification deleted successfully!", CONFIG.TOAST);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to delete notification",
        CONFIG.TOAST,
      );
    } finally {
      setDeletingId(null);
      setConfirmModal({ isOpen: false, noteId: null, noteTitle: "" });
    }
  };

  const handleDeleteCancel = () => {
    setConfirmModal({ isOpen: false, noteId: null, noteTitle: "" });
  };

  /* ================= FILTER & SEARCH LOGIC ================= */
  const filterNotifications = useCallback(
    (notes) => {
      return notes.filter((note) => {
        // Tab filter
        if (activeTab === "primary" && !note.isOwner) return false;
        if (activeTab === "secondary" && note.isOwner) return false;

        // Search filter
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          !searchQuery ||
          note.title.toLowerCase().includes(searchLower) ||
          note.message.toLowerCase().includes(searchLower) ||
          (note.type && note.type.toLowerCase().includes(searchLower));

        // Type filter
        const matchesType =
          !typeFilter || (note.type && note.type === typeFilter);

        return matchesSearch && matchesType;
      });
    },
    [activeTab, searchQuery, typeFilter],
  );

  const filteredPrimaryNotes = useMemo(
    () => filterNotifications(primaryNotes),
    [primaryNotes, filterNotifications],
  );

  const filteredSecondaryNotes = useMemo(
    () => filterNotifications(secondaryNotes),
    [secondaryNotes, filterNotifications],
  );

  /* ================= PAGINATION ================= */
  const getUniqueNotes = useMemo(() => {
    const allNotes = [...filteredPrimaryNotes, ...filteredSecondaryNotes];
    const uniqueIds = new Set();
    return allNotes.filter((note) => {
      if (uniqueIds.has(note._id)) return false;
      uniqueIds.add(note._id);
      return true;
    });
  }, [filteredPrimaryNotes, filteredSecondaryNotes]);

  const paginatedNotes = useMemo(() => {
    const startIndex = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
    const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
    return getUniqueNotes.slice(startIndex, endIndex);
  }, [getUniqueNotes, currentPage]);

  const totalPages = Math.ceil(getUniqueNotes.length / CONFIG.ITEMS_PER_PAGE);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, activeTab]);

  /* ================= GET UNIQUE TYPES FOR FILTER ================= */
  const notificationTypes = useMemo(() => {
    const allNotes = [...primaryNotes, ...secondaryNotes];
    const types = new Set(allNotes.map((note) => note.type).filter(Boolean));
    return Array.from(types);
  }, [primaryNotes, secondaryNotes]);

  /* ================= CALCULATE STATS ================= */
  const stats = useMemo(() => {
    const allNotes = [...primaryNotes, ...secondaryNotes];
    return {
      totalPrimary: primaryNotes.length,
      totalSecondary: secondaryNotes.length,
      unreadPrimary: primaryNotes.filter((n) => !n.read).length,
      unreadSecondary: secondaryNotes.filter((n) => !n.read).length,
      urgent: allNotes.filter((n) => n.priority === "URGENT").length,
      total: allNotes.length,
    };
  }, [primaryNotes, secondaryNotes]);

  /* ================= LOADING STATE ================= */
  if (loading && retryCount === 0) {
    return <Loading fullScreen size="lg" text="Loading notifications..." />;
  }

  /* ================= ERROR STATE ================= */
  if (error) {
    return (
      <ApiError
        title="Error Loading Notifications"
        message={
          error.message || "Failed to load notifications. Please try again."
        }
        statusCode={error.statusCode}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        retryCount={retryCount}
        maxRetry={3}
        isRetryLoading={isRetrying}
      />
    );
  }

  /* ================= MAIN RENDER ================= */
  const PrimaryIcon = config.primaryIcon;
  const SecondaryIcon = config.secondaryIcon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="erp-container"
        style={{
          minHeight: "100vh",
          background: "#f5f7fa",
          paddingTop: "1.5rem",
          paddingBottom: "2rem",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* ================= BREADCRUMB ================= */}
          <Breadcrumb
            items={[
              { label: "Dashboard", path: config.dashboardRoute },
              { label: "Notifications" },
            ]}
          />

          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="erp-page-header"
            style={{
              marginBottom: "1.5rem",
              backgroundColor: "white",
              borderRadius: "1.5rem",
              overflow: "hidden",
              boxShadow: "0 10px 40px rgba(26, 75, 109, 0.15)",
            }}
          >
            <div
              style={{
                padding: "1.75rem 2rem",
                background: BRAND_COLORS.primary.gradient,
                color: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1.5rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}
              >
                <motion.div
                  variants={pulseVariants}
                  initial="initial"
                  animate="pulse"
                  style={{
                    width: "72px",
                    height: "72px",
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2rem",
                    flexShrink: 0,
                    boxShadow: "0 8px 25px rgba(255, 255, 255, 0.3)",
                  }}
                >
                  <FaBell />
                </motion.div>
                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "2rem",
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    Notifications Center
                  </h1>
                  <p
                    style={{
                      margin: "0.5rem 0 0 0",
                      opacity: 0.9,
                      fontSize: "1.1rem",
                    }}
                  >
                    {role === "student"
                      ? "Important updates from college & teachers"
                      : role === "teacher"
                        ? "Your announcements and college updates"
                        : "Manage and view all announcements"}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {config.canCreate && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(config.createRoute)}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      color: "white",
                      border: "2px solid rgba(255, 255, 255, 0.4)",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "12px",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <FaBell /> Create New
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fetchNotes(true)}
                  disabled={loading}
                  style={{
                    backgroundColor: loading
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(255, 255, 255, 0.2)",
                    color: "white",
                    border: "2px solid rgba(255, 255, 255, 0.4)",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "12px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.3s ease",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <FaSyncAlt className={loading ? "spinning" : ""} /> Refresh
                </motion.button>
              </div>
            </div>

            {/* Stats Bar (conditionally rendered) */}
            {config.showStats && (
              <div
                style={{
                  padding: "1rem 2rem",
                  backgroundColor: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "2rem",
                    flexWrap: "wrap",
                  }}
                >
                  <StatItem
                    icon={<PrimaryIcon />}
                    label={config.primaryLabel}
                    value={stats.totalPrimary}
                    unread={stats.unreadPrimary}
                    color={BRAND_COLORS.primary.main}
                  />
                  <StatItem
                    icon={<SecondaryIcon />}
                    label={config.secondaryLabel}
                    value={stats.totalSecondary}
                    unread={stats.unreadSecondary}
                    color={BRAND_COLORS.info.main}
                  />
                  <StatItem
                    icon={<FaExclamationTriangle />}
                    label="Urgent Alerts"
                    value={stats.urgent}
                    color={BRAND_COLORS.danger.main}
                  />
                </div>
                <div
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "20px",
                    backgroundColor: "#dbeafe",
                    color: BRAND_COLORS.primary.main,
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <FaInfoCircle size={14} />
                  Total: {stats.total} notifications
                </div>
              </div>
            )}
          </motion.div>

          {/* ================= SEARCH & FILTER BAR ================= */}
          <div
            className="filter-bar mb-4"
            style={{
              backgroundColor: "white",
              padding: "1.25rem",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <div
              className="filter-group"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flex: 1,
                minWidth: "200px",
              }}
            >
              <FaSearch className="filter-icon" style={{ color: "#64748b" }} />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  transition: "all 0.3s ease",
                }}
                aria-label="Search notifications"
              />
            </div>

            <div
              className="filter-group"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flex: 1,
                minWidth: "200px",
              }}
            >
              <FaFilter className="filter-icon" style={{ color: "#64748b" }} />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="filter-select"
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  backgroundColor: "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                aria-label="Filter by type"
              >
                <option value="">All Types</option>
                {notificationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* TABS */}
            <div
              className="tab-group"
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <button
                className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
                style={{
                  padding: "0.625rem 1.25rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  backgroundColor:
                    activeTab === "all" ? BRAND_COLORS.primary.main : "white",
                  color: activeTab === "all" ? "white" : "#64748b",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                All
              </button>
              <button
                className={`tab-btn ${activeTab === "primary" ? "active" : ""}`}
                onClick={() => setActiveTab("primary")}
                style={{
                  padding: "0.625rem 1.25rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  backgroundColor:
                    activeTab === "primary"
                      ? BRAND_COLORS.primary.main
                      : "white",
                  color: activeTab === "primary" ? "white" : "#64748b",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <PrimaryIcon className="me-1" /> {config.primaryLabel}
              </button>
              <button
                className={`tab-btn ${activeTab === "secondary" ? "active" : ""}`}
                onClick={() => setActiveTab("secondary")}
                style={{
                  padding: "0.625rem 1.25rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  backgroundColor:
                    activeTab === "secondary"
                      ? BRAND_COLORS.primary.main
                      : "white",
                  color: activeTab === "secondary" ? "white" : "#64748b",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <SecondaryIcon className="me-1" /> {config.secondaryLabel}
              </button>
            </div>
          </div>

          {/* ================= NOTIFICATIONS GRID ================= */}
          <div
            className="notifications-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
              gap: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            {paginatedNotes.length === 0 ? (
              <div
                className="empty-state"
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "4rem 2rem",
                  backgroundColor: "white",
                  borderRadius: "16px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div
                  className="empty-icon"
                  style={{
                    width: "80px",
                    height: "80px",
                    margin: "0 auto 1.5rem",
                    background:
                      "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.5rem",
                    color: "#94a3b8",
                  }}
                >
                  <FaBell />
                </div>
                <h4
                  style={{
                    margin: "0 0 0.5rem",
                    color: "#1e293b",
                    fontSize: "1.5rem",
                  }}
                >
                  No Notifications Found
                </h4>
                <p
                  style={{
                    margin: "0 0 1.5rem",
                    color: "#64748b",
                    fontSize: "1rem",
                  }}
                >
                  {searchQuery || typeFilter
                    ? "Try adjusting your search or filters"
                    : "You're all caught up! No notifications yet."}
                </p>
                {(searchQuery || typeFilter) && (
                  <button
                    className="btn-clear-filters"
                    onClick={() => {
                      setSearchQuery("");
                      setTypeFilter("");
                      setActiveTab("all");
                    }}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: BRAND_COLORS.primary.main,
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              paginatedNotes.map((note, index) => (
                <motion.div
                  key={note._id}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={fadeInVariants}
                >
                  <NotificationCard
                    note={note}
                    isOwner={note.isOwner}
                    onEdit={
                      config.editRoute
                        ? (id) => navigate(`${config.editRoute}${id}`)
                        : null
                    }
                    onDelete={config.deleteEndpoint ? handleDeleteClick : null}
                    deletingId={deletingId}
                    showViewButton={true}
                  />
                </motion.div>
              ))
            )}
          </div>

          {/* ================= PAGINATION ================= */}
          {totalPages > 1 && (
            <div
              className="pagination-wrapper"
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "2rem",
              }}
            >
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        {/* ================= CONFIRM MODAL ================= */}
        {config.deleteEndpoint && (
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            onClose={handleDeleteCancel}
            onConfirm={handleDeleteConfirm}
            title="Delete Notification"
            message={`Are you sure you want to delete "${confirmModal.noteTitle}"? This action cannot be undone.`}
            type="danger"
            confirmText="Delete"
            cancelText="Cancel"
            isLoading={!!deletingId}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= STAT ITEM COMPONENT ================= */
function StatItem({ icon, label, value, unread = 0, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          backgroundColor: `${color}15`,
          color: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.25rem",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>
          {label}
        </div>
        <div
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#1e293b",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          {value}
          {unread > 0 && (
            <span
              style={{
                backgroundColor: BRAND_COLORS.danger.main,
                color: "white",
                padding: "0.125rem 0.5rem",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {unread} new
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
