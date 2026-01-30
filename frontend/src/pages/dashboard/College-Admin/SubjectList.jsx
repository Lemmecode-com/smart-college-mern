import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import { FaBook, FaTrash, FaEdit } from "react-icons/fa";

export default function SubjectList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  const [loading, setLoading] = useState(true);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH DEPARTMENTS ================= */
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments");
        setDepartments(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  /* ================= FETCH COURSES BY DEPARTMENT ================= */
  const fetchCourses = async (deptId) => {
    try {
      const res = await api.get(`/courses/department/${deptId}`);
      setCourses(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= FETCH SUBJECTS BY COURSE ================= */
  const fetchSubjects = async (courseId) => {
    try {
      const res = await api.get(`/subjects/course/${courseId}`);
      setSubjects(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= DELETE SUBJECT ================= */
  const deleteSubject = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;

    try {
      await api.delete(`/subjects/${id}`);
      alert("Subject deleted successfully");
      fetchSubjects(selectedCourse);
    } catch (err) {
      alert("Failed to delete subject");
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Subjects...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaBook className="me-2 blink" />
          Subject Management
        </h3>
        <p className="opacity-75 mb-0">
          Manage subjects department & course wise
        </p>
      </div>

      {/* ================= FILTERS ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card mb-4">
        <div className="card-body row g-3">

          <div className="col-md-6">
            <label className="fw-semibold">Select Department</label>
            <select
              className="form-select"
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedCourse("");
                setSubjects([]);
                fetchCourses(e.target.value);
              }}
            >
              <option value="">-- Select Department --</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6">
            <label className="fw-semibold">Select Course</label>
            <select
              className="form-select"
              value={selectedCourse}
              disabled={!selectedDepartment}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                fetchSubjects(e.target.value);
              }}
            >
              <option value="">-- Select Course --</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ================= SUBJECT TABLE ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body">

          <h5 className="fw-bold mb-3">
            Subject List
          </h5>

          {subjects.length === 0 ? (
            <div className="alert alert-info">
              No subjects found for selected course.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Semester</th>
                    <th>Credits</th>
                    <th>Teacher</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => (
                    <tr key={s._id}>
                      <td>{s.name}</td>
                      <td>{s.code}</td>
                      <td>{s.semester}</td>
                      <td>{s.credits}</td>
                      <td>
                        {s.teacher_id?.name || "Not Assigned"}
                      </td>
                      <td>
                        <span className={`badge ${
                          s.status === "ACTIVE"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-primary me-2"
                          onClick={() => navigate(`/subjects/edit/${s._id}`)}
                        >
                          <FaEdit /> Edit
                        </button>

                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => deleteSubject(s._id)}
                        >
                          <FaTrash /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0% {opacity:1}
          50% {opacity:0.4}
          100% {opacity:1}
        }
        `}
      </style>
    </div>
  );
}
