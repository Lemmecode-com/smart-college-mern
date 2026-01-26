import { useContext, useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaEdit,
  FaUsers,
  FaSave,
  FaCheckCircle,
  FaTimesCircle
} from "react-icons/fa";

export default function EditAttendance() {
  const { user } = useContext(AuthContext);
  const { sessionId } = useParams();

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER")
    return <Navigate to="/teacher/dashboard" />;

  /* ================= LOAD STUDENTS ================= */
  useEffect(() => {
    const loadStudents = async () => {
      try {
        // First get session to know course
        const sessionRes = await api.get(`/attendance/sessions/${sessionId}`);
        const courseId = sessionRes.data.course_id;

        // Get students for that course
        const studentsRes = await api.get(
          `/attendance/students?course_id=${courseId}`
        );

        setStudents(studentsRes.data || []);

        // Default all ABSENT
        const initial = {};
        studentsRes.data.forEach((s) => {
          initial[s._id] = "ABSENT";
        });
        setAttendance(initial);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [sessionId]);

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
      const res = await api.put(
        `/attendance/sessions/${sessionId}/edit`,
        payload
      );

      alert(
        `Attendance Updated: ${res.data.totalUpdated} students`
      );
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Attendance...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaEdit className="me-2 blink" />
          Edit Attendance
        </h3>
        <p className="opacity-75 mb-0">
          Modify student attendance for this lecture
        </p>
      </div>

      {/* ================= TABLE ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body">

          {students.length === 0 ? (
            <div className="alert alert-info">
              No students found for this session.
            </div>
          ) : (
            <>
              <table className="table table-hover align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th className="text-center">
                      <FaCheckCircle className="text-success" /> Present
                    </th>
                    <th className="text-center">
                      <FaTimesCircle className="text-danger" /> Absent
                    </th>
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
                className="btn btn-warning w-100 mt-3"
                onClick={handleSubmit}
                disabled={submitting}
              >
                <FaSave className="me-2" />
                {submitting ? "Updating..." : "Update Attendance"}
              </button>
            </>
          )}

        </div>
      </div>

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
