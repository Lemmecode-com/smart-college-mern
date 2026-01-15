import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AddStudent() {
  const [name, setName] = useState("");
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [courseId, setCourseId] = useState("");

  const [rollNo, setRollNo] = useState(1);
  const [loading, setLoading] = useState(false);

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const deptRes = await api.get("/departments");
        setDepartments(deptRes.data?.data || []);

        const courseRes = await api.get("/courses");
        setCourses(courseRes.data?.data || []);
      } catch {
        alert("Failed to load data");
      }
    };
    fetchData();
  }, []);

  /* ---------------- AUTO ROLL NO ---------------- */
  useEffect(() => {
    const generateRollNo = async () => {
      try {
        const res = await api.get("/students");
        const list = res.data?.students || [];
        setRollNo(list.length + 1);
      } catch {
        setRollNo(1);
      }
    };
    generateRollNo();
  }, []);

  /* ---------------- FILTER COURSES (FIXED) ---------------- */
  const handleDepartmentChange = (deptId) => {
    setDepartmentId(deptId);
    setCourseId("");

    const related = courses.filter(
      (c) => c.departmentId?._id === deptId   // ✅ FIX
    );

    setFilteredCourses(related);
  };

  /* ---------------- SUBMIT ---------------- */
  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/students", {
        name,
        rollNo,
        departmentId,
        courseId,
        status: "Active",
      });

      alert("Student created successfully!");
      setName("");
      setDepartmentId("");
      setCourseId("");
    } catch {
      alert("Failed to create student");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageWrapper}>
      <div style={card}>
        <h3 style={title}>Add Student</h3>

        <form onSubmit={submitHandler} style={formGrid}>
          <div style={field}>
            <label style={label}>Student Name</label>
            <input
              style={input}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter student name"
            />
          </div>

          <div style={field}>
            <label style={label}>Department</label>
            <select
              style={input}
              required
              value={departmentId}
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

          <div style={field}>
            <label style={label}>Course</label>
            <select
              style={input}
              required
              disabled={!departmentId}
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Select Course</option>
              {filteredCourses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={field}>
            <label style={label}>Roll Number</label>
            <input style={input} value={rollNo} disabled />
          </div>

          <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
            <button style={button} disabled={loading}>
              {loading ? "Creating..." : "Create Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const pageWrapper = {
  minHeight: "100vh",
  padding: "20px",
  background: "linear-gradient(180deg, #0f3a4a, #134952)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const card = {
  background: "#fff",
  borderRadius: "16px",
  padding: "25px",
  width: "100%",
  maxWidth: "720px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const title = {
  textAlign: "center",
  marginBottom: "20px",
  color: "#0f3a4a",
  fontWeight: "700",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "15px",
};

const field = { display: "flex", flexDirection: "column" };

const label = { fontWeight: "600", marginBottom: "5px" };

const input = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
};

const button = {
  padding: "10px 18px",
  borderRadius: "8px",
  border: "none",
  color: "#fff",
  fontWeight: "600",
  background: "linear-gradient(180deg, #0f3a4a, #134952)",
  cursor: "pointer",
};
