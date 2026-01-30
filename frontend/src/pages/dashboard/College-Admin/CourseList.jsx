import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaBookOpen,
  FaEdit,
  FaTrash,
  FaPlus,
  FaLayerGroup
} from "react-icons/fa";

export default function CourseList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [loading, setLoading] = useState(true);

  /* ================= LOAD DEPARTMENTS ================= */
  useEffect(() => {
    const fetchDepartments = async () => {
      const res = await api.get("/departments");
      setDepartments(res.data);
      setLoading(false);
    };
    fetchDepartments();
  }, []);

  /* ================= LOAD COURSES ================= */
  useEffect(() => {
    if (!selectedDepartment) return;

    const fetchCourses = async () => {
      const res = await api.get(
        `/courses/department/${selectedDepartment}`
      );
      setCourses(res.data);
    };

    fetchCourses();
  }, [selectedDepartment]);

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this course?"
    );
    if (!confirm) return;

    await api.delete(`/courses/${id}`);

    setCourses(courses.filter((c) => c._id !== id));
  };

  /* ================= LOADING ================= */
  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <div className="container-fluid">

      {/* HEADER */}
      <div className="gradient-header p-4 rounded-4 text-white shadow mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h3 className="fw-bold">
            <FaBookOpen className="blink me-2" />
            Course Management
          </h3>
          <p className="opacity-75 mb-0">
            Department wise courses
          </p>
        </div>

        <button
          className="btn btn-light"
          onClick={() => navigate("/courses/add")}
        >
          <FaPlus className="me-1" />
          Add Course
        </button>
      </div>

      {/* DEPARTMENT DROPDOWN */}
      <div className="card shadow-sm border-0 rounded-4 mb-4">
        <div className="card-body">
          <label className="fw-semibold">
            <FaLayerGroup className="me-1 text-primary" />
            Select Department
          </label>
          <select
            className="form-control mt-2"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <option value="">-- Select Department --</option>
            {departments.map((dep) => (
              <option key={dep._id} value={dep._id}>
                {dep.name} ({dep.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* COURSES TABLE */}
      {courses.length > 0 ? (
        <div className="card shadow-lg border-0 rounded-4">
          <div className="card-body">

            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Sr.No</th>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Semester</th>
                  <th>Credits</th>
                  <th>Max Students</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {courses.map((c, index) => (
                  <tr key={c._id}>
                    <td>{index + 1}</td>
                    <td>{c.name}</td>
                    <td>{c.code}</td>
                    <td>{c.type}</td>
                    <td>
                      <span className="badge bg-success">
                        {c.status}
                      </span>
                    </td>
                    <td>{c.semester}</td>
                    <td>{c.credits}</td>
                    <td>{c.maxStudents}</td>
                    <td className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() =>
                          navigate(`/courses/edit/${c._id}`)
                        }
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(c._id)}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        </div>
      ) : (
        selectedDepartment && (
          <p className="text-muted text-center">
            No courses found for this department
          </p>
        )
      )}

      {/* CSS */}
      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0% {opacity:1}
          50% {opacity:0.4}
          100% {opacity:1}
        }
      `}</style>
    </div>
  );
}
