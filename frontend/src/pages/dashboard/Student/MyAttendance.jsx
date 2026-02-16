import { useEffect, useState } from "react";
import api from "../../../api/axios";

export default function StudentAttendanceReport() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    subjectId: "",
    startDate: "",
    endDate: "",
  });

  const fetchReport = async () => {
    const res = await api.get("/attendance/student", {
      params: filters,
    });
    setData(res.data);
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (!data) return <p className="text-center mt-4">Loading...</p>;

  const summary = data?.summary || {
  totalLectures: 0,
  present: 0,
  absent: 0,
  percentage: 0,
};

const sessions = data?.sessions || [];
const today = data?.today || [];
const subjectWise = data?.subjectWise || [];


  return (
    <div className="container py-4">
      {/* HEADER */}
      <div className="header p-4 rounded-4 text-white shadow mb-4">
        <h4>📊 My Attendance Report</h4>
      </div>

      {/* TODAY SECTION */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <h5 className="mb-3">📅 Today's Attendance</h5>

          {today.length === 0 && (
            <p className="text-muted">No sessions today</p>
          )}

          {today.map((t, i) => (
            <div key={i} className="d-flex justify-content-between mb-2">
              <span>{t.subject}</span>
              <span
                className={`badge ${
                  t.status === "PRESENT"
                    ? "bg-success"
                    : t.status === "ABSENT"
                      ? "bg-danger"
                      : "bg-secondary"
                }`}
              >
                {t.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SUBJECT-WISE BREAKDOWN */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="mb-3">📊 Subject-wise Attendance</h5>

          <table className="table table-bordered">
            <thead className="table-dark">
              <tr>
                <th>Subject</th>
                <th>Total</th>
                <th>Present</th>
                <th>Percentage</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {subjectWise.map((sub, i) => (
                <tr key={i}>
                  <td>
                    {sub.subject}
                    <div className="text-muted small">{sub.code}</div>
                  </td>

                  <td>{sub.total}</td>
                  <td>{sub.present}</td>

                  <td>
                    <span
                      className={`badge ${
                        sub.percentage >= 75 ? "bg-success" : "bg-danger"
                      }`}
                    >
                      {sub.percentage}%
                    </span>
                  </td>

                  <td>
                    {sub.warning ? (
                      <span className="text-danger fw-bold">
                        ⚠ Low Attendance
                      </span>
                    ) : (
                      <span className="text-success">✔ Safe</span>
                    )}
                  </td>
                </tr>
              ))}

              {subjectWise.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="row text-center mb-4">
        <Summary title="Total Lectures" value={summary.totalLectures} />
        <Summary
          title="Present"
          value={summary.present}
          className="text-success"
        />
        <Summary
          title="Absent"
          value={summary.absent}
          className="text-danger"
        />
        <Summary title="Attendance %" value={`${summary.percentage}%`} />
      </div>

      {/* SESSION TABLE */}
      <div className="card shadow-sm">
        <div className="card-body">
          <h5>Session-wise Report</h5>

          <table className="table table-bordered">
            <thead className="table-dark">
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Lecture</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {sessions.map((s, i) => (
                <tr key={i}>
                  <td>{new Date(s.date).toLocaleDateString()}</td>
                  <td>{s.subject}</td>
                  <td>{s.lectureNumber}</td>
                  <td>
                    <span
                      className={`badge ${
                        s.status === "PRESENT" ? "bg-success" : "bg-danger"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}

              {sessions.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center">
                    No attendance records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .header {
          background: linear-gradient(180deg,#0f3a4a,#134952);
        }
      `}</style>
    </div>
  );
}

function Summary({ title, value, className }) {
  return (
    <div className="col-md-3">
      <div className={`card p-3 shadow-sm ${className || ""}`}>
        <h6>{title}</h6>
        <h4>{value}</h4>
      </div>
    </div>
  );
}




