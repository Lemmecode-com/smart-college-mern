import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AddStudent() {
  const [name, setName] = useState("");

  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [courseId, setCourseId] = useState("");

  const [rollNo, setRollNo] = useState("");

  useEffect(() => {
    api.get("/departments").then((res) => setDepartments(res.data));
    api.get("/courses").then((res) => setCourses(res.data));
  }, []);

  // 🔹 UPDATED ROLL NUMBER LOGIC (1,2,3...)
  useEffect(() => {
    const generateRollNo = async () => {
      const res = await api.get("/students");
      setRollNo(res.data.length + 1);
    };
    generateRollNo();
  }, []);

  const handleDepartmentChange = (deptId) => {
    setDepartmentId(deptId);
    setCourseId("");

    const relatedCourses = courses.filter(
      (c) => c.departmentId === deptId || c.departmentId?._id === deptId
    );
    setFilteredCourses(relatedCourses);
  };

  // 🔹 ONLY COURSE SELECTION (no roll logic here now)
  const handleCourseChange = (courseId) => {
    setCourseId(courseId);
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    await api.post("/students", {
      name,
      rollNo,
      departmentId,
      courseId,
      status: "Active",
    });

    alert("Student added");
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5>Add Student</h5>

        <form onSubmit={submitHandler}>
          <div className="mb-3">
            <label>Student Name</label>
            <input
              className="form-control"
              required
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label>Department</label>
            <select
              className="form-select"
              required
              onChange={(e) => handleDepartmentChange(e.target.value)}
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label>Course</label>
            <select
              className="form-select"
              required
              disabled={!departmentId}
              onChange={(e) => handleCourseChange(e.target.value)}
            >
              <option value="">Select Course</option>
              {filteredCourses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label>Roll Number</label>
            <input className="form-control" value={rollNo} disabled />
          </div>

          <button className="btn btn-primary">Create</button>
        </form>
      </div>
    </div>
  );
}
