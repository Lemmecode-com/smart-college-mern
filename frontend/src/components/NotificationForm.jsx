import { useState, useEffect, useCallback, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";
import Loading from "../components/Loading";
import ApiError from "../components/ApiError";
import Breadcrumb from "../components/Breadcrumb";
import ConfirmModal from "../components/ConfirmModal";
import PageHero from "../components/common/PageHero";
import { AuthContext } from "../auth/AuthContext";
import { logger } from "../utils/logger";
import {
  FaBell,
  FaPaperPlane,
  FaExclamationTriangle,
  FaInfoCircle,
  FaGraduationCap,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaUserCheck,
  FaBullhorn,
  FaClipboardList,
  FaSyncAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaEye,
  FaClock,
  FaStar,
  FaDownload,
  FaSave,
  FaLayerGroup,
  FaUsers,
  FaChalkboardTeacher,
  FaFileAlt,
  FaUserTie,
  FaUserFriends,
} from "react-icons/fa";
import { NOTIFICATION_TYPES } from "../utils/notificationTypes";

/* ================= ROLE-BASED CONFIGURATION ================= */
const ROLE_CONFIG = {
  "college-admin": {
    createEndpoint: "/notifications/admin/create",
    editEndpoint: "/notifications/edit-note/",
    readEndpoint: "/notifications/admin/read",
    dashboardRoute: "/dashboard",
    listRoute: "/notification/list",
    canCreate: true,
    canEdit: true,
    canTarget: true, // Can target specific groups
    placeholder: "college community",
    successMessage: "Notification created successfully!",
    editSuccessMessage: "Notification updated successfully!",
  },
  teacher: {
    createEndpoint: "/notifications/teacher/create",
    editEndpoint: "/notifications/edit-note/",
    readEndpoint: "/notifications/teacher/read",
    dashboardRoute: "/teacher/dashboard",
    listRoute: "/teacher/notifications/list",
    canCreate: true,
    canEdit: true,
    canTarget: true,
    placeholder: "students",
    successMessage: "Notification sent successfully to students!",
    editSuccessMessage: "Notification updated successfully!",
  },
  hod: {
    createEndpoint: "/notifications/hod/create",
    editEndpoint: "/notifications/edit-note/",
    readEndpoint: "/notifications/hod/read",
    dashboardRoute: "/hod/dashboard",
    listRoute: "/hod/notifications/list",
    canCreate: true,
    canEdit: true,
    canTarget: true,
    placeholder: "department",
    successMessage: "Notification created successfully!",
    editSuccessMessage: "Notification updated successfully!",
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
  notificationTypes: NOTIFICATION_TYPES,
  priorities: {
    LOW: { color: "#64748b", bg: "#f1f5f9", label: "Low Priority" },
    NORMAL: { color: "#1e40af", bg: "#dbeafe", label: "Normal Priority" },
    MEDIUM: { color: "#d97706", bg: "#fef3c7", label: "Medium Priority" },
    HIGH: { color: "#b91c1c", bg: "#fee2e2", label: "High Priority" },
    URGENT: { color: "#dc2626", bg: "#fecaca", label: "Urgent" },
  },
};

/* ================= ANIMATION VARIANTS ================= */
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

/* ================= NOTIFICATION DESCRIPTION ================= */
const NOTIFICATION_DESCRIPTION = {
  GENERAL: "General announcements",
  ACADEMIC: "Academic updates and progress",
  EXAM: "Exam schedules and updates",
  FEE: "Fee payment and dues",
  ATTENDANCE: "Attendance alerts",
  EVENT: "College events and activities",
  ASSIGNMENT: "Assignment deadlines",
  URGENT: "Critical time-sensitive notices",
};

/* ================= MAIN COMPONENT ================= */
export default function NotificationForm({
  role = "college-admin",
  mode = "create",
}) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG["college-admin"];
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "GENERAL",
    priority: mode === "edit" ? "NORMAL" : "LOW",
    expiresAt: "",
    target: role === "teacher" || role === "hod" ? "STUDENTS" : "ALL",
    target_department: "",
    target_course: "",
    target_semester: "",
    target_users: [],
  });

  const [originalForm, setOriginalForm] = useState({ ...form });
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [titleCount, setTitleCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [hodDepartment, setHodDepartment] = useState(null); // HOD's own dept (locked)
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [recipientLoading, setRecipientLoading] = useState(false);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    action: null,
  });

  /* ================= CHARACTER COUNTERS ================= */
  useEffect(() => {
    setTitleCount(form.title.length);
    setMessageCount(form.message.length);
  }, [form.title, form.message]);

  /* ================= FETCH DEPARTMENTS & COURSES ================= */
  useEffect(() => {
    if (config.canTarget) {
      const fetchData = async () => {
        try {
          const deptRes = await api.get("/departments");
          setDepartments(deptRes.data || []);

          const courseRes = await api.get("/courses");
          setCourses(courseRes.data || []);
        } catch (err) {
          logger.error("Error fetching departments/courses:", err);
        }
      };
      fetchData();
    }
  }, [config.canTarget]);

  /* ================= FETCH HOD'S OWN DEPARTMENT (locked for DEPARTMENT target) ================= */
  useEffect(() => {
    if (role !== "hod") return;
    const fetchHodDept = async () => {
      try {
        // The HOD profile endpoint returns the teacher record which includes department_id.
        // We use the departments list already fetched to resolve the name.
        const res = await api.get("/hod/profile");
        const deptId = res.data?.teacher?.department_id || res.data?.department_id;
        if (deptId) {
          setHodDepartment(deptId);
          // Pre-fill target_department so the backend receives the correct value.
          setForm((prev) => ({ ...prev, target_department: deptId }));
        }
      } catch (err) {
        logger.error("Error fetching HOD department:", err);
      }
    };
    fetchHodDept();
  }, [role]);

  /* ================= FETCH ELIGIBLE RECIPIENTS (INDIVIDUAL TARGET) ================= */
  useEffect(() => {
    if (form.target !== "INDIVIDUAL" || (role !== "college-admin" && role !== "hod")) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setRecipientLoading(true);
      try {
        const params = recipientSearch.trim() ? `?search=${encodeURIComponent(recipientSearch.trim())}` : "";
        const res = await api.get(`/notifications/eligible-recipients${params}`, { signal: controller.signal });
        setRecipientOptions(res.data || []);
      } catch (err) {
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          logger.error("Error fetching eligible recipients:", err);
        }
      } finally {
        setRecipientLoading(false);
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [form.target, recipientSearch, role]);

  /* ================= LOAD EXISTING NOTIFICATION (EDIT MODE) ================= */
  const loadNotification = useCallback(async () => {
    if (mode !== "edit") return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.get(config.readEndpoint);

      const all = [
        ...(res.data.myNotifications || []),
        ...(res.data.adminNotifications || []),
        ...(res.data.staffNotifications || []),
        ...(res.data.teacherNotifications || []),
      ];

      const found = all.find((n) => n._id === id);

      if (!found) {
        setError({
          message: "Notification not found. It may have been deleted.",
          statusCode: 404,
        });
        setLoading(false);
        return;
      }

      const formData = {
        title: found.title || "",
        message: found.message || "",
        type: found.type || "GENERAL",
        priority: found.priority || "NORMAL",
        expiresAt: found.expiresAt
          ? new Date(found.expiresAt).toISOString().slice(0, 16)
          : "",
        target: found.target || "ALL",
        target_department: found.target_department || "",
        target_course: found.target_course || "",
        target_semester: found.target_semester || "",
        target_users: found.target_users || [],
      };

      setForm(formData);
      setOriginalForm(formData);
      setRetryCount(0);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to load notification";
      const statusCode = err.response?.status;
      setError({ message: errorMsg, statusCode, errorCode: err.response?.data?.code });
      toast.error("Failed to load notification");
    } finally {
      setLoading(false);
    }
  }, [mode, id, config.readEndpoint]);

  useEffect(() => {
    if (mode === "edit") {
      loadNotification();
    }
  }, [mode, loadNotification]);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setError(null);
    const updated = { ...form, [name]: type === "checkbox" ? checked : value };
    if (name === "target" && value !== "INDIVIDUAL") {
      updated.target_users = [];
      setRecipientSearch("");
    }
    setForm(updated);
  };

  /* ================= SUBMIT FORM ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Title and Message are required");
      return;
    }

    if (form.title.length > 100) {
      toast.error("Title must be less than 100 characters");
      return;
    }

    if (form.message.length > 1000) {
      toast.error("Message must be less than 1000 characters");
      return;
    }

    if (form.expiresAt) {
      const [datePart, timePart] = form.expiresAt.split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hours, minutes] = timePart.split(":").map(Number);
      const selectedLocal = new Date(year, month - 1, day, hours, minutes, 0);
      const nowLocal = new Date();
      if (selectedLocal < nowLocal) {
        toast.error("Expiry Date must be today or a future date.");
        return;
      }
    }

    if (form.target === "COURSE" && !form.target_course) {
      toast.error("Please select a course");
      return;
    }

    if (form.target === "SEMESTER" && !form.target_semester) {
      toast.error("Please select a semester");
      return;
    }

    if (form.target === "INDIVIDUAL" && form.target_users.length === 0) {
      toast.error("Please select at least one recipient.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        priority: form.priority,
        target: form.target,
        target_department: form.target_department || undefined,
        target_course: form.target === "COURSE" ? form.target_course || undefined : undefined,
        target_semester: form.target === "SEMESTER" ? form.target_semester || undefined : undefined,
        target_users: form.target === "INDIVIDUAL" ? form.target_users : undefined,
        expiresAt: form.expiresAt || null,
      };

      if (mode === "create") {
        await api.post(config.createEndpoint, payload);
        toast.success(config.successMessage);

        setTimeout(() => {
          setForm({
            title: "",
            message: "",
            type: "GENERAL",
            priority: "LOW",
            expiresAt: "",
            target: "STUDENTS",
            target_department: "",
            target_course: "",
            target_semester: "",
            target_users: [],
          });
        }, 2000);
      } else {
        await api.put(`${config.editEndpoint}${id}`, payload);
        toast.success(config.editSuccessMessage);
        setOriginalForm({ ...form });

        setTimeout(() => {
          navigate(config.listRoute);
        }, 1500);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || `Failed to ${mode} notification`;
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  /* ================= LOAD SAMPLE ================= */
  const loadSample = () => {
    const sample =
      role === "teacher"
        ? {
            title: "Important Exam Schedule Update",
            message:
              "Dear Students,\n\nPlease note that the exam schedule for Semester 5 has been updated. The new timetable is available on the student portal.\n\nKey changes:\n- Data Structures exam moved to Feb 25\n- Database Systems exam moved to Feb 28\n\nPlease check your portals for the complete schedule.\n\nRegards,\nExamination Cell",
            type: "EXAM",
            priority: "HIGH",
            expiresAt: new Date(new Date().setDate(new Date().getDate() + 7))
              .toISOString()
              .slice(0, 16),
            target: "STUDENTS",
            target_department: "",
          }
        : {
            title: "Fee Payment Deadline Extended",
            message:
              "Dear Students,\n\nThe deadline for semester fee payment has been extended to February 28, 2026.\n\nPlease complete your payment before the deadline to avoid late fees.\n\nContact accounts@college.edu for queries.",
            type: "FEE",
            priority: "MEDIUM",
            expiresAt: new Date(new Date().setDate(new Date().getDate() + 7))
              .toISOString()
              .slice(0, 16),
            target: "STUDENTS",
            target_department: "",
          };

    setForm(sample);
    setTitleCount(sample.title.length);
    setMessageCount(sample.message.length);
    toast.info("Sample notification loaded");
  };

  /* ================= CHECK FOR UNSAVED CHANGES ================= */
  const hasUnsavedChanges = useCallback(() => {
    return (
      form.title !== originalForm.title ||
      form.message !== originalForm.message ||
      form.type !== originalForm.type ||
      form.priority !== originalForm.priority ||
      form.expiresAt !== originalForm.expiresAt ||
      form.target !== originalForm.target ||
      JSON.stringify(form.target_users) !== JSON.stringify(originalForm.target_users) ||
      form.target_department !== originalForm.target_department ||
      form.target_course !== originalForm.target_course ||
      form.target_semester !== originalForm.target_semester
    );
  }, [form, originalForm]);

  /* ================= HANDLE BACK NAVIGATION ================= */
  const handleBackClick = () => {
    if (mode === "edit" && hasUnsavedChanges()) {
      setConfirmModal({ isOpen: true, action: "back" });
    } else {
      navigate(mode === "edit" ? -1 : config.listRoute);
    }
  };

  const handleConfirmNavigation = () => {
    setConfirmModal({ isOpen: false, action: null });
    navigate(mode === "edit" ? -1 : config.listRoute);
  };

  const handleCancelNavigation = () => {
    setConfirmModal({ isOpen: false, action: null });
  };

  /* ================= HANDLE RETRY ================= */
  const handleRetry = async () => {
    if (retryCount >= 3) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    await loadNotification();
    setIsRetrying(false);
  };

  const handleGoBack = () => navigate(-1);

  /* ================= GET TYPE CONFIG ================= */
  const typeConfig =
    BRAND_COLORS.notificationTypes[form.type] ||
    BRAND_COLORS.notificationTypes.GENERAL;
  const priorityConfig =
    BRAND_COLORS.priorities[form.priority] || BRAND_COLORS.priorities.NORMAL;
  const TypeIcon = typeConfig.icon;

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <Loading
        fullScreen
        size="lg"
        text={mode === "edit" ? "Loading notification..." : "Preparing form..."}
      />
    );
  }

  /* ================= ERROR STATE ================= */
  if (error && mode === "edit") {
    return (
      <ApiError
        title="Error Loading Notification"
        message={error.message}
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
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
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
              { label: "Notifications", path: config.listRoute },
              {
                label:
                  mode === "create"
                    ? "Create Notification"
                    : "Edit Notification",
              },
            ]}
          />

          <PageHero
            icon={<FaBell />}
            title={
              mode === "create"
                ? "Create Notification"
                : "Edit Notification"
            }
            description={
              mode === "create"
                ? `Send important announcements to your ${config.placeholder}`
                : "Update your announcement details"
            }
            onBack={mode === "edit" ? handleBackClick : undefined}
            backLabel="Back"
            primaryAction={
              <>
                {mode === "create" && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={loadSample}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      color: "white",
                      border: "2px solid rgba(255, 255, 255, 0.4)",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "12px",
                      fontSize: "1rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <FaDownload /> Load Sample
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPreview(!showPreview)}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    color: "white",
                    border: "2px solid rgba(255, 255, 255, 0.4)",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "12px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  <FaEye /> {showPreview ? "Hide" : "Show"} Preview
                </motion.button>
              </>
            }
          />

          {/* Info Banner */}
          <div
            style={{
              padding: "1rem 2rem",
              backgroundColor: "#dbeafe",
              borderTop: "1px solid #bfdbfe",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <FaInfoCircle
              style={{
                color: BRAND_COLORS.primary.main,
                fontSize: "1.5rem",
                flexShrink: 0,
              }}
            />
            <div style={{ color: "#1e293b", fontWeight: 500 }}>
              {mode === "create" ? (
                <>
                  Notifications will be sent to all {config.placeholder}.
                  <strong style={{ marginLeft: "0.5rem" }}>
                    Recipients will receive email and in-app alerts.
                  </strong>
                </>
              ) : (
                <>Changes will be reflected immediately for all recipients.</>
              )}
            </div>
          </div>

          {/* ================= MAIN CONTENT ================= */}
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {/* ================= FORM CARD ================= */}
            <motion.div
              variants={fadeInVariants}
              initial="hidden"
              animate="visible"
              style={{
                flex: showPreview ? "0 0 calc(58.333% - 0.75rem)" : "0 0 100%",
                maxWidth: showPreview ? "calc(58.333% - 0.75rem)" : "100%",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "20px",
                  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
                  overflow: "hidden",
                }}
              >
                {/* Form Header */}
                <div
                  style={{
                    padding: "1.75rem",
                    background:
                      "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      backgroundColor: `${BRAND_COLORS.primary.main}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: BRAND_COLORS.primary.main,
                      fontSize: "1.5rem",
                      flexShrink: 0,
                    }}
                  >
                    <FaBell />
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color: "#1e293b",
                    }}
                  >
                    {mode === "create"
                      ? "Compose Notification"
                      : "Edit Notification Content"}
                  </h2>
                </div>

                {/* Form Body */}
                <div style={{ padding: "2rem" }}>
                  <form onSubmit={handleSubmit}>
                    {/* Title */}
                    <div style={{ marginBottom: "1.5rem" }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "0.75rem",
                          fontWeight: 600,
                          color: "#1e293b",
                          fontSize: "1.05rem",
                        }}
                      >
                        <span>
                          <FaInfoCircle
                            style={{
                              color: BRAND_COLORS.primary.main,
                              marginRight: "0.5rem",
                            }}
                          />
                          Notification Title{" "}
                          <span style={{ color: BRAND_COLORS.danger.main }}>
                            *
                          </span>
                        </span>
                        <small
                          style={{
                            color:
                              titleCount > 80
                                ? BRAND_COLORS.danger.main
                                : titleCount > 60
                                  ? BRAND_COLORS.warning.main
                                  : "#64748b",
                          }}
                        >
                          {titleCount}/100 characters
                        </small>
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="e.g., Important Exam Schedule Update"
                        style={{
                          width: "100%",
                          padding: "0.875rem 1.25rem",
                          borderRadius: "14px",
                          border: "2px solid #e2e8f0",
                          fontSize: "1.05rem",
                          transition: "all 0.3s ease",
                        }}
                        maxLength="100"
                        required
                      />
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#64748b",
                          marginTop: "0.5rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <FaInfoCircle
                          size={12}
                          style={{ color: BRAND_COLORS.primary.main }}
                        />
                        Keep it concise and action-oriented.
                      </div>
                    </div>

                    {/* Message */}
                    <div style={{ marginBottom: "1.5rem" }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "0.75rem",
                          fontWeight: 600,
                          color: "#1e293b",
                          fontSize: "1.05rem",
                        }}
                      >
                        <span>
                          <FaClipboardList
                            style={{
                              color: BRAND_COLORS.info.main,
                              marginRight: "0.5rem",
                            }}
                          />
                          Message Content{" "}
                          <span style={{ color: BRAND_COLORS.danger.main }}>
                            *
                          </span>
                        </span>
                        <small
                          style={{
                            color:
                              messageCount > 800
                                ? BRAND_COLORS.danger.main
                                : messageCount > 600
                                  ? BRAND_COLORS.warning.main
                                  : "#64748b",
                          }}
                        >
                          {messageCount}/1000 characters
                        </small>
                      </label>
                      <textarea
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Enter detailed notification message here..."
                        rows="6"
                        style={{
                          width: "100%",
                          padding: "0.875rem 1.25rem",
                          borderRadius: "14px",
                          border: "2px solid #e2e8f0",
                          fontSize: "1.05rem",
                          resize: "vertical",
                          minHeight: "150px",
                          transition: "all 0.3s ease",
                        }}
                        maxLength="1000"
                        required
                      />
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#64748b",
                          marginTop: "0.5rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <FaInfoCircle
                          size={12}
                          style={{ color: BRAND_COLORS.primary.main }}
                        />
                        Include deadlines, contact info, or next steps.
                      </div>
                    </div>

                    {/* Type & Priority Row */}
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        marginBottom: "1.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: "200px" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.75rem",
                            fontWeight: 600,
                            color: "#1e293b",
                          }}
                        >
                          <FaLayerGroup
                            style={{
                              color: BRAND_COLORS.primary.main,
                              marginRight: "0.5rem",
                            }}
                          />
                          Notification Type
                        </label>
                        <select
                          name="type"
                          value={form.type}
                          onChange={handleChange}
                          style={{
                            width: "100%",
                            padding: "0.875rem 1.25rem",
                            borderRadius: "14px",
                            border: "2px solid #e2e8f0",
                            fontSize: "1.05rem",
                          }}
                        >
                          {Object.entries(BRAND_COLORS.notificationTypes).map(
                            ([key, config]) => {
                              const Icon = config.icon;
                              return (
                                <option key={key} value={key}>
                                  {config.label} -{" "}
                                  {NOTIFICATION_DESCRIPTION[key]}
                                </option>
                              );
                            },
                          )}
                        </select>
                      </div>

                      <div style={{ flex: 1, minWidth: "200px" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.75rem",
                            fontWeight: 600,
                            color: "#1e293b",
                          }}
                        >
                          <FaExclamationTriangle
                            style={{
                              color: BRAND_COLORS.warning.main,
                              marginRight: "0.5rem",
                            }}
                          />
                          Priority Level
                        </label>
                        <select
                          name="priority"
                          value={form.priority}
                          onChange={handleChange}
                          style={{
                            width: "100%",
                            padding: "0.875rem 1.25rem",
                            borderRadius: "14px",
                            border: "2px solid #e2e8f0",
                            fontSize: "1.05rem",
                          }}
                        >
                          {Object.entries(BRAND_COLORS.priorities).map(
                            ([key, config]) => (
                              <option key={key} value={key}>
                                {config.label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Expiry Date */}
                    <div style={{ marginBottom: "1.5rem" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.75rem",
                          fontWeight: 600,
                          color: "#1e293b",
                        }}
                      >
                        <FaCalendarAlt
                          style={{
                            color: BRAND_COLORS.primary.main,
                            marginRight: "0.5rem",
                          }}
                        />
                        Expiry Date (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        name="expiresAt"
                        value={form.expiresAt}
                        onChange={handleChange}
                        min={
                          (() => {
                            const now = new Date();
                            const year = now.getFullYear();
                            const month = String(now.getMonth() + 1).padStart(2, "0");
                            const day = String(now.getDate()).padStart(2, "0");
                            const hours = String(now.getHours()).padStart(2, "0");
                            const minutes = String(now.getMinutes()).padStart(2, "0");
                            return `${year}-${month}-${day}T${hours}:${minutes}`;
                          })()
                        }
                        style={{
                          width: "100%",
                          padding: "0.875rem 1.25rem",
                          borderRadius: "14px",
                          border: "2px solid #e2e8f0",
                          fontSize: "1.05rem",
                        }}
                      />
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#64748b",
                          marginTop: "0.5rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <FaInfoCircle
                          size={12}
                          style={{ color: BRAND_COLORS.primary.main }}
                        />
                        Notification will auto-archive after this date.
</div>
                      </div>

                      {/* Target Audience (Only for college-admin) */}
                      {config.canTarget && (
                        <div
                          style={{
                            padding: "1.25rem",
                            backgroundColor: "#f8fafc",
                            borderRadius: "12px",
                            marginBottom: "1.5rem",
                          }}
                        >
                          <h5
                            style={{
                              fontWeight: 700,
                              marginBottom: "1rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <FaUsers
                              style={{ color: BRAND_COLORS.primary.main }}
                            />
                            Target Audience
                          </h5>

                          <div style={{ marginBottom: "0.75rem" }}>
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginBottom: "0.5rem",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="radio"
                                name="target"
                                value="STUDENTS"
                                checked={form.target === "STUDENTS"}
                                onChange={handleChange}
                              />
                              <FaGraduationCap /> Students Only
                            </label>
                          </div>

                          {/* ALL & TEACHERS: Only for college-admin */}
{role === "college-admin" && (
                            <>
                            <div style={{ marginBottom: "0.75rem" }}>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  marginBottom: "0.5rem",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="radio"
                                  name="target"
                                  value="ALL"
                                  checked={form.target === "ALL"}
                                  onChange={handleChange}
                                />
                                <FaUsers /> All Users (Students, Teachers, HODs, Parents)
                              </label>
                            </div>

                            <div style={{ marginBottom: "0.75rem" }}>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  marginBottom: "0.5rem",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="radio"
                                  name="target"
                                  value="TEACHERS"
                                  checked={form.target === "TEACHERS"}
                                  onChange={handleChange}
                                />
                                <FaChalkboardTeacher /> Teachers Only
                              </label>
                            </div>

                            <div style={{ marginBottom: "0.75rem" }}>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  marginBottom: "0.5rem",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="radio"
                                  name="target"
                                  value="HOD"
                                  checked={form.target === "HOD"}
                                  onChange={handleChange}
                                />
                                <FaUserTie /> HOD Only
                              </label>
                            </div>

                            <div style={{ marginBottom: "0.75rem" }}>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  marginBottom: "0.5rem",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="radio"
                                  name="target"
                                  value="PARENTS"
                                  checked={form.target === "PARENTS"}
                                  onChange={handleChange}
                                />
                                <FaUserFriends /> Parents Only
                              </label>
                            </div>

                            <div style={{ marginBottom: "0.75rem" }}>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  marginBottom: "0.5rem",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="radio"
                                  name="target"
                                  value="COURSE"
                                  checked={form.target === "COURSE"}
                                  onChange={handleChange}
                                />
                                <FaGraduationCap /> Specific Course
                              </label>
                            </div>

                            <div style={{ marginBottom: "0.75rem" }}>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  marginBottom: "0.5rem",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="radio"
                                  name="target"
                                  value="SEMESTER"
                                  checked={form.target === "SEMESTER"}
                                  onChange={handleChange}
                                />
                                <FaCalendarAlt /> Specific Semester
                              </label>
                            </div>

                            <div style={{ marginBottom: "0.75rem" }}>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  marginBottom: "0.5rem",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="radio"
                                  name="target"
                                  value="INDIVIDUAL"
                                  checked={form.target === "INDIVIDUAL"}
                                  onChange={handleChange}
                                />
                                <FaUserCheck /> Individual User(s)
                              </label>
                            </div>
                            </>
                          )}

                          {/* DEPARTMENT Option - Available for admin and teacher (not HOD — HOD gets it in their own section below) */}
                          {(role === "college-admin" || role === "teacher") && (
                            <div style={{ marginBottom: "0.75rem" }}>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  marginBottom: "0.5rem",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="radio"
                                  name="target"
                                  value="DEPARTMENT"
                                  checked={form.target === "DEPARTMENT"}
                                  onChange={handleChange}
                                />
                                <FaUsers /> Specific Department
                              </label>
                            </div>
                          )}

                          {form.target === "DEPARTMENT" && (
                          <div
                            style={{
                              marginLeft: "1.5rem",
                              marginBottom: "1rem",
                            }}
                          >
                            {role === "hod" ? (
                              // HOD: department is locked to their own dept — no free selection
                              <div
                                style={{
                                  padding: "0.75rem 1rem",
                                  borderRadius: "10px",
                                  border: "2px solid #bfdbfe",
                                  backgroundColor: "#eff6ff",
                                  color: "#1e40af",
                                  fontSize: "0.95rem",
                                  fontWeight: 500,
                                }}
                              >
                                {departments.find((d) => d._id === hodDepartment)?.name ||
                                  "Your Department (auto-assigned)"}
                                <input type="hidden" name="target_department" value={hodDepartment || ""} />
                              </div>
                            ) : (
                              <select
                                name="target_department"
                                value={form.target_department}
                                onChange={handleChange}
                                required
                                style={{
                                  width: "100%",
                                  padding: "0.75rem",
                                  borderRadius: "10px",
                                  border: "2px solid #e2e8f0",
                                }}
                              >
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                  <option key={dept._id} value={dept._id}>
                                    {dept.name} ({dept.code})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}

                          {form.target === "COURSE" && (
                            <div
                              style={{
                                marginLeft: "1.5rem",
                                marginBottom: "1rem",
                              }}
                            >
                              <select
                                name="target_course"
                                value={form.target_course}
                                onChange={handleChange}
                                required
                                style={{
                                  width: "100%",
                                  padding: "0.75rem",
                                  borderRadius: "10px",
                                  border: "2px solid #e2e8f0",
                                }}
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

                          {form.target === "SEMESTER" && (
                            <div
                              style={{
                                marginLeft: "1.5rem",
                                marginBottom: "1rem",
                              }}
                            >
                              <select
                                name="target_semester"
                                value={form.target_semester}
                                onChange={handleChange}
                                required
                                style={{
                                  width: "100%",
                                  padding: "0.75rem",
                                  borderRadius: "10px",
                                  border: "2px solid #e2e8f0",
                                }}
                              >
                                <option value="">Select Semester</option>
                                {Array.from(
                                  {
                                    length:
                                      courses.find(
                                        (c) => c._id === form.target_course
                                      )?.durationSemesters || 8,
                                  },
                                  (_, i) => i + 1
                                ).map((sem) => (
                                  <option key={sem} value={sem}>
                                    Semester {sem}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* HOD additional targets */}
                          {role === "hod" && (
                            <>
                              <div style={{ marginBottom: "0.75rem" }}>
                                <label
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    marginBottom: "0.5rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name="target"
                                    value="TEACHERS"
                                    checked={form.target === "TEACHERS"}
                                    onChange={handleChange}
                                  />
                                  <FaChalkboardTeacher /> Teachers Only (Your Department)
                                </label>
                              </div>

                              <div style={{ marginBottom: "0.75rem" }}>
                                <label
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    marginBottom: "0.5rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name="target"
                                    value="HOD"
                                    checked={form.target === "HOD"}
                                    onChange={handleChange}
                                  />
                                  <FaUserTie /> HOD Only (Your Department)
                                </label>
                              </div>

                              <div style={{ marginBottom: "0.75rem" }}>
                                <label
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    marginBottom: "0.5rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name="target"
                                    value="DEPARTMENT"
                                    checked={form.target === "DEPARTMENT"}
                                    onChange={handleChange}
                                  />
                                  <FaUsers /> Entire Department (Your Department Only)
                                </label>
                              </div>

                              <div style={{ marginBottom: "0.75rem" }}>
                                <label
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    marginBottom: "0.5rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name="target"
                                    value="INDIVIDUAL"
                                    checked={form.target === "INDIVIDUAL"}
                                    onChange={handleChange}
                                  />
                                  <FaUserCheck /> Individual User(s) (Your Department)
                                </label>
                              </div>
                            </>
                          )}

                          {form.target === "INDIVIDUAL" && (
                            <div
                              style={{
                                marginLeft: "1.5rem",
                                marginBottom: "1rem",
                              }}
                            >
                              <label
                                style={{
                                  display: "block",
                                  marginBottom: "0.5rem",
                                  fontWeight: 600,
                                  color: "#1e293b",
                                  fontSize: "0.95rem",
                                }}
                              >
                                Select Recipients
                              </label>
                              <div
                                style={{
                                  border: "2px solid #e2e8f0",
                                  borderRadius: "10px",
                                  padding: "0.5rem",
                                  backgroundColor: "white",
                                }}
                              >
                                <input
                                  type="text"
                                  placeholder="Search by name or email..."
                                  value={recipientSearch}
                                  onChange={(e) => setRecipientSearch(e.target.value)}
                                  style={{
                                    width: "100%",
                                    padding: "0.6rem 0.75rem",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontSize: "0.95rem",
                                    outline: "none",
                                  }}
                                />
                              </div>
                              {recipientLoading && (
                                <div
                                  style={{
                                    padding: "0.75rem",
                                    color: "#64748b",
                                    fontSize: "0.85rem",
                                  }}
                                >
                                  Searching...
                                </div>
                              )}
                              {!recipientLoading && recipientOptions.length > 0 && (
                                <div
                                  style={{
                                    maxHeight: "200px",
                                    overflowY: "auto",
                                    border: "2px solid #e2e8f0",
                                    borderRadius: "10px",
                                    marginTop: "0.5rem",
                                  }}
                                >
                                  {recipientOptions
                                    .filter(
                                      (opt) =>
                                        !form.target_users.includes(opt._id)
                                    )
                                    .map((opt) => (
                                      <div
                                        key={opt._id}
                                        onClick={() => {
                                          setForm((prev) => ({
                                            ...prev,
                                            target_users: [
                                              ...prev.target_users,
                                              opt._id,
                                            ],
                                          }));
                                          setRecipientSearch("");
                                        }}
                                        style={{
                                          padding: "0.75rem 1rem",
                                          cursor: "pointer",
                                          borderBottom:
                                            "1px solid #f1f5f9",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "0.75rem",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor =
                                            "#f8fafc";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor =
                                            "transparent";
                                        }}
                                      >
                                        <div>
                                          <div
                                            style={{
                                              fontWeight: 500,
                                              color: "#1e293b",
                                              fontSize: "0.95rem",
                                            }}
                                          >
                                            {opt.name}
                                          </div>
                                          <div
                                            style={{
                                              fontSize: "0.8rem",
                                              color: "#64748b",
                                            }}
                                          >
                                            {opt.role.replace(/_/g, " ")}{" "}
                                            • {opt.email}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}
                              {!recipientLoading &&
                                recipientSearch &&
                                recipientOptions.filter(
                                  (opt) => !form.target_users.includes(opt._id)
                                ).length === 0 && (
                                  <div
                                    style={{
                                      padding: "0.75rem",
                                      color: "#64748b",
                                      fontSize: "0.85rem",
                                      textAlign: "center",
                                    }}
                                  >
                                    No eligible recipients found
                                  </div>
                              )}
                              {form.target_users.length > 0 && (
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "0.5rem",
                                    marginTop: "0.75rem",
                                  }}
                                >
                                  {form.target_users.map((userId) => {
                                    const user = recipientOptions.find(
                                      (opt) => opt._id === userId
                                    );
                                    return (
                                      <span
                                        key={userId}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.4rem",
                                          padding: "0.4rem 0.75rem",
                                          backgroundColor: "#dbeafe",
                                          color: "#1e40af",
                                          borderRadius: "20px",
                                          fontSize: "0.85rem",
                                          fontWeight: 500,
                                        }}
                                      >
                                        {user ? user.name : userId}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setForm((prev) => ({
                                              ...prev,
                                              target_users: prev.target_users.filter(
                                                (id) => id !== userId
                                              ),
                                            }));
                                          }}
                                          style={{
                                            background: "none",
                                            border: "none",
                                            color: "#1e40af",
                                            cursor: "pointer",
                                            padding: 0,
                                            display: "flex",
                                            alignItems: "center",
                                          }}
                                        >
                                          <FaTimesCircle size={12} />
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    )}

                    {/* Submit Buttons */}
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        justifyContent: "flex-end",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleBackClick}
                        style={{
                          padding: "0.875rem 1.5rem",
                          borderRadius: "12px",
                          border: "2px solid #e2e8f0",
                          backgroundColor: "white",
                          color: "#64748b",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          transition: "all 0.3s ease",
                        }}
                      >
                        <FaArrowLeft /> Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        style={{
                          padding: "0.875rem 1.5rem",
                          borderRadius: "12px",
                          border: "none",
                          backgroundColor: saving
                            ? "#94a3b8"
                            : BRAND_COLORS.primary.main,
                          color: "white",
                          fontWeight: 600,
                          cursor: saving ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          transition: "all 0.3s ease",
                        }}
                      >
                        {saving ? (
                          <>
                            <FaSyncAlt className="spinning" />{" "}
                            {mode === "create" ? "Creating..." : "Saving..."}
                          </>
                        ) : (
                          <>
                            {mode === "create" ? <FaPaperPlane /> : <FaSave />}
                            {mode === "create"
                              ? "Send Notification"
                              : "Update Notification"}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>

            {/* ================= PREVIEW CARD ================= */}
            {showPreview && (
              <motion.div
                variants={fadeInVariants}
                initial="hidden"
                animate="visible"
                style={{
                  flex: "0 0 calc(41.667% - 0.75rem)",
                  maxWidth: "calc(41.667% - 0.75rem)",
                }}
              >
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "20px",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
                    overflow: "hidden",
                    position: "sticky",
                    top: "1.5rem",
                  }}
                >
                  {/* Preview Header */}
                  <div
                    style={{
                      padding: "1.5rem",
                      background:
                        "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                      borderBottom: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        backgroundColor: `${BRAND_COLORS.primary.main}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: BRAND_COLORS.primary.main,
                        fontSize: "1.5rem",
                      }}
                    >
                      <FaEye />
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#1e293b",
                      }}
                    >
                      Live Preview
                    </h2>
                  </div>

                  {/* Preview Content */}
                  <div style={{ padding: "1.5rem" }}>
                    {/* Type & Priority Badges */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        marginBottom: "1rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.375rem 0.875rem",
                          borderRadius: "20px",
                          backgroundColor: typeConfig.bg,
                          color: typeConfig.color,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                        }}
                      >
                        <TypeIcon size={14} />
                        {typeConfig.label}
                      </div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          padding: "0.375rem 0.875rem",
                          borderRadius: "20px",
                          backgroundColor: priorityConfig.bg,
                          color: priorityConfig.color,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                        }}
                      >
                        {form.priority === "URGENT" && (
                          <FaExclamationTriangle size={12} />
                        )}
                        {priorityConfig.label}
                      </div>
                    </div>

                    {/* Title Preview */}
                    <h3
                      style={{
                        margin: "0 0 0.75rem",
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "#1e293b",
                      }}
                    >
                      {form.title || "Notification Title"}
                    </h3>

                    {/* Message Preview */}
                    <div
                      style={{
                        fontSize: "0.95rem",
                        lineHeight: 1.6,
                        color: "#64748b",
                        marginBottom: "1.5rem",
                        whiteSpace: "pre-wrap",
                        minHeight: "100px",
                      }}
                    >
                      {form.message ||
                        "Your notification message will appear here..."}
                    </div>

                    {/* Expiry Preview */}
                    {form.expiresAt && (
                      <div
                        style={{
                          padding: "0.75rem",
                          backgroundColor: "#fef3c7",
                          borderRadius: "10px",
                          fontSize: "0.85rem",
                          color: "#92400e",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <FaCalendarAlt size={14} />
                        Expires:{" "}
                        {new Date(form.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ================= CONFIRM MODAL ================= */}
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

        {/* Spinner Animation */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .spinning {
            animation: spin 1s linear infinite;
          }

          /* ================= RESPONSIVE STYLES ================= */
          @media (max-width: 1023.98px) {
            /* Collapse two-column layout to single column */
            div[style*="flex: 0 0 calc(58.333%"] {
              flex: 0 0 100% !important;
              max-width: 100% !important;
            }

            div[style*="flex: 0 0 calc(41.667%"] {
              flex: 0 0 100% !important;
              max-width: 100% !important;
              position: static !important;
            }
          }

          @media (max-width: 767.98px) {
            /* Reduce padding on mobile */
            div[style*="padding: 1.75rem"] {
              padding: 1rem !important;
            }

            div[style*="padding: 2rem"] {
              padding: 1.25rem !important;
            }

            /* Reduce icon size */
            div[style*="width: 48px"][style*="height: 48px"] {
              width: 40px !important;
              height: 40px !important;
              font-size: 1.25rem !important;
            }

            /* Reduce heading size */
            h2[style*="fontSize: 1.5rem"] {
              font-size: 1.25rem !important;
            }
          }

          @media (max-width: 479.98px) {
            /* Further reduce padding for small screens */
            div[style*="padding: 1.25rem"] {
              padding: 1rem !important;
            }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
