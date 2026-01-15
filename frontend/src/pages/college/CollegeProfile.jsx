import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../auth/AuthContext";
import { FaUniversity, FaSave } from "react-icons/fa";

export default function CollegeProfile() {
  const { user } = useContext(AuthContext);

  const [college, setCollege] = useState(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
    logo: ""
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  /* ================= AUTH GUARD ================= */
  if (!user) return <Navigate to="/login" />;

  /* ================= LOAD COLLEGE ================= */
  useEffect(() => {
    loadCollege();
  }, []);

  const loadCollege = async () => {
    try {
      const res = await api.get("/college");
      if (res.data?._id) {
        setCollege(res.data);
        setForm({
          name: res.data.name || "",
          address: res.data.address || "",
          contactEmail: res.data.contactEmail || "",
          contactPhone: res.data.contactPhone || "",
          logo: res.data.logo || ""
        });
      }
    } catch (err) {
      // College not created yet → ignore
    }
  };

  /* ================= CHANGE HANDLER ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= CREATE COLLEGE ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (user.role !== "admin") {
      setMessage("Only Admin can create college profile");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await api.post("/admin/college", form);
      setMessage("College profile created successfully");
      loadCollege();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create college");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrapper}>
      <div style={card}>
        <div style={header}>
          <FaUniversity size={26} />
          <h3>College Profile</h3>
        </div>

        <p style={subtitle}>Official college information</p>

        {message && <div style={alert}>{message}</div>}

        {/* ================= VIEW MODE ================= */}
        {college && (
          <div style={viewBox}>
            <p><b>Name:</b> {college.name}</p>
            <p><b>Email:</b> {college.contactEmail}</p>
            <p><b>Phone:</b> {college.contactPhone}</p>
            <p><b>Address:</b> {college.address}</p>
          </div>
        )}

        {/* ================= CREATE MODE ================= */}
        {!college && user.role === "admin" && (
          <form onSubmit={handleSubmit} style={formGrid}>
            <Field label="College Name *">
              <input name="name" required value={form.name} onChange={handleChange} style={input} />
            </Field>

            <Field label="Contact Email *">
              <input type="email" name="contactEmail" required value={form.contactEmail} onChange={handleChange} style={input} />
            </Field>

            <Field label="Contact Phone *">
              <input name="contactPhone" required value={form.contactPhone} onChange={handleChange} style={input} />
            </Field>

            <Field label="Logo URL">
              <input name="logo" value={form.logo} onChange={handleChange} style={input} />
            </Field>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={label}>Address *</label>
              <textarea name="address" required value={form.address} onChange={handleChange} style={textarea} />
            </div>

            <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
              <button style={button} disabled={loading}>
                <FaSave /> {loading ? "Saving..." : "Create College"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ================= FIELD ================= */
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
  background: "linear-gradient(180deg, #ffffff, #ffffff)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px"
};

const card = {
  background: "#fff",
  borderRadius: "16px",
  padding: "30px",
  width: "100%",
  maxWidth: "900px",
  boxShadow: "0 12px 30px rgba(0,0,0,.25)"
};

const header = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  color: "#0f3a4a"
};

const subtitle = { color: "#555", marginBottom: "20px" };

const alert = {
  background: "#e6f7f4",
  color: "#0f3a4a",
  padding: "10px",
  borderRadius: "8px",
  marginBottom: "15px",
  textAlign: "center",
  fontWeight: "600"
};

const viewBox = {
  background: "#f9f9f9",
  padding: "15px",
  borderRadius: "10px"
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "15px"
};

const field = { display: "flex", flexDirection: "column" };
const label = { fontWeight: "600", marginBottom: "6px" };

const input = { padding: "10px", borderRadius: "8px", border: "1px solid #ccc" };
const textarea = { ...input, minHeight: "90px", resize: "none" };

const button = {
  padding: "12px 22px",
  borderRadius: "10px",
  border: "none",
  color: "#fff",
  fontWeight: "600",
  background: "linear-gradient(180deg, #0f3a4a, #134952)",
  cursor: "pointer",
  display: "inline-flex",
  gap: "8px",
  alignItems: "center"
};
