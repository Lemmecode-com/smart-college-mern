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

export default function CreateTimetable() {
  const [department, setDepartment] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    course_id: "",
    semester: "",
    academicYear: "",
  });

  const [previewName, setPreviewName] = useState("");
  const [availableSemesters, setAvailableSemesters] = useState([]); // ⭐ NEW
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* LOAD PROFILE */
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/teachers/my-profile");
        setDepartment(res.data.department_id);
      } catch {
        setError("Failed to load department");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  /* LOAD COURSES */
  useEffect(() => {
    if (!department?._id) return;
    const loadCourses = async () => {
      try {
        const res = await api.get(`/courses/department/${department._id}`);
        setCourses(res.data);
      } catch {
        setError("Failed to load courses");
      }
    };
    loadCourses();
  }, [department]);

  /* ⭐ GENERATE SEMESTERS BASED ON SELECTED COURSE */
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

  /* AUTO NAME */
  useEffect(() => {
    if (!form.course_id || !form.semester || !form.academicYear) {
      setPreviewName("");
      return;
    }
    const course = courses.find((c) => c._id === form.course_id);
    if (!course) return;

    setPreviewName(
      `${course.name} - Sem ${form.semester} (${form.academicYear})`,
    );
  }, [form, courses]);

  /* SUBMIT */
  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await api.post("/timetable", {
        department_id: department._id,
        course_id: form.course_id,
        semester: Number(form.semester),
        academicYear: form.academicYear,
      });
      setSuccess("Timetable created successfully!");
      setForm({ course_id: "", semester: "", academicYear: "" });
      setPreviewName("");
      setAvailableSemesters([]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create timetable");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
        }}
      >
        <motion.div
          variants={spinVariants}
          animate="animate"
          style={{ color: BRAND_COLORS.primary.main, fontSize: "3rem" }}
        >
          <FaSyncAlt />
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="container py-4">
        <div className="card shadow border-0 mx-auto" style={{ maxWidth: 480 }}>
          <div className="card-body">
            <h4 className="fw-bold mb-3">Create Timetable</h4>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Department */}
            <div className="mb-3">
              <label className="form-label">Department</label>
              <input
                className="form-control"
                value={department?.name || ""}
                disabled
              />
            </div>

            {/* Course */}
            <motion.div className="mb-3">
              <label className="form-label">Course</label>
              <select
                className="form-select"
                value={form.course_id}
                onChange={(e) =>
                  setForm({ ...form, course_id: e.target.value, semester: "" })
                }
                required
              ></select>
              <motion.button>
                <FaArrowLeft /> Back
              </motion.button>
              <span style={{ color: "#94a3b8" }}>›</span>
              <span
                style={{ color: BRAND_COLORS.primary.main, fontWeight: 600 }}
              >
                Create Timetable
              </span>
            </motion.div>

            {/* ⭐ Semester (Dynamic) */}
            <div className="mb-3">
              <label className="form-label">Semester</label>
              <select
                className="form-select"
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
                required
                disabled={!availableSemesters.length}
              >
                <option value="">Select semester</option>
                {availableSemesters.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div className="mb-3">
              <label className="form-label">Academic Year</label>
              <select
                className="form-select"
                value={form.academicYear}
                onChange={(e) =>
                  setForm({ ...form, academicYear: e.target.value })
                }
                required
              ></select>
              <motion.div>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "20px",
                    boxShadow: "0 10px 40px rgba(26, 75, 109, 0.12)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "1.75rem",
                      background: BRAND_COLORS.info.gradient,
                      color: "white",
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
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem",
                        flexShrink: 0,
                      }}
                    >
                      <FaInfoCircle />
                    </div>
                    <h2
                      style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}
                    >
                      Timetable Preview
                    </h2>
                  </div>

                  <div style={{ padding: "2rem", textAlign: "center" }}>
                    <div
                      style={{
                        border: `2px dashed ${previewName ? BRAND_COLORS.primary.main : "#cbd5e1"}`,
                        borderRadius: "16px",
                        padding: "2.5rem",
                        backgroundColor: previewName
                          ? `${BRAND_COLORS.primary.main}05`
                          : "#f8fafc",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {previewName ? (
                        <>
                          <div
                            style={{
                              fontSize: "4rem",
                              marginBottom: "1.5rem",
                              color: BRAND_COLORS.primary.main,
                              opacity: 0.2,
                            }}
                          >
                            <FaCalendarAlt />
                          </div>
                          <h3
                            style={{
                              margin: "0 0 1rem 0",
                              fontSize: "1.75rem",
                              fontWeight: 700,
                              color: "#1e293b",
                            }}
                          >
                            {previewName}
                          </h3>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "0.75rem",
                              marginTop: "1.5rem",
                            }}
                          >
                            <div
                              style={{
                                padding: "0.5rem 1.5rem",
                                borderRadius: "20px",
                                backgroundColor: `${BRAND_COLORS.success.main}15`,
                                color: BRAND_COLORS.success.main,
                                fontWeight: 600,
                                fontSize: "0.95rem",
                              }}
                            >
                              Ready to Create
                            </div>
                            <p
                              style={{
                                color: "#64748b",
                                margin: 0,
                                maxWidth: "80%",
                              }}
                            >
                              This timetable will be created for your
                              department. You can add time slots after creation.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              fontSize: "4rem",
                              marginBottom: "1.5rem",
                              color: "#cbd5e1",
                              opacity: 0.3,
                            }}
                          >
                            <FaCalendarAlt />
                          </div>
                          <h3
                            style={{
                              margin: "0 0 1rem 0",
                              fontSize: "1.75rem",
                              fontWeight: 600,
                              color: "#64748b",
                            }}
                          >
                            Complete Form to Preview
                          </h3>
                          <p
                            style={{
                              color: "#94a3b8",
                              margin: 0,
                              maxWidth: "80%",
                            }}
                          >
                            Select course, semester, and academic year to see
                            timetable preview
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Preview Name */}
            <div className="mb-4">
              <label className="form-label">Timetable Name (auto)</label>
              <input className="form-control" value={previewName} readOnly />
            </div>

            <button className="btn btn-primary w-100" onClick={submitHandler}>
              Create Timetable
            </button>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}

/* ================= FORM FIELD COMPONENT ================= */
function FormField({ icon, label, children, required = false, error = false }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <label
        style={{
          display: "block",
          marginBottom: "0.5rem",
          fontWeight: 600,
          color: "#1e293b",
          fontSize: "0.95rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            backgroundColor: `${BRAND_COLORS.primary.main}10`,
            color: BRAND_COLORS.primary.main,
            fontSize: "0.85rem",
          }}
        >
          {icon}
        </span>
        {label}
        {required && <span style={{ color: BRAND_COLORS.danger.main }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        {children}
        {error && (
          <div
            style={{
              position: "absolute",
              right: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: BRAND_COLORS.danger.main,
              fontSize: "1.25rem",
            }}
          >
            <FaTimesCircle />
          </div>
        )}
      </div>
    </div>
  );
}
