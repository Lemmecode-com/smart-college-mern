import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [rollNo, setRollNo] = useState("");

  /* ---------------- FETCH STUDENTS ---------------- */
  const fetchStudents = async () => {
    try {
      const res = await api.get("/students");
      setStudents(res.data.students || []);
    } catch (err) {
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  /* ---------------- DELETE STUDENT ---------------- */
  const deleteStudent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;

    try {
      await api.delete(`/students/${id}`);
      fetchStudents();
    } catch (err) {
      alert("Failed to delete student");
    }
  };

  /* ---------------- EDIT STUDENT ---------------- */
  const openEditModal = (student) => {
    setEditStudent(student);
    setRollNo(student.rollNo);
    setShowModal(true);
  };

  const updateStudent = async () => {
    try {
      await api.put(`/students/${editStudent._id}`, {
        rollNo
      });

      setShowModal(false);
      fetchStudents();
    } catch (err) {
      alert("Failed to update student");
    }
  };

  if (loading) return <p style={{ color: "#fff" }}>Loading students...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div style={pageWrapper}>
      <h3 style={title}>Students</h3>

      <div style={card}>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead style={thead}>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roll No</th>
                <th>Department</th>
                <th>Course</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {students.length === 0 && (
                <tr>
                  <td colSpan="7" style={noData}>
                    No students found
                  </td>
                </tr>
              )}

              {students.map((s) => (
                <tr key={s._id}>
                  <td>{s.userId?.name}</td>
                  <td>{s.userId?.email}</td>
                  <td>{s.rollNo}</td>
                  <td>{s.departmentId?.name || "-"}</td>
                  <td>{s.courseId?.name || "-"}</td>
                  <td>
                    <span
                      style={{
                        ...badge,
                        background:
                          s.status === "Active" ? "#28a745" : "#6c757d"
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <button
                      style={editBtn}
                      onClick={() => openEditModal(s)}
                    >
                      Edit
                    </button>
                    <button
                      style={deleteBtn}
                      onClick={() => deleteStudent(s._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- EDIT MODAL ---------------- */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h4>Edit Student</h4>

            <label style={label}>Roll Number</label>
            <input
              style={input}
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
            />

            <div style={{ marginTop: "15px", textAlign: "right" }}>
              <button style={cancelBtn} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button style={saveBtn} onClick={updateStudent}>
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
  padding: "25px",
  background: "linear-gradient(180deg, #0f3a4a, #134952)"
};

const title = {
  color: "#fff",
  fontWeight: "700",
  marginBottom: "15px"
};

const card = {
  background: "#fff",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
};

const table = {
  width: "100%",
  borderCollapse: "collapse"
};

const thead = {
  background: "#f2f2f2"
};

const noData = {
  textAlign: "center",
  padding: "20px",
  color: "#777"
};

const badge = {
  padding: "4px 10px",
  color: "#fff",
  borderRadius: "20px",
  fontSize: "12px"
};

const editBtn = {
  padding: "6px 10px",
  marginRight: "5px",
  border: "none",
  borderRadius: "6px",
  background: "#0f3a4a",
  color: "#fff",
  cursor: "pointer"
};

const deleteBtn = {
  padding: "6px 10px",
  border: "none",
  borderRadius: "6px",
  background: "#dc3545",
  color: "#fff",
  cursor: "pointer"
};

/* ---------- MODAL ---------- */

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const modalBox = {
  background: "#fff",
  padding: "20px",
  borderRadius: "12px",
  width: "100%",
  maxWidth: "400px"
};

const label = {
  fontWeight: "600",
  marginTop: "10px",
  display: "block"
};

const input = {
  width: "100%",
  padding: "8px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  marginTop: "5px"
};

const cancelBtn = {
  background: "#6c757d",
  color: "#fff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "6px",
  marginRight: "8px",
  cursor: "pointer"
};

const saveBtn = {
  background: "linear-gradient(180deg, #0f3a4a, #134952)",
  color: "#fff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "6px",
  cursor: "pointer"
};
