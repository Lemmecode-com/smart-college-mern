import { useState } from "react";
import api from "../../api/axios";

export default function AddParent() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    occupation: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/parents", form);
      alert("Parent added successfully!");

      setForm({
        name: "",
        email: "",
        password: "",
        occupation: "",
        phone: "",
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add parent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageWrapper}>
      <div style={card}>
        <h2 style={title}>Add Parent</h2>
        <p style={subtitle}>
          Create a parent account linked to the logged-in student
        </p>

        <form onSubmit={submitHandler} style={formGrid}>
          <Input
            label="Parent Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter full name"
            required
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter email"
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Create password"
            required
          />

          <Input
            label="Occupation"
            name="occupation"
            value={form.occupation}
            onChange={handleChange}
            placeholder="e.g. Business, Teacher"
          />

          <Input
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="10-digit mobile number"
          />

          <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
            <button style={button} disabled={loading}>
              {loading ? "Saving..." : "Add Parent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================= REUSABLE INPUT ================= */

function Input({ label, ...props }) {
  return (
    <div style={field}>
      <label style={labelStyle}>{label}</label>
      <input style={input} {...props} />
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
  padding: "30px",
  width: "100%",
  maxWidth: "820px",
  boxShadow: "0 15px 40px rgba(0,0,0,0.25)",
};

const title = {
  textAlign: "center",
  color: "#0f3a4a",
  fontWeight: "700",
  marginBottom: "5px",
};

const subtitle = {
  textAlign: "center",
  color: "#666",
  fontSize: "14px",
  marginBottom: "25px",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "18px",
};

const field = {
  display: "flex",
  flexDirection: "column",
};

const labelStyle = {
  fontWeight: "600",
  marginBottom: "6px",
  color: "#333",
};

const input = {
  padding: "11px 12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "14px",
  outline: "none",
};

const button = {
  padding: "12px 22px",
  borderRadius: "10px",
  border: "none",
  color: "#fff",
  fontWeight: "600",
  fontSize: "15px",
  background: "linear-gradient(180deg, #0f3a4a, #134952)",
  cursor: "pointer",
};
