import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { toast } from "react-toastify";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

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
        toast.error("Failed to load students", {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />
        });
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

      toast.success(res.data.message || "Attendance updated successfully", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaCheckCircle />
      });
      navigate(`/attendance/session/${sessionId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />
      });
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