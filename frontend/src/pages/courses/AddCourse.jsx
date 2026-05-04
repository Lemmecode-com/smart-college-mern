import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AddCourse() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [departmentId, setDepartmentId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const deptRes = await api.get("/departments");
        setDepartments(deptRes.data.data || deptRes.data);

        const teacherRes = await api.get("/users/teachers");
        setTeachers(teacherRes.data.data || []);
      } catch (err) {
        console.error(err);
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

    const coursePrefix = value.substring(0, 2).toUpperCase();
    setCode(`${coursePrefix}-${dept.code}`);
  };

  /* ---------------- SUBMIT ---------------- */
  const submitHandler = async (e) => {
    e.preventDefault();

    try {
      await api.post("/courses", {
        name,
        code,
        departmentId,
        teacherId,
        duration: "6 Sem",
      });

      alert("Course created successfully");

      // reset
      setName("");
      setCode("");
      setDepartmentId("");
      setTeacherId("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create course");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5 className="mb-3">Add Course</h5>

        <form onSubmit={submitHandler}>
          {/* Department */}
          <div className="mb-3">
            <label className="form-label">Department</label>
            <select
              className="form-select"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
            >
              <option value="">Select</option>
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
              required
              disabled={!departmentId}
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
          <div className="mb-3">
            <label className="form-label">Assign Teacher</label>
            <select
              className="form-select"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              required
            >
              <option value="">Select</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary">Create Course</button>
        </form>
      </div>
    </div>
  );
}
