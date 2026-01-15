import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../auth/AuthContext";

export default function AddSubject() {
  const { user } = useContext(AuthContext);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);

  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= ROLE GUARD ================= */
  if (!user || !["admin", "collegeAdmin"].includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  /* ================= FETCH MASTER DATA ================= */
  useEffect(() => {
    Promise.all([
      api.get("/departments"),
      api.get("/courses")
    ])
      .then(([deptRes, courseRes]) => {
        setDepartments(Array.isArray(deptRes.data?.data) ? deptRes.data.data : []);
        setCourses(Array.isArray(courseRes.data?.data) ? courseRes.data.data : []);
      })
      .catch(() => setError("Failed to load departments or courses"))
      .finally(() => setPageLoading(false));
  }, []);

  /* ================= DEPARTMENT CHANGE ================= */
  const handleDepartmentChange = (id) => {
    setDepartmentId(id);
    setCourseId("");
    setName("");
    setCode("");

    const filtered = courses.filter(
      (c) =>
        c.departmentId === id ||
        c.departmentId?._id === id
    );

    setFilteredCourses(filtered);
  };

  /* ================= AUTO SUBJECT CODE ================= */
  const handleNameChange = (value) => {
    setName(value);

    if (!courseId) return;

    const prefix = value.substring(0, 3).toUpperCase();
    const unique = Math.floor(1000 + Math.random() * 9000);
    setCode(`${prefix}${unique}`);
  };

  /* ================= SUBMIT ================= */
  const submitHandler = async (e) => {
    e.preventDefault();

    if (!departmentId || !courseId || !name) {
      alert("All fields are required");
      return;
    }

    setLoading(true);

    try {
      await api.post("/subjects", {
        name,
        code,
        departmentId,
        courseId,
        status: "Active"
      });

      alert("✅ Subject created successfully");

      setName("");
      setCode("");
      setDepartmentId("");
      setCourseId("");
      setFilteredCourses([]);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create subject");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  if (pageLoading) {
    return <p className="text-center mt-5">Loading...</p>;
  }

  return (
    <div className="container-fluid mt-4">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">

          {/* Header */}
          <div
            className="p-3 mb-4 text-center"
            style={{
              background: "linear-gradient(180deg, #0f3a4a, #134952)",
              borderRadius: "12px",
              color: "white"
            }}
          >
            <h5 className="mb-1">Add Subject</h5>
            <small className="text-white-50">
              Course & Academic Management
            </small>
          </div>

          {error && (
            <div className="alert alert-danger text-center">
              {error}
            </div>
          )}

          {/* Card */}
          <div className="card shadow-sm" style={{ borderRadius: "12px" }}>
            <div className="card-body">
              <form onSubmit={submitHandler}>

                {/* Department */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Department *
                  </label>
                  <select
                    className="form-select"
                    value={departmentId}
                    onChange={(e) =>
                      handleDepartmentChange(e.target.value)
                    }
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Course */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Course *
                  </label>
                  <select
                    className="form-select"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    disabled={!departmentId}
                    required
                  >
                    <option value="">Select Course</option>
                    {filteredCourses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject Name */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) =>
                      handleNameChange(e.target.value)
                    }
                    disabled={!courseId}
                    required
                  />
                </div>

                {/* Subject Code */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={code}
                    disabled
                  />
                </div>

                {/* Submit */}
                <button
                  className="btn w-100"
                  disabled={loading}
                  style={{
                    background:
                      "linear-gradient(180deg, #0f3a4a, #134952)",
                    color: "white",
                    padding: "10px",
                    borderRadius: "8px"
                  }}
                >
                  {loading ? "Creating..." : "Create Subject"}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
