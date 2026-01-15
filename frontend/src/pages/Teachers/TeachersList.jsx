import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function TeachersList() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/users/teachers")
      .then((res) => setTeachers(res.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-fluid mt-4">
      {/* Header */}
      <div
        className="p-3 mb-4"
        style={{
          background: "linear-gradient(180deg, #0f3a4a, #134952)",
          borderRadius: "12px",
          color: "white",
        }}
      >
        <h5 className="mb-1">Teachers</h5>
        <small className="text-white-50">Faculty Management</small>
      </div>

      {/* Card */}
      <div
        className="card shadow-sm"
        style={{ borderRadius: "12px", backgroundColor: "white" }}
      >
        <div className="card-body">
          {loading ? (
            <p className="text-center text-muted">Loading teachers...</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead
                  style={{
                    background:
                      "linear-gradient(180deg, #0f3a4a, #134952)",
                    color: "white",
                  }}
                >
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {teachers.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center text-muted">
                        No teachers found
                      </td>
                    </tr>
                  )}

                  {teachers.map((t, index) => (
                    <tr key={t._id}>
                      <td>{index + 1}</td>
                      <td>{t.name}</td>
                      <td>{t.email}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: "#198754",
                            color: "white",
                            padding: "6px 12px",
                            borderRadius: "20px",
                          }}
                        >
                          Active
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
