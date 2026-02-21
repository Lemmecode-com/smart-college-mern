import { useContext, useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../../auth/AuthContext";
import api from "../../../../api/axios";

import { FaEdit, FaSave } from "react-icons/fa";

export default function EditAttendance() {
  const { user } = useContext(AuthContext);
  const { sessionId } = useParams();

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /* SECURITY */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER")
    return <Navigate to="/teacher/dashboard" />;

  /* LOAD SESSION + STUDENTS */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get session
        const sessionRes = await api.get(
          `/attendance/sessions/${sessionId}`
        );
        const sessionData = sessionRes.data.session;
        setSession(sessionData);

        // 2. Get students
        const studentsRes = await api.get(
          `/attendance/students?course_id=${sessionData.course_id}`
        );

        const studentList = studentsRes.data || [];
        setStudents(studentList);

        // 3. Default all ABSENT
        const map = {};
        studentList.forEach((s) => {
          map[s._id] = "ABSENT";
        });
        setAttendance(map);

      } catch (err) {
        console.error(err);
        setError("Failed to load attendance data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  const handleStatusChange = (studentId, status) => {
    setAttendance({ ...attendance, [studentId]: status });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    const payload = {
      attendance: Object.keys(attendance).map((id) => ({
        student_id: id,
        status: attendance[id]
      }))
    };

    try {
      await api.put(
        `/attendance/sessions/${sessionId}/edit`,
        payload
      );
      alert("Attendance updated successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Attendance...</h5>
      </div>
    );
  }

  if (!session || session.status !== "OPEN") {
    return (
      <div className="alert alert-warning text-center">
        Attendance session is already closed. Editing not allowed.
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaEdit className="me-2 blink" />
          Edit Attendance
        </h3>
      </div>

      {error && (
        <div className="alert alert-danger text-center">
          {error}
        </div>
      )}

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
            className="btn btn-warning w-100 mt-3"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <FaSave className="me-2" />
            {submitting ? "Updating..." : "Update Attendance"}
          </button>

        </div>
      </div>
    </div>
  );
}