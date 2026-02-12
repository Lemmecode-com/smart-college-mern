import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/axios";

export default function SessionDetails() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);

  /* ================= FETCH SESSION ================= */
  const fetchSession = async () => {
    const res = await api.get(`/attendance/sessions/${sessionId}`);
    setSession(res.data);
  };

  /* ================= FETCH RECORDS ================= */
  const fetchRecords = async () => {
    const res = await api.get(`/attendance/sessions/${sessionId}/records`);
    setRecords(res.data);
  };

  /* ================= FETCH STUDENTS (ONLY IF OPEN) ================= */
  const fetchStudents = async () => {
    const res = await api.get(`/attendance/sessions/${sessionId}/students`);
    setStudents(res.data);
  };

  useEffect(() => {
    const load = async () => {
      await fetchSession();
      await fetchRecords();
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (session?.status === "OPEN") {
      fetchStudents();
    }
  }, [session]);

  /* ================= DELETE SESSION ================= */
  const deleteSession = async () => {
    if (!window.confirm("Are you sure to delete this session?")) return;

    await api.delete(`/attendance/sessions/${sessionId}`);
    alert("Session deleted");
    navigate("/attendance/sessions");
  };

  /* ================= MARK ATTENDANCE ================= */
  const saveAttendance = async () => {
    const payload = {
      attendance: Object.keys(attendance).map((id) => ({
        student_id: id,
        status: attendance[id],
      })),
    };

    await api.post(`/attendance/sessions/${sessionId}/mark`, payload);

    alert("Attendance saved");
    fetchRecords();
  };

  if (loading) return <p>Loading...</p>;
  if (!session) return <p>No session found</p>;

  /* ================= CALCULATIONS ================= */
  const total = records.length;
  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

  return (
    <div className="container py-4">
      <h4 className="fw-bold mb-4">Session Details</h4>

      {/* ================= SESSION INFO ================= */}
      <div className="card shadow-sm p-4 mb-4">
        <div className="row">
          <div className="col-md-6">
            <p>
              <strong>Date:</strong>{" "}
              {new Date(session.lectureDate).toLocaleDateString()}
            </p>
            <p>
              <strong>Lecture No:</strong> {session.lectureNumber}
            </p>
            <p>
              <strong>Subject:</strong> {session.subject_id?.name}
            </p>
            <p>
              <strong>Course:</strong> {session.course_id?.name}
            </p>
          </div>

          <div className="col-md-6">
            <p>
              <strong>Status:</strong>
              <span
                className={`badge ms-2 ${
                  session.status === "OPEN" ? "bg-success" : "bg-secondary"
                }`}
              >
                {session.status}
              </span>
            </p>

            <p>
              <strong>Total Students:</strong> {total}
            </p>
            <p>
              <strong>Present:</strong> {present}
            </p>
            <p>
              <strong>Absent:</strong> {absent}
            </p>
            <p>
              <strong>Attendance %:</strong> {percentage}%
            </p>
          </div>
        </div>
      </div>

      {/* ================= OPEN SESSION ACTIONS ================= */}
      {session.status === "OPEN" && (
        <div className="mb-4">
          <button className="btn btn-success me-2" onClick={saveAttendance}>
            Save Attendance
          </button>

          <button className="btn btn-danger" onClick={deleteSession}>
            Delete Session
          </button>

          <button
            className="btn btn-warning ms-2"
            onClick={async () => {
              await api.put(`/attendance/sessions/${sessionId}/close`);
              alert("Session closed");
              window.location.reload();
            }}
          >
            Close Session
          </button>
        </div>
      )}

      {/* ================= MARK ATTENDANCE TABLE ================= */}
      {session.status === "OPEN" && (
        <>
          <h5>Mark Attendance</h5>
          <table className="table table-bordered">
            <thead className="table-dark">
              <tr>
                <th>Student</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id}>
                  <td>{s.fullName}</td>
                  <td>
                    <select
                      className="form-select"
                      onChange={(e) =>
                        setAttendance({
                          ...attendance,
                          [s._id]: e.target.value,
                        })
                      }
                    >
                      <option value="">Select</option>
                      <option value="PRESENT">Present</option>
                      <option value="ABSENT">Absent</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ================= CLOSED SESSION VIEW ================= */}
      {session.status === "CLOSED" && (
        <>
          <div className="alert alert-info">
            This session is closed. Attendance cannot be modified.
          </div>

          <h5>Attendance Records</h5>

          {records.length === 0 ? (
            <div className="alert alert-warning">
              No attendance records found.
            </div>
          ) : (
            <table className="table table-bordered">
              <thead className="table-dark">
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Marked At</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r._id}>
                    <td>{r.student_id?.fullName}</td>
                    <td>{r.student_id?.email}</td>
                    <td>
                      <span
                        className={`badge ${
                          r.status === "PRESENT" ? "bg-success" : "bg-danger"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
