import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../../../api/axios";
import Loading from "../../../../components/Loading";
import Breadcrumb from "../../../../components/Breadcrumb";
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
  FaLightbulb,
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

export default function CreateNotification() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "GENERAL",
    priority: "LOW",
    expiresAt: "",
    target: "ALL",
    target_department: "",
    target_course: "",
    target_semester: "",
    sendImmediately: true,
    scheduledTime: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [titleCount, setTitleCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);

  /* ================= CHARACTER COUNTERS ================= */
  useEffect(() => {
    setTitleCount(form.title.length);
    setMessageCount(form.message.length);
  }, [form.title, form.message]);

  /* ================= FETCH DEPARTMENTS & COURSES ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, courseRes] = await Promise.all([
          api.get("/departments"),
          api.get("/courses"),
        ]);
        setDepartments(deptRes.data || []);
        setCourses(courseRes.data || []);
      } catch (err) {
        console.error("Error fetching departments/courses:", err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();

    if (!form.title || !form.message) {
      toast.error("Title and Message are required", CONFIG.TOAST);
      return;
    }

    // VALIDATE SCHEDULED TIME
    if (
      !form.sendImmediately &&
      form.scheduledTime &&
      new Date(form.scheduledTime) < new Date()
    ) {
      toast.error("Scheduled time cannot be in the past", CONFIG.TOAST);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: form.title,
        message: form.message,
        type: form.type,
        target: form.target,
        target_department: form.target_department || undefined,
        target_course: form.target_course || undefined,
        target_semester: form.target_semester
          ? parseInt(form.target_semester)
          : undefined,
        expiresAt: form.expiresAt || null,
      };

      await api.post("/notifications/admin/create", payload);

      toast.success("Notification created successfully!", {
        ...CONFIG.TOAST,
        toastId: "notification-create-success",
      });

      // Reset form with slight delay for user feedback
      setTimeout(() => {
        setForm({
          title: "",
          message: "",
          type: "GENERAL",
          target: "ALL",
          target_department: "",
          target_course: "",
          target_semester: "",
          expiresAt: "",
          sendImmediately: true,
          scheduledTime: "",
        });
      }, 2000);
    } catch (err) {
      console.error("Notification creation error:", err);
      toast.error(
        err.response?.data?.message ||
          "Failed to create notification. Please try again.",
        CONFIG.TOAST
      );
    } finally {
      setLoading(false);
    }
  }, [form]);

  /* ================= GET ICON & COLOR FOR TYPE ================= */
  const getTypeConfig = (type) => {
    const configs = {
      GENERAL: {
        icon: <FaBell />,
        color: CONFIG.THEME.INFO,
        bg: "bg-info-subtle",
      },
      ACADEMIC: {
        icon: <FaGraduationCap />,
        color: CONFIG.THEME.PRIMARY,
        bg: "bg-primary-subtle",
      },
      EXAM: {
        icon: <FaCalendarAlt />,
        color: CONFIG.THEME.WARNING,
        bg: "bg-warning-subtle",
      },
      FEE: {
        icon: <FaFileAlt />,
        color: CONFIG.THEME.DANGER,
        bg: "bg-danger-subtle",
      },
      ATTENDANCE: {
        icon: <FaUsers />,
        color: CONFIG.THEME.SUCCESS,
        bg: "bg-success-subtle",
      },
      EVENT: {
        icon: <FaCalendarAlt />,
        color: CONFIG.THEME.PRIMARY_LIGHT,
        bg: "bg-secondary-subtle",
      },
      ASSIGNMENT: {
        icon: <FaFileAlt />,
        color: CONFIG.THEME.INFO,
        bg: "bg-info-subtle",
      },
      URGENT: {
        icon: <FaExclamationTriangle />,
        color: CONFIG.THEME.DANGER,
        bg: "bg-danger-subtle",
      },
    };
    return configs[type] || configs.GENERAL;
  };

  /* ================= GET PRIORITY BADGE ================= */
  const getPriorityBadge = (priority) => {
    const badges = {
      LOW: { text: "Low", class: "badge-success" },
      MEDIUM: { text: "Medium", class: "badge-warning" },
      HIGH: { text: "High", class: "badge-danger" },
    };
    return badges[priority] || badges.LOW;
  };

  const loadSample = () => {
    const sample = {
      title: "Fee Payment Deadline Extended",
      message:
        "Dear Students,\n\nThe deadline for semester fee payment has been extended to February 28, 2026.\n\nPlease complete your payment before the deadline to avoid late fees.\n\nContact accounts@college.edu for queries.",
      type: "FEE",
      priority: "MEDIUM",
      expiresAt: new Date(
        new Date().setDate(new Date().getDate() + 7)
      )
        .toISOString()
        .slice(0, 16),
      target: "ALL",
      target_department: "",
      target_course: "",
      target_semester: "",
      sendImmediately: true,
      scheduledTime: "",
    };
    setForm(sample);
    setTitleCount(sample.title.length);
    setMessageCount(sample.message.length);
    toast.info("Sample notification loaded", CONFIG.TOAST);
  };

  /* ================= LOADING STATE ================= */
  if (loading && !form.title) {
    return (
      <Loading
        size="lg"
        color="primary"
        text="Preparing notification form..."
        fullScreen={true}
      />
    );
  }

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Notifications", path: "/notifications" },
          { label: "Create Notification" },
        ]}
      />

      {/* ================= HELP SECTION ================= */}
      {showHelp && (
        <div className="info-banner mb-4 animate-fade-in">
          <div className="info-banner-icon">
            <FaInfoCircle />
          </div>
          <div className="info-banner-content">
            <h6 className="fw-bold mb-1">Notification Creation Guide</h6>
            <ul className="mb-0 small ps-3">
              <li>
                <strong>Title</strong>: Keep under 60 characters for best
                visibility
              </li>
              <li>
                <strong>Message</strong>: Include clear call-to-action if needed
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
      )}

      {/* ================= HEADER ================= */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="header-icon-wrapper">
            <FaBell />
          </div>
          <div className="header-text">
            <h1 className="dashboard-title">Create Notification</h1>
            <p className="dashboard-subtitle">
              Send important announcements to your college community
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="btn-header"
            title="Notification Help"
          >
            <FaInfoCircle /> <span>Help</span>
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-header"
            title={showPreview ? "Hide Preview" : "Show Preview"}
          >
            <FaEye /> <span>{showPreview ? "Hide" : "Show"} Preview</span>
          </button>
          <button
            type="button"
            className="btn-header"
            onClick={loadSample}
            title="Load sample notification"
          >
            <FaDownload /> <span>Load Sample</span>
          </button>
        </div>
      </div>

      {/* ================= MAIN CONTENT GRID ================= */}
      <div className="row g-4">
        {/* FORM COLUMN */}
        <div className={showPreview ? "col-lg-7" : "col-lg-12"}>
          <div className="erp-card">
            <div className="erp-card-header">
              <h3>
                <FaBell className="erp-card-icon" />
                Notification Details
              </h3>
            </div>

            <div className="erp-card-body">
              <form onSubmit={handleSubmit}>
                {/* TITLE */}
                <div className="mb-4">
                  <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                    <span>
                      <FaBell className="me-1" style={{ color: CONFIG.THEME.PRIMARY }} />
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
                      <FaFileAlt className="me-1" style={{ color: CONFIG.THEME.INFO }} />
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
                      <FaLayerGroup className="me-1" style={{ color: CONFIG.THEME.PRIMARY }} />
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
                      <FaExclamationTriangle className="me-1" style={{ color: CONFIG.THEME.WARNING }} />
                      Priority Level
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
                      <FaInfoCircle className="me-1" size={12} />
                      Affects visual urgency and sorting in notification lists
                    </div>
                  </div>
                </div>

                {/* SCHEDULING & EXPIRY */}
                <div className="info-box mb-4">
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
                        <FaCalendarAlt className="me-1" style={{ color: CONFIG.THEME.SUCCESS }} />
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
                      <FaCalendarAlt className="me-1" style={{ color: CONFIG.THEME.PRIMARY_LIGHT }} />
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

                {/* TARGET AUDIENCE */}
                <div className="info-box mb-4">
                  <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                    <FaUsers className="me-1" style={{ color: CONFIG.THEME.PRIMARY }} />
                    Target Audience
                  </h5>

                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="target"
                      id="targetAll"
                      value="ALL"
                      checked={form.target === "ALL"}
                      onChange={handleChange}
                    />
                    <label
                      className="form-check-label fw-medium"
                      htmlFor="targetAll"
                    >
                      <FaUsers className="me-1" /> All Users (Students, Teachers, Admins)
                    </label>
                  </div>

                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="target"
                      id="targetStudents"
                      value="STUDENTS"
                      checked={form.target === "STUDENTS"}
                      onChange={handleChange}
                    />
                    <label
                      className="form-check-label fw-medium"
                      htmlFor="targetStudents"
                    >
                      <FaGraduationCap className="me-1" /> Students Only
                    </label>
                  </div>

                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="target"
                      id="targetTeachers"
                      value="TEACHERS"
                      checked={form.target === "TEACHERS"}
                      onChange={handleChange}
                    />
                    <label
                      className="form-check-label fw-medium"
                      htmlFor="targetTeachers"
                    >
                      <FaChalkboardTeacher className="me-1" /> Teachers Only
                    </label>
                  </div>

                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="target"
                      id="targetDepartment"
                      value="DEPARTMENT"
                      checked={form.target === "DEPARTMENT"}
                      onChange={handleChange}
                    />
                    <label
                      className="form-check-label fw-medium"
                      htmlFor="targetDepartment"
                    >
                      <FaLayerGroup className="me-1" /> Specific Department
                    </label>
                  </div>

                  {form.target === "DEPARTMENT" && (
                    <div className="ms-4 mb-3">
                      <select
                        className="form-select"
                        name="target_department"
                        value={form.target_department}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name} ({dept.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="target"
                      id="targetCourse"
                      value="COURSE"
                      checked={form.target === "COURSE"}
                      onChange={handleChange}
                    />
                    <label
                      className="form-check-label fw-medium"
                      htmlFor="targetCourse"
                    >
                      <FaGraduationCap className="me-1" /> Specific Course
                    </label>
                  </div>

                  {form.target === "COURSE" && (
                    <div className="ms-4 mb-3">
                      <select
                        className="form-select"
                        name="target_course"
                        value={form.target_course}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Course</option>
                        {courses.map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.name} ({course.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="target"
                      id="targetSemester"
                      value="SEMESTER"
                      checked={form.target === "SEMESTER"}
                      onChange={handleChange}
                    />
                    <label
                      className="form-check-label fw-medium"
                      htmlFor="targetSemester"
                    >
                      <FaClock className="me-1" /> Specific Semester
                    </label>
                  </div>

                  {form.target === "SEMESTER" && (
                    <div className="ms-4">
                      <select
                        className="form-select"
                        name="target_semester"
                        value={form.target_semester}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Semester</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                          <option key={sem} value={sem}>
                            Semester {sem}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div className="d-flex gap-3 flex-wrap justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary d-flex align-items-center gap-2 px-4 py-2"
                    onClick={() => navigate("/notifications")}
                  >
                    <FaArrowLeft /> Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center gap-2 px-4 py-2"
                    disabled={
                      loading || titleCount === 0 || messageCount === 0
                    }
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
          <div className="col-lg-5">
            <div className="erp-card sticky-preview-card">
              <div className="erp-card-header">
                <div className="d-flex justify-content-between align-items-center">
                  <h3>
                    <FaEye className="erp-card-icon" />
                    Live Preview
                  </h3>
                  <span className="badge bg-light text-dark">Student View</span>
                </div>
              </div>

              <div className="erp-card-body bg-light">
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
                      className={`badge ${getPriorityBadge(form.priority).class}`}
                    >
                      {getPriorityBadge(form.priority).text}
                    </span>
                  </div>

                  <p
                    className="text-dark mb-3"
                    style={{ whiteSpace: "pre-line", minHeight: "80px" }}
                  >
                    {form.message ||
                      "Your notification message will appear here..."}
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
                <div className="info-banner-small mb-4">
                  <div className="info-banner-small-icon">
                    <FaInfoCircle />
                  </div>
                  <div className="info-banner-small-content">
                    <h6 className="fw-bold mb-1">Preview Notes</h6>
                    <ul className="mb-0 small ps-3">
                      <li>
                        This is exactly how students will see your notification
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

                {/* QUICK TIPS */}
                <div className="tips-box">
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

              <div className="erp-card-footer">
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    <FaCheckCircle className="text-success me-1" />
                    Ready to send
                  </small>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                    onClick={handleSubmit}
                    disabled={
                      loading || titleCount === 0 || messageCount === 0
                    }
                  >
                    <FaPaperPlane size={14} /> Send from Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
          flex-wrap: wrap;
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
          margin-bottom: 1.5rem;
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

        .erp-card-footer {
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .sticky-preview-card {
          position: sticky;
          top: 1.5rem;
        }

        .info-box {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.25rem;
          border: 1px solid #e2e8f0;
        }

        .info-banner {
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          border-left: 4px solid #0284c7;
        }

        .info-banner-icon {
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

        .info-banner-content {
          flex: 1;
        }

        .info-banner-small {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-radius: 12px;
          padding: 1rem 1.25rem;
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          border: 1px solid #bae6fd;
        }

        .info-banner-small-icon {
          width: 32px;
          height: 32px;
          background: rgba(2, 132, 199, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0284c7;
          flex-shrink: 0;
          font-size: 1rem;
        }

        .info-banner-small-content {
          flex: 1;
        }

        .tips-box {
          background: white;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          border: 1px solid #fde68a;
        }

        .notification-preview {
          transition: all 0.3s ease;
        }

        .notification-preview:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        }

        .preview-icon {
          font-size: 1rem;
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

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .badge-success {
          background-color: #28a745;
        }

        .badge-warning {
          background-color: #ffc107;
          color: #000;
        }

        .badge-danger {
          background-color: #dc3545;
        }

        @media (max-width: 992px) {
          .sticky-preview-card {
            position: static !important;
          }

          .erp-page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
          }

          .btn-header {
            flex: 1;
            justify-content: center;
            min-width: 120px;
          }
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
          .erp-card-body,
          .erp-card-footer {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
