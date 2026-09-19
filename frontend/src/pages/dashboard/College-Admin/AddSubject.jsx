import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";

import {
  FaBookOpen,
  FaUniversity,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt,
  FaInfoCircle,
  FaGraduationCap,
  FaLayerGroup,
  FaCreditCard,
  FaCode,
  FaRobot,
  FaKeyboard,
  FaShieldAlt,
  FaCalendarAlt,
  FaRegClock,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

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
};

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: "easeOut" },
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

export default function AddSubject() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

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

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);

  // College Code Generation State
  const [codeGenerationMode, setCodeGenerationMode] = useState("auto"); // 'auto' or 'manual'
  const [generatedCodePreview, setGeneratedCodePreview] = useState("");

  const [formData, setFormData] = useState({
    department_id: "",
    course_id: "",
    name: "",
    code: "",
    semester: "",
    credits: "",
    subjectType: "",
    internalMaxMarks: "",
    externalMaxMarks: "",
    internalPassMarks: "",
    externalPassMarks: "",
    passMarks: "",
  });

  // ✅ Get selected course for UI display (with safety check)
  const selectedCourse =
    Array.isArray(courses) && courses.length > 0
      ? courses.find((c) => c._id === formData.course_id)
      : null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  /* ================= LOAD DEPARTMENTS ================= */
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments");
        setDepartments(res.data);
      } catch (err) {
        setError("Failed to load departments. Please try again later.");
      }
    };
    fetchDepartments();
  }, []);

  /* ================= LOAD COURSES BY DEPARTMENT ================= */
  useEffect(() => {
    if (!formData.department_id) {
      setCourses([]);
      setFormData((prev) => ({ ...prev, course_id: "" }));
      return;
    }

    const fetchCourses = async () => {
      try {
        const res = await api.get(
          `/courses/department/${formData.department_id}`,
        );
        // Ensure courses is always an array
        const coursesData = (Array.isArray(res.data)
          ? res.data
          : res.data?.courses || [])
          .filter((c) => c.status === "ACTIVE");
        setCourses(coursesData);
      } catch (err) {
        setCourses([]);
      }
    };
    fetchCourses();
  }, [formData.department_id]);

  /* ================= AUTO-GENERATE CODE PREVIEW ================= */
  useEffect(() => {
    if (codeGenerationMode === "auto" && formData.name && formData.course_id) {
      const course = courses.find((c) => c._id === formData.course_id);
      const courseCode = course?.code?.substring(0, 3).toUpperCase() || "SUB";
      const subjectInitials = formData.name
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .substring(0, 4)
        .toUpperCase();

      const semesterPart = formData.semester ? `S${formData.semester}` : "S0";
      const timestampPart = Date.now().toString().slice(-4);

      const generatedCode = `${courseCode}-${subjectInitials}-${semesterPart}-${timestampPart}`;
      setGeneratedCodePreview(generatedCode);
      setFormData((prev) => ({ ...prev, code: generatedCode }));
    } else if (codeGenerationMode === "manual") {
      setGeneratedCodePreview("");
    }
  }, [
    formData.name,
    formData.course_id,
    formData.semester,
    codeGenerationMode,
    courses,
  ]);

  /* ================= FORM VALIDATION ================= */
  const validateForm = () => {
    const errors = {};
    let isValid = true;

    const requiredFields = [
      "department_id",
      "course_id",
      "name",
      "code",
      "semester",
      "credits",
    ];

    requiredFields.forEach((field) => {
      if (!formData[field] || formData[field].trim() === "") {
        errors[field] =
          `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} is required`;
        isValid = false;
      }
    });

    // Semester validation - check against course duration
    const semesterNum = Number(formData.semester);
    const maxSemesters = selectedCourse?.durationSemesters || 8;

    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > maxSemesters) {
      errors.semester = `Semester must be between 1-${maxSemesters} (course duration)`;
      isValid = false;
    }

    // Credits validation
    const creditsNum = Number(formData.credits);
    if (isNaN(creditsNum) || creditsNum < 1 || creditsNum > 6) {
      errors.credits = "Credits must be between 1-6";
      isValid = false;
    }

    // Exam / Marks Configuration validation (UI only; backend is authoritative)
    if (formData.subjectType) {
      const VALID_TYPES = ["THEORY", "PRACTICAL", "COMPOSITE"];
      if (!VALID_TYPES.includes(formData.subjectType)) {
        errors.subjectType = "Select a valid subject type";
        isValid = false;
      } else {
        const numField = (field, label) => {
          const v = formData[field];
          if (v === "" || v === null || v === undefined) {
            errors[field] = `${label} is required`;
            isValid = false;
            return;
          }
          const n = Number(v);
          if (isNaN(n) || n < 0) {
            errors[field] = `${label} must be a non-negative number`;
            isValid = false;
          }
        };

        if (formData.subjectType === "THEORY") {
          numField("internalMaxMarks", "Internal Max Marks");
          numField("externalMaxMarks", "External Max Marks");
          numField("internalPassMarks", "Internal Pass Marks");
          numField("externalPassMarks", "External Pass Marks");
        } else if (formData.subjectType === "PRACTICAL") {
          numField("internalMaxMarks", "Applicable Maximum Marks");
          numField("passMarks", "Pass Marks");
        } else if (formData.subjectType === "COMPOSITE") {
          numField("internalMaxMarks", "Internal Max Marks");
          numField("externalMaxMarks", "External Max Marks");
          numField("passMarks", "Pass Marks");
        }
      }
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Special handling for code field in manual mode
    if (name === "code" && codeGenerationMode === "manual") {
      setGeneratedCodePreview("");
    }
  };

  const handleCodeModeChange = (mode) => {
    setCodeGenerationMode(mode);
    if (mode === "auto") {
      // Trigger auto-generation
      setFormData((prev) => ({ ...prev, code: generatedCodePreview }));
    } else {
      // Clear preview but keep current code value for manual editing
      setGeneratedCodePreview("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setError("Please fix the errors before submitting");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/subjects", {
        course_id: formData.course_id,
        name: formData.name.trim(),
        code: formData.code.trim(),
        semester: Number(formData.semester),
        credits: Number(formData.credits),
        subjectType: formData.subjectType || undefined,
        ...(formData.internalMaxMarks !== ""
          ? { internalMaxMarks: Number(formData.internalMaxMarks) }
          : {}),
        ...(formData.externalMaxMarks !== ""
          ? { externalMaxMarks: Number(formData.externalMaxMarks) }
          : {}),
        ...(formData.internalPassMarks !== ""
          ? { internalPassMarks: Number(formData.internalPassMarks) }
          : {}),
        ...(formData.externalPassMarks !== ""
          ? { externalPassMarks: Number(formData.externalPassMarks) }
          : {}),
        ...(formData.passMarks !== ""
          ? { passMarks: Number(formData.passMarks) }
          : {}),
      });

      setSuccess("Subject created successfully!");

      // Reset form after success
      setTimeout(() => {
        const courseId = formData.course_id;
        setFormData({
          department_id: "",
          course_id: "",
          name: "",
          code: "",
          semester: "",
          credits: "",
        });
        setCodeGenerationMode("auto");
        setGeneratedCodePreview("");
        // Navigate to the course-specific subject list
        navigate(`/subjects/course/${courseId}`);
      }, 2000);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        logger.error("Auth error creating subject:", statusCode, errorCode);
        setError({
          message: "Authentication error occurred.",
          statusCode,
          errorCode,
        });
      } else {
        const backendMessage = err.response?.data?.error?.message || err.response?.data?.message;

        let errorMessage = backendMessage || "Failed to create subject. Please try again.";

        if (!backendMessage && err.response?.status === 500) {
          errorMessage = "Server error. Please contact system administrator.";
        }

        setError(errorMessage);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="erp-page erp-viewport-min-100 add-subject-page"
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
          paddingTop: "1.5rem",
          paddingBottom: "2rem",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {error && typeof error === 'object' && !loading && (
            <ApiError
              title="Subject Creation Error"
              message={error.message}
              statusCode={error.statusCode}
              errorCode={error.errorCode}
              onGoBack={() => navigate(-1)}
            />
          )}
          {/* ================= BREADCRUMB ================= */}
          <div
            style={{
              width: "100%",
              margin: "10px auto",
              paddingTop: "2px",
              height: "60px",
            }}
          >
            <div style={{ width: "100%" }}>
              <Breadcrumb
                items={[
                  { label: "Dashboard", path: "/dashboard" },
                  { label: "Subjects", path: "/subjects" },
                  { label: "Add New Subject" },
                ]}
              />
            </div>
          </div>

          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="add-subject-hero"
            style={{
              marginBottom: "2rem",
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
                padding: "2rem",
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
                    width: "80px",
                    height: "80px",
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.5rem",
                    flexShrink: 0,
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <FaBookOpen />
                </motion.div>
                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "2.25rem",
                      fontWeight: 700,
                      lineHeight: 1.1,
                    }}
                  >
                    Add New Subject
                  </h1>
                  <p
                    style={{
                      margin: "0.75rem 0 0 0",
                      opacity: 0.9,
                      fontSize: "1.25rem",
                    }}
                  >
                    Create academic subject with department and course
                    assignment
                  </p>
                </div>
              </div>
            </div>

            {/* Info Banner */}
            <div
              className="add-subject-workflow"
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
                <div
                  style={{ color: "#1e293b", fontWeight: 500, lineHeight: 1.5 }}
                >
                  <strong>Workflow:</strong> Select Department → Choose Course →
                  Enter Subject Details → Generate/Enter Subject Code
                </div>
            </div>
          </motion.div>

          {/* ================= ALERTS ================= */}
          {error && typeof error === 'string' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: "1.5rem",
                padding: "1.25rem",
                borderRadius: "16px",
                backgroundColor: `${BRAND_COLORS.danger.main}0a`,
                border: `1px solid ${BRAND_COLORS.danger.main}`,
                color: BRAND_COLORS.danger.main,
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                fontSize: "1.05rem",
                fontWeight: 500,
              }}
            >
              <FaExclamationTriangle size={24} />
              <div>{error}</div>
              <button
                onClick={() => setError("")}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  color: "inherit",
                  cursor: "pointer",
                  marginLeft: "auto",
                }}
              >
                ×
              </button>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: "1.5rem",
                padding: "1.25rem",
                borderRadius: "16px",
                backgroundColor: `${BRAND_COLORS.success.main}0a`,
                border: `1px solid ${BRAND_COLORS.success.main}`,
                color: BRAND_COLORS.success.main,
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                fontSize: "1.05rem",
                fontWeight: 500,
              }}
            >
              <FaCheckCircle size={24} />
              <div>{success}</div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row g-4">
              {/* ================= ACADEMIC HIERARCHY CARD ================= */}
              <motion.div
                variants={fadeInVariants}
                custom={0}
                initial="hidden"
                animate="visible"
                className="col-12"
              >
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "20px",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
                    overflow: "hidden",
                  }}
                >
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
                      <FaUniversity />
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#1e293b",
                      }}
                    >
                      Academic Hierarchy
                    </h2>
                  </div>

                  <div className="p-4">
                    <div className="row g-4">
                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaUniversity />}
                          label="Department"
                          required
                          error={validationErrors.department_id}
                          helperText="Select the academic department"
                        >
                          <select
                            name="department_id"
                            value={formData.department_id}
                            onChange={handleChange}
                            className="form-control"
                            required
                          >
                            <option value="">Select department</option>
                            {departments.map((dept) => (
                              <option key={dept._id} value={dept._id}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                        </FormField>
                      </div>

                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaGraduationCap />}
                          label="Course"
                          required
                          error={validationErrors.course_id}
                          helperText={
                            formData.department_id
                              ? `${courses.length} courses available`
                              : "Select department first"
                          }
                        >
                          <select
                            name="course_id"
                            value={formData.course_id}
                            onChange={handleChange}
                            className="form-control"
                            disabled={!formData.department_id}
                            required
                          >
                            <option value="">Select course</option>
                            {Array.isArray(courses) &&
                              courses.map((course) => (
                                <option key={course._id} value={course._id}>
                                  {course.name} ({course.code})
                                </option>
                              ))}
                          </select>
                        </FormField>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ================= SUBJECT DETAILS CARD ================= */}
              <motion.div
                variants={fadeInVariants}
                custom={1}
                initial="hidden"
                animate="visible"
                style={{ gridColumn: "1 / -1" }}
              >
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "20px",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "1.75rem",
                      background:
                        "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                      borderBottom: "1px solid #bbf7d0",
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
                        backgroundColor: `${BRAND_COLORS.success.main}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: BRAND_COLORS.success.main,
                        fontSize: "1.5rem",
                        flexShrink: 0,
                      }}
                    >
                      <FaBookOpen />
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#1e293b",
                      }}
                    >
                      Subject Details
                    </h2>
                  </div>

                  <div className="p-4">
                    <div className="row g-4">
                      <div className="col-12 col-md-8">
                        <FormField
                          icon={<FaBookOpen />}
                          label="Subject Name"
                          required
                          error={validationErrors.name}
                        >
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="form-control"
                            placeholder="e.g., Data Structures and Algorithms"
                            required
                          />
                        </FormField>
                      </div>

                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaLayerGroup />}
                          label="Semester"
                          required
                          error={validationErrors.semester}
                          helperText={`Subject semester (1-${selectedCourse?.durationSemesters || 8})`}
                        >
                          <select
                            name="semester"
                            value={formData.semester}
                            onChange={handleChange}
                            className="form-control"
                            required
                          >
                            <option value="">Select semester</option>
                            {Array.from(
                              {
                                length: selectedCourse?.durationSemesters || 8,
                              },
                              (_, i) => i + 1,
                            ).map((sem) => (
                              <option key={sem} value={sem}>
                                Semester {sem}
                              </option>
                            ))}
                          </select>
                        </FormField>
                      </div>

                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaCreditCard />}
                          label="Credits"
                          required
                          error={validationErrors.credits}
                          helperText="Academic credits (1-6)"
                        >
                          <select
                            name="credits"
                            value={formData.credits}
                            onChange={handleChange}
                            className="form-control"
                            required
                          >
                            <option value="">Select credits</option>
                            {[1, 2, 3, 4, 5, 6].map((credit) => (
                              <option key={credit} value={credit}>
                                {credit} Credit{credit > 1 ? "s" : ""}
                              </option>
                            ))}
                          </select>
                        </FormField>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ================= SUBJECT CODE CARD ================= */}
              <motion.div
                variants={fadeInVariants}
                custom={2}
                initial="hidden"
                animate="visible"
                style={{ gridColumn: "1 / -1" }}
              >
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "20px",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "1.75rem",
                      background:
                        "linear-gradient(135deg, #ffedd5 0%, #ffeddb 100%)",
                      borderBottom: "1px solid #fed7aa",
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
                        backgroundColor: `${BRAND_COLORS.warning.main}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: BRAND_COLORS.warning.main,
                        fontSize: "1.5rem",
                        flexShrink: 0,
                      }}
                    >
                      <FaCode />
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#1e293b",
                      }}
                    >
                      Subject Code Configuration
                    </h2>
                  </div>

                  <div style={{ padding: "2rem" }}>
                    {/* Code Generation Mode Toggle */}
                    <div
                      className="code-generation-method"
                      style={{
                        marginBottom: "1.5rem",
                        padding: "1.25rem",
                        borderRadius: "16px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <h4
                        style={{
                          margin: "0 0 1rem 0",
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          color: "#1e293b",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <FaInfoCircle
                          size={18}
                          style={{ color: BRAND_COLORS.primary.main }}
                        />
                        Code Generation Method
                      </h4>

                      <div
                        className="code-generation-options"
                        style={{
                          display: "flex",
                          gap: "1.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          className="code-mode-option"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "1rem",
                            borderRadius: "12px",
                            border:
                              codeGenerationMode === "auto"
                                ? `2px solid ${BRAND_COLORS.success.main}`
                                : "1px solid #cbd5e1",
                            backgroundColor:
                              codeGenerationMode === "auto"
                                ? `${BRAND_COLORS.success.main}08`
                                : "white",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            flex: 1,
                            minWidth: "150px",
                          }}
                          onClick={() => handleCodeModeChange("auto")}
                        >
                          <div
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              border: `2px solid ${BRAND_COLORS.success.main}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor:
                                codeGenerationMode === "auto"
                                  ? BRAND_COLORS.success.main
                                  : "transparent",
                            }}
                          >
                            {codeGenerationMode === "auto" && (
                              <div
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  backgroundColor: "white",
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "#1e293b",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                            >
                              <FaRobot /> Auto-Generate
                            </div>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "#64748b",
                                marginTop: "0.25rem",
                              }}
                            >
                              System creates unique code based on course and
                              subject
                            </div>
                          </div>
                        </div>

                        <div
                        className="code-mode-option"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "1rem",
                            borderRadius: "12px",
                            border:
                              codeGenerationMode === "manual"
                                ? `2px solid ${BRAND_COLORS.primary.main}`
                                : "1px solid #cbd5e1",
                            backgroundColor:
                              codeGenerationMode === "manual"
                                ? `${BRAND_COLORS.primary.main}08`
                                : "white",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            flex: 1,
                            minWidth: "150px",
                          }}
                          onClick={() => handleCodeModeChange("manual")}
                        >
                          <div
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              border: `2px solid ${BRAND_COLORS.primary.main}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor:
                                codeGenerationMode === "manual"
                                  ? BRAND_COLORS.primary.main
                                  : "transparent",
                            }}
                          >
                            {codeGenerationMode === "manual" && (
                              <div
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  backgroundColor: "white",
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "#1e293b",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                            >
                              <FaKeyboard /> Manual Entry
                            </div>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "#64748b",
                                marginTop: "0.25rem",
                              }}
                            >
                              Enter custom subject code manually
                            </div>
                          </div>
                        </div>
                      </div>

                      {codeGenerationMode === "auto" &&
                        generatedCodePreview && (
                          <div
                            className="generated-code-preview"
                            style={{
                              marginTop: "1rem",
                              padding: "1rem",
                              borderRadius: "12px",
                              backgroundColor: "#dcfce7",
                              border: "1px solid #bbf7d0",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                            }}
                          >
                            <FaRobot
                              size={20}
                              style={{ color: BRAND_COLORS.success.main }}
                            />
                            <div>
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: "#064e3b",
                                  fontSize: "0.95rem",
                                }}
                              >
                                Auto-Generated Code Preview:
                              </div>
                              <div
                                style={{
                                  marginTop: "0.25rem",
                                  fontSize: "1.5rem",
                                  fontWeight: 800,
                                  color: BRAND_COLORS.success.main,
                                  letterSpacing: "1px",
                                  fontFamily: "monospace",
                                }}
                              >
                                {generatedCodePreview}
                              </div>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Subject Code Field */}
                    <FormField
                      icon={<FaCode />}
                      label="Subject Code"
                      required
                      error={validationErrors.code}
                      helperText={
                        codeGenerationMode === "auto"
                          ? "Code auto-generated based on course and subject name. Click 'Manual Entry' to customize."
                          : "Enter unique subject code (e.g., CS301-DSA)"
                      }
                    >
                      <div
                      className="subject-code-input-wrap"
                      style={{ position: "relative" }}>
                        <input
                          type="text"
                          name="code"
                          value={formData.code}
                          onChange={handleChange}
                          style={{
                            ...inputStyle,
                            backgroundColor:
                              codeGenerationMode === "auto"
                                ? "#f1f5f9"
                                : "white",
                            borderColor:
                              codeGenerationMode === "auto"
                                ? "#cbd5e1"
                                : "#e2e8f0",
                            color:
                              codeGenerationMode === "auto"
                                ? "#64748b"
                                : "#1e293b",
                            fontWeight:
                              codeGenerationMode === "auto" ? 600 : 500,
                          }}
                          placeholder={
                            codeGenerationMode === "auto"
                              ? "Auto-generated code will appear here"
                              : "Enter subject code (e.g., CS301)"
                          }
                          required
                          disabled={codeGenerationMode === "auto"}
                        />
                        {codeGenerationMode === "auto" && (
                          <div
                            style={{
                              position: "absolute",
                              right: "15px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: BRAND_COLORS.success.main,
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontSize: "0.85rem",
                              fontWeight: 600,
                            }}
                          >
                            <FaRobot size={14} />
                            AUTO
                          </div>
                        )}
                      </div>

                      <div
                       className="security-note"
                        style={{
                          marginTop: "0.75rem",
                          padding: "0.75rem",
                          borderRadius: "10px",
                          backgroundColor: "#f8fafc",
                          borderLeft: `3px solid ${BRAND_COLORS.info.main}`,
                          fontSize: "0.85rem",
                          color: "#4a5568",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.5rem",
                          }}
                        >
                          <FaShieldAlt
                            size={16}
                            style={{ marginTop: "0.25rem", flexShrink: 0 }}
                          />
                          <div>
                            <strong>Security Note:</strong> Subject codes must
                            be unique within the course. Auto-generation ensures
                            no duplicates. Manual entries are validated before
                            submission.
                          </div>
                        </div>
                      </div>
                    </FormField>
                  </div>
                </div>
              </motion.div>
            </div>

              {/* ================= EXAM / MARKS CONFIGURATION CARD ================= */}
              <motion.div
                variants={fadeInVariants}
                custom={3}
                initial="hidden"
                animate="visible"
                style={{ gridColumn: "1 / -1" }}
              >
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "20px",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "1.75rem",
                      background:
                        "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
                      borderBottom: "1px solid #c7d2fe",
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
                      <FaLayerGroup />
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#1e293b",
                      }}
                    >
                      Exam / Marks Configuration
                    </h2>
                  </div>

                  <div className="p-4">
                    <div className="row g-4">
                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaLayerGroup />}
                          label="Subject Type"
                          required
                          error={validationErrors.subjectType}
                          helperText="Determines which marks fields apply"
                        >
                          <select
                            name="subjectType"
                            value={formData.subjectType}
                            onChange={handleChange}
                            className="form-control"
                            required
                          >
                            <option value="">Select subject type</option>
                            <option value="THEORY">THEORY</option>
                            <option value="PRACTICAL">PRACTICAL</option>
                            <option value="COMPOSITE">COMPOSITE</option>
                          </select>
                        </FormField>
                      </div>

                      {formData.subjectType === "THEORY" && (
                        <>
                          <div className="col-12 col-md-6 col-lg-4">
                            <FormField
                              icon={<FaBookOpen />}
                              label="Internal Max Marks"
                              required
                              error={validationErrors.internalMaxMarks}
                            >
                              <input
                                type="number"
                                name="internalMaxMarks"
                                value={formData.internalMaxMarks}
                                onChange={handleChange}
                                className="form-control"
                                placeholder="30"
                                min="0"
                              />
                            </FormField>
                          </div>
                          <div className="col-12 col-md-6 col-lg-4">
                            <FormField
                              icon={<FaUniversity />}
                              label="External Max Marks"
                              required
                              error={validationErrors.externalMaxMarks}
                            >
                              <input
                                type="number"
                                name="externalMaxMarks"
                                value={formData.externalMaxMarks}
                                onChange={handleChange}
                                className="form-control"
                                placeholder="70"
                                min="0"
                              />
                            </FormField>
                          </div>
                          <div className="col-12 col-md-6 col-lg-4">
                            <FormField
                              icon={<FaCreditCard />}
                              label="Internal Pass Marks"
                              required
                              error={validationErrors.internalPassMarks}
                            >
                              <input
                                type="number"
                                name="internalPassMarks"
                                value={formData.internalPassMarks}
                                onChange={handleChange}
                                className="form-control"
                                placeholder="12"
                                min="0"
                              />
                            </FormField>
                          </div>
                          <div className="col-12 col-md-6 col-lg-4">
                            <FormField
                              icon={<FaCreditCard />}
                              label="External Pass Marks"
                              required
                              error={validationErrors.externalPassMarks}
                            >
                              <input
                                type="number"
                                name="externalPassMarks"
                                value={formData.externalPassMarks}
                                onChange={handleChange}
                                className="form-control"
                                placeholder="28"
                                min="0"
                              />
                            </FormField>
                          </div>
                        </>
                      )}

                      {formData.subjectType === "PRACTICAL" && (
                        <>
                          <div className="col-12 col-md-6 col-lg-4">
                            <FormField
                              icon={<FaBookOpen />}
                              label="Applicable Maximum Marks"
                              required
                              error={validationErrors.internalMaxMarks}
                            >
                              <input
                                type="number"
                                name="internalMaxMarks"
                                value={formData.internalMaxMarks}
                                onChange={handleChange}
                                className="form-control"
                                placeholder="100"
                                min="0"
                              />
                            </FormField>
                          </div>
                          <div className="col-12 col-md-6 col-lg-4">
                            <FormField
                              icon={<FaCreditCard />}
                              label="Pass Marks"
                              required
                              error={validationErrors.passMarks}
                            >
                              <input
                                type="number"
                                name="passMarks"
                                value={formData.passMarks}
                                onChange={handleChange}
                                className="form-control"
                                placeholder="40"
                                min="0"
                              />
                            </FormField>
                          </div>
                        </>
                      )}

                      {formData.subjectType === "COMPOSITE" && (
                        <>
                          <div className="col-12 col-md-6 col-lg-4">
                            <FormField
                              icon={<FaBookOpen />}
                              label="Internal Max Marks"
                              required
                              error={validationErrors.internalMaxMarks}
                            >
                              <input
                                type="number"
                                name="internalMaxMarks"
                                value={formData.internalMaxMarks}
                                onChange={handleChange}
                                className="form-control"
                                placeholder="40"
                                min="0"
                              />
                            </FormField>
                          </div>
                          <div className="col-12 col-md-6 col-lg-4">
                            <FormField
                              icon={<FaUniversity />}
                              label="External Max Marks"
                              required
                              error={validationErrors.externalMaxMarks}
                            >
                              <input
                                type="number"
                                name="externalMaxMarks"
                                value={formData.externalMaxMarks}
                                onChange={handleChange}
                                className="form-control"
                                placeholder="60"
                                min="0"
                              />
                            </FormField>
                          </div>
                          <div className="col-12 col-md-6 col-lg-4">
                            <FormField
                              icon={<FaCreditCard />}
                              label="Pass Marks"
                              required
                              error={validationErrors.passMarks}
                            >
                              <input
                                type="number"
                                name="passMarks"
                                value={formData.passMarks}
                                onChange={handleChange}
                                className="form-control"
                                placeholder="50"
                                min="0"
                              />
                            </FormField>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ================= SUBMIT BUTTON ================= */}
            <motion.div
              variants={fadeInVariants}
              custom={3}
              initial="hidden"
              animate="visible"
              style={{
                marginTop: "2rem",
                display: "flex",
                justifyContent: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  // Navigate to course-specific subject list if course selected, otherwise general list
                  if (formData.course_id) {
                    navigate(`/subjects/course/${formData.course_id}`);
                  } else {
                    navigate("/subjects");
                  }
                }}
                disabled={loading}
                style={{
                  padding: "1rem 2rem",
                  borderRadius: "16px",
                  border: "2px solid #e2e8f0",
                  backgroundColor: "white",
                  color: "#1e293b",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                <FaArrowLeft /> Cancel
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                style={{
                  padding: "1rem 2rem",
                  borderRadius: "16px",
                  border: "none",
                  backgroundColor: loading
                    ? "#94a3b8"
                    : BRAND_COLORS.primary.main,
                  color: "white",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "all 0.3s ease",
                  boxShadow: loading
                    ? "none"
                    : "0 6px 20px rgba(26, 75, 109, 0.35)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {loading ? (
                  <>
                    <motion.div variants={spinVariants} animate="animate">
                      <FaSyncAlt size={20} />
                    </motion.div>
                    Creating Subject...
                  </>
                ) : (
                  <>
                    <FaBookOpen size={20} /> Create Subject
                  </>
                )}
                {!loading && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "4px",
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                      animation: "shimmer 2s infinite",
                    }}
                  />
                )}
              </motion.button>
            </motion.div>
          </form>
        </div>

        {/* ================= STYLES ================= */}
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @media (prefers-reduced-motion) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
/* =========================================================
   ADD SUBJECT - MOBILE & TABLET
   DESKTOP DESIGN REMAINS UNCHANGED
   ========================================================= */


