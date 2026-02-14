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
        <div className="card shadow border-0 mx-auto" style={{ maxWidth: 600 }}>
          <div className="card-body p-4">
            {/* Header Section */}
            <div className="d-flex align-items-center mb-4">
              <div 
                className="d-flex align-items-center justify-content-center me-3"
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: `${BRAND_COLORS.primary.main}10`,
                  color: BRAND_COLORS.primary.main,
                }}
              >
                <FaCalendarAlt size={20} />
              </div>
              <div>
                <h4 className="fw-bold mb-0">Create Timetable</h4>
                <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
                  Fill in the details to create a new timetable
                </p>
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="alert alert-danger d-flex align-items-center" role="alert">
                <FaTimesCircle className="me-2" />
                <div>{error}</div>
              </div>
            )}
            {success && (
              <div className="alert alert-success d-flex align-items-center" role="alert">
                <FaCheckCircle className="me-2" />
                <div>{success}</div>
              </div>
            )}

            {/* Form Section */}
            <form onSubmit={submitHandler}>
              {/* Department Field */}
              <div className="mb-4">
                <label className="form-label fw-semibold mb-2">
                  <FaUniversity className="me-2" style={{ color: BRAND_COLORS.primary.main }} />
                  Department
                </label>
                <input
                  className="form-control form-control-lg"
                  value={department?.name || ""}
                  disabled
                  style={{ 
                    backgroundColor: "#f8f9fa",
                    borderColor: "#dee2e6"
                  }}
                />
              </div>

              {/* Course Selection */}
              <div className="mb-4">
                <label className="form-label fw-semibold mb-2">
                  <FaGraduationCap className="me-2" style={{ color: BRAND_COLORS.primary.main }} />
                  Course
                </label>
                <select
                  className="form-select form-select-lg"
                  value={form.course_id}
                  onChange={(e) =>
                    setForm({ ...form, course_id: e.target.value, semester: "" })
                  }
                  required
                  style={{ borderColor: "#dee2e6" }}
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester Selection */}
              <div className="mb-4">
                <label className="form-label fw-semibold mb-2">
                  <FaLayerGroup className="me-2" style={{ color: BRAND_COLORS.primary.main }} />
                  Semester
                </label>
                <select
                  className="form-select form-select-lg"
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value })}
                  required
                  disabled={!availableSemesters.length}
                  style={{ borderColor: "#dee2e6" }}
                >
                  <option value="">Select semester</option>
                  {availableSemesters.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Year Selection */}
              <div className="mb-4">
                <label className="form-label fw-semibold mb-2">
                  <FaCalendarAlt className="me-2" style={{ color: BRAND_COLORS.primary.main }} />
                  Academic Year
                </label>
                <select
                  className="form-select form-select-lg"
                  value={form.academicYear}
                  onChange={(e) =>
                    setForm({ ...form, academicYear: e.target.value })
                  }
                  required
                  style={{ borderColor: "#dee2e6" }}
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
              </div>

              {/* Timetable Preview Card */}
              <div 
                className="card border-0 shadow-sm mb-4"
                style={{
                  backgroundColor: "white",
                  borderRadius: "16px",
                  overflow: "hidden",
                }}
              >
                <div
                  className="p-4 d-flex align-items-center"
                  style={{
                    background: BRAND_COLORS.info.gradient,
                    color: "white",
                  }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                      fontSize: "1.5rem",
                      flexShrink: 0,
                    }}
                  >
                    <FaInfoCircle />
                  </div>
                  <h5 className="mb-0 fw-bold">Timetable Preview</h5>
                </div>

                <div className="p-4 text-center">
                  <div
                    className={`border-2 rounded-3 p-4 ${previewName ? 'border-primary' : 'border-light'}`}
                    style={{
                      borderStyle: 'dashed',
                      backgroundColor: previewName ? `${BRAND_COLORS.primary.main}05` : "#f8fafc",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {previewName ? (
                      <>
                        <div
                          className="mx-auto mb-4"
                          style={{
                            fontSize: "4rem",
                            color: BRAND_COLORS.primary.main,
                            opacity: 0.2,
                          }}
                        >
                          <FaCalendarAlt />
                        </div>
                        <h5
                          className="mb-3"
                          style={{
                            fontWeight: 700,
                            color: "#1e293b",
                          }}
                        >
                          {previewName}
                        </h5>
                        <div className="d-flex flex-column align-items-center">
                          <div
                            className="py-2 px-4 rounded-pill mb-3"
                            style={{
                              backgroundColor: `${BRAND_COLORS.success.main}15`,
                              color: BRAND_COLORS.success.main,
                              fontWeight: 600,
                              fontSize: "0.95rem",
                            }}
                          >
                            Ready to Create
                          </div>
                          <p
                            className="mb-0"
                            style={{
                              color: "#64748b",
                              maxWidth: "80%",
                            }}
                          >
                            This timetable will be created for your department. You can add time slots after creation.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className="mx-auto mb-4"
                          style={{
                            fontSize: "4rem",
                            color: "#cbd5e1",
                            opacity: 0.3,
                          }}
                        >
                          <FaCalendarAlt />
                        </div>
                        <h5
                          className="mb-3"
                          style={{
                            fontWeight: 600,
                            color: "#64748b",
                          }}
                        >
                          Complete Form to Preview
                          </h5>
                        <p
                          className="mb-0"
                          style={{
                            color: "#94a3b8",
                            maxWidth: "80%",
                          }}
                        >
                          Select course, semester, and academic year to see timetable preview
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="d-grid">
                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg"
                  disabled={submitting || !previewName}
                  style={{
                    background: BRAND_COLORS.primary.gradient,
                    border: 'none',
                    padding: '12px 0',
                    fontWeight: 600,
                    fontSize: '1.1rem'
                  }}
                >
                  {submitting ? (
                    <span className="d-flex align-items-center justify-content-center">
                      <FaSyncAlt className="me-2" spin />
                      Creating Timetable...
                    </span>
                  ) : (
                    "Create Timetable"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
