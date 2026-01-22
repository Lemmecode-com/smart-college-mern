import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    api.get("/parents/my-children").then((res) => {
      setChildren(res.data);
      setSelectedChild(res.data[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedChild) {
      api
        .get("/attendance", {
          params: { studentId: selectedChild._id },
        })
        .then((res) => setAttendance(res.data));
    }
  }, [selectedChild]);

  if (!children.length) {
    return <p>No child linked to your account</p>;
  }

  return (
    <div>
      <h4 className="mb-3">Parent Dashboard</h4>

      {/* Child Selector */}
      <select
        className="form-select mb-4"
        onChange={(e) =>
          setSelectedChild(
            children.find((c) => c._id === e.target.value)
          )
        }
      >
        {children.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name} (Roll: {c.rollNo})
          </option>
        ))}
      </select>

      {/* Child Profile */}
      {selectedChild && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5>Child Profile</h5>

            <p><strong>Name:</strong> {selectedChild.name}</p>
            <p><strong>Roll No:</strong> {selectedChild.rollNo}</p>
            <p><strong>Department:</strong> {selectedChild.departmentId?.name}</p>
            <p><strong>Course:</strong> {selectedChild.courseId?.name}</p>
          </div>
        </div>
      )}

      {/* Attendance */}
      <div className="card shadow-sm">
        <div className="card-body">
          <h5>Attendance</h5>

          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 && (
                <tr>
                  <td colSpan="3" className="text-center">
                    No attendance records
                  </td>
                </tr>
              )}

              {attendance.map((a) => (
                <tr key={a._id}>
                  <td>{new Date(a.date).toLocaleDateString()}</td>
                  <td>{a.subjectId?.name}</td>
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
      </div>
    </div>
  );
}
