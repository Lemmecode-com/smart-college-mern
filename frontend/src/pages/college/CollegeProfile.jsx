import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../auth/AuthContext";
import { FaUniversity, FaSave } from "react-icons/fa";

export default function CollegeProfile() {
  const { user } = useContext(AuthContext);

  const [form, setForm] = useState({
    name: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
    logo: ""
  });

  const [loading, setLoading] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  /* ================= ROLE GUARD ================= */
  if (!user || !["admin", "collegeAdmin"].includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  /* ================= LOAD COLLEGE ================= */
  useEffect(() => {
    api
      .get("/college")
      .then((res) => {
        if (res.data) {
          setForm(res.data);
          setExistingId(res.data._id);
        }
      })
      .catch(() => {});
  }, []);

  /* ================= CHANGE HANDLER ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({});

    try {
      if (existingId) {
        await api.put(`/college/${existingId}`, form);
        setMessage({ type: "success", text: "College profile updated successfully" });
      } else {
        await api.post("/college", form);
        setMessage({ type: "success", text: "College profile created successfully" });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to save college profile"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrapper}>
      <div style={card}>
        <div style={header}>
          <FaUniversity size={28} />
          <h3>College Profile</h3>
        </div>

        <p style={subtitle}>
          This information defines your college identity across the system.
        </p>

        {message.text && (
          <div
            style={{
              ...alert,
              background: message.type === "success" ? "#e6f7f4" : "#fdecea",
              color: message.type === "success" ? "#0f3a4a" : "#b71c1c"
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={formGrid}>
          <Field label="College Name *">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              style={input}
              disabled={loading}
            />
          </Field>

          <Field label="Contact Email *">
            <input
              type="email"
              name="contactEmail"
              value={form.contactEmail}
              onChange={handleChange}
              required
              style={input}
              disabled={loading}
            />
          </Field>

          <Field label="Contact Phone *">
            <input
              name="contactPhone"
              value={form.contactPhone}
              onChange={handleChange}
              required
              style={input}
              disabled={loading}
            />
          </Field>

          <Field label="Logo URL">
            <input
              name="logo"
              value={form.logo}
              onChange={handleChange}
              style={input}
              disabled={loading}
            />
          </Field>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={label}>Address *</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              required
              style={textarea}
              disabled={loading}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
            <button style={button} disabled={loading}>
              <FaSave /> {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================= FIELD COMPONENT ================= */
function Field({ label: text, children }) {
  return (
    <div style={field}>
      <label style={label}>{text}</label>
      {children}
    </div>
  );
}

/* ================= STYLES ================= */
const wrapper = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #0f3a4a, #134952)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px"
};

const card = {
  background: "#fff",
  borderRadius: "18px",
  padding: "32px",
  width: "100%",
  maxWidth: "900px",
  boxShadow: "0 12px 30px rgba(0,0,0,.25)"
};

const header = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "#0f3a4a",
  marginBottom: "8px"
};

const subtitle = {
  color: "#555",
  marginBottom: "20px"
};

const alert = {
  padding: "12px",
  borderRadius: "8px",
  marginBottom: "15px",
  fontWeight: "600",
  textAlign: "center"
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "16px"
};

const field = { display: "flex", flexDirection: "column" };

const label = { fontWeight: "600", marginBottom: "6px" };

const input = {
  padding: "11px",
  borderRadius: "8px",
  border: "1px solid #ccc"
};

const textarea = {
  ...input,
  minHeight: "90px",
  resize: "none"
};

const button = {
  padding: "12px 22px",
  borderRadius: "10px",
  border: "none",
  color: "#fff",
  fontWeight: "600",
  background: "linear-gradient(180deg, #0f3a4a, #134952)",
  display: "inline-flex",
  gap: "8px",
  alignItems: "center",
  cursor: "pointer"
};
