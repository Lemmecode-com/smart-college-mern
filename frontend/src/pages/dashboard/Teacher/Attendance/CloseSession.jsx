import { useContext, useState } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../auth/AuthContext";
import api from "../../../../api/axios";

import {
  FaLock,
  FaCheckCircle,
  FaUsers
} from "react-icons/fa";

export default function CloseSession() {
  const { user } = useContext(AuthContext);
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER")
    return <Navigate to="/teacher/dashboard" />;

  /* ================= CLOSE SESSION ================= */
  const handleCloseSession = async () => {
    const confirm = window.confirm(
      "Are you sure you want to close this attendance session?\nThis action cannot be undone."
    );

    if (!confirm) return;

    setLoading(true);
    setError("");

    try {
      const res = await api.put(
        `/attendance/sessions/${sessionId}/close`
      );

      // Backend returns:
      // { totalStudents, present, absent }
      setResult(res.data);

    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Failed to close session"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaLock className="me-2 blink" />
          Close Attendance Session
        </h3>
        <p className="opacity-75 mb-0">
          Finalize attendance and lock the session
        </p>
      </div>

      {error && (
        <div className="alert alert-danger text-center">
          {error}
        </div>
      )}

      {/* ================= RESULT ================= */}
      {result ? (
        <div className="card shadow-lg border-0 rounded-4 glass-card text-center">
          <div className="card-body">

            <FaCheckCircle
              size={60}
              className="text-success mb-3"
            />

            <h4 className="fw-bold">Session Closed Successfully</h4>

            <div className="row mt-4">
              <div className="col">
                <h6>Total Students</h6>
                <p className="fw-bold">
                  {result.totalStudents}
                </p>
              </div>
              <div className="col">
                <h6>Present</h6>
                <p className="fw-bold text-success">
                  {result.present}
                </p>
              </div>
              <div className="col">
                <h6>Absent</h6>
                <p className="fw-bold text-danger">
                  {result.absent}
                </p>
              </div>
            </div>

            <button
              className="btn btn-primary mt-4"
              onClick={() => navigate("/attendance/report")}
            >
              <FaUsers className="me-2" />
              View Attendance Report
            </button>

          </div>
        </div>
      ) : (
        /* ================= ACTION ================= */
        <div className="card shadow-lg border-0 rounded-4 glass-card text-center">
          <div className="card-body">

            <FaLock size={60} className="text-warning mb-3" />

            <h4 className="fw-bold">Close This Session?</h4>
            <p className="text-muted">
              Once closed, attendance cannot be edited.
            </p>

            <button
              className="btn btn-danger px-4"
              onClick={handleCloseSession}
              disabled={loading}
            >
              {loading ? "Closing..." : "Close Session"}
            </button>

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
