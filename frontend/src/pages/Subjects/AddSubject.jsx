import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AddSubject() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);

  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");

  const [loading, setLoading] = useState(false);

  /* ---------------- FETCH MASTER DATA ---------------- */
  useEffect(() => {
    api.get("/departments").then((res) => setDepartments(res.data));
    api.get("/courses").then((res) => setCourses(res.data));
  }, []);

  /* ---------------- DEPARTMENT CHANGE ---------------- */
  const handleDepartmentChange = (id) => {
    setDepartmentId(id);
    setCourseId("");
    setFilteredCourses(
      courses.filter(
        (c) => c.departmentId === id || c.departmentId?._id === id
      )
    );
  };

  /* ---------------- AUTO CODE ---------------- */
  const handleNameChange = (value) => {
    setName(value);
    setCode(value.substring(0, 3).toUpperCase());
  };

  /* ---------------- SUBMIT ---------------- */
  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/subjects", {
        name,
        code,
        departmentId,
        courseId,
        status: "Active",
      });

      alert("Subject created successfully");
      setName("");
      setCode("");
      setDepartmentId("");
      setCourseId("");
      setFilteredCourses([]);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create subject");
    }

    setLoading(false);
  };

  /* ---------------- UI ---------------- */
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
              color: "white",
            }}
          >
            <h5 className="mb-1">Add Subject</h5>
            <small className="text-white-50">
              Course & Academic Management
            </small>
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
              <form onSubmit={submitHandler}>
                {/* Department */}
                <div className="mb-3">
                  <label className="form-label">Department</label>
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
                  <label className="form-label">Course</label>
                  <select
                    className="form-select"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    required
                    disabled={!departmentId}
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
                  <label className="form-label">Subject Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) =>
                      handleNameChange(e.target.value)
                    }
                    required
                  />
                </div>

                {/* Subject Code */}
                <div className="mb-4">
                  <label className="form-label">Subject Code</label>
                  <input
                    type="text"
                    className="form-control"
                    value={code}
                    disabled
                  />
                </div>

                {/* Button */}
                <button
                  className="btn w-100"
                  disabled={loading}
                  style={{
                    background:
                      "linear-gradient(180deg, #0f3a4a, #134952)",
                    color: "white",
                    padding: "10px",
                    borderRadius: "8px",
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
