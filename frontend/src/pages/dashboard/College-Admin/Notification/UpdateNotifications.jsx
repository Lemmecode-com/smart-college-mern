import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../../api/axios";
import Loading from "../../../../components/Loading";
import Breadcrumb from "../../../../components/Breadcrumb";
import ConfirmModal from "../../../../components/ConfirmModal";
import {
  FaBell,
  FaCalendarAlt,
  FaSave,
  FaArrowLeft,
  FaExclamationTriangle,
  FaSyncAlt,
  FaInfoCircle,
} from "react-icons/fa";

/* ================= CONFIGURATION ================= */
const CONFIG = {
  TOAST: {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "colored",
  },
  THEME: {
    PRIMARY: "#0f3a4a",
    PRIMARY_DARK: "#0c2d3a",
    PRIMARY_LIGHT: "#1a4b6d",
    ACCENT: "#3db5e6",
    SUCCESS: "#28a745",
    WARNING: "#ffc107",
    DANGER: "#dc3545",
    INFO: "#17a2b8",
  },
};

export default function UpdateNotifications() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "GENERAL",
    priority: "LOW",
    expiresAt: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // Confirm modal for navigation
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    action: null,
  });

  /* ================= LOAD EXISTING ================= */
  const loadNote = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/notifications/admin/read`);

      // Check in myNotifications first (user owns these - can edit)
      const myNotes = res.data.myNotifications || [];
      let note = myNotes.find((n) => n._id === id);
      let isOwner = false;

      // If not found in myNotifications, check staffNotifications (cannot edit)
      if (!note) {
        const staffNotes = res.data.staffNotifications || [];
        note = staffNotes.find((n) => n._id === id);
        isOwner = false; // Staff notifications cannot be edited
      } else {
        isOwner = true; // Found in myNotifications - user owns this
      }

      if (!note) {
        setError("Notification not found");
        toast.error("Notification not found", CONFIG.TOAST);
        return;
      }

      // Check if user has permission to edit
      if (!isOwner) {
        setError("You don't have permission to edit this notification");
        toast.error("Permission denied", CONFIG.TOAST);
        return;
      }

      setForm({
        title: note.title,
        message: note.message,
        type: note.type,
        priority: note.priority || "LOW",
        expiresAt: note.expiresAt ? note.expiresAt.slice(0, 16) : "",
      });
      setRetryCount(0);
    } catch (err) {
      console.error("Load notification error:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to load notification";
      setError(errorMsg);
      toast.error("Failed to load notification", CONFIG.TOAST);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= UPDATE ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        title: form.title,
        message: form.message,
        type: form.type,
        priority: form.priority,
        expiresAt: form.expiresAt || null,
      };

      await api.put(`/notifications/edit-note/${id}`, payload);

      toast.success("Notification updated successfully!", {
        ...CONFIG.TOAST,
        toastId: "notification-update-success",
      });

      setTimeout(() => navigate("/notification/list"), 1500);
    } catch (err) {
      console.error("Update error:", err);
      const errorMsg =
        err.response?.data?.message || err.message || "Update failed";
      setError(errorMsg);
      toast.error(errorMsg, CONFIG.TOAST);
    } finally {
      setSaving(false);
    }
  };

  /* ================= NAVIGATION HANDLER ================= */
  const handleBackClick = () => {
    // Check if form has unsaved changes
    const hasChanges =
      form.title !== "" || form.message !== "" || form.expiresAt !== "";

    if (hasChanges) {
      setConfirmModal({
        isOpen: true,
        action: "back",
      });
    } else {
      navigate("/notification/list");
    }
  };

  const handleConfirmNavigation = () => {
    setConfirmModal({ isOpen: false, action: null });
    if (confirmModal.action === "back") {
      navigate("/notification/list");
    }
  };

  const handleCancelNavigation = () => {
    setConfirmModal({ isOpen: false, action: null });
  };

  /* ================= LOADING STATE ================= */
  if (loading && retryCount === 0) {
    return (
      <Loading
        size="lg"
        color="primary"
        text="Loading notification..."
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
        <h3>Notification Error</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button
            className="erp-btn erp-btn-secondary"
            onClick={() => navigate("/notification/list")}
          >
            <FaArrowLeft className="erp-btn-icon" />
            Back to Notifications
          </button>
          <button
            className="erp-btn erp-btn-primary"
            onClick={() => {
              setRetryCount((prev) => prev + 1);
              loadNote();
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

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Notifications", path: "/notification/list" },
          { label: "Update Notification" },
        ]}
      />

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="header-icon-wrapper">
            <FaBell />
          </div>
          <div className="header-text">
            <h1 className="dashboard-title">Update Notification</h1>
            <p className="dashboard-subtitle">
              Modify your announcement details
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-header" onClick={handleBackClick}>
            <FaArrowLeft /> <span>Back</span>
          </button>
        </div>
      </div>

      {/* FORM CARD */}
      <div className="row justify-content-center">
        <div className="col-lg-8 col-md-10">
          <div className="erp-card">
            <div className="erp-card-header">
              <h3>
                <FaBell className="erp-card-icon" />
                Edit Notification
              </h3>
            </div>

            <div className="erp-card-body">
              <form onSubmit={handleSubmit}>
                {/* TITLE */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <FaBell
                      className="me-1"
                      style={{ color: CONFIG.THEME.PRIMARY }}
                    />
                    Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    className="form-control form-control-lg border-2 py-2"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Enter notification title"
                    required
                  />
                  <div className="form-text">
                    <FaInfoCircle className="me-1" size={12} />
                    Keep it concise and descriptive (max 100 characters)
                  </div>
                </div>

                {/* MESSAGE */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <FaBell
                      className="me-1"
                      style={{ color: CONFIG.THEME.INFO }}
                    />
                    Message <span className="text-danger">*</span>
                  </label>
                  <textarea
                    name="message"
                    className="form-control form-control-lg border-2"
                    rows="6"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Enter detailed notification message"
                    required
                  />
                  <div className="form-text">
                    <FaInfoCircle className="me-1" size={12} />
                    Include all relevant details, dates, and action items
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  {/* TYPE */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <FaBell
                        className="me-1"
                        style={{ color: CONFIG.THEME.PRIMARY }}
                      />
                      Type
                    </label>
                    <select
                      className="form-select form-select-lg border-2 py-2"
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                    >
                      <option value="GENERAL">General Announcement</option>
                      <option value="ACADEMIC">Academic Update</option>
                      <option value="EXAM">Exam Schedule</option>
                      <option value="FEE">Fee Related</option>
                      <option value="ATTENDANCE">Attendance Alert</option>
                      <option value="EVENT">College Event</option>
                      <option value="ASSIGNMENT">Assignment Due</option>
                      <option value="URGENT">Urgent Notice</option>
                    </select>
                    <div className="form-text">
                      Determines icon and category in recipient's inbox
                    </div>
                  </div>

                  {/* PRIORITY */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <FaExclamationTriangle
                        className="me-1"
                        style={{ color: CONFIG.THEME.WARNING }}
                      />
                      Priority
                    </label>
                    <select
                      className="form-select form-select-lg border-2 py-2"
                      name="priority"
                      value={form.priority}
                      onChange={handleChange}
                    >
                      <option value="LOW">Low Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="HIGH">High Priority - Urgent</option>
                    </select>
                    <div className="form-text">
                      Affects visual urgency and sorting
                    </div>
                  </div>
                </div>

                {/* EXPIRY */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <FaCalendarAlt
                      className="me-1"
                      style={{ color: CONFIG.THEME.PRIMARY_LIGHT }}
                    />
                    Expiry Date
                  </label>
                  <input
                    type="datetime-local"
                    name="expiresAt"
                    className="form-control form-control-lg border-2 py-2"
                    value={form.expiresAt}
                    onChange={handleChange}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <div className="form-text">
                    <FaInfoCircle className="me-1" size={12} />
                    Notification will auto-archive after this date. Leave blank
                    for no expiry.
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="d-grid gap-2 d-md-flex justify-content-md-end gap-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-4 py-2"
                    onClick={handleBackClick}
                  >
                    <FaArrowLeft className="me-1" /> Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary px-4 py-2"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <FaSpinner className="spin-icon me-1" /> Updating...
                      </>
                    ) : (
                      <>
                        <FaSave className="me-1" /> Update Notification
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* INFO BOX */}
          <div className="info-box mt-4">
            <div className="info-box-icon">
              <FaInfoCircle />
            </div>
            <div className="info-box-content">
              <h6 className="fw-bold mb-1">Editing Information</h6>
              <ul className="mb-0 small ps-3">
                <li>Changes are saved immediately upon clicking "Update"</li>
                <li>
                  Updated notifications retain their original creation date
                </li>
                <li>All recipients will see the updated content</li>
                <li>
                  Use expiry date to auto-archive time-sensitive notifications
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleCancelNavigation}
        onConfirm={handleConfirmNavigation}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to discard them and navigate away?"
        type="warning"
        confirmText="Discard Changes"
        cancelText="Stay Here"
        isLoading={false}
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
          flex-wrap: wrap;
          gap: 1rem;
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
          gap: 0.75rem;
        }

        .btn-header {
          padding: 0.625rem 1rem;
          border-radius: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.15);
          color: white;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .btn-header:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .erp-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .erp-card-header {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #0f3a4a 0%, #1a4b6d 100%);
          color: white;
          border-bottom: none;
        }

        .erp-card-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .erp-card-body {
          padding: 1.5rem;
        }

        .info-box {
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          border-left: 4px solid #0284c7;
        }

        .info-box-icon {
          width: 40px;
          height: 40px;
          background: rgba(2, 132, 199, 0.15);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0284c7;
          flex-shrink: 0;
          font-size: 1.25rem;
        }

        .info-box-content {
          flex: 1;
        }

        .form-control:focus,
        .form-select:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.15);
        }

        .form-label {
          color: #1e293b;
        }

        .form-text {
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 0.375rem;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
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

        @media (max-width: 768px) {
          .erp-container {
            padding: 1rem;
          }

          .erp-page-header {
            padding: 1.25rem;
          }

          .dashboard-title {
            font-size: 1.5rem;
          }

          .header-icon-wrapper {
            width: 48px;
            height: 48px;
            font-size: 1.5rem;
          }

          .erp-card-header,
          .erp-card-body {
            padding: 1rem;
          }

          .info-box {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .info-box-content {
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}
