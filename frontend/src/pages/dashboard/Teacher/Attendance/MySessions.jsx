import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../auth/AuthContext";
import api from "../../../../api/axios";

import {
  FaListAlt,
  FaCalendarAlt,
  FaLock,
  FaEdit,
  FaEye,
  FaCheckCircle
} from "react-icons/fa";

export default function MySessions() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER")
    return <Navigate to="/teacher/dashboard" />;

  /* ================= FETCH SESSIONS ================= */
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get("/attendance/sessions");
        setSessions(res.data.sessions || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load attendance sessions");
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading My Sessions...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaListAlt className="me-2 blink" />
          My Attendance Sessions
        </h3>
        <p className="opacity-75 mb-0">
          All attendance sessions created by you
        </p>
      </div>

      {error && (
        <div className="alert alert-danger text-center">
          {error}
        </div>
      )}

      {/* ================= EMPTY ================= */}
      {sessions.length === 0 && !error && (
        <div className="alert alert-warning text-center">
          You have not created any attendance sessions yet.
        </div>
      )}

      {/* ================= TABLE ================= */}
      {sessions.length > 0 && (
        <div className="card shadow-lg border-0 rounded-4 glass-card">
          <div className="card-body">

            <table className="table table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>
                    <FaCalendarAlt className="me-1" />
                    Date
                  </th>
                  <th>Lecture No</th>
                  <th>Session ID</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={s._id}>
                    <td>{i + 1}</td>
                    <td>
                      {new Date(s.lectureDate).toLocaleDateString()}
                    </td>
                    <td>{s.lectureNumber}</td>
                    <td className="text-muted small">
                      {s._id}
                    </td>
                    <td>
                      {s.status === "OPEN" ? (
                        <span className="badge bg-success">
                          <FaCheckCircle className="me-1" />
                          OPEN
                        </span>
                      ) : (
                        <span className="badge bg-danger">
                          CLOSED
                        </span>
                      )}
                    </td>
                    <td className="text-center d-flex gap-2 justify-content-center">

                      {/* VIEW / MARK */}
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() =>
                          navigate(`/attendance/mark?sessionId=${s._id}`)
                        }
                        title="Mark Attendance"
                      >
                        <FaEye />
                      </button>

                      {/* EDIT */}
                      {s.status === "OPEN" && (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() =>
                            navigate(`/attendance/sessions/${s._id}/edit`)
                          }
                          title="Edit Attendance"
                        >
                          <FaEdit />
                        </button>
                      )}

                      {/* CLOSE */}
                      {s.status === "OPEN" && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() =>
                            navigate(`/session/close/${s._id}`)
                          }
                          title="Close Session"
                        >
                          <FaLock />
                        </button>
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