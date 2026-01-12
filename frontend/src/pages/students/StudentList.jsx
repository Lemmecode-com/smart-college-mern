import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/students")
      .then((res) => setStudents(res.data))
      .catch(() => setError("Failed to load students"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading students...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  const getDepartmentName = (id) => {
    if (!id) return '—';
    const dept = departments.find((d) => d._id === id);
    return dept ? dept.name : '—';
  };

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <h5 className="mb-3">Students</h5>

        <div className="table-responsive">
          <table className="table table-bordered align-middle">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Roll No</th>
                <th>Department</th>
                <th>Course</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {students.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">
                    No students found
                  </td>
                </tr>
              )}

              {students.map((s) => (
                <tr key={s._id}>
                  <td>{s.name}</td>
                  <td>{s.rollNo}</td>
                  <td>{s.departmentId?.name || "-"}</td>
                  <td>{s.courseId?.name || "-"}</td>
                  <td>
                    <span
                      className={`badge ${
                        s.status === "Active"
                          ? "bg-success"
                          : "bg-secondary"
                      }`}
                    >
                      {s.status}
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
