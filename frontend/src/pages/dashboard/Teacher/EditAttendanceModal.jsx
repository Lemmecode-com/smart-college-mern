import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/axios";

export default function EditAttendanceModal() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);

  /* ================= LOAD STUDENTS ================= */
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get(
          `/attendance/sessions/${sessionId}/students`
        );
        setStudents(res.data);
      } catch {
        alert("Failed to load students");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [sessionId]);

  /* ================= UPDATE ================= */
  const handleSubmit = async () => {
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

      alert(res.data.message);
      navigate(`/attendance/session/${sessionId}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="container py-4">
      <h4>Edit Attendance</h4>

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
                      [s._id]: e.target.value
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

      <button
        className="btn btn-warning"
        onClick={handleSubmit}
      >
        Update Attendance
      </button>
    </div>
  );
}