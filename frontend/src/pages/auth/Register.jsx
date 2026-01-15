import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });

  const [strength, setStrength] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const checkStrength = (password) => {
    if (password.length < 6) return "Weak";
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return "Strong";
    return "Medium";
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      return setError("All fields are required");
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/auth/register", form);
      alert("Registration successful");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }

    setLoading(false);
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center px-3"
      style={{ background: "#ffffff" }}
    >
      <div className="card shadow-lg border-0 rounded-4 overflow-hidden w-100"
        style={{ maxWidth: "900px", animation: "fadeIn 0.6s ease" }}
      >
        <div className="row g-0">

          <div className="col-md-5 d-none d-md-flex flex-column justify-content-center text-white p-5"
            style={{ background: "linear-gradient(180deg, #0f3a4a, #134952)" }}
          >
            <h2 className="fw-bold">Join Smart College</h2>
            <p className="opacity-75">Create your account to get started</p>
          </div>

          <div className="col-md-7 bg-white p-4 p-md-5">

            <div className="text-center mb-4">
              <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-2"
                style={{ width: 70, height: 70, background: "#e6f3f7" }}
              >
                📝
              </div>
              <h4 className="fw-bold">REGISTER</h4>
            </div>

            {error && <div className="alert alert-danger py-2 text-center">{error}</div>}

            <form onSubmit={submitHandler}>

              <div className="mb-3">
                <label className="form-label fw-semibold">Full Name</label>
                <input
                  className="form-control border-0 border-bottom rounded-0"
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Email</label>
                <input
                  type="email"
                  className="form-control border-0 border-bottom rounded-0"
                  placeholder="Enter email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="mb-2">
                <label className="form-label fw-semibold">Password</label>
                <div className="input-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control border-0 border-bottom rounded-0"
                    placeholder="Create password"
                    value={form.password}
                    onChange={(e) => {
                      setForm({ ...form, password: e.target.value });
                      setStrength(checkStrength(e.target.value));
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {form.password && (
                  <small className={`fw-semibold ${
                    strength === "Strong" ? "text-success" :
                    strength === "Medium" ? "text-warning" : "text-danger"
                  }`}>
                    Password Strength: {strength}
                  </small>
                )}
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold">Role</label>
                <select
                  className="form-select border-0 border-bottom rounded-0"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="college-admin">College Admin</option>
                  <option value="admin">Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                </select>
              </div>

              <div className="d-flex justify-content-end">
                <button
                  className="btn text-white px-4 rounded-pill"
                  style={{ backgroundColor: "#1f6f8b" }}
                  disabled={loading}
                >
                  {loading ? "Registering..." : "REGISTER"}
                </button>
              </div>
            </form>

            <div className="text-center mt-4">
              <span className="text-muted small">Already have an account?</span>{" "}
              <Link to="/login" className="fw-semibold text-decoration-none" style={{ color: "#1f6f8b" }}>
                Login
              </Link>
            </div>

          </div>
        </div>
      </div>

      <style>
        {`@keyframes fadeIn { from {opacity:0; transform: translateY(20px)} to {opacity:1; transform: translateY(0)} }`}
      </style>
    </div>
  );
}
