import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../auth/AuthContext";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid email or password"
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
                Login Panel
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
                {/* EMAIL */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Email
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="admin@college.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* PASSWORD */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    Password
                  </label>

                  <div className="input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="Enter password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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

                {/* LOGIN BUTTON */}
                <button
                  className="btn w-100 text-white fw-semibold"
                  style={{
                    backgroundColor: "#1f6f8b",
                  }}
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>
            </div>

            {/* FOOTER */}
            <div className="card-footer bg-light text-center py-3">
              <span className="text-muted small">
                Don’t have an account?
              </span>{" "}
              <Link
                to="/register"
                className="fw-semibold text-decoration-none"
                style={{ color: "#1f6f8b" }}
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}