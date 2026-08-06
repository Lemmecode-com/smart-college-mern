import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import api from "../api/axios";
import Loading from "../components/Loading";
import ApiError from "../components/ApiError";
import ConfirmModal from "../components/ConfirmModal";
import Pagination from "../components/Pagination";
import Breadcrumb from "../components/Breadcrumb";
import PageHero from "../components/common/PageHero";
import NotificationCard from "../components/NotificationCard";
import {
  FaBell,
  FaUserTie,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaClock,
  FaTrash,
  FaEdit,
  FaExclamationTriangle,
  FaArrowLeft,
  FaInfoCircle,
  FaSearch,
  FaEye,
  FaStar,
  FaBullhorn,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

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
    secondaryNotesKey: "hodNotifications",
    tertiaryNotesKey: "adminNotifications",
    primaryLabel: "My Notifications",
    secondaryLabel: "From HOD",
    tertiaryLabel: "From College Admin",
    primaryIcon: FaChalkboardTeacher,
    secondaryIcon: FaUserTie,
    tertiaryIcon: FaBullhorn,
    createRoute: "/teacher/notifications/create",
    editRoute: "/teacher/notifications/edit/",
    viewRoute: "/teacher/notifications/view/",
    dashboardRoute: "/teacher/dashboard",
    canCreate: true,
    showStats: true,
  },
  hod: {
    apiEndpoint: "/notifications/hod/read",
    deleteEndpoint: "/notifications/delete-note/",
    primaryNotesKey: "myNotifications",
    secondaryNotesKey: "teacherNotifications",
    tertiaryNotesKey: "adminNotifications",
    primaryLabel: "My HOD Notifications",
    secondaryLabel: "From Teachers",
    tertiaryLabel: "From College Admin",
    primaryIcon: FaChalkboardTeacher,
    secondaryIcon: FaUserTie,
    tertiaryIcon: FaBullhorn,
    createRoute: null,
    editRoute: null,
    viewRoute: "/notification/view/",
    dashboardRoute: "/hod/dashboard",
    canCreate: false,
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
  parent: {
    apiEndpoint: "/notifications/parent/read",
    deleteEndpoint: null,
    primaryNotesKey: "adminNotifications",
    secondaryNotesKey: "teacherNotifications",
    tertiaryNotesKey: "hodNotifications",
    primaryLabel: "From College Admin",
    secondaryLabel: "From Teachers",
    tertiaryLabel: "From HOD",
    primaryIcon: FaUserTie,
    secondaryIcon: FaChalkboardTeacher,
    tertiaryIcon: FaUserGraduate,
    createRoute: null,
    editRoute: null,
    viewRoute: "/notification/view/",
    dashboardRoute: "/dashboard/parent",
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
  const [tertiaryNotes, setTertiaryNotes] = useState([]);
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
          noteCategory: "primary",
        }));

        const secondaryData = (res.data[config.secondaryNotesKey] || []).map(
          (note) => ({
            ...note,
            isOwner: false,
            noteCategory: "secondary",
          }),
        );

        const tertiaryData = (res.data[config.tertiaryNotesKey] || []).map(
          (note) => ({
            ...note,
            isOwner: false,
            noteCategory: "tertiary",
          }),
        );

        setPrimaryNotes(primaryData);
        setSecondaryNotes(secondaryData);
        setTertiaryNotes(tertiaryData);

        if (showRefreshToast) {
          toast.success("Notifications refreshed!", CONFIG.TOAST);
        }
        setRetryCount(0);
      } catch (err) {
        const statusCode = err.response?.status;
        const errorCode = err.response?.data?.code;
        const errorMsg = err.response?.data?.message || "Failed to load notifications";
        const isAuthError =
          statusCode === 401 ||
          (errorCode && AUTH_ERROR_CODES.has(errorCode));
        setError({ message: errorMsg, statusCode, errorCode });
        if (!isAuthError) {
          toast.error("Failed to load notifications", CONFIG.TOAST);
        }
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
      setTertiaryNotes((prev) =>
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
        if (activeTab === "primary" && note.noteCategory !== "primary") return false;
        if (activeTab === "secondary" && note.noteCategory !== "secondary") return false;
        if (activeTab === "tertiary" && note.noteCategory !== "tertiary") return false;

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

  const filteredTertiaryNotes = useMemo(
    () => filterNotifications(tertiaryNotes),
    [tertiaryNotes, filterNotifications],
  );

  /* ================= PAGINATION ================= */
  const getUniqueNotes = useMemo(() => {
    const allNotes = [...filteredPrimaryNotes, ...filteredSecondaryNotes, ...filteredTertiaryNotes];
    const uniqueIds = new Set();
    return allNotes.filter((note) => {
      if (uniqueIds.has(note._id)) return false;
      uniqueIds.add(note._id);
      return true;
    });
  }, [filteredPrimaryNotes, filteredSecondaryNotes, filteredTertiaryNotes]);

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

  /* ================= CALCULATE STATS ================= */
  const stats = useMemo(() => {
    const allNotes = [...primaryNotes, ...secondaryNotes, ...tertiaryNotes];
    return {
      totalPrimary: primaryNotes.length,
      totalSecondary: secondaryNotes.length,
      totalTertiary: tertiaryNotes.length,
      unreadPrimary: primaryNotes.filter((n) => !n.isRead).length,
      unreadSecondary: secondaryNotes.filter((n) => !n.isRead).length,
      unreadTertiary: tertiaryNotes.filter((n) => !n.isRead).length,
      urgent: allNotes.filter((n) => n.priority === "URGENT").length,
      total: allNotes.length,
    };
  }, [primaryNotes, secondaryNotes, tertiaryNotes]);

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
          errorCode={error.errorCode}
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
  const TertiaryIcon = config.tertiaryIcon;

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

          {/* ================= PAGE HERO ================= */}
          <PageHero
            icon={<FaBell />}
            title="Notifications Center"
            description={
              role === "student"
                ? "Important updates from college & teachers"
                : role === "teacher"
                  ? "Your announcements and college updates"
                  : "Manage and view all announcements"
            }
            onBack={handleGoBack}
            backLabel="Back"
            primaryAction={
              config.canCreate ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(config.createRoute)}
                  className="erp-page-hero__primary-btn"
                  type="button"
                >
                  <FaBell /> Create New
                </motion.button>
              ) : null
            }
          />

          {/* ================= STATS BAR ================= */}
          {config.showStats && (
            <div
              className="erp-stats-bar"
              style={{
                padding: "1rem 2rem",
                backgroundColor: "#f8fafc",
                borderRadius: "1.5rem",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1.5rem",
                boxShadow: "0 10px 40px rgba(26, 75, 109, 0.15)",
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
                {config.tertiaryLabel && (
                  <StatItem
                    icon={<TertiaryIcon />}
                    label={config.tertiaryLabel}
                    value={stats.totalTertiary}
                    unread={stats.unreadTertiary}
                    color={BRAND_COLORS.warning.main}
                  />
                )}
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

          {/* ================= SEARCH & FILTER BAR ================= */}
          <div
            className="filter-bar mb-4"
            style={{
              backgroundColor: "white",
              padding: "1.25rem",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginBottom: "1.5rem",
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              overflow: "visible",
            }}
          >
            {/* Search Input with Icon Inside */}
            <div
              className="search-wrapper"
              style={{
                width: "100%",
                position: "relative",
                overflow: "visible",
              }}
            >
              <FaSearch
                className="filter-icon search-icon"
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                  zIndex: 2,
                  pointerEvents: "none",
                  fontSize: "0.95rem",
                }}
              />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem 0.75rem 2.75rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  transition: "all 0.3s ease",
                  boxSizing: "border-box",
                  display: "block",
                }}
                aria-label="Search notifications"
              />
            </div>

            {/* TABS */}
            <div
              className="tab-group"
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              <button
                className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
                style={{
                  flex: "1 1 auto",
                  minWidth: "80px",
                  padding: "0.625rem 1rem",
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
                  justifyContent: "center",
                  gap: "0.375rem",
                }}
              >
                All
              </button>
              <button
                className={`tab-btn ${activeTab === "primary" ? "active" : ""}`}
                onClick={() => setActiveTab("primary")}
                style={{
                  flex: "1 1 auto",
                  minWidth: "120px",
                  padding: "0.625rem 1rem",
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
                  justifyContent: "center",
                  gap: "0.375rem",
                }}
              >
                <PrimaryIcon className="me-1" /> {config.primaryLabel}
              </button>
              <button
                className={`tab-btn ${activeTab === "secondary" ? "active" : ""}`}
                onClick={() => setActiveTab("secondary")}
                style={{
                  flex: "1 1 auto",
                  minWidth: "120px",
                  padding: "0.625rem 1rem",
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
                  justifyContent: "center",
                  gap: "0.375rem",
                }}
              >
                <SecondaryIcon className="me-1" /> {config.secondaryLabel}
              </button>
              {config.tertiaryLabel && (
                <button
                  className={`tab-btn ${activeTab === "tertiary" ? "active" : ""}`}
                  onClick={() => setActiveTab("tertiary")}
                  style={{
                    flex: "1 1 auto",
                    minWidth: "120px",
                    padding: "0.625rem 1rem",
                    border: "2px solid #e2e8f0",
                    borderRadius: "10px",
                    backgroundColor:
                      activeTab === "tertiary"
                        ? BRAND_COLORS.primary.main
                        : "white",
                    color: activeTab === "tertiary" ? "white" : "#64748b",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.375rem",
                  }}
                >
                  <TertiaryIcon className="me-1" /> {config.tertiaryLabel}
                </button>
              )}
            </div>
          </div>

          {/* ================= NOTIFICATIONS LIST ================= */}
          <div
            className="notifications-list"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            {paginatedNotes.length === 0 ? (
              <div
                className="empty-state"
                style={{
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

        {/* ================= RESPONSIVE STYLES ================= */}
        <style>{`
          /* Notification page specific mobile styles */
          @media (max-width: 767.98px) {
            .search-icon,
            .filter-select-icon {
              position: relative !important;
              left: auto !important;
              top: auto !important;
              transform: none !important;
              flex-shrink: 0 !important;
              margin-left: 1rem !important;
              margin-right: 0.5rem !important;
              z-index: 2 !important;
            }

            .tab-group {
              flex-direction: column !important;
              width: 100% !important;
            }

            .tab-btn {
              width: 100% !important;
              justify-content: center !important;
            }

            /* Stack notification row content on small screens */
            .notification-row {
              flex-wrap: wrap !important;
            }

            .notification-row > div:last-child {
              width: 100% !important;
              justify-content: flex-start !important;
              flex-wrap: wrap !important;
              margin-left: 3.25rem !important;
              margin-top: 0.25rem !important;
            }
          }

          /* Small mobile: Further reduce sizes */
          @media (max-width: 479.98px) {
            .search-icon,
            .filter-select-icon {
              margin-left: 0.75rem !important;
              font-size: 0.85rem !important;
            }

            .tab-btn {
              font-size: 0.85rem !important;
              padding: 0.5rem 0.75rem !important;
            }
          }
        `}</style>
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