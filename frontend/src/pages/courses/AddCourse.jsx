import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AddCourse() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [departmentId, setDepartmentId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const deptRes = await api.get("/departments");
        setDepartments(deptRes.data.data || deptRes.data || []);

        const teacherRes = await api.get("/users/teachers");
        setTeachers(teacherRes.data.data || []);
      } catch (err) {
        alert("Failed to load data");
      }
    };

    fetchData();
  }, []);

  /* ---------------- AUTO COURSE CODE ---------------- */
  const handleNameChange = (value) => {
    setName(value);

    const dept = departments.find((d) => d._id === departmentId);
    if (!dept) return;

    const prefix = value.substring(0, 2).toUpperCase();
    setCode(`${prefix}-${dept.code}`);
  };

  /* ---------------- SUBMIT ---------------- */
  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/courses", {
        name,
        code,
        departmentId,
        teacherId,
        duration: "6 Sem",
      });

      alert("Course created successfully");

      setName("");
      setCode("");
      setDepartmentId("");
      setTeacherId("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div
      className="container-fluid py-3"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #ffffff, #ffffff)",
      }}
    >
      <div className="container">
        <div
          className="card shadow-lg border-0"
          style={{ borderRadius: "16px" }}
        >
          <div className="card-body p-4 p-md-5">
            <h4 className="fw-bold mb-4">Add Course</h4>

            <form onSubmit={submitHandler}>
              {/* Department */}
              <div className="mb-3">
                <label className="form-label">Department</label>
                <select
                  className="form-select"
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setName("");
                    setCode("");
                  }}
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

              {/* Course Name */}
              <div className="mb-3">
                <label className="form-label">Course Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={!departmentId}
                  required
                />
              </div>

              {/* Course Code */}
              <div className="mb-3">
                <label className="form-label">Course Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={code}
                  disabled
                />
              </div>

              {/* Assign Teacher */}
              <div className="mb-4">
                <label className="form-label">Assign Teacher</label>
                <select
                  className="form-select"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  required
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn text-white px-4"
                style={{
                  background: "linear-gradient(180deg, #0f3a4a, #134952)",
                  border: "none",
                  transition: "0.3s ease",
                }}
                onMouseOver={(e) =>
                  (e.target.style.background =
                    "linear-gradient(180deg, #134952, #0f3a4a)")
                }
                onMouseOut={(e) =>
                  (e.target.style.background =
                    "linear-gradient(180deg, #0f3a4a, #134952)")
                }
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Course"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
