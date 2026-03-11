import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import api from "../../../../api/axios";
import Loading from "../../../../components/Loading";
import ConfirmModal from "../../../../components/ConfirmModal";
import Pagination from "../../../../components/Pagination";
import Breadcrumb from "../../../../components/Breadcrumb";
import {
  FaBell,
  FaTrash,
  FaEdit,
  FaUserTie,
  FaUserGraduate,
  FaClock,
  FaSearch,
  FaFilter,
  FaSyncAlt,
  FaExclamationTriangle,
  FaArrowLeft,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

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

export default function NotificationList() {
  const [myNotes, setMyNotes] = useState([]);
  const [staffNotes, setStaffNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [deletingId, setDeletingId] = useState(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'my', 'staff'

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    noteId: null,
    noteTitle: "",
  });

  const navigate = useNavigate();

  /* ================= FETCH NOTIFICATIONS ================= */
  const fetchNotes = useCallback(async (showRefreshToast = false) => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/notifications/admin/read");
      
      // Mark myNotifications with isOwner = true
      const myNotesData = (res.data.myNotifications || res.data || []).map(note => ({
        ...note,
        isOwner: true,
      }));
      
      // Mark staffNotifications with isOwner = false
      const staffNotesData = (res.data.staffNotifications || []).map(note => ({
        ...note,
        isOwner: false,
      }));
      
      setMyNotes(myNotesData);
      setStaffNotes(staffNotesData);

      if (showRefreshToast) {
        toast.success("Notifications refreshed!", {
          ...CONFIG.TOAST,
          toastId: "notifications-refresh-success",
        });
      }
      setRetryCount(0);
    } catch (err) {
      console.error("Fetch notifications error:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to load notifications";
      setError(errorMsg);
      toast.error("Failed to load notifications", {
        ...CONFIG.TOAST,
        toastId: "notifications-fetch-error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

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
        prev.filter((note) => note._id !== confirmModal.noteId)
      );
      setStaffNotes((prev) =>
        prev.filter((note) => note._id !== confirmModal.noteId)
      );

      toast.success("Notification deleted successfully!", {
        ...CONFIG.TOAST,
        toastId: "notification-delete-success",
      });
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete notification", {
        ...CONFIG.TOAST,
        toastId: "notification-delete-error",
      });
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
        if (activeTab === "staff" && note.isOwner) return false;

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
    [activeTab, searchQuery, typeFilter]
  );

  const filteredMyNotes = useMemo(
    () => filterNotifications(myNotes),
    [myNotes, filterNotifications]
  );

  const filteredStaffNotes = useMemo(
    () => filterNotifications(staffNotes),
    [staffNotes, filterNotifications]
  );

  /* ================= PAGINATION ================= */
  const getUniqueNotes = useMemo(() => {
    // Combine and deduplicate notes for pagination
    const allNotes = [...filteredMyNotes, ...filteredStaffNotes];
    const uniqueIds = new Set();
    return allNotes.filter((note) => {
      if (uniqueIds.has(note._id)) return false;
      uniqueIds.add(note._id);
      return true;
    });
  }, [filteredMyNotes, filteredStaffNotes]);

  const paginatedNotes = useMemo(() => {
    const startIndex = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
    const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
    return getUniqueNotes.slice(startIndex, endIndex);
  }, [getUniqueNotes, currentPage]);

  const totalPages = Math.ceil(
    getUniqueNotes.length / CONFIG.ITEMS_PER_PAGE
  );

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, activeTab]);

  /* ================= GET UNIQUE TYPES FOR FILTER ================= */
  const notificationTypes = useMemo(() => {
    const allNotes = [...myNotes, ...staffNotes];
    const types = new Set(allNotes.map((note) => note.type).filter(Boolean));
    return Array.from(types);
  }, [myNotes, staffNotes]);

  /* ================= LOADING STATE ================= */
  if (loading && retryCount === 0) {
    return (
      <Loading
        size="lg"
        color="primary"
        text="Loading notifications..."
        fullScreen={true}
      />
    );
  }

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <div className="erp-error-container">
        <div className="erp-error-icon">
          <FaExclamationTriangle className="shake" />
        </div>
        <h3>Notifications Loading Error</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button
            className="erp-btn erp-btn-secondary"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft className="erp-btn-icon" />
            Go Back
          </button>
          <button
            className="erp-btn erp-btn-primary"
            onClick={() => {
              setRetryCount((prev) => prev + 1);
              fetchNotes();
            }}
            disabled={retryCount >= 3}
          >
            <FaSyncAlt className="erp-btn-icon spin" />
            {retryCount >= 3 ? "Max Retries" : `Retry (${retryCount}/3)`}
          </button>
        </div>
      </div>
    );
  }

  /* ================= MAIN RENDER ================= */
  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Notifications" },
        ]}
      />

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="header-icon-wrapper">
            <FaBell />
          </div>
          <div className="header-text">
            <h1 className="dashboard-title">Notifications Center</h1>
            <p className="dashboard-subtitle">
              Manage and view all announcements
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn-refresh"
            onClick={() => fetchNotes(true)}
            disabled={loading}
            title="Refresh notifications"
            aria-label="Refresh notifications"
          >
            <FaSyncAlt className={`spin-icon ${loading ? "spinning" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="filter-bar mb-4">
        <div className="filter-group">
          <FaSearch className="filter-icon" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            aria-label="Search notifications"
          />
        </div>

        <div className="filter-group">
          <FaFilter className="filter-icon" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="filter-select"
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
        <div className="tab-group">
          <button
            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All
          </button>
          <button
            className={`tab-btn ${activeTab === "my" ? "active" : ""}`}
            onClick={() => setActiveTab("my")}
          >
            <FaUserTie className="me-1" /> My Notifications
          </button>
          <button
            className={`tab-btn ${activeTab === "staff" ? "active" : ""}`}
            onClick={() => setActiveTab("staff")}
          >
            <FaUserGraduate className="me-1" /> Staff Notifications
          </button>
        </div>
      </div>

      {/* NOTIFICATIONS GRID */}
      <div className="notifications-grid">
        {paginatedNotes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FaBell />
            </div>
            <h4>No Notifications Found</h4>
            <p>
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
              onEdit={(id) => navigate(`/notification/edit/${id}`)}
              onDelete={(id, title) => handleDeleteClick(id, title)}
              deletingId={deletingId}
            />
          ))
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="pagination-wrapper">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* CONFIRM MODAL */}
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

      {/* STYLES */}
      <style>{`
        .erp-container {
          padding: 1.5rem;
          background: #f5f7fa;
          min-height: 100vh;
        }

        .erp-page-header {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a4b6d 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 32px rgba(15, 58, 74, 0.3);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .erp-header-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .header-icon-wrapper {
          width: 56px;
          height: 56px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
        }

        .dashboard-title {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
        }

        .dashboard-subtitle {
          margin: 0.375rem 0 0 0;
          opacity: 0.9;
          font-size: 1rem;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .btn-refresh {
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.15);
          color: white;
          transition: all 0.3s ease;
          font-size: 0.95rem;
        }

        .btn-refresh:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .btn-refresh:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spin-icon {
          transition: transform 0.3s ease;
        }

        .spin-icon.spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* FILTER BAR */
        .filter-bar {
          background: white;
          padding: 1.25rem;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: center;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
          min-width: 200px;
        }

        .filter-icon {
          color: #64748b;
          font-size: 1rem;
        }

        .search-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #0f3a4a;
          box-shadow: 0 0 0 3px rgba(15, 58, 74, 0.1);
        }

        .filter-select {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.95rem;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .filter-select:focus {
          outline: none;
          border-color: #0f3a4a;
        }

        .tab-group {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .tab-btn {
          padding: 0.625rem 1.25rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          color: #64748b;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .tab-btn:hover {
          border-color: #0f3a4a;
          color: #0f3a4a;
        }

        .tab-btn.active {
          background: #0f3a4a;
          border-color: #0f3a4a;
          color: white;
        }

        /* NOTIFICATIONS GRID */
        .notifications-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        /* EMPTY STATE */
        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          color: #94a3b8;
        }

        .empty-state h4 {
          margin: 0 0 0.5rem;
          color: #1e293b;
          font-size: 1.5rem;
        }

        .empty-state p {
          margin: 0 0 1.5rem;
          color: #64748b;
          font-size: 1rem;
        }

        .btn-clear-filters {
          padding: 0.75rem 1.5rem;
          background: #0f3a4a;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-clear-filters:hover {
          background: #1a4b6d;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 58, 74, 0.3);
        }

        /* PAGINATION */
        .pagination-wrapper {
          display: flex;
          justify-content: center;
          margin-top: 2rem;
        }

        /* ERROR CONTAINER */
        .erp-error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem;
          text-align: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }

        .erp-error-icon {
          width: 80px;
          height: 80px;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          color: #dc3545;
        }

        .erp-error-icon svg {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }

        .erp-error-container h3 {
          margin: 0 0 0.5rem;
          color: #1e293b;
          font-size: 1.5rem;
        }

        .erp-error-container p {
          margin: 0 0 1.5rem;
          color: #64748b;
          font-size: 1rem;
          max-width: 400px;
        }

        .error-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .erp-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }

        .erp-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .erp-btn-secondary {
          background: #f1f5f9;
          color: #475569;
        }

        .erp-btn-secondary:hover:not(:disabled) {
          background: #e2e8f0;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
        }

        .erp-btn-primary {
          background: #0f3a4a;
          color: white;
        }

        .erp-btn-primary:hover:not(:disabled) {
          background: #1a4b6d;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 58, 74, 0.3);
        }

        .erp-btn-icon {
          font-size: 1rem;
        }

        .erp-btn-icon.spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

