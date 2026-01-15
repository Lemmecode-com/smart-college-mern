import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../auth/AuthContext";

export default function AddDepartment() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  /* ================= ROLE GUARD ================= */
  if (!user || !["admin", "collegeAdmin"].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  /* ================= FETCH COLLEGE ================= */
  useEffect(() => {
    api
      .get("/college")
      .then((res) => setCollegeId(res.data._id))
      .catch(() => setMessage("College profile not found"));
  }, []);

  /* ================= AUTO GENERATE CODE ================= */
  const generateCode = (value) => {
    setName(value);

    const cleaned = value.replace(/\s+/g, "");
    const generated =
      cleaned.length >= 3
        ? cleaned.substring(0, 3).toUpperCase()
        : cleaned.toUpperCase();

    setCode(generated);
  };

  /* ================= SUBMIT ================= */
  const submitHandler = async (e) => {
    e.preventDefault();

    if (!name || !collegeId) {
      setMessage("All fields are required");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await api.post("/departments", {
        name,
        code,
        collegeId,
        status: "Active"
      });

      setMessage("Department created successfully 🎉");

      setTimeout(() => {
        navigate("/departments");
      }, 1200);
    } catch (err) {
      setMessage(err.response?.data?.message || "Creation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrapper}>
      <div style={card}>
        <h2 style={title}>Add Department</h2>

        {message && <div style={alert}>{message}</div>}

        <form onSubmit={submitHandler}>
          {/* Department Name */}
          <div style={field}>
            <label style={label}>Department Name *</label>
            <input
              value={name}
              onChange={(e) => generateCode(e.target.value)}
              required
              placeholder="Enter department name"
              style={input}
            />
          </div>

          {/* Department Code */}
          <div style={field}>
            <label style={label}>Department Code</label>
            <input
              value={code}
              disabled
              style={{ ...input, background: "#f1f1f1" }}
            />
          </div>

          <div style={{ textAlign: "center" }}>
            <button style={button} disabled={loading}>
              {loading ? "Saving..." : "Create Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const wrapper = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #ffffff, #ffffff)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px"
};

const card = {
  background: "#fff",
  width: "100%",
  maxWidth: "780px",
  borderRadius: "16px",
  padding: "30px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
};

const title = {
  textAlign: "center",
  marginBottom: "20px",
  color: "#0f3a4a",
  fontWeight: "700"
};

const alert = {
  background: "#e8f6f3",
  color: "#0f3a4a",
  padding: "10px",
  borderRadius: "8px",
  marginBottom: "15px",
  textAlign: "center",
  fontWeight: "600"
};

const field = { marginBottom: "18px" };

const label = {
  fontWeight: "600",
  marginBottom: "6px",
  display: "block"
};

const input = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "14px"
};

const button = {
  width: "45%",
  padding: "12px",
  borderRadius: "10px",
  border: "none",
  background: "linear-gradient(180deg, #0f3a4a, #134952)",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer"
};
