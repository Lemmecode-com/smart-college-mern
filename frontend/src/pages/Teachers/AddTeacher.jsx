import { useContext, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../auth/AuthContext";

export default function AddTeacher() {
  const { user } = useContext(AuthContext);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= ROLE GUARD ================= */
  if (!user || !["admin", "collegeAdmin"].includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  /* ================= SUBMIT ================= */
  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        name,
        email,
        password,
        role: "teacher"
      });

      setSuccess("Teacher created successfully 🎉");

      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create teacher"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="container-fluid mt-4">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          {/* Header */}
          <div
            className="p-3 mb-4 text-center"
            style={{
              background: "linear-gradient(180deg, #0f3a4a, #134952)",
              borderRadius: "12px",
              color: "white"
            }}
          >
            <h5 className="mb-1">Add Teacher</h5>
            <small className="text-white-50">
              Faculty Registration
            </small>
          </div>

          {/* Card */}
          <div
            className="card shadow-sm"
            style={{ borderRadius: "12px" }}
          >
            <div className="card-body">
              {/* Alerts */}
              {error && (
                <div className="alert alert-danger text-center py-2">
                  {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success text-center py-2">
                  {success}
                </div>
              )}

              <form onSubmit={submitHandler}>
                {/* Name */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Full Name
                  </label>
                  <input
                    className="form-control"
                    value={name}
                    required
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Email
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Password */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    required
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                  />
                </div>

                {/* Button */}
                <button
                  className="btn w-100 fw-semibold"
                  disabled={loading}
                  style={{
                    background:
                      "linear-gradient(180deg, #0f3a4a, #134952)",
                    color: "white",
                    padding: "10px",
                    borderRadius: "8px"
                  }}
                >
                  {loading ? "Creating..." : "Create Teacher"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
