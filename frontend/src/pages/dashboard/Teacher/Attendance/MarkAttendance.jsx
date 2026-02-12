import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../auth/AuthContext";
import api from "../../../../api/axios";

import {
  FaUsers,
  FaSave,
  FaBookOpen,
  FaEdit,
  FaLock,
  FaCheckCircle
} from "react-icons/fa";

export default function MarkAttendance() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [attendance, setAttendance] = useState({});
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      } catch {
        setError("Failed to load sessions");
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  /* ================= LOAD STUDENTS ================= */
  const loadStudents = async (sessionId) => {
    setError("");
    setStudents([]);
    setAttendance({});
    setAttendanceSaved(false);

    const session = sessions.find((s) => s._id === sessionId);
    if (!session?.course_id) return;

    try {
      const res = await api.get(
        `/attendance/students?course_id=${session.course_id}`
      );

      const list = res.data || [];
      setStudents(list);

      const initial = {};
      list.forEach((s) => (initial[s._id] = "ABSENT"));
      setAttendance(initial);

    } catch {
      setError("Failed to load students");
    }
  };

  /* ================= MARK STATUS ================= */
  const handleStatusChange = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  /* ================= SAVE ATTENDANCE (ONLY ONCE) ================= */
  const handleSaveAttendance = async () => {
    if (!selectedSession) return;

    setSaving(true);
    setError("");

    const payload = {
      attendance: Object.entries(attendance).map(
        ([student_id, status]) => ({ student_id, status })
      )
    };

    try {
      await api.post(
        `/attendance/sessions/${selectedSession}/mark-attendance`,
        payload
      );

      setAttendanceSaved(true);
      alert("✅ Attendance saved successfully");

    } catch (err) {
      if (err.response?.status === 409 || err.response?.status === 500) {
        setAttendanceSaved(true);
        setError("Attendance already saved. Use Edit option.");
      } else {
        setError("Failed to save attendance");
      }
    } finally {
      setSaving(false);
    }
  };

  /* ================= CLOSE SESSION ================= */
  const handleCloseSession = () => {
    navigate(`/session/close/${selectedSession}`);
  };

  if (loading) {
    return <h5 className="text-center">Loading...</h5>;
  }

return (
  <div className="container-fluid px-3 px-md-4">

    {/* ================= PAGE HEADER ================= */}
    <div className="page-header mb-4">
      <div className="d-flex align-items-center gap-3">
        <div className="icon-box">
          <FaUsers />
        </div>
        <div>
          <h3 className="mb-1 fw-bold">Mark Attendance</h3>
          <p className="text-muted mb-0">
            Select session → students auto load → mark → save
          </p>
        </div>
      </div>
    </div>

    {/* ================= ALERTS ================= */}
    {error && (
      <div className="alert alert-danger text-center mb-4">
        {error}
      </div>
    )}

    {attendanceSaved && (
      <div className="alert alert-success text-center mb-4">
        Attendance already saved for this session.  
        Use <strong>Edit</strong> to modify.
      </div>
    )}

    {/* ================= SESSION SELECT ================= */}
    <div className="card section-card mb-4">
      <div className="card-body">
        <label className="form-label fw-semibold mb-2">
          <FaBookOpen className="me-2 text-primary" />
          Attendance Session
        </label>

        <select
          className="form-select"
          value={selectedSession}
          onChange={(e) => {
            const sessionId = e.target.value;
            setSelectedSession(sessionId);
            if (sessionId) loadStudents(sessionId);
          }}
        >
          <option value="">-- Select Lecture Session --</option>
          {sessions.map((s) => (
            <option key={s._id} value={s._id}>
              {new Date(s.lectureDate).toLocaleDateString()} | Lecture {s.lectureNumber}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* ================= STUDENT TABLE ================= */}
    {students.length > 0 && (
      <div className="card section-card">
        <div className="card-body p-0">

          {/* Table Header */}
          <div className="table-header px-4 py-3">
            <h5 className="fw-bold mb-0">Student Attendance</h5>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Email</th>
                  <th className="text-center">Present</th>
                  <th className="text-center">Absent</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s._id}>
                    <td>{i + 1}</td>
                    <td className="fw-semibold">{s.fullName}</td>
                    <td className="text-muted">{s.email}</td>

                    <td className="text-center">
                      <input
                        type="radio"
                        name={s._id}
                        disabled={attendanceSaved}
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
                        disabled={attendanceSaved}
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
          </div>

          {/* ================= ACTION FOOTER ================= */}
          <div className="action-footer px-4 py-3">
            <div className="row g-2">
              <div className="col-md-4">
                <button
                  className="btn btn-success w-100"
                  onClick={handleSaveAttendance}
                  disabled={saving || attendanceSaved}
                >
                  <FaSave className="me-2" />
                  {saving ? "Saving..." : "Save Attendance"}
                </button>
              </div>

              <div className="col-md-4">
                <button
                  className="btn btn-warning w-100"
                  onClick={() =>
                    navigate(`/attendance/sessions/${selectedSession}/edit`)
                  }
                >
                  <FaEdit className="me-2" />
                  Edit Attendance
                </button>
              </div>

              <div className="col-md-4">
                <button
                  className="btn btn-danger w-100"
                  onClick={handleCloseSession}
                >
                  <FaLock className="me-2" />
                  Close Session
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    )}

    {/* ================= PAGE STYLES ================= */}
    <style>{`
      .page-header {
        background: linear-gradient(180deg, #0f3a4a, #134952);
        color: white;
        padding: 20px 24px;
        border-radius: 14px;
      }

      .icon-box {
        width: 46px;
        height: 46px;
        background: rgba(255,255,255,0.15);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }

      .section-card {
        border-radius: 16px;
        border: none;
        box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      }

      .table-header {
        background: #f8f9fa;
        border-bottom: 1px solid #dee2e6;
      }

      .action-footer {
        background: #f8f9fa;
        border-top: 1px solid #dee2e6;
      }

      @media (max-width: 768px) {
        .page-header {
          padding: 16px;
        }
      }
    `}</style>

  </div>
);

}