/* ================= NOTIFICATION CARD COMPONENT ================= */
function NotificationCard({ note, isOwner, onEdit, onDelete, deletingId }) {
  const isDeleting = deletingId === note._id;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", CONFIG.DATE_OPTIONS);
  };

  const getTypeBadgeClass = (type) => {
    const classes = {
      INFO: "bg-info",
      WARNING: "bg-warning",
      URGENT: "bg-danger",
      SUCCESS: "bg-success",
      GENERAL: "bg-primary",
    };
    return classes[type] || "bg-secondary";
  };

  return (
    <div className="notification-card">
      <div className="card-header-custom">
        <span
          className={`notification-badge ${getTypeBadgeClass(note.type)}`}
        >
          {note.type || "GENERAL"}
        </span>
        {isOwner && (
          <div className="card-actions">
            <button
              className="action-btn edit"
              onClick={() => onEdit(note._id)}
              disabled={isDeleting}
              aria-label={`Edit notification: ${note.title}`}
              title="Edit"
            >
              <FaEdit />
            </button>
            <button
              className="action-btn delete"
              onClick={() => onDelete(note._id, note.title)}
              disabled={isDeleting}
              aria-label={`Delete notification: ${note.title}`}
              title="Delete"
            >
              {isDeleting ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <FaTrash />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="card-body-custom">
        <h6 className="notification-title">{note.title}</h6>
        <p className="notification-message">{note.message}</p>

        <div className="notification-footer">
          <div className="notification-date">
            <FaClock className="date-icon" />
            <span>{formatDate(note.createdAt)}</span>
          </div>
          {note.expiresAt && (
            <div className="notification-expires">
              <span>Expires: {new Date(note.expiresAt).toLocaleDateString("en-US", CONFIG.DATE_OPTIONS)}</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .notification-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .notification-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .card-header-custom {
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
        }

        .notification-badge {
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.875rem;
        }

        .action-btn.edit {
          background: #e0f2fe;
          color: #0284c7;
        }

        .action-btn.edit:hover:not(:disabled) {
          background: #0284c7;
          color: white;
          transform: scale(1.1);
        }

        .action-btn.delete {
          background: #fee2e2;
          color: #dc3545;
        }

        .action-btn.delete:hover:not(:disabled) {
          background: #dc3545;
          color: white;
          transform: scale(1.1);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .card-body-custom {
          padding: 1.25rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .notification-title {
          margin: 0 0 0.75rem;
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.4;
        }

        .notification-message {
          margin: 0 0 1rem;
          color: #64748b;
          font-size: 0.95rem;
          line-height: 1.6;
          flex: 1;
        }

        .notification-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.75rem;
          border-top: 1px solid #f1f5f9;
          font-size: 0.85rem;
        }

        .notification-date {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          color: #94a3b8;
        }

        .date-icon {
          font-size: 0.75rem;
        }

        .notification-expires {
          color: #dc3545;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