/* =========================================================
   TABLET
   768px - 1024px
   ========================================================= */

@media (min-width: 768px) and (max-width: 1024px) {

  .add-subject-page {
    padding: 1rem !important;
    overflow-x: hidden !important;
  }

  .add-subject-page > div {
    width: 100% !important;
    max-width: 900px !important;
    margin: 0 auto !important;
  }


  /* ================= BREADCRUMB ================= */

  .add-subject-page .breadcrumb {
    width: 100% !important;
    max-width: 100% !important;
  }


  /* ================= HERO ================= */

  .add-subject-hero {
    margin-bottom: 1.25rem !important;
    border-radius: 18px !important;
  }

  .add-subject-hero > div:first-child {
    padding: 1.4rem 1.5rem !important;
    gap: 1rem !important;
  }

  .add-subject-hero > div:first-child > div:first-child {
    gap: 1rem !important;
  }

  .add-subject-hero h1 {
    font-size: 1.8rem !important;
    line-height: 1.15 !important;
  }

  .add-subject-hero p {
    font-size: 0.95rem !important;
    line-height: 1.45 !important;
    margin-top: 0.5rem !important;
  }

  .add-subject-hero > div:first-child
  > div:first-child
  > div:first-child {
    width: 64px !important;
    height: 64px !important;
    min-width: 64px !important;
    border-radius: 16px !important;
    font-size: 2rem !important;
  }


  /* ================= WORKFLOW ================= */

  .add-subject-workflow {
    padding: 0.9rem 1.25rem !important;
    gap: 0.75rem !important;
  }

  .add-subject-workflow > div {
    font-size: 0.85rem !important;
    line-height: 1.45 !important;
  }


  /* ================= FORM CARDS ================= */

  .add-subject-page form > .row {
    --bs-gutter-y: 1rem !important;
  }

  .add-subject-page form > .row > [class*="col-"] > div {
    border-radius: 16px !important;
    box-shadow: 0 6px 24px rgba(15, 23, 42, 0.07) !important;
  }


  /* Card header */

  .add-subject-page form > .row > [class*="col-"] > div
  > div:first-child {
    padding: 1.1rem 1.25rem !important;
    gap: 0.75rem !important;
  }

  .add-subject-page form > .row > [class*="col-"] > div
  > div:first-child > div {
    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;
    border-radius: 10px !important;
    font-size: 1.2rem !important;
  }

  .add-subject-page form > .row > [class*="col-"] > div
  > div:first-child h2 {
    font-size: 1.15rem !important;
  }


  /* Card body */

  .add-subject-page form > .row > [class*="col-"] > div
  > div:last-child {
    padding: 1.25rem !important;
  }


  /* Inputs */

  .add-subject-page .form-control {
    min-height: 46px !important;
    font-size: 0.9rem !important;
    border-radius: 10px !important;
  }


  /* ================= CODE GENERATION ================= */

  .code-generation-method {
    padding: 1rem !important;
    border-radius: 14px !important;
  }

  .code-generation-options {
    gap: 0.75rem !important;
  }

  .code-mode-option {
    min-width: 0 !important;
    padding: 0.85rem !important;
    border-radius: 11px !important;
  }

  .code-mode-option > div:last-child {
    min-width: 0 !important;
  }

  .code-mode-option > div:last-child > div:last-child {
    font-size: 0.78rem !important;
    line-height: 1.4 !important;
  }

  .generated-code-preview {
    padding: 0.85rem !important;
  }

  .subject-code-input-wrap input {
    padding-right: 75px !important;
  }
}


