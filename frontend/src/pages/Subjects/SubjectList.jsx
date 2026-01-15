import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../auth/AuthContext";
import { FaSearch } from "react-icons/fa";

export default function SubjectList() {
  const { user } = useContext(AuthContext);

  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  /* ================= ROLE GUARD ================= */
  if (!user || !["admin", "collegeAdmin", "teacher"].includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  /* ================= FETCH COURSES ================= */
  useEffect(() => {
    api
      .get("/courses")
      .then((res) =>
        setCourses(Array.isArray(res.data?.data) ? res.data.data : [])
      )
      .catch(() => setError("Failed to load courses"));
  }, []);

  /* ================= FETCH SUBJECTS ================= */
  useEffect(() => {
    if (!courseId) return;

    setLoading(true);
    setError("");

    api
      .get(`/subjects?courseId=${courseId}`)
      .then((res) =>
        setSubjects(Array.isArray(res.data?.data) ? res.data.data : [])
      )
      .catch(() => setError("Failed to load subjects"))
      .finally(() => setLoading(false));
  }, [courseId]);

  /* ================= SEARCH ================= */
  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container-fluid mt-4">
      {/* Header */}
      <div
        className="d-flex justify-content-between align-items-center p-3 mb-4"
        style={{
          background: "linear-gradient(180deg, #0f3a4a, #134952)",
          borderRadius: "10px",
          color: "white"
        }}
      >
        <h5 className="mb-0">Subjects</h5>
        <span className="text-white-50">Academic Management</span>
      </div>

      {/* Card */}
      <div className="card shadow-sm" style={{ borderRadius: "12px" }}>
        <div className="card-body">
          {/* Course Select */}
          <div className="mb-3">
            <label className="fw-semibold mb-1">Select Course *</label>
            <select
              className="form-select"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">-- Select Course --</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          {courseId && (
            <div className="d-flex align-items-center gap-2 mb-3">
              <FaSearch className="text-muted" />
              <input
                className="form-control"
                placeholder="Search subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          {loading && (
            <p className="text-center text-muted">Loading subjects...</p>
          )}

          {error && (
            <p className="text-center text-danger fw-semibold">{error}</p>
          )}

          {!loading && !error && courseId && (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead
                  style={{
                    background: "linear-gradient(180deg, #0f3a4a, #134952)",
                    color: "white"
                  }}
                >
                  <tr>
                    <th>#</th>
                    <th>Subject Name</th>
                    <th>Code</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSubjects.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center text-muted">
                        No subjects found
                      </td>
                    </tr>
                  )}

                  {filteredSubjects.map((s, index) => (
                    <tr key={s._id}>
                      <td>{index + 1}</td>
                      <td>{s.name}</td>
                      <td>{s.code}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              s.status === "Active" ? "#198754" : "#6c757d",
                            padding: "6px 12px",
                            borderRadius: "20px"
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

          {!courseId && (
            <p className="text-center text-muted mt-3">
              Please select a course to view subjects
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
