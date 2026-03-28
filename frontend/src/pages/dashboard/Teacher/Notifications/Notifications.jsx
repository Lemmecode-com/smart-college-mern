import React, { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import api from "../../../../api/axios";
import Loading from "../../../../components/Loading";
import ApiError from "../../../../components/ApiError";
import ConfirmModal from "../../../../components/ConfirmModal";
import Pagination from "../../../../components/Pagination";
import Breadcrumb from "../../../../components/Breadcrumb";
import {
  FaBell,
  FaUserTie,
  FaChalkboardTeacher,
  FaClock,
  FaTrash,
  FaEdit,
  FaSyncAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaInfoCircle,
  FaExclamationTriangle,
  FaGraduationCap,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaUserCheck,
  FaBullhorn,
  FaClipboardList,
  FaStar,
  FaEye,
  FaSearch,
  FaFilter,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/* ================= CONFIGURATION ================= */
const CONFIG = {
  ITEMS_PER_PAGE: 9,
  AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
  DATE_OPTIONS: {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
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

// Brand Color Palette
const BRAND_COLORS = {
  primary: {
    main: "#1a4b6d",
    gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
  },
  success: {
    main: "#28a745",
    gradient: "linear-gradient(135deg, #28a745 0%, #218838 100%)",
  },
  info: {
    main: "#17a2b8",
    gradient: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)",
  },
  warning: {
    main: "#ffc107",
    gradient: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)",
  },
  danger: {
    main: "#dc3545",
    gradient: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
  },
  secondary: {
    main: "#6c757d",
    gradient: "linear-gradient(135deg, #6c757d 0%, #545b62 100%)",
  },
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

// Animation Variants
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

const spinVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" },
  },
};

export default function Notifications() {
  const [myNotes, setMyNotes] = useState([]);
  const [adminNotes, setAdminNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'my', 'admin'

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    noteId: null,
    noteTitle: "",
  });

  /* ================= FETCH NOTIFICATIONS ================= */
  const fetchNotes = useCallback(async (showRefreshToast = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/notifications/teacher/read");

      // Mark myNotifications with isOwner = true
      const myNotesData = (res.data.myNotifications || res.data || []).map(
        (note) => ({
          ...note,
          isOwner: true,
        }),
      );

      // Mark adminNotifications with isOwner = false
      const adminNotesData = (res.data.adminNotifications || []).map(
        (note) => ({
          ...note,
          isOwner: false,
        }),
      );

      setMyNotes(myNotesData);
      setAdminNotes(adminNotesData);

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
  }, []);

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
    setConfirmModal({
      isOpen: true,
      noteId: id,
      noteTitle: title,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmModal.noteId) return;

    try {
      setDeletingId(confirmModal.noteId);
      await api.delete(`/notifications/delete-note/${confirmModal.noteId}`);

      // Update state optimistically
      setMyNotes((prev) =>
        prev.filter((note) => note._id !== confirmModal.noteId),
      );
      setAdminNotes((prev) =>
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
        if (activeTab === "my" && !note.isOwner) return false;
        if (activeTab === "admin" && note.isOwner) return false;

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

  const filteredMyNotes = useMemo(
    () => filterNotifications(myNotes),
    [myNotes, filterNotifications],
  );

  const filteredAdminNotes = useMemo(
    () => filterNotifications(adminNotes),
    [adminNotes, filterNotifications],
  );

  /* ================= PAGINATION ================= */
  const getUniqueNotes = useMemo(() => {
    // Combine and deduplicate notes for pagination
    const allNotes = [...filteredMyNotes, ...filteredAdminNotes];
    const uniqueIds = new Set();
    return allNotes.filter((note) => {
      if (uniqueIds.has(note._id)) return false;
      uniqueIds.add(note._id);
      return true;
    });
  }, [filteredMyNotes, filteredAdminNotes]);

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
    const allNotes = [...myNotes, ...adminNotes];
    const types = new Set(allNotes.map((note) => note.type).filter(Boolean));
    return Array.from(types);
  }, [myNotes, adminNotes]);

  /* ================= CALCULATE STATS ================= */
  const totalMyNotes = myNotes.length;
  const totalAdminNotes = adminNotes.length;
  const unreadMyNotes = myNotes.filter((n) => !n.read).length;
  const unreadAdminNotes = adminNotes.filter((n) => !n.read).length;
  const urgentNotes = [...myNotes, ...adminNotes].filter(
    (n) => n.priority === "URGENT",
  ).length;

  /* ================= LOADING STATE ================= */
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading Notifications..." />;
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
        <div style={{ maxWidth: "100%", margin: "0 auto" }}>
          {/* ================= BREADCRUMB ================= */}
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/teacher/dashboard" },
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
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
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
                    Your announcements and college updates
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/teacher/notifications/create")}
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
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchNotes}
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

            {/* Stats Bar */}
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
                  icon={<FaChalkboardTeacher />}
                  label="My Notifications"
                  value={totalMyNotes}
                  unread={unreadMyNotes}
                  color={BRAND_COLORS.primary.main}
                />
                <StatItem
                  icon={<FaUserTie />}
                  label="Admin Notifications"
                  value={totalAdminNotes}
                  unread={unreadAdminNotes}
                  color={BRAND_COLORS.info.main}
                />
                <StatItem
                  icon={<FaExclamationTriangle />}
                  label="Urgent Alerts"
                  value={urgentNotes}
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
                Total: {totalMyNotes + totalAdminNotes} notifications
              </div>
            </div>
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
                className={`tab-btn ${activeTab === "my" ? "active" : ""}`}
                onClick={() => setActiveTab("my")}
                style={{
                  padding: "0.625rem 1.25rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  backgroundColor:
                    activeTab === "my" ? BRAND_COLORS.primary.main : "white",
                  color: activeTab === "my" ? "white" : "#64748b",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <FaChalkboardTeacher className="me-1" /> My Notifications
              </button>
              <button
                className={`tab-btn ${activeTab === "admin" ? "active" : ""}`}
                onClick={() => setActiveTab("admin")}
                style={{
                  padding: "0.625rem 1.25rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  backgroundColor:
                    activeTab === "admin" ? BRAND_COLORS.primary.main : "white",
                  color: activeTab === "admin" ? "white" : "#64748b",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <FaUserTie className="me-1" /> Admin Notifications
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
              paginatedNotes.map((note) => (
                <NotificationCard
                  key={note._id}
                  note={note}
                  isOwner={note.isOwner}
                  onEdit={(id) => navigate(`/notifications/edit/${id}`)}
                  onDelete={(id, title) => handleDeleteClick(id, title)}
                  deletingId={deletingId}
                />
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
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= STAT ITEM ================= */
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

/* ================= NOTIFICATION CARD ================= */
function NotificationCard({
  note,
  isOwner,
  onEdit,
  onDelete,
  deletingId,
  delay = 0,
}) {
  const typeConfig =
    BRAND_COLORS.notificationTypes[note.type] ||
    BRAND_COLORS.notificationTypes.GENERAL;
  const priorityConfig =
    BRAND_COLORS.priorities[note.priority] || BRAND_COLORS.priorities.NORMAL;
  const TypeIcon = typeConfig.icon;
  const PriorityIcon = priorityConfig.icon;

  const isExpired = note.expiresAt && new Date(note.expiresAt) < new Date();
  const isUrgent = note.priority === "URGENT";
  const isDeleting = deletingId === note._id;

  const formattedDate = new Date(note.createdAt).toLocaleString(
    "en-US",
    CONFIG.DATE_OPTIONS,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)" }}
      className="notification-card"
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        transition: "all 0.3s ease",
        border: isUrgent
          ? `2px solid ${BRAND_COLORS.danger.main}`
          : "1px solid #e2e8f0",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Urgent ribbon */}
      {isUrgent && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "-28px",
            backgroundColor: BRAND_COLORS.danger.main,
            color: "white",
            padding: "0.25rem 2rem",
            transform: "rotate(45deg)",
            fontWeight: 700,
            fontSize: "0.85rem",
            boxShadow: "0 3px 10px rgba(220, 53, 69, 0.4)",
            zIndex: 10,
          }}
        >
          URGENT
        </div>
      )}

      {/* Header with badges */}
      <div
        style={{
          padding: "1rem 1.25rem",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <span
            className={`notification-badge`}
            style={{
              padding: "0.375rem 0.875rem",
              borderRadius: "20px",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              backgroundColor: typeConfig.bg,
              color: typeConfig.color,
              border: `1px solid ${typeConfig.color}30`,
            }}
          >
            {note.type}
          </span>
          <span
            style={{
              padding: "0.375rem 0.875rem",
              borderRadius: "20px",
              fontSize: "0.75rem",
              fontWeight: 700,
              backgroundColor: priorityConfig.bg,
              color: priorityConfig.color,
              border: `1px solid ${priorityConfig.color}30`,
            }}
          >
            {note.priority}
          </span>
          {!note.read && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.375rem 0.875rem",
                borderRadius: "20px",
                backgroundColor: `${BRAND_COLORS.success.main}15`,
                color: BRAND_COLORS.success.main,
                fontSize: "0.75rem",
                fontWeight: 600,
                border: `1px solid ${BRAND_COLORS.success.main}30`,
              }}
            >
              <FaEye size={10} />
              Unread
            </span>
          )}
        </div>

        {isOwner && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(note._id);
              }}
              disabled={isDeleting}
              className="action-btn edit"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "white",
                color: BRAND_COLORS.primary.main,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isDeleting ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: isDeleting ? 0.6 : 1,
              }}
              title="Edit notification"
              aria-label={`Edit notification: ${note.title}`}
            >
              <FaEdit size={14} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note._id, note.title);
              }}
              disabled={isDeleting}
              className="action-btn delete"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "1px solid #fecaca",
                backgroundColor: isDeleting ? "#94a3b8" : "#fee2e2",
                color: isDeleting ? "#64748b" : BRAND_COLORS.danger.main,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isDeleting ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: isDeleting ? 0.6 : 1,
              }}
              title="Delete notification"
              aria-label={`Delete notification: ${note.title}`}
            >
              {isDeleting ? (
                <motion.span
                  variants={spinVariants}
                  animate="animate"
                  className="spinner-border spinner-border-sm"
                />
              ) : (
                <FaTrash size={14} />
              )}
            </motion.button>
          </div>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          padding: "1.25rem",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h3
          style={{
            margin: "0 0 0.75rem 0",
            fontSize: "1.15rem",
            fontWeight: 700,
            color: "#1e293b",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <TypeIcon size={18} style={{ color: typeConfig.color }} />
          {note.title}
        </h3>

        <p
          style={{
            margin: 0,
            color: "#4a5568",
            fontSize: "0.95rem",
            lineHeight: 1.6,
            marginBottom: "1rem",
            flex: 1,
          }}
        >
          {note.message}
        </p>

        {/* Meta information */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            paddingTop: "1rem",
            borderTop: "1px dashed #e2e8f0",
            fontSize: "0.85rem",
            color: "#64748b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FaClock size={14} />
            <span>{formattedDate}</span>
          </div>

          {note.expiresAt && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: isExpired ? BRAND_COLORS.danger.main : "#64748b",
                fontWeight: isExpired ? 600 : 500,
              }}
            >
              <FaCalendarAlt size={14} />
              <span>
                Expires: {new Date(note.expiresAt).toLocaleDateString()}
              </span>
              {isExpired && (
                <span
                  style={{
                    backgroundColor: `${BRAND_COLORS.danger.main}15`,
                    color: BRAND_COLORS.danger.main,
                    padding: "0.125rem 0.5rem",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    marginLeft: "0.5rem",
                  }}
                >
                  EXPIRED
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expired overlay */}
      {isExpired && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(220, 53, 69, 0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 5,
            borderRadius: "16px",
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "1rem",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            <FaTimesCircle
              size={28}
              style={{
                color: BRAND_COLORS.danger.main,
                marginBottom: "0.5rem",
              }}
            />
            <div
              style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.9rem" }}
            >
              Notification Expired
            </div>
            <div style={{ color: "#64748b", fontSize: "0.8rem" }}>
              This notification is no longer active
            </div>
          </div>
        </div>
      )}

      <style>{`
        .notification-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .notification-badge {
          background-color: #dbeafe;
          color: #3b82f6;
        }

        .action-btn.edit:hover:not(:disabled) {
          background-color: #f1f5f9;
          border-color: #0f3a4a;
        }

        .action-btn.delete:hover:not(:disabled) {
          background-color: #fecaca;
          border-color: #dc3545;
        }

        .spinner-border {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: spinner-border 0.75s linear infinite;
        }

        @keyframes spinner-border {
          to { transform: rotate(360deg); }
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}
