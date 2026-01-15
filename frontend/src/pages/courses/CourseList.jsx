import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../auth/AuthContext";

export default function CourseList() {
  const { user } = useContext(AuthContext);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [editCourse, setEditCourse] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    duration: ""
  });

  /* ================= ROLE GUARD ================= */
  if (!user || !["collegeAdmin", "admin"].includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  /* ================= FETCH COURSES ================= */
  const fetchCourses = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/courses");

      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      setCourses(list);
    } catch (err) {
      setError("Failed to load courses");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  /* ================= UPDATE COURSE ================= */
  const updateCourse = async () => {
    if (!editCourse) return;

    try {
      await api.put(`/courses/${editCourse._id}`, {
        name: formData.name,
        code: formData.code,
        duration: formData.duration
      });

      setEditCourse(null);
      fetchCourses();
    } catch {
      alert("Update failed");
    }
  };

  /* ================= DELETE COURSE ================= */
  const deleteCourse = async (id) => {
    if (!window.confirm("Delete this course?")) return;

    try {
      await api.delete(`/courses/${id}`);
      fetchCourses();
    } catch {
      alert("Delete failed");
    }
  };

  /* ================= FILTER ================= */
  const filteredCourses = Array.isArray(courses)
    ? courses.filter((c) =>
        c.name?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div style={pageWrapper}>
      {/* Header */}
      <div style={headerSection}>
        <h2 style={titleStyle}>Course Management</h2>
        <p style={subtitleStyle}>Manage college courses</p>
      </div>

      {/* Content */}
      <div style={contentCard}>
        <input
          type="text"
          placeholder="Search course..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInput}
        />

        {loading && <p style={{ textAlign: "center" }}>Loading...</p>}
        {error && <p style={errorText}>{error}</p>}

        {!loading && !error && (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={theadStyle}>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Department</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th width="140">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCourses.length === 0 && (
                  <tr>
                    <td colSpan="6" style={emptyStyle}>
                      No courses found
                    </td>
                  </tr>
                )}

                {filteredCourses.map((c) => (
                  <tr key={c._id} style={rowStyle}>
                    <td>{c.name}</td>
                    <td>{c.code}</td>
                    <td>{c.departmentId?.name || "-"}</td>
                    <td>{c.duration || "-"}</td>
                    <td>
                      <span style={activeBadge}>Active</span>
                    </td>
                    <td>
                      <button
                        style={editBtn}
                        onClick={() => {
                          setEditCourse(c);
                          setFormData({
                            name: c.name,
                            code: c.code,
                            duration: c.duration || ""
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        style={deleteBtn}
                        onClick={() => deleteCourse(c._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= EDIT MODAL ================= */}
      {editCourse && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginBottom: "15px" }}>Edit Course</h3>

            <input
              style={inputStyle}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Course Name"
            />

            <input
              style={inputStyle}
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              placeholder="Course Code"
            />

            <input
              style={inputStyle}
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: e.target.value })
              }
              placeholder="Duration (e.g. 3 Years)"
            />

            <div style={{ textAlign: "right" }}>
              <button
                style={cancelBtn}
                onClick={() => setEditCourse(null)}
              >
                Cancel
              </button>
              <button style={saveBtn} onClick={updateCourse}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const pageWrapper = {
  minHeight: "100vh",
  padding: "40px 20px",
  background: "linear-gradient(180deg, #0f3a4a, #134952)"
};

const headerSection = {
  textAlign: "center",
  color: "#fff",
  marginBottom: "30px"
};

const titleStyle = { fontWeight: "800" };
const subtitleStyle = { opacity: 0.9 };

const contentCard = {
  background: "#fff",
  borderRadius: "16px",
  padding: "25px",
  maxWidth: "1200px",
  margin: "0 auto",
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
};

const searchInput = {
  width: "100%",
  padding: "12px",
  marginBottom: "20px",
  borderRadius: "10px",
  border: "1px solid #ddd"
};

const tableStyle = { width: "100%", borderCollapse: "collapse" };
const theadStyle = { background: "#0f3a4a", color: "#fff" };
const rowStyle = { borderBottom: "1px solid #eee" };

const emptyStyle = {
  textAlign: "center",
  padding: "20px",
  color: "#777"
};

const activeBadge = {
  background: "#e0f7f4",
  color: "#0f3a4a",
  padding: "6px 12px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "600"
};

const editBtn = {
  background: "#0f3a4a",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  marginRight: "6px",
  cursor: "pointer"
};

const deleteBtn = {
  background: "#d9534f",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer"
};

const errorText = {
  color: "#d9534f",
  textAlign: "center",
  fontWeight: "600"
};

/* ===== MODAL ===== */
const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000
};

const modalBox = {
  background: "#fff",
  padding: "25px",
  borderRadius: "12px",
  width: "90%",
  maxWidth: "400px"
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "1px solid #ddd"
};

const cancelBtn = {
  background: "#aaa",
  color: "#fff",
  border: "none",
  padding: "8px 14px",
  borderRadius: "6px",
  marginRight: "10px"
};

const saveBtn = {
  background: "#0f3a4a",
  color: "#fff",
  border: "none",
  padding: "8px 14px",
  borderRadius: "6px"
};
