import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUsers,
  FaEnvelope,
  FaGraduationCap,
  FaIdCard
} from "react-icons/fa";

export default function MyStudents() {
  const { user } = useContext(AuthContext);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER")
    return <Navigate to="/teacher/dashboard" />;

  /* ================= FETCH STUDENTS ================= */
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get("/students/teacher");
        setStudents(res.data.students || res.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load students");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Students...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaUsers className="me-2 blink" />
          My Students
        </h3>
        <p className="opacity-75 mb-0">
          All students enrolled in your subjects
        </p>
      </div>

      {error && (
        <div className="alert alert-danger text-center">
          {error}
        </div>
      )}

      {students.length === 0 && !error && (
        <div className="alert alert-warning text-center">
          No students found for your subjects.
        </div>
      )}

      {/* ================= TABLE ================= */}
      {students.length > 0 && (
        <div className="card shadow-lg border-0 rounded-4 glass-card">
          <div className="card-body">

            <table className="table table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>
                    <FaIdCard className="me-1" />
                    Name
                  </th>
                  <th>
                    <FaEnvelope className="me-1" />
                    Email
                  </th>
                  <th>
                    <FaGraduationCap className="me-1" />
                    Course
                  </th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s._id}>
                    <td>{i + 1}</td>
                    <td>{s.fullName || s.name}</td>
                    <td>{s.email}</td>
                    <td>{s.course?.name || "Course"}</td>
                    <td>
                      {s.status === "APPROVED" ? (
                        <span className="badge bg-success">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="badge bg-secondary">
                          PENDING
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        </div>
      )}

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.96);
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
