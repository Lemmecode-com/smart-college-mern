import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AttendanceList() {
  const [attendance, setAttendance] = useState([]);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= FETCH ATTENDANCE ================= */
  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const res = await api.get("/attendance", {
          params: date ? { date } : {}
        });

        // SAFE ARRAY HANDLING
        setAttendance(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (err) {
        console.error("Failed to load attendance");
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [date]);

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5 className="mb-3">Attendance Records</h5>

        {/* DATE FILTER */}
        <input
          type="date"
          className="form-control mb-3"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {loading ? (
          <p className="text-center text-muted">Loading...</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered align-middle">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Teacher</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {attendance.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted">
                      No attendance records found
                    </td>
                  </tr>
                )}

                {attendance.map((a) => (
                  <tr key={a._id}>
                    <td>
                      {new Date(a.date).toLocaleDateString()}
                    </td>
                    <td>{a.studentId?.name || "-"}</td>
                    <td>{a.courseId?.name || "-"}</td>
                    <td>{a.markedBy?.name || "-"}</td>
                    <td>
                      <span
                        className={`badge ${
                          a.status === "Present"
                            ? "bg-success"
                            : "bg-danger"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
