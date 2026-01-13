import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function CourseList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get("/courses");
        setCourses(res.data || []);
      } catch (err) {
        setError("Failed to load courses");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <div
      className="container-fluid py-2"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #ffffff, #ffffff)"
      }}
    >
      <div className="container">
        <div
          className="card shadow-lg border-0"
          style={{ borderRadius: "16px" }}
        >
          <div className="card-body p-4 p-md-5">
            <h4 className="mb-4 fw-bold text-dark">
              Courses
            </h4>

            {loading && <p>Loading courses...</p>}
            {error && <p className="text-danger">{error}</p>}

            {!loading && !error && (
              <div className="table-responsive">
                <table className="table table-bordered align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Department</th>
                      <th>Teacher</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center text-muted py-4">
                          No courses found
                        </td>
                      </tr>
                    )}

                    {courses.map((c) => (
                      <tr key={c._id}>
                        <td className="fw-semibold">{c.name}</td>
                        <td>{c.code}</td>
                        <td>{c.departmentId?.name || "-"}</td>
                        <td>{c.teacherId?.name || "-"}</td>
                        <td>
                          <span
                            className={`badge ${
                              c.status === "Active"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                          >
                            {c.status}
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
    </div>
  );
}