/* =========================================================
   MOBILE
   0 - 767px
   ========================================================= */

@media (max-width: 767px) {

  .add-subject-page {
    width: 100% !important;
    max-width: 100% !important;
    padding: 0.55rem !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
  }

  .add-subject-page > div {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
  }


  /* =====================================================
     BREADCRUMB
     ===================================================== */

  .add-subject-page .breadcrumb {
    width: 100% !important;
    max-width: 100% !important;
    min-height: 42px !important;
    border-radius: 10px !important;
    overflow-x: auto !important;
    white-space: nowrap !important;
    scrollbar-width: none !important;
    font-size: 0.75rem !important;
  }

  .add-subject-page .breadcrumb::-webkit-scrollbar {
    display: none !important;
  }


  /* =====================================================
     HERO
     ===================================================== */

  .add-subject-hero {
    width: 100% !important;
    margin-bottom: 0.75rem !important;
    border-radius: 14px !important;
    box-shadow: 0 5px 18px rgba(15, 23, 42, 0.09) !important;
  }


  /* Blue hero */

  .add-subject-hero > div:first-child {
    padding: 1rem !important;
    gap: 0.7rem !important;
    flex-wrap: nowrap !important;
  }


  /* Hero inner */

  .add-subject-hero > div:first-child > div:first-child {
    width: 100% !important;
    gap: 0.7rem !important;
    align-items: center !important;
  }


  /* Hero icon */

  .add-subject-hero > div:first-child
  > div:first-child
  > div:first-child {
    width: 48px !important;
    height: 48px !important;
    min-width: 48px !important;
    border-radius: 12px !important;
    font-size: 1.45rem !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  }


  /* Hero content */

  .add-subject-hero > div:first-child
  > div:first-child
  > div:last-child {
    min-width: 0 !important;
    flex: 1 !important;
  }


  /* Hero title */

  .add-subject-hero h1 {
    margin: 0 !important;
    font-size: 1.25rem !important;
    line-height: 1.2 !important;
    font-weight: 700 !important;
  }


  /* Hero description */

  .add-subject-hero p {
    margin: 0.25rem 0 0 !important;
    font-size: 0.72rem !important;
    line-height: 1.35 !important;
  }


  /* =====================================================
     WORKFLOW
     ===================================================== */

  .add-subject-workflow {
    padding: 0.7rem 0.85rem !important;
    gap: 0.55rem !important;
    align-items: flex-start !important;
    flex-wrap: nowrap !important;
  }

  .add-subject-workflow svg {
    flex-shrink: 0 !important;
    font-size: 1rem !important;
    margin-top: 2px !important;
  }

  .add-subject-workflow > div {
    min-width: 0 !important;
    font-size: 0.72rem !important;
    line-height: 1.4 !important;
  }


  /* =====================================================
     FORM
     ===================================================== */

  .add-subject-page form {
    width: 100% !important;
    max-width: 100% !important;
  }

  .add-subject-page form > .row {
    width: 100% !important;
    margin: 0 !important;
    --bs-gutter-x: 0 !important;
    --bs-gutter-y: 0.7rem !important;
  }

  .add-subject-page form > .row > [class*="col-"] {
    width: 100% !important;
    max-width: 100% !important;
    flex: 0 0 100% !important;
    padding: 0 !important;
    margin-bottom: 0.7rem !important;
  }


  /* =====================================================
     FORM CARDS
     ===================================================== */

  .add-subject-page form > .row > [class*="col-"] > div {
    width: 100% !important;
    border-radius: 13px !important;
    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.055) !important;
    overflow: hidden !important;
  }


  /* =====================================================
     CARD HEADERS
     ===================================================== */

  .add-subject-page form > .row > [class*="col-"] > div
  > div:first-child {
    min-height: 50px !important;
    padding: 0.75rem 0.85rem !important;
    gap: 0.65rem !important;
  }


  .add-subject-page form > .row > [class*="col-"] > div
  > div:first-child > div {
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    border-radius: 9px !important;
    font-size: 1rem !important;
  }


  .add-subject-page form > .row > [class*="col-"] > div
  > div:first-child h2 {
    font-size: 0.95rem !important;
    line-height: 1.25 !important;
  }


  /* =====================================================
     CARD BODY
     ===================================================== */

  .add-subject-page form > .row > [class*="col-"] > div
  > div:last-child {
    padding: 0.9rem !important;
    box-sizing: border-box !important;
  }


  /* =====================================================
     LABELS
     ===================================================== */

  .add-subject-page label {
    margin-bottom: 0.45rem !important;
    font-size: 0.82rem !important;
    gap: 0.45rem !important;
  }

  .add-subject-page label span {
    width: 26px !important;
    height: 26px !important;
    min-width: 26px !important;
    border-radius: 7px !important;
    font-size: 0.8rem !important;
  }


  /* =====================================================
     INPUTS / SELECTS
     ===================================================== */

  .add-subject-page .form-control {
    width: 100% !important;
    min-height: 43px !important;
    padding: 0.62rem 0.75rem !important;
    font-size: 0.82rem !important;
    border-radius: 9px !important;
    box-sizing: border-box !important;
  }


  /* =====================================================
     CODE GENERATION METHOD
     ===================================================== */

  .code-generation-method {
    padding: 0.8rem !important;
    margin-bottom: 0.9rem !important;
    border-radius: 12px !important;
  }


  .code-generation-method h4 {
    margin-bottom: 0.65rem !important;
    font-size: 0.88rem !important;
  }


  /* Auto + Manual */

  .code-generation-options {
    display: flex !important;
    flex-direction: column !important;
    gap: 0.55rem !important;
  }


  .code-mode-option {
    width: 100% !important;
    min-width: 0 !important;
    flex: none !important;

    padding: 0.7rem 0.75rem !important;

    border-radius: 10px !important;

    box-sizing: border-box !important;

    gap: 0.65rem !important;
  }


  /* Radio */

  .code-mode-option > div:first-child {
    width: 21px !important;
    height: 21px !important;
    min-width: 21px !important;
  }


  /* Text */

  .code-mode-option > div:last-child {
    min-width: 0 !important;
    flex: 1 !important;
  }


  .code-mode-option > div:last-child > div:first-child {
    font-size: 0.84rem !important;
    line-height: 1.25 !important;
  }


  .code-mode-option > div:last-child > div:last-child {
    margin-top: 0.15rem !important;
    font-size: 0.7rem !important;
    line-height: 1.35 !important;
  }


  /* =====================================================
     GENERATED CODE PREVIEW
     ===================================================== */

  .generated-code-preview {
    margin-top: 0.7rem !important;
    padding: 0.7rem !important;

    display: flex !important;
    align-items: flex-start !important;

    gap: 0.55rem !important;

    border-radius: 9px !important;

    overflow: hidden !important;
  }

  .generated-code-preview > div {
    min-width: 0 !important;
    max-width: 100% !important;
  }


  .generated-code-preview [style*="fontSize"] {
    font-size: 0.85rem !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
  }


  /* =====================================================
     SUBJECT CODE INPUT
     ===================================================== */

  .subject-code-input-wrap {
    width: 100% !important;
    position: relative !important;
  }


  .subject-code-input-wrap input {
    width: 100% !important;

    padding-right: 4.5rem !important;

    font-size: 0.8rem !important;

    text-overflow: ellipsis !important;

    white-space: nowrap !important;

    overflow: hidden !important;
  }


  /* AUTO badge */

  .subject-code-input-wrap > div {
    right: 10px !important;

    font-size: 0.68rem !important;

    gap: 0.2rem !important;

    white-space: nowrap !important;
  }

  .subject-code-input-wrap > div svg {
    font-size: 0.7rem !important;
  }


  /* =====================================================
     SECURITY NOTE
     ===================================================== */

  .security-note {
    margin-top: 0.6rem !important;

    padding: 0.65rem !important;

    font-size: 0.7rem !important;

    line-height: 1.4 !important;

    border-radius: 8px !important;
  }


  /* =====================================================
     SUBMIT BUTTONS
     ===================================================== */

  .add-subject-page form > div:last-child {
    width: 100% !important;

    margin-top: 0.4rem !important;

    display: flex !important;

    flex-direction: column !important;

    gap: 0.5rem !important;
  }

  .add-subject-page form > div:last-child button {
    width: 100% !important;

    min-height: 44px !important;

    padding: 0.65rem 1rem !important;

    border-radius: 10px !important;

    font-size: 0.84rem !important;

    justify-content: center !important;
  }
}


