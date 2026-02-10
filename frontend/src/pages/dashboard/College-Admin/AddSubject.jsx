import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaBookOpen,
  FaUniversity,
  FaArrowLeft,
  FaCheckCircle
} from "react-icons/fa";

export default function AddSubject() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [formData, setFormData] = useState({
    department_id: "",
    course_id: "",
    teacher_id: "",
    name: "",
    code: "",
    semester: "",
    credits: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= LOAD DEPARTMENTS ================= */
  useEffect(() => {
    api.get("/departments")
      .then(res => setDepartments(res.data))
      .catch(() => setDepartments([]));
  }, []);

  /* ================= LOAD COURSES BY DEPARTMENT ================= */
  useEffect(() => {
    if (!formData.department_id) {
      setCourses([]);
      setTeachers([]);
      return;
    }

    api.get(`/courses/department/${formData.department_id}`)
      .then(res => setCourses(res.data))
      .catch(() => setCourses([]));
  }, [formData.department_id]);

  /* ================= LOAD TEACHERS BY COURSE ================= */
  useEffect(() => {
    if (!formData.course_id) {
      setTeachers([]);
      return;
    }

    api.get(`/teachers/course/${formData.course_id}`)
      .then(res => setTeachers(res.data))
      .catch(() => setTeachers([]));
  }, [formData.course_id]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/subjects", {
        course_id: formData.course_id,
        name: formData.name,
        code: formData.code,
        semester: Number(formData.semester),
        credits: Number(formData.credits),
        teacher_id: formData.teacher_id
      });

      setSuccess("Subject created successfully!");
      setTimeout(() => navigate("/subjects"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create subject");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">

      <div className="gradient-header mb-4 p-4 rounded-4 text-white" style={{background: "linear-gradient(180deg, #0f3a4a, #134952)"}}>
        <h3 className="fw-bold mb-1">
          <FaBookOpen className="blink me-2" />
          Add New Subject
        </h3>
        <p className="opacity-75 mb-0">
          Department → Course → Teacher → Subject
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && (
        <div className="alert alert-success d-flex align-items-center gap-2">
          <FaCheckCircle /> {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card shadow-lg border-0 rounded-4 glass-card">
          <div className="card-body p-4">
            <div className="row g-3">

              {/* Department */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  <FaUniversity className="me-1" /> Department
                </label>
                <select
                  className="form-select"
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Course */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">Course</label>
                <select
                  className="form-select"
                  name="course_id"
                  value={formData.course_id}
                  onChange={handleChange}
                  required
                  disabled={!formData.department_id}
                >
                  <option value="">Select Course</option>
                  {courses.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Teacher */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">Teacher</label>
                <select
                  className="form-select"
                  name="teacher_id"
                  value={formData.teacher_id}
                  onChange={handleChange}
                  required
                  disabled={!formData.course_id}
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.name} - {t.designation}
                    </option>
                  ))}
                </select>
              </div>

              <Input label="Subject Name" name="name" value={formData.name} onChange={handleChange} />
              <Input label="Subject Code" name="code" value={formData.code} onChange={handleChange} />
              <Input label="Semester" name="semester" type="number" value={formData.semester} onChange={handleChange} />
              <Input label="Credits" name="credits" type="number" value={formData.credits} onChange={handleChange} />

            </div>
          </div>

          <div className="card-footer bg-white border-0 d-flex justify-content-between p-3">
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate("/subjects")}>
              <FaArrowLeft /> Back
            </button>
            <button className="btn btn-success px-4 rounded-pill" disabled={loading}>
              {loading ? "Creating..." : "Create Subject"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="col-md-6">
      <label className="form-label fw-semibold">{label}</label>
      <input className="form-control" {...props} required />
    </div>
  );
}
