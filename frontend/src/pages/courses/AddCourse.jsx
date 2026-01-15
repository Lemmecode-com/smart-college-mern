import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../auth/AuthContext";

export default function AddCourse() {
  const { user } = useContext(AuthContext);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [departmentId, setDepartmentId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= ROLE GUARD ================= */
  if (!user || !["collegeAdmin", "admin"].includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, teacherRes] = await Promise.all([
          api.get("/departments"),
          api.get("/users/teachers")
        ]);

        setDepartments(
          Array.isArray(deptRes.data?.data) ? deptRes.data.data : []
        );

        setTeachers(
          Array.isArray(teacherRes.data?.data) ? teacherRes.data.data : []
        );
      } catch {
        alert("Failed to load departments or teachers");
      }
    };

    fetchData();
  }, []);

  /* ================= AUTO COURSE CODE ================= */
  const handleNameChange = (value) => {
    setName(value);

    const dept = departments.find((d) => d._id === departmentId);
    if (!dept || !value) {
      setCode("");
      return;
    }

    const prefix = value.substring(0, 3).toUpperCase();
    setCode(`${prefix}-${dept.code}`);
  };

  /* ================= SUBMIT ================= */
  const submitHandler = async (e) => {
    e.preventDefault();

    if (!departmentId || !teacherId || !name || !code) {
      alert("All fields are required");
      return;
    }

    setLoading(true);

    try {
      await api.post("/courses", {
        name,
        code,
        departmentId,
        teacherId,
        duration: "6 Sem"
      });

      alert("Course created successfully 🎉");

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

  /* ================= UI ================= */
  return (
    <div style={pageWrapper}>
      <div style={headerSection}>
        <h2 style={titleStyle}>Add New Course</h2>
        <p style={subtitleStyle}>Create & assign courses easily</p>
      </div>

      <div style={cardWrapper}>
        <form onSubmit={submitHandler}>
          {/* Department */}
          <div style={fieldGroup}>
            <label style={labelStyle}>Department *</label>
            <select
              style={inputStyle}
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
          <div style={fieldGroup}>
            <label style={labelStyle}>Course Name *</label>
            <input
              type="text"
              style={inputStyle}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={!departmentId}
              placeholder="Enter course name"
              required
            />
          </div>

          {/* Course Code */}
          <div style={fieldGroup}>
            <label style={labelStyle}>Course Code</label>
            <input
              type="text"
              style={{ ...inputStyle, background: "#f2f2f2" }}
              value={code}
              disabled
            />
          </div>

          {/* Teacher */}
          <div style={fieldGroup}>
            <label style={labelStyle}>Assign Teacher *</label>
            <select
              style={inputStyle}
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

          {/* Submit */}
          <button style={submitBtn} disabled={loading}>
            {loading ? "Creating..." : "Create Course"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const pageWrapper = {
  minHeight: "100vh",
  padding: "30px 15px",
  background: "linear-gradient(180deg, #0f3a4a, #134952)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center"
};

const headerSection = {
  textAlign: "center",
  color: "#fff",
  marginBottom: "25px"
};

const titleStyle = { fontWeight: "800" };
const subtitleStyle = { opacity: 0.9, fontSize: "14px" };

const cardWrapper = {
  background: "#fff",
  width: "100%",
  maxWidth: "500px",
  borderRadius: "16px",
  padding: "25px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
};

const fieldGroup = { marginBottom: "18px" };

const labelStyle = {
  display: "block",
  fontWeight: "600",
  marginBottom: "6px",
  color: "#0f3a4a"
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  outline: "none",
  fontSize: "14px"
};

const submitBtn = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "none",
  color: "#fff",
  fontWeight: "600",
  fontSize: "15px",
  cursor: "pointer",
  background: "linear-gradient(180deg, #0f3a4a, #134952)"
};
