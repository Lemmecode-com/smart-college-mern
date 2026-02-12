import { useState, useEffect } from "react";
import api from "../../../../api/axios";
import {
  FaBell,
  FaCalendarAlt,
  FaPaperPlane,
  FaEye,
  FaUsers,
  FaGraduationCap,
  FaLayerGroup,
  FaClock,
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaSync,
  FaArrowLeft,
  FaSave,
  FaFileAlt,
  FaDownload,
  FaSpinner,
  FaChalkboardTeacher,
  FaLightbulb
} from "react-icons/fa";

export default function CreateNotification() {
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "GENERAL",
    priority: "LOW",
    expiresAt: "",
    targetAudience: "ALL", // NEW: Target audience selection
    departmentIds: [], // NEW: Department targeting
    courseIds: [], // NEW: Course targeting
    sendImmediately: true, // NEW: Scheduling option
    scheduledTime: "", // NEW: Scheduled send time
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [titleCount, setTitleCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  /* ================= CHARACTER COUNTERS ================= */
  useEffect(() => {
    setTitleCount(form.title.length);
    setMessageCount(form.message.length);
  }, [form.title, form.message]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title || !form.message) {
      setError("Title and Message are required");
      return;
    }

    // VALIDATE SCHEDULED TIME
    if (
      !form.sendImmediately &&
      form.scheduledTime &&
      new Date(form.scheduledTime) < new Date()
    ) {
      setError("Scheduled time cannot be in the past");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // MAINTAIN EXACT SAME PAYLOAD STRUCTURE AS ORIGINAL
      const payload = {
        title: form.title,
        message: form.message,
        type: form.type,
        priority: form.priority,
        expiresAt: form.expiresAt || null,
        // Note: New fields (targetAudience, etc.) are NOT sent to backend
        // They are UI-only enhancements for future backend integration
      };

      await api.post("/notifications/admin/create", payload);

      setSuccess(
        "✅ Notification created successfully! It will be delivered to all recipients immediately.",
      );

      // Reset form with slight delay for user feedback
      setTimeout(() => {
        setForm({
          title: "",
          message: "",
          type: "GENERAL",
          priority: "LOW",
          expiresAt: "",
          targetAudience: "ALL",
          departmentIds: [],
          courseIds: [],
          sendImmediately: true,
          scheduledTime: "",
        });
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error("Notification creation error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to create notification. Please check all fields and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= GET ICON & COLOR FOR TYPE ================= */
  const getTypeConfig = (type) => {
    const configs = {
      GENERAL: { icon: <FaBell />, color: "info", bg: "bg-info bg-opacity-10" },
      ACADEMIC: {
        icon: <FaGraduationCap />,
        color: "primary",
        bg: "bg-primary bg-opacity-10",
      },
      EXAM: {
        icon: <FaCalendarAlt />,
        color: "warning",
        bg: "bg-warning bg-opacity-10",
      },
      FEE: {
        icon: <FaFileAlt />,
        color: "danger",
        bg: "bg-danger bg-opacity-10",
      },
      ATTENDANCE: {
        icon: <FaUsers />,
        color: "success",
        bg: "bg-success bg-opacity-10",
      },
      EVENT: {
        icon: <FaCalendarAlt />,
        color: "secondary",
        bg: "bg-secondary bg-opacity-10",
      },
      ASSIGNMENT: {
        icon: <FaFileAlt />,
        color: "info",
        bg: "bg-info bg-opacity-10",
      },
      URGENT: {
        icon: <FaExclamationTriangle />,
        color: "danger",
        bg: "bg-danger bg-opacity-10",
      },
    };
    return configs[type] || configs.GENERAL;
  };

  /* ================= GET PRIORITY BADGE ================= */
  const getPriorityBadge = (priority) => {
    const badges = {
      LOW: { text: "Low Priority", class: "bg-success" },
      MEDIUM: { text: "Medium Priority", class: "bg-warning text-dark" },
      HIGH: { text: "High Priority", class: "bg-danger" },
    };
    return badges[priority] || badges.LOW;
  };

  return (
    <div className="container-fluid py-3 py-md-4 animate-fade-in">
      {/* ================= HELP SECTION ================= */}
      {showHelp && (
        <div className="alert alert-info border-0 bg-info bg-opacity-10 rounded-4 mb-3 mb-md-4 animate-fade-in">
          <div className="d-flex align-items-start gap-2">
            <FaInfoCircle className="mt-1 flex-shrink-0" size={20} />
            <div>
              <h6 className="fw-bold mb-1">Notification Creation Guide</h6>
              <ul className="mb-0 small ps-3">
                <li>
                  <strong>Title</strong>: Keep under 60 characters for best
                  visibility
                </li>
                <li>
                  <strong>Message</strong>: Include clear call-to-action if
                  needed
                </li>
                <li>
                  <strong>Type</strong>: Determines icon and category in
                  recipient's inbox
                </li>
                <li>
                  <strong>Priority</strong>: Affects notification color and
                  urgency indicators
                </li>
                <li>
                  <strong>Expiry Date</strong>: Notification auto-archives after
                  this date
                </li>
                <li>
                  <strong>Preview Panel</strong>: See exactly how recipients
                  will view your notification
                </li>
                <li>
                  Click <FaEye className="mx-1" /> to toggle preview panel
                </li>
              </ul>
              <button
                onClick={() => setShowHelp(false)}
                className="btn btn-sm btn-outline-info mt-2 px-3"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= HEADER ================= */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-3 mb-md-4 animate-slide-down">
        <div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
           <div className="d-flex align-items-center gap-3">
            <div className="notification-logo-container bg-gradient-primary text-white rounded-circle d-flex align-items-center justify-content-center pulse-icon">
              <FaBell size={28} />
            </div>
            <div>
              <h1 className="h4 h3-md fw-bold mb-1 text-dark">
                Create Notification
              </h1>
              <p className="text-muted mb-0 small">
                <FaPaperPlane className="me-1" />
                Send important announcements to your college community
              </p>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="btn btn-outline-info d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Notification Help"
          >
            <FaInfoCircle size={16} /> Help
          </button>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn btn-outline-primary d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title={showPreview ? "Hide Preview" : "Show Preview"}
          >
            <FaEye size={16} /> {showPreview ? "Hide Preview" : "Show Preview"}
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            onClick={() =>
              setForm({
                title: "",
                message: "",
                type: "GENERAL",
                priority: "LOW",
                expiresAt: "",
                targetAudience: "ALL",
                departmentIds: [],
                courseIds: [],
                sendImmediately: true,
                scheduledTime: "",
              })
            }
          >
            <FaSync size={16} /> Reset Form
          </button>
        </div>
      </div>

      {/* ================= ALERTS ================= */}
      {success && (
        <div
          className="alert alert-success d-flex align-items-center alert-dismissible fade show mb-3 mb-md-4 animate-slide-down"
          role="alert"
        >
          <FaCheckCircle className="me-2 flex-shrink-0" size={24} />
          <div className="flex-grow-1">{success}</div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccess("")}
          ></button>
        </div>
      )}

      {error && (
        <div
          className="alert alert-danger d-flex align-items-center alert-dismissible fade show mb-3 mb-md-4 animate-slide-down"
          role="alert"
        >
          <FaExclamationTriangle className="me-2 flex-shrink-0" size={24} />
          <div className="flex-grow-1">{error}</div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
          ></button>
        </div>
      )}

      {/* ================= MAIN CONTENT GRID ================= */}
      <div className="row g-3 g-md-4">
        {/* FORM COLUMN */}
        <div
          className={`col-lg-${showPreview ? "7" : "12"} order-2 order-lg-1`}
        >
          <div className="card border-0 shadow-lg rounded-4 overflow-hidden animate-fade-in-up">
            <div className="card-header bg-gradient-primary text-white py-3 py-md-4">
              <h2 className="h5 h6-md fw-bold mb-0 d-flex align-items-center gap-2">
                <FaBell /> Notification Details
              </h2>
            </div>

            <div className="card-body p-3 p-md-4">
              <form onSubmit={handleSubmit}>
                {/* TITLE */}
                <div className="mb-4">
                  <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                    <span>
                      <FaBell className="me-1 text-primary" />
                      Notification Title <span className="text-danger">*</span>
                    </span>
                    <small
                      className={`text-${titleCount > 80 ? "danger" : titleCount > 60 ? "warning" : "muted"}`}
                    >
                      {titleCount}/100 characters
                    </small>
                  </label>
                  <input
                    type="text"
                    name="title"
                    className="form-control form-control-lg border-2 py-2"
                    placeholder="e.g., Library Hours Extended for Exam Week"
                    value={form.title}
                    onChange={handleChange}
                    maxLength="100"
                    required
                  />
                  <div className="form-text">
                    <FaInfoCircle className="me-1" size={12} />
                    Keep it concise and action-oriented. Appears in notification
                    headers and push alerts.
                  </div>
                </div>

                {/* MESSAGE */}
                <div className="mb-4">
                  <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                    <span>
                      <FaFileAlt className="me-1 text-info" />
                      Message Content <span className="text-danger">*</span>
                    </span>
                    <small
                      className={`text-${messageCount > 800 ? "danger" : messageCount > 600 ? "warning" : "muted"}`}
                    >
                      {messageCount}/1000 characters
                    </small>
                  </label>
                  <textarea
                    name="message"
                    className="form-control form-control-lg border-2"
                    rows="6"
                    placeholder="Enter detailed notification message here. Include important dates, links, or instructions..."
                    value={form.message}
                    onChange={handleChange}
                    maxLength="1000"
                    required
                  />
                  <div className="form-text">
                    <FaInfoCircle className="me-1" size={12} />
                    Use clear paragraphs. Include deadlines, contact info, or
                    next steps. Supports line breaks.
                  </div>
                </div>

                {/* TYPE & PRIORITY ROW */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <FaLayerGroup className="me-1 text-primary" />
                      Notification Type
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
                      <FaInfoCircle className="me-1" size={12} />
                      Determines icon and category in recipient's notification
                      center
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <FaExclamationTriangle className="me-1 text-warning" />
                      Priority Level
                    </label>
                    <select
                      className="form-select form-select-lg border-2 py-2"
                      name="priority"
                      value={form.priority}
                      onChange={handleChange}
                    >
                      <option value="LOW">Low Priority (Blue)</option>
                      <option value="MEDIUM">Medium Priority (Orange)</option>
                      <option value="HIGH">High Priority (Red) - Urgent</option>
                    </select>
                    <div className="form-text">
                      <FaInfoCircle className="me-1" size={12} />
                      Affects visual urgency and sorting in notification lists
                    </div>
                  </div>
                </div>

                {/* SCHEDULING & EXPIRY */}
                <div className="card border-0 bg-light rounded-3 mb-4">
                  <div className="card-body p-3 p-md-4">
                    <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                      <FaClock className="text-secondary" /> Scheduling & Expiry
                    </h5>

                    <div className="form-check form-switch mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="sendImmediately"
                        name="sendImmediately"
                        checked={form.sendImmediately}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            sendImmediately: e.target.checked,
                          })
                        }
                      />
                      <label
                        className="form-check-label fw-medium"
                        htmlFor="sendImmediately"
                      >
                        Send Immediately
                      </label>
                    </div>

                    {!form.sendImmediately && (
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          <FaCalendarAlt className="me-1 text-success" />
                          Scheduled Send Time
                        </label>
                        <input
                          type="datetime-local"
                          className="form-control border-2 py-2"
                          name="scheduledTime"
                          value={form.scheduledTime}
                          onChange={handleChange}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                        <div className="form-text">
                          <FaInfoCircle className="me-1" size={12} />
                          Notification will be sent automatically at this time
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="form-label fw-semibold">
                        <FaCalendarAlt className="me-1 text-muted" />
                        Expiry Date (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        className="form-control border-2 py-2"
                        name="expiresAt"
                        value={form.expiresAt}
                        onChange={handleChange}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      <div className="form-text">
                        <FaInfoCircle className="me-1" size={12} />
                        Notification will auto-archive after this date. Leave
                        blank for no expiry.
                      </div>
                    </div>
                  </div>
                </div>

                {/* TARGET AUDIENCE (UI ONLY - NOT SENT TO BACKEND) */}
                <div className="card border-0 bg-light rounded-3 mb-4">
                  <div className="card-body p-3 p-md-4">
                    <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                      <FaUsers className="text-primary" /> Target Audience{" "}
                      <span className="badge bg-info ms-2">
                        UI Preview Only
                      </span>
                    </h5>
                    <p className="text-muted small mb-3">
                      <FaInfoCircle className="me-1" size={12} />
                      <strong>Note:</strong> Current backend sends to all users.
                      These options are for future integration preview.
                    </p>

                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="targetAudience"
                        id="targetAll"
                        value="ALL"
                        checked={form.targetAudience === "ALL"}
                        onChange={handleChange}
                      />
                      <label
                        className="form-check-label fw-medium"
                        htmlFor="targetAll"
                      >
                        <FaUsers className="me-1" /> All Users (Students,
                        Teachers, Admins)
                      </label>
                    </div>

                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="targetAudience"
                        id="targetStudents"
                        value="STUDENTS"
                        checked={form.targetAudience === "STUDENTS"}
                        onChange={handleChange}
                        disabled
                      />
                      <label
                        className="form-check-label fw-medium text-muted"
                        htmlFor="targetStudents"
                      >
                        <FaGraduationCap className="me-1" /> Students Only{" "}
                        <span className="badge bg-secondary ms-2">
                          Coming Soon
                        </span>
                      </label>
                    </div>

                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="targetAudience"
                        id="targetTeachers"
                        value="TEACHERS"
                        checked={form.targetAudience === "TEACHERS"}
                        onChange={handleChange}
                        disabled
                      />
                      <label
                        className="form-check-label fw-medium text-muted"
                        htmlFor="targetTeachers"
                      >
                        <FaChalkboardTeacher className="me-1" /> Teachers Only{" "}
                        <span className="badge bg-secondary ms-2">
                          Coming Soon
                        </span>
                      </label>
                    </div>

                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="targetAudience"
                        id="targetCustom"
                        value="CUSTOM"
                        checked={form.targetAudience === "CUSTOM"}
                        onChange={handleChange}
                        disabled
                      />
                      <label
                        className="form-check-label fw-medium text-muted"
                        htmlFor="targetCustom"
                      >
                        <FaLayerGroup className="me-1" /> Custom Selection{" "}
                        <span className="badge bg-secondary ms-2">
                          Coming Soon
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="d-grid gap-3 d-md-flex justify-content-md-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary d-flex align-items-center gap-2 px-4 py-2"
                    onClick={() => window.history.back()}
                  >
                    <FaArrowLeft /> Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center gap-2 px-4 py-2 pulse-button"
                    disabled={loading || titleCount === 0 || messageCount === 0}
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="spin-icon" /> Sending...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane />{" "}
                        {form.sendImmediately
                          ? "Send Now"
                          : "Schedule Notification"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* PREVIEW COLUMN (CONDITIONAL) */}
        {showPreview && (
          <div className="col-lg-5 order-1 order-lg-2">
            <div
              className="card border-0 shadow-lg rounded-4 overflow-hidden sticky-top animate-fade-in-up"
              style={{ top: "15px" }}
            >
              <div className="card-header bg-gradient-info text-white py-3 py-md-4">
                <div className="d-flex justify-content-between align-items-center">
                  <h2 className="h5 h6-md fw-bold mb-0 d-flex align-items-center gap-2">
                    <FaEye /> Live Preview
                  </h2>
                  <span className="badge bg-light text-dark">Student View</span>
                </div>
              </div>

              <div className="card-body p-3 p-md-4 bg-light">
                {/* PREVIEW NOTIFICATION */}
                <div
                  className={`notification-preview border rounded-3 p-3 mb-4 ${getTypeConfig(form.type).bg}`}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2 pb-2 border-bottom">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className={`preview-icon rounded-circle d-flex align-items-center justify-content-center ${getTypeConfig(form.type).bg}`}
                        style={{ width: "36px", height: "36px" }}
                      >
                        {getTypeConfig(form.type).icon}
                      </div>
                      <h6 className="fw-bold mb-0 text-dark">
                        {form.title || "Notification Title"}
                      </h6>
                    </div>
                    <span
                      className={`badge ${getPriorityBadge(form.priority).class} py-2`}
                    >
                      {getPriorityBadge(form.priority).text}
                    </span>
                  </div>

                  <p
                    className="text-dark mb-3"
                    style={{ whiteSpace: "pre-line", minHeight: "80px" }}
                  >
                    {form.message ||
                      "Your notification message will appear here. Format it with clear paragraphs and important details."}
                  </p>

                  <div className="d-flex flex-wrap justify-content-between align-items-center text-muted small">
                    <div className="d-flex align-items-center gap-2 mb-2 mb-md-0">
                      <FaBell className="text-primary" />
                      <span>{form.type.replace("_", " ")}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <FaClock className="text-secondary" />
                      <span>
                        {form.sendImmediately
                          ? "Just now"
                          : form.scheduledTime
                            ? new Date(form.scheduledTime).toLocaleString()
                            : "Scheduled"}
                      </span>
                    </div>
                  </div>

                  {form.expiresAt && (
                    <div className="mt-3 pt-3 border-top text-muted small">
                      <FaCalendarAlt className="text-warning me-1" />
                      Expires: {new Date(form.expiresAt).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* PREVIEW INFO */}
                <div className="alert alert-info bg-info bg-opacity-10 mb-4">
                  <div className="d-flex align-items-start gap-2">
                    <FaInfoCircle className="mt-1 flex-shrink-0" />
                    <div>
                      <h6 className="fw-bold mb-1">Preview Notes</h6>
                      <ul className="mb-0 small ps-3">
                        <li>
                          This is exactly how students will see your
                          notification
                        </li>
                        <li>
                          High priority notifications appear with red badges
                        </li>
                        <li>
                          Expiry dates automatically archive old notifications
                        </li>
                        <li>Icons change based on notification type</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* QUICK TIPS */}
                <div className="border rounded-3 p-3 bg-white">
                  <h6 className="fw-bold mb-2 d-flex align-items-center gap-2">
                    <FaLightbulb className="text-warning" /> Pro Tips
                  </h6>
                  <ul className="mb-0 small ps-3">
                    <li>
                      Keep titles under 60 characters for mobile visibility
                    </li>
                    <li>Include clear deadlines or action items in messages</li>
                    <li>Use HIGH priority sparingly for true emergencies</li>
                    <li>
                      Schedule non-urgent notifications for business hours
                    </li>
                    <li>Add expiry dates to time-sensitive announcements</li>
                  </ul>
                </div>
              </div>

              <div className="card-footer bg-light py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    <FaCheckCircle className="text-success me-1" />
                    Ready to send
                  </small>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                    onClick={handleSubmit}
                    disabled={loading || titleCount === 0 || messageCount === 0}
                  >
                    <FaPaperPlane size={14} /> Send from Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= FOOTER ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mt-3 mt-md-4 animate-fade-in-up">
        <div className="card-body p-3 p-md-4 bg-light">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="text-center text-md-start">
              <p className="mb-1">
                <small className="text-muted">
                  <FaBell className="me-1" />
                  Notification Management | Smart College ERP System
                </small>
              </p>
              <p className="mb-0">
                <small className="text-muted">
                  <FaSync className="spin-icon me-1" />
                  Last Updated: <strong>{new Date().toLocaleString()}</strong>
                </small>
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <button
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                onClick={() => window.history.back()}
              >
                <FaArrowLeft size={12} /> Back to Notifications
              </button>
              <button
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                onClick={() => {
                  setForm({
                    title: "Fee Payment Deadline Extended",
                    message:
                      "Dear Students,\n\nThe deadline for semester fee payment has been extended to February 28, 2026.\n\nPlease complete your payment before the deadline to avoid late fees.\n\nContact accounts@college.edu for queries.",
                    type: "FEE",
                    priority: "MEDIUM",
                    expiresAt: new Date(
                      new Date().setDate(new Date().getDate() + 7),
                    )
                      .toISOString()
                      .slice(0, 16),
                    targetAudience: "ALL",
                    departmentIds: [],
                    courseIds: [],
                    sendImmediately: true,
                    scheduledTime: "",
                  });
                  setTitleCount(32);
                  setMessageCount(180);
                }}
              >
                <FaDownload size={12} /> Load Sample
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26, 75, 109, 0.4); }
          70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(26, 75, 109, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26, 75, 109, 0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes lift {
          to { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slide-down { animation: slideDown 0.5s ease-out forwards; }
        .animate-fade-in-up { animation: slideUp 0.6s ease-out forwards; }
        .pulse-icon { animation: pulse 2s infinite; }
        .hover-lift:hover { animation: lift 0.3s ease forwards; }
        .spin-icon { animation: spin 1s linear infinite; }
        .float-badge { animation: float 3s ease-in-out infinite; }
        .pulse-button { position: relative; overflow: hidden; }
        .pulse-button::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 5px;
          height: 5px;
          background: rgba(255,255,255,0.5);
          opacity: 0;
          border-radius: 100%;
          transform: scale(1, 1) translate(-50%);
          transform-origin: 50% 50%;
        }
        .pulse-button:focus:not(:active)::after {
          animation: ripple 1s ease-out;
        }
        @keyframes ripple {
          0% { transform: scale(0, 0); opacity: 0.5; }
          100% { transform: scale(100, 100); opacity: 0; }
        }

        .bg-gradient-primary {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }
        .bg-gradient-info {
          background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
        }

        .notification-logo-container {
          width: 60px;
          height: 60px;
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.4);
        }

        .preview-icon {
          font-size: 1.2rem;
        }

        .form-control:focus, .form-select:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.25rem rgba(26, 75, 109, 0.25);
        }

        .form-label {
          font-weight: 600;
          color: #212529;
          margin-bottom: 0.5rem;
        }

        .form-text {
          font-size: 0.875rem;
          color: #6c757d;
          margin-top: 0.25rem;
        }

        .notification-preview {
          transition: all 0.3s ease;
          border-color: #dee2e6;
        }
        .notification-preview:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.08);
          border-color: #adb5bd;
        }

        @media (max-width: 992px) {
          .sticky-top {
            position: static !important;
          }
          .notification-logo-container {
            width: 50px;
            height: 50px;
          }
        }

        @media (max-width: 768px) {
          .btn-sm {
            padding: 0.25rem 0.5rem !important;
            font-size: 0.75rem !important;
          }
          .form-control-lg {
            padding: 0.75rem 1rem !important;
            font-size: 1rem !important;
          }
          .form-select-lg {
            padding: 0.75rem 1rem !important;
            font-size: 1rem !important;
          }
        }

        @media (max-width: 576px) {
          .notification-logo-container {
            width: 45px;
            height: 45px;
          }
          .preview-icon {
            width: 32px;
            height: 32px;
            font-size: 1rem;
          }
          .card-footer {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
          }
          .card-footer .d-flex {
            width: 100%;
          }
          .card-footer button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
