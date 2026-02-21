import React, { useEffect, useState } from "react";
import api from "../../../../api/axios";
import {
  FaCalendarAlt,
  FaGraduationCap,
  FaLayerGroup,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSyncAlt,
  FaArrowLeft,
  FaUniversity,
  FaEdit,
  FaInfoCircle,
  FaPlus,
  FaEye,
  FaFileAlt,
  FaShieldAlt,
  FaUserTie,
  FaLock,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
export default function CreateTimetable() {
  const navigate = useNavigate();
  // State
  const [department, setDepartment] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // ✅ HOD Verification
  const [isHOD, setIsHOD] = useState(false);
  const [hodVerified, setHodVerified] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [form, setForm] = useState({
    course_id: "",
    semester: "",
    academicYear: "",
  });
  const [previewName, setPreviewName] = useState("");
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  /* ================= LOAD PROFILE & CHECK HOD ================= */
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get("/teachers/my-profile");
        setDepartment(res.data.department_id);
        
        // ✅ Check if teacher is HOD
        const teacherData = res.data;
        
        // ✅ FIXED: Check both direct hod_id and populated hod_id._id
        const hodId = teacherData.department_id?.hod_id?._id || teacherData.department_id?.hod_id;
        const teacherId = teacherData._id;
        
        const isTeacherHOD = hodId?.toString() === teacherId?.toString();
        
        if (!isTeacherHOD) {
          setAccessDenied(true);
          setError(
            "Access Denied: Only HOD can create timetables. Please contact your department HOD.",
          );
        } else {
          setIsHOD(true);
          setHodVerified(true);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        setError("Failed to load department information");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);
  /* ================= LOAD COURSES ================= */
  useEffect(() => {
    if (!department?._id) return;
    const loadCourses = async () => {
      try {
        const res = await api.get(`/courses/department/${department._id}`);
        setCourses(res.data);
      } catch (err) {
        console.error("Failed to load courses:", err);
        setError("Failed to load courses for your department");
      }
    };
    loadCourses();
  }, [department]);
  /* ================= GENERATE SEMESTERS ================= */
  useEffect(() => {
    if (!form.course_id) {
      setAvailableSemesters([]);
      return;
    }
    const selectedCourse = courses.find((c) => c._id === form.course_id);
    if (!selectedCourse?.semester) {
      setAvailableSemesters([]);
      return;
    }
    const totalSem = selectedCourse.semester;
    const semArray = Array.from({ length: totalSem }, (_, i) => i + 1);
    setAvailableSemesters(semArray);
  }, [form.course_id, courses]);
  /* ================= AUTO NAME GENERATION ================= */
  useEffect(() => {
    if (!form.course_id || !form.semester || !form.academicYear) {
      setPreviewName("");
      return;
    }
    const course = courses.find((c) => c._id === form.course_id);
    if (!course) return;
    setPreviewName(
      `${course.name} - Semester ${form.semester} (${form.academicYear})`,
    );
  }, [form, courses]);
  /* ================= SUBMIT HANDLER ================= */
  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const response = await api.post("/timetable", {
        department_id: department._id,
        course_id: form.course_id,
        semester: Number(form.semester),
        academicYear: form.academicYear,
      });
      setSuccess("✅ Timetable created successfully! Redirecting...");
      setTimeout(() => {
        navigate(`/timetable/${response.data._id}/weekly`);
      }, 2000);
    } catch (err) {
      console.error("Timetable creation failed:", err);
      setError(
        err.response?.data?.message ||
          "Failed to create timetable. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  // Loading State
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <motion.div
            variants={spinVariants}
            animate="animate"
            style={{
              marginBottom: "1.5rem",
              color: BRAND_COLORS.primary.main,
              fontSize: "4rem",
            }}
          >
            <FaSyncAlt />
          </motion.div>
          <h3
            style={{
              margin: "0 0 0.5rem 0",
              color: "#1e293b",
              fontWeight: 700,
              fontSize: "1.5rem",
            }}
          >
            Loading Department Information...
          </h3>
          <p style={{ color: "#64748b", margin: 0 }}>
            Preparing timetable creation interface
          </p>
        </div>
      </div>
    );
  }
  // Access Denied State
  if (accessDenied) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
          padding: "2rem",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            maxWidth: "500px",
            backgroundColor: "white",
            borderRadius: "20px",
            padding: "3rem",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 1.5rem",
              backgroundColor: `${BRAND_COLORS.danger.main}15`,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: BRAND_COLORS.danger.main,
              fontSize: "2.5rem",
            }}
          >
            <FaLock />
          </div>
          <h2
            style={{
              margin: "0 0 0.5rem 0",
              color: "#1e293b",
              fontWeight: 700,
              fontSize: "1.75rem",
            }}
          >
            Access Denied
          </h2>
          <p
            style={{
              color: "#64748b",
              margin: "0 0 1.5rem 0",
              lineHeight: 1.6,
            }}
          >
            {error}
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(-1)}
            style={{
              padding: "0.875rem 2rem",
              backgroundColor: BRAND_COLORS.primary.main,
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <FaArrowLeft /> Go Back
          </motion.button>
        </motion.div>
      </div>
    );
  }
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
          paddingTop: "2rem",
          paddingBottom: "2rem",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* ================= BREADCRUMB ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <motion.button
              whileHover={{ x: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: BRAND_COLORS.primary.main,
                background: "none",
                border: "none",
                fontSize: "0.95rem",
                fontWeight: 500,
                cursor: "pointer",
                padding: "0.5rem",
                borderRadius: "8px",
              }}
            >
              <FaArrowLeft /> Back
            </motion.button>
            <span style={{ color: "#94a3b8" }}>›</span>
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600 }}>
              Create Timetable
            </span>
          </motion.div>
          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: "2rem",
              backgroundColor: "white",
              borderRadius: "20px",
              boxShadow: "0 10px 40px rgba(26, 75, 109, 0.15)",
              overflow: "hidden",
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
                  }}
                >
                  <FaCalendarAlt />
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
                    Create New Timetable
                  </h1>
                  <p
                    style={{
                      margin: "0.75rem 0 0 0",
                      opacity: 0.9,
                      fontSize: "1.1rem",
                    }}
                  >
                    Set up academic schedule for your department courses
                  </p>
                  {hodVerified && isHOD && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginTop: "0.5rem",
                        padding: "0.375rem 0.75rem",
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        borderRadius: "20px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      }}
                    >
                      <FaUserTie /> HOD Access
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Info Banner */}
            <div
              style={{
                padding: "1rem 2rem",
                backgroundColor: "#dbeafe",
                borderTop: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <FaInfoCircle
                style={{
                  color: BRAND_COLORS.primary.main,
                  fontSize: "1.25rem",
                }}
              />
              <div
                style={{ color: "#1e293b", fontWeight: 500, lineHeight: 1.5 }}
              >
                Timetables can only be created for courses in your department.
                After creation, you can add time slots and assign subjects.
              </div>
            </div>
          </motion.div>
          {/* ================= FORM CARD ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
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
                background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
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
                <FaFileAlt />
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#1e293b",
                }}
              >
                Timetable Details
              </h2>
            </div>
            <div style={{ padding: "2rem" }}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginBottom: "1.5rem",
                    padding: "1rem",
                    borderRadius: "12px",
                    backgroundColor: `${BRAND_COLORS.danger.main}0a`,
                    border: `1px solid ${BRAND_COLORS.danger.main}`,
                    color: BRAND_COLORS.danger.main,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <FaTimesCircle size={20} />
                  <span>{error}</span>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginBottom: "1.5rem",
                    padding: "1rem",
                    borderRadius: "12px",
                    backgroundColor: `${BRAND_COLORS.success.main}0a`,
                    border: `1px solid ${BRAND_COLORS.success.main}`,
                    color: BRAND_COLORS.success.main,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <FaCheckCircle size={20} />
                  <span>{success}</span>
                </motion.div>
              )}
              <form onSubmit={submitHandler}>
                {/* Department Field */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        color: BRAND_COLORS.primary.main,
                        fontSize: "1.1rem",
                      }}
                    >
                      <FaUniversity />
                    </span>
                    <label
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        color: "#1e293b",
                      }}
                    >
                      Department
                    </label>
                  </div>
                  <input
                    type="text"
                    value={department?.name || "Loading..."}
                    disabled
                    style={{
                      width: "100%",
                      padding: "0.875rem 1.25rem",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "1rem",
                      backgroundColor: "#f8fafc",
                      color: "#4a5568",
                      fontWeight: 500,
                    }}
                  />
                  <p
                    style={{
                      marginTop: "0.375rem",
                      fontSize: "0.8rem",
                      color: "#64748b",
                      marginLeft: "2.25rem",
                    }}
                  >
                    Your assigned department (auto-detected)
                  </p>
                </div>
                {/* Course Selection */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        color: BRAND_COLORS.primary.main,
                        fontSize: "1.1rem",
                      }}
                    >
                      <FaGraduationCap />
                    </span>
                    <label
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        color: "#1e293b",
                      }}
                    >
                      Course
                      <span
                        style={{
                          color: BRAND_COLORS.danger.main,
                          marginLeft: "0.25rem",
                        }}
                      >
                        *
                      </span>
                    </label>
                  </div>
                  <select
                    value={form.course_id}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        course_id: e.target.value,
                        semester: "",
                      });
                      setError("");
                    }}
                    required
                    style={{
                      width: "100%",
                      padding: "0.875rem 1.25rem",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "1rem",
                      backgroundColor: "white",
                      color: "#1e293b",
                      fontWeight: 500,
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 1rem center",
                      backgroundSize: "16px",
                    }}
                  >
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                  <p
                    style={{
                      marginTop: "0.375rem",
                      fontSize: "0.8rem",
                      color: "#64748b",
                      marginLeft: "2.25rem",
                    }}
                  >
                    Select a course from your department
                  </p>
                </div>
                {/* Semester Selection */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        color: BRAND_COLORS.primary.main,
                        fontSize: "1.1rem",
                      }}
                    >
                      <FaLayerGroup />
                    </span>
                    <label
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        color: "#1e293b",
                      }}
                    >
                      Semester
                      <span
                        style={{
                          color: BRAND_COLORS.danger.main,
                          marginLeft: "0.25rem",
                        }}
                      >
                        *
                      </span>
                    </label>
                  </div>
                  <select
                    value={form.semester}
                    onChange={(e) => {
                      setForm({ ...form, semester: e.target.value });
                      setError("");
                    }}
                    disabled={!availableSemesters.length}
                    required
                    style={{
                      width: "100%",
                      padding: "0.875rem 1.25rem",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "1rem",
                      backgroundColor: availableSemesters.length
                        ? "white"
                        : "#f8fafc",
                      color: availableSemesters.length ? "#1e293b" : "#94a3b8",
                      fontWeight: 500,
                      cursor: availableSemesters.length
                        ? "pointer"
                        : "not-allowed",
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 1rem center",
                      backgroundSize: "16px",
                    }}
                  >
                    <option value="">Select semester</option>
                    {availableSemesters.map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                  <p
                    style={{
                      marginTop: "0.375rem",
                      fontSize: "0.8rem",
                      color: "#64748b",
                      marginLeft: "2.25rem",
                    }}
                  >
                    Available semesters: {availableSemesters.length || "N/A"}
                  </p>
                </div>
                {/* Academic Year Selection */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        color: BRAND_COLORS.primary.main,
                        fontSize: "1.1rem",
                      }}
                    >
                      <FaCalendarAlt />
                    </span>
                    <label
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        color: "#1e293b",
                      }}
                    >
                      Academic Year
                      <span
                        style={{
                          color: BRAND_COLORS.danger.main,
                          marginLeft: "0.25rem",
                        }}
                      >
                        *
                      </span>
                    </label>
                  </div>
                  <select
                    value={form.academicYear}
                    onChange={(e) => {
                      setForm({ ...form, academicYear: e.target.value });
                      setError("");
                    }}
                    required
                    style={{
                      width: "100%",
                      padding: "0.875rem 1.25rem",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "1rem",
                      backgroundColor: "white",
                      color: "#1e293b",
                      fontWeight: 500,
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 1rem center",
                      backgroundSize: "16px",
                    }}
                  >
                    <option value="">Select academic year</option>
                    {Array.from({ length: 5 }, (_, i) => {
                      const currentYear = new Date().getFullYear();
                      const year = currentYear + i;
                      return (
                        <option key={year} value={`${year}-${year + 1}`}>
                          {year}-{year + 1}
                        </option>
                      );
                    })}
                  </select>
                  <p
                    style={{
                      marginTop: "0.375rem",
                      fontSize: "0.8rem",
                      color: "#64748b",
                      marginLeft: "2.25rem",
                    }}
                  >
                    Timetable will be active for this academic year
                  </p>
                </div>
                {/* Preview */}
                {previewName && (
                  <div
                    style={{
                      padding: "1.25rem",
                      borderRadius: "12px",
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        color: BRAND_COLORS.success.main,
                        fontWeight: 600,
                        marginBottom: "0.5rem",
                      }}
                    >
                      <FaCheckCircle />
                      Timetable Preview
                    </div>
                    <div style={{ color: "#15803d", fontSize: "0.95rem" }}>
                      {previewName}
                    </div>
                  </div>
                )}
                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting || !previewName}
                  style={{
                    width: "100%",
                    padding: "1.125rem",
                    borderRadius: "14px",
                    border: "none",
                    backgroundColor:
                      submitting || !previewName
                        ? "#cbd5e1"
                        : BRAND_COLORS.success.main,
                    color: "white",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    cursor:
                      submitting || !previewName ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.75rem",
                    boxShadow:
                      submitting || !previewName
                        ? "none"
                        : "0 6px 20px rgba(40, 167, 69, 0.35)",
                  }}
                >
                  {submitting ? (
                    <>
                      <motion.div variants={spinVariants} animate="animate">
                        <FaSyncAlt size={20} />
                      </motion.div>
                      Creating Timetable...
                    </>
                  ) : (
                    <>
                      <FaPlus size={20} /> Create Timetable
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
