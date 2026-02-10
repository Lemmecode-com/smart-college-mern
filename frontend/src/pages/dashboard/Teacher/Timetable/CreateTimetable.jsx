import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../api/axios";
import { AuthContext } from "../../../../auth/AuthContext";
import {
  FaCalendarAlt,
  FaLayerGroup,
  FaBook,
  FaGraduationCap,
  FaSave,
  FaArrowLeft,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle
} from "react-icons/fa";

export default function CreateTimetable() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  useEffect(() => {
    if (!user || user.role !== "TEACHER") {
      navigate("/login");
    }
  }, [user, navigate]);

  /* ================= STATE ================= */
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);

  const [formData, setFormData] = useState({
    department_id: "",
    course_id: "",
    semester: "",
    academicYear: ""
  });

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= FETCH DEPARTMENTS ================= */
  useEffect(() => {
  const fetchHodDepartment = async () => {
    try {
      const res = await api.get("/teachers/my-profile");

      const hodDepartment = res.data.department;

      setDepartments([hodDepartment]); // 👈 important
      setFormData(prev => ({
        ...prev,
        department_id: hodDepartment._id
      }));
    } catch (err) {
      setError("Failed to load department");
    } finally {
      setPageLoading(false);
    }
  };

  fetchHodDepartment();
}, []);


  /* ================= FETCH COURSES (BY DEPARTMENT) ================= */
 useEffect(() => {
  if (!formData.department_id) return;

  const fetchCourses = async () => {
    const res = await api.get(
      `/courses?departmentId=${formData.department_id}`
    );
    setCourses(res.data || []);
  };

  fetchCourses();
}, [formData.department_id]);

  /* ================= HANDLER ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /* ================= VALIDATION ================= */
  const validate = () => {
    if (!formData.department_id) return "Department is required";
    if (!formData.course_id) return "Course is required";
    if (!formData.semester) return "Semester is required";
    if (formData.semester < 1 || formData.semester > 10)
      return "Semester must be between 1 and 10";
    if (!formData.academicYear) return "Academic year is required";
    return null;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.post("/timetable", {
        department_id: formData.department_id,
        course_id: formData.course_id,
        semester: Number(formData.semester),
        academicYear: formData.academicYear
      });

      setSuccess("Timetable created successfully");

      setTimeout(() => {
        navigate("/timetable/list");
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to create timetable"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= LOADING SCREEN ================= */
  if (pageLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "60vh" }}>
        <FaSpinner className="spin" size={28} />
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold text-primary">
            <FaCalendarAlt className="me-2" />
            Create Timetable
          </h3>
          <p className="text-muted mb-0">
            Create timetable for your department (HOD only)
          </p>
        </div>

        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate("/timetable/list")}
        >
          <FaArrowLeft className="me-1" />
          Back
        </button>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <FaExclamationTriangle className="me-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success d-flex align-items-center">
          <FaCheckCircle className="me-2" />
          {success}
        </div>
      )}

      {/* FORM */}
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-4">
              {/* DEPARTMENT */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  <FaLayerGroup className="me-1" />
                  Department <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleChange}
                >
                  <option value="">Select Department</option>
                  {departments.map(dep => (
                    <option key={dep._id} value={dep._id}>
                      {dep.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* COURSE */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  <FaBook className="me-1" />
                  Course <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  name="course_id"
                  value={formData.course_id}
                  onChange={handleChange}
                  disabled={!formData.department_id}
                >
                  <option value="">Select Course</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SEMESTER */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  <FaGraduationCap className="me-1" />
                  Semester <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  min="1"
                  max="10"
                  placeholder="e.g. 3"
                />
              </div>

              {/* ACADEMIC YEAR */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Academic Year <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  name="academicYear"
                  value={formData.academicYear}
                  onChange={handleChange}
                  placeholder="e.g. 2025-2026"
                />
              </div>
            </div>

            {/* ACTIONS */}
            <div className="d-flex justify-content-end mt-4">
              <button
                type="submit"
                className="btn btn-primary px-4"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="me-2 spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FaSave className="me-2" />
                    Create Timetable
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* SPINNER STYLE */}
      <style>
        {`
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
