import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaCalendarAlt,
  FaClock,
  FaBookOpen,
  FaDoorOpen
} from "react-icons/fa";

export default function MyTimetable() {
  const { user } = useContext(AuthContext);

  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER")
    return <Navigate to="/teacher/dashboard" />;

  /* ================= FETCH TIMETABLE ================= */
  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const res = await api.get("/timetable/teacher");
        setTimetable(res.data.timetable || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load timetable");
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading My Timetable...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaCalendarAlt className="me-2 blink" />
          My Timetable
        </h3>
        <p className="opacity-75 mb-0">
          Weekly lecture schedule assigned to you
        </p>
      </div>

      {/* ================= ERROR ================= */}
      {error && (
        <div className="alert alert-danger text-center">
          {error}
        </div>
      )}

      {/* ================= EMPTY ================= */}
      {timetable.length === 0 && !error && (
        <div className="alert alert-warning text-center">
          No timetable slots assigned to you.
        </div>
      )}

      {/* ================= TIMETABLE TABLE ================= */}
      {timetable.length > 0 && (
        <div className="card shadow-lg border-0 rounded-4 glass-card">
          <div className="card-body">

            <table className="table table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Day</th>
                  <th>
                    <FaBookOpen className="me-1" />
                    Subject
                  </th>
                  <th>Code</th>
                  <th>Course</th>
                  <th>
                    <FaClock className="me-1" />
                    Time
                  </th>
                  <th>
                    <FaDoorOpen className="me-1" />
                    Room
                  </th>
                  <th>Semester</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {timetable.map((t, i) => (
                  <tr key={t._id}>
                    <td>{i + 1}</td>
                    <td className="fw-bold">{t.dayOfWeek}</td>
                    <td>{t.subject_id?.name}</td>
                    <td>{t.subject_id?.code}</td>
                    <td>{t.course_id?.name}</td>
                    <td>
                      {t.startTime} - {t.endTime}
                    </td>
                    <td>{t.room || "N/A"}</td>
                    <td>{t.semester}</td>
                    <td>
                      <span className="badge bg-primary">
                        {t.lectureType}
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
