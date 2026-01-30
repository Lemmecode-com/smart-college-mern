import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../auth/AuthContext";

export default function TeachersList() {
  const { user } = useContext(AuthContext);

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= ROLE GUARD ================= */
  if (!user || !["admin", "collegeAdmin"].includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  /* ================= FETCH TEACHERS ================= */
  useEffect(() => {
    api
      .get("/users/teachers")
      .then((res) => {
        setTeachers(Array.isArray(res.data?.data) ? res.data.data : []);
      })
      .catch(() => setError("Failed to load teachers"))
      .finally(() => setLoading(false));
  }, []);

  /* ================= UI ================= */
  return (
    <div className="container-fluid mt-4">
      {/* Header */}
      <div
        className="p-3 mb-4"
        style={{
          background: "linear-gradient(180deg, #0f3a4a, #134952)",
          borderRadius: "12px",
          color: "white"
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
          {loading && (
            <p className="text-center text-muted">
              Loading teachers...
            </p>
          )}

          {error && (
            <p className="text-center text-danger fw-semibold">
              {error}
            </p>
          )}

          {!loading && !error && (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead
                  style={{
                    background:
                      "linear-gradient(180deg, #0f3a4a, #134952)",
                    color: "white"
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
                      <td
                        colSpan="4"
                        className="text-center text-muted"
                      >
                        No teachers found
                      </td>
                    </tr>
                  )}

                  {teachers.map((t, index) => (
                    <tr key={t._id}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">{t.name}</td>
                      <td>{t.email}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              t.status === "Inactive"
                                ? "#6c757d"
                                : "#198754",
                            color: "white",
                            padding: "6px 12px",
                            borderRadius: "20px"
                          }}
                        >
                          {t.status || "Active"}
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
  