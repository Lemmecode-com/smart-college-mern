import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function SubjectList() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/subjects")
      .then((res) => setSubjects(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-fluid mt-4">
      {/* Header */}
      <div
        className="d-flex justify-content-between align-items-center p-3 mb-4"
        style={{
          background: "linear-gradient(180deg, #0f3a4a, #134952)",
          borderRadius: "10px",
          color: "white",
        }}
      >
        <h5 className="mb-0">Subjects</h5>
        <span className="text-white-50">Academic Management</span>
      </div>

      {/* Card */}
      <div
        className="card shadow-sm"
        style={{
          borderRadius: "12px",
          backgroundColor: "white",
        }}
      >
        <div className="card-body">
          {loading ? (
            <p className="text-center text-muted">Loading subjects...</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead
                  style={{
                    background: "linear-gradient(180deg, #0f3a4a, #134952)",
                    color: "white",
                  }}
                >
                  <tr>
                    <th>#</th>
                    <th>Subject Name</th>
                    <th>Code</th>
                    <th>Course</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {subjects.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted">
                        No subjects found
                      </td>
                    </tr>
                  )}

                  {subjects.map((s, index) => (
                    <tr key={s._id}>
                      <td>{index + 1}</td>
                      <td>{s.name}</td>
                      <td>{s.code}</td>
                      <td>{s.courseId?.name || "-"}</td>
                      <td>{s.departmentId?.name || "-"}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              s.status === "Active" ? "#198754" : "#6c757d",
                            color: "white",
                            padding: "6px 10px",
                            borderRadius: "20px",
                          }}
                        >
                          {s.status}
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
    </div>
  );
}
