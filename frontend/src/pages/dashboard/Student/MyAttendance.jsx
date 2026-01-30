import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaBookOpen,
  FaChartPie
} from "react-icons/fa";

export default function MyAttendance() {
  const { user } = useContext(AuthContext);

  const [attendance, setAttendance] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT")
    return <Navigate to="/" />;

  /* ================= FETCH ATTENDANCE ================= */
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await api.get(
          "/attendance/my-attendance/summary"
        );

        setStudentId(res.data.studentId);
        setAttendance(res.data.attendance || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load attendance data");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading My Attendance...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaCalendarAlt className="me-2 blink" />
          My Attendance
        </h3>
        <p className="opacity-75 mb-0">
          Student ID: {studentId}
        </p>
      </div>

      {error && (
        <div className="alert alert-danger text-center">
          {error}
        </div>
      )}

      {/* ================= EMPTY STATE ================= */}
      {attendance.length === 0 && !error && (
        <div className="card shadow-lg border-0 rounded-4 glass-card text-center">
          <div className="card-body p-5">
            <FaChartPie size={60} className="text-muted mb-3" />
            <h5 className="fw-bold">
              No Attendance Records Found
            </h5>
            <p className="text-muted">
              Your attendance will appear once teachers mark it.
            </p>
          </div>
        </div>
      )}

      {/* ================= ATTENDANCE TABLE ================= */}
      {attendance.length > 0 && (
        <div className="card shadow-lg border-0 rounded-4 glass-card">
          <div className="card-body">

            <table className="table table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Sr.No</th>
                  <th>
                    <FaBookOpen className="me-1" />
                    Subject
                  </th>
                  <th>Code</th>
                  <th className="text-center">
                    Total Lectures
                  </th>
                  <th className="text-center text-success">
                    <FaCheckCircle className="me-1" />
                    Present
                  </th>
                  <th className="text-center text-danger">
                    <FaTimesCircle className="me-1" />
                    Absent
                  </th>
                  <th className="text-center">
                    Attendance %
                  </th>
                </tr>
              </thead>

              <tbody>
                {attendance.map((a, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{a.subject}</td>
                    <td>{a.subjectCode}</td>
                    <td className="text-center">
                      {a.totalLectures}
                    </td>
                    <td className="text-center text-success">
                      {a.present}
                    </td>
                    <td className="text-center text-danger">
                      {a.absent}
                    </td>
                    <td className="text-center fw-bold">
                      <span
                        className={`badge ${
                          a.percentage >= 75
                            ? "bg-success"
                            : a.percentage >= 60
                            ? "bg-warning text-dark"
                            : "bg-danger"
                        }`}
                      >
                        {a.percentage}%
                      </span>
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