/* =========================================================
   VERY SMALL MOBILE
   <= 400px
   ========================================================= */

@media (max-width: 400px) {

  .add-subject-page {
    padding: 0.45rem !important;
  }


  /* Hero */

  .add-subject-hero > div:first-child {
    padding: 0.85rem !important;
  }

  .add-subject-hero > div:first-child
  > div:first-child {
    gap: 0.6rem !important;
  }

  .add-subject-hero > div:first-child
  > div:first-child
  > div:first-child {
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
    font-size: 1.3rem !important;
  }

  .add-subject-hero h1 {
    font-size: 1.12rem !important;
  }

  .add-subject-hero p {
    font-size: 0.68rem !important;
  }


  /* Workflow */

  .add-subject-workflow {
    padding: 0.6rem 0.7rem !important;
  }

  .add-subject-workflow > div {
    font-size: 0.68rem !important;
  }


  /* Card */

  .add-subject-page form > .row > [class*="col-"] > div
  > div:first-child {
    padding: 0.7rem 0.75rem !important;
  }

  .add-subject-page form > .row > [class*="col-"] > div
  > div:first-child > div {
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
  }

  .add-subject-page form > .row > [class*="col-"] > div
  > div:first-child h2 {
    font-size: 0.9rem !important;
  }


  /* Code options */

  .code-generation-method {
    padding: 0.7rem !important;
  }

  .code-mode-option {
    padding: 0.65rem !important;
  }

  .code-mode-option > div:last-child > div:first-child {
    font-size: 0.8rem !important;
  }

  .code-mode-option > div:last-child > div:last-child {
    font-size: 0.67rem !important;
  }


  /* Subject code */

  .subject-code-input-wrap input {
    padding-right: 4rem !important;
    font-size: 0.76rem !important;
  }

  .subject-code-input-wrap > div {
    right: 8px !important;
    font-size: 0.62rem !important;
  }


  /* Security */

  .security-note {
    font-size: 0.67rem !important;
  }
}
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= FORM FIELD COMPONENT ================= */
function FormField({
  icon,
  label,
  children,
  required = false,
  error,
  helperText,
}) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "0.75rem",
          fontWeight: 600,
          color: "#1e293b",
          fontSize: "1.05rem",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            backgroundColor: `${BRAND_COLORS.primary.main}10`,
            color: BRAND_COLORS.primary.main,
            fontSize: "1.1rem",
          }}
        >
          {icon}
        </span>
        {label}
        {required && (
          <span
            style={{
              color: BRAND_COLORS.danger.main,
              marginLeft: "0.25rem",
              fontSize: "1.2rem",
            }}
          >
            *
          </span>
        )}
      </label>

      {helperText && (
        <div
          style={{
            fontSize: "0.85rem",
            color: "#64748b",
            marginBottom: "0.75rem",
            paddingLeft: "2.5rem",
          }}
        >
          {helperText}
        </div>
      )}

      {children}

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.85rem",
            color: BRAND_COLORS.danger.main,
            marginTop: "0.5rem",
            paddingLeft: "2.5rem",
          }}
        >
          <FaExclamationTriangle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */
const inputStyle = {
  width: "100%",
  padding: "0.875rem 1.25rem",
  borderRadius: "14px",
  border: "1px solid #e2e8f0",
  fontSize: "1.05rem",
  backgroundColor: "white",
  color: "#1e293b",
  fontWeight: 500,
  transition: "all 0.3s ease",
  boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
};

const selectStyle = {
  width: "100%",
  padding: "0.875rem 1.25rem",
  borderRadius: "14px",
  border: "1px solid #e2e8f0",
  fontSize: "1.05rem",
  backgroundColor: "white",
  color: "#1e293b",
  fontWeight: 500,
  appearance: "none",
  backgroundImage: `url("image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 1.25rem center",
  backgroundSize: "20px",
  transition: "all 0.3s ease",
  boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
};
