import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function ChildAttendance() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    api.get("/parents/attendance").then((res) => {
      setRecords(res.data);
    });
  }, []);

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5>Attendance Records</h5>

        <table className="table table-bordered mt-3">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Course</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center">
                  No records found
                </td>
              </tr>
            )}

            {records.map((r) => (
              <tr key={r._id}>
                <td>{new Date(r.date).toLocaleDateString()}</td>
                <td>{r.courseId?.name}</td>
                <td>
                  <span
                    className={`badge ${
                      r.status === "Present"
                        ? "bg-success"
                        : "bg-danger"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
