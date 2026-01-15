import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AssignParent() {
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);

  const [studentId, setStudentId] = useState("");
  const [parentId, setParentId] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentRes, parentRes] = await Promise.all([
          api.get("/students"),
          api.get("/users/parents")
        ]);

        setStudents(studentRes.data.data || []);
        setParents(parentRes.data.data || []);
      } catch {
        setMessage("Failed to load students or parents");
      }
    };

    fetchData();
  }, []);

  /* ================= ASSIGN HANDLER ================= */
  const submitHandler = async (e) => {
    e.preventDefault();

    if (!studentId || !parentId) {
      setMessage("Please Select Student and Parent");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await api.post(
        `/students/${studentId}/assign-parent`,
        { parentId }
      );

      setMessage("Parent successfully assigned 🎉");
      setStudentId("");
      setParentId("");
    } catch {
      setMessage("Assignment failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div style={{ padding: "40px", maxWidth: "500px", margin: "auto" }}>
      <h3 style={{ marginBottom: "20px" }}>Assign Parent to Student</h3>

      {message && (
        <div style={{ marginBottom: "15px", color: "#b71c1c" }}>
          {message}
        </div>
      )}

      <form onSubmit={submitHandler}>
        {/* Student */}
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
          style={input}
        >
          <option value="">Select Student</option>
          {students.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Parent */}
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          required
          style={input}
        >
          <option value="">Select Parent</option>
          {parents.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} ({p.email})
            </option>
          ))}
        </select>

        <button disabled={loading} style={btn}>
          {loading ? "Assigning..." : "Assign Parent"}
        </button>
      </form>
    </div>
  );
}

/* ================= STYLES ================= */
const input = {
  width: "100%",
  padding: "10px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "1px solid #ccc"
};

const btn = {
  width: "100%",
  padding: "12px",
  background: "#0f3a4a",
  color: "#fff",
  borderRadius: "8px",
  border: "none",
  fontWeight: "600"
};
