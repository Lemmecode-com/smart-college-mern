import { useContext, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaChalkboardTeacher,
  FaEdit,
  FaTrash,
  FaPlus
} from "react-icons/fa";

export default function TeachersList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD TEACHERS ================= */
  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await api.get("/teachers");
      setTeachers(res.data);
    } catch {
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE ================= */
  const deleteTeacher = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this teacher?"
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/teachers/${id}`);
      fetchTeachers();
    } catch {
      alert("Failed to delete teacher");
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-5">
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="d-flex justify-content-between align-items-center mb-4 gradient-header p-4 rounded-4 text-white">
        <h4 className="fw-bold mb-0">
          <FaChalkboardTeacher className="blink me-2" />
          Teachers Management
        </h4>

        <button
          className="btn btn-light fw-semibold"
          onClick={() => navigate("/teachers/add-teacher")}
        >
          <FaPlus className="me-1" />
          Add Teacher
        </button>
      </div>

      {/* ================= TABLE ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-0">

          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Employee ID</th>
                <th>Email</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Experience</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {teachers.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center text-muted py-4">
                    No teachers found
                  </td>
                </tr>
              )}

              {teachers.map((t, index) => (
                <tr key={t._id}>
                  <td>{index + 1}</td>
                  <td className="fw-semibold">{t.name}</td>
                  <td>{t.employeeId}</td>
                  <td>{t.email}</td>
                  <td>
                    {t.department_id?.name} ({t.department_id?.code})
                  </td>
                  <td>{t.designation}</td>
                  <td>{t.experienceYears} yrs</td>
                  <td>
                    <span
                      className={`badge ${
                        t.status === "ACTIVE"
                          ? "bg-success"
                          : "bg-secondary"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="text-center">

                    <Link
                      to={`/teachers/edit/${t._id}`}
                      className="btn btn-sm btn-outline-primary me-2"
                    >
                      <FaEdit />
                    </Link>

                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => deleteTeacher(t._id)}
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

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(10px);
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0% {opacity:1}
          50% {opacity:0.4}
          100% {opacity:1}
        }

        .table-hover tbody tr:hover {
          background-color: rgba(15,58,74,0.05);
        }
        `}
      </style>
    </div>
  );
}
