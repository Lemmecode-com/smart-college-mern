import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUsers,
  FaSave,
  FaBookOpen,
  FaEdit,
  FaLock
} from "react-icons/fa";

export default function MarkAttendance() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER")
    return <Navigate to="/teacher/dashboard" />;

  /* ================= FETCH ATTENDANCE SESSIONS ================= */
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

  /* ================= LOAD STUDENTS ================= */
  const loadStudents = async (sessionId) => {
    const session = sessions.find((s) => s._id === sessionId);
    if (!session) return;

    try {
      const res = await api.get(
        `/attendance/students?course_id=${session.course_id}`
      );

      const studentList = res.data || [];
      setStudents(studentList);

      // Default all ABSENT
      const initial = {};
      studentList.forEach((s) => {
        initial[s._id] = "ABSENT";
      });
      setAttendance(initial);

    } catch (err) {
      console.error(err);
      setError("Failed to load students");
    }
  };

  /* ================= HANDLE CHANGE ================= */
  const handleStatusChange = (studentId, status) => {
    setAttendance({ ...attendance, [studentId]: status });
  };

  /* ================= SAVE ATTENDANCE ================= */
  const handleSubmit = async () => {
    if (!selectedSession) {
      setError("Please select a session first");
      return;
    }

    setSubmitting(true);
    setError("");

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
      alert("Attendance saved successfully");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to mark attendance");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= CLOSE SESSION (CORRECT FLOW) ================= */
  const handleCloseSession = () => {
    if (!selectedSession) {
      setError("Please select a session first");
      return;
    }

    // 👉 Just navigate, do NOT call API here
    navigate(`/session/close/${selectedSession}`);
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
          Mark Attendance
        </h3>
        <p className="opacity-75 mb-0">
          Mark student attendance for lecture
        </p>
      </div>

      {error && (
        <div className="alert alert-danger text-center">
          {error}
        </div>
      )}

      {/* ================= SESSION SELECT ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card mb-4">
        <div className="card-body">
          <label className="fw-semibold">
            <FaBookOpen className="me-2" />
            Select Attendance Session
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
                {new Date(s.lectureDate).toLocaleDateString()} |
                Lecture {s.lectureNumber}
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

            {/* ================= ACTION BUTTONS ================= */}
            <div className="d-flex gap-2 mt-3">
              <button
                className="btn btn-success w-100"
                onClick={handleSubmit}
                disabled={submitting}
              >
                <FaSave className="me-2" />
                {submitting ? "Saving..." : "Save Attendance"}
              </button>

              <button
                className="btn btn-warning w-100"
                onClick={() =>
                  navigate(`/attendance/sessions/${selectedSession}/edit`)
                }
                disabled={!selectedSession}
              >
                <FaEdit className="me-2" />
                Edit
              </button>

              <button
                className="btn btn-danger w-100"
                onClick={handleCloseSession}
                disabled={!selectedSession}
              >
                <FaLock className="me-2" />
                Close Session
              </button>
            </div>

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
