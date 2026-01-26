import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaSave,
  FaBookOpen
} from "react-icons/fa";

export default function MarkAttendance() {
  const { user } = useContext(AuthContext);

  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER")
    return <Navigate to="/teacher/dashboard" />;

  /* ================= FETCH MY OPEN SESSIONS ================= */
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get("/timetable/teacher");
        setSessions(res.data.timetable || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  /* ================= LOAD STUDENTS ================= */
  const loadStudents = async (sessionId) => {
    const session = sessions.find((s) => s._id === sessionId);
    if (!session) return;

    try {
      const res = await api.get(
        `/attendance/students?course_id=${session.course_id._id}`
      );
      setStudents(res.data || []);

      // Default attendance = ABSENT
      const initial = {};
      res.data.forEach((s) => {
        initial[s._id] = "ABSENT";
      });
      setAttendance(initial);
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= HANDLE CHANGE ================= */
  const handleStatusChange = (studentId, status) => {
    setAttendance({ ...attendance, [studentId]: status });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    setSubmitting(true);

    const payload = {
      attendance: Object.keys(attendance).map((id) => ({
        student_id: id,
        status: attendance[id]
      }))
    };

    try {
      await api.post(
        `/attendance/sessions/${selectedSession}/manual`,
        payload
      );
      alert("Attendance marked successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark attendance");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Sessions...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaUsers className="me-2 blink" />
          Manual Attendance
        </h3>
        <p className="opacity-75 mb-0">
          Mark student attendance for lecture
        </p>
      </div>

      {/* ================= SESSION SELECT ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card mb-4">
        <div className="card-body">
          <label className="fw-semibold">
            <FaBookOpen className="me-2" />
            Select Timetable Slot
          </label>
          <select
            className="form-select"
            value={selectedSession}
            onChange={(e) => {
              setSelectedSession(e.target.value);
              loadStudents(e.target.value);
            }}
          >
            <option value="">-- Select Session --</option>
            {sessions.map((s) => (
              <option key={s._id} value={s._id}>
                {s.dayOfWeek} | {s.subject_id?.name} |{" "}
                {s.startTime}-{s.endTime}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ================= STUDENT LIST ================= */}
      {students.length > 0 && (
        <div className="card shadow-lg border-0 rounded-4 glass-card">
          <div className="card-body">

            <table className="table table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th className="text-center">Present</th>
                  <th className="text-center">Absent</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s._id}>
                    <td>{i + 1}</td>
                    <td>{s.fullName}</td>
                    <td>{s.email}</td>
                    <td className="text-center">
                      <input
                        type="radio"
                        name={s._id}
                        checked={attendance[s._id] === "PRESENT"}
                        onChange={() =>
                          handleStatusChange(s._id, "PRESENT")
                        }
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="radio"
                        name={s._id}
                        checked={attendance[s._id] === "ABSENT"}
                        onChange={() =>
                          handleStatusChange(s._id, "ABSENT")
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              className="btn btn-success w-100 mt-3"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <FaSave className="me-2" />
              {submitting ? "Saving..." : "Submit Attendance"}
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
