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

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/auth/register", form);
      alert("Registration successful. Please login.");
      navigate("/login");
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed"
      );
    }

    setLoading(false);
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-white">
      <div className="row w-100 justify-content-center">
        <div className="col-11 col-sm-8 col-md-6 col-lg-4">
          <div
            className="card shadow-lg border-0 rounded-3"
            style={{ overflow: "hidden" }}
          >
            {/* HEADER */}
            <div
              className="text-white text-center py-4"
              style={{
                background: "linear-gradient(180deg, #0f3a4a, #134952)",
              }}
            >
              <h3 className="fw-bold mb-1">Smart College</h3>
              <p className="mb-0 small opacity-75">
                Create New Account
              </p>
            </div>

            {/* BODY */}
            <div className="card-body px-4 py-4">
              {error && (
                <div className="alert alert-danger text-center py-2">
                  {error}
                </div>
              )}

              <form onSubmit={submitHandler}>
                {/* NAME */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Full Name
                  </label>
                  <input
                    className="form-control"
                    placeholder="Enter full name"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </div>

                {/* EMAIL */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Email
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>

                {/* PASSWORD WITH SHOW/HIDE */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Password
                  </label>

                  <div className="input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="Create password"
                      required
                      value={form.password}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          password: e.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* ROLE */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    Role
                  </label>
                  <select
                    className="form-select"
                    value={form.role}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        role: e.target.value,
                      })
                    }
                  >
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                  </select>
                </div>

                {/* REGISTER BUTTON */}
                <button
                  className="btn w-100 text-white fw-semibold"
                  style={{ backgroundColor: "#1f6f8b" }}
                  disabled={loading}
                >
                  {loading ? "Registering..." : "Register"}
                </button>
              </form>
            </div>

            {/* FOOTER */}
            <div className="card-footer bg-light text-center py-3">
              <span className="text-muted small">
                Already have an account?
              </span>{" "}
              <Link
                to="/login"
                className="fw-semibold text-decoration-none"
                style={{ color: "#1f6f8b" }}
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}