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
  const [forgotMode, setForgotMode] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!email || (!forgotMode && !password)) {
      return setError("All fields are required");
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (forgotMode) {
        // Simulated forgot password success
        setSuccessMsg("Password reset link sent to your email.");
      } else {
        await login({ email, password });
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }

    setLoading(false);
  };

  return (
    <div
      className="container-fluid min-vh-100 d-flex align-items-center justify-content-center px-3"
      style={{ background: "#f5eef1" }}
    >
      <div
        className="card shadow-lg border-0 rounded-4 overflow-hidden w-100"
        style={{ maxWidth: "900px", animation: "fadeIn 0.6s ease" }}
      >
        <div className="row g-0">

          {/* LEFT PANEL */}
          <div
            className="col-md-5 d-none d-md-flex flex-column justify-content-center text-white p-5"
            style={{ background: "linear-gradient(180deg, #0f3a4a, #134952)" }}
          >
            <h2 className="fw-bold">
              {forgotMode ? "Reset Password" : "Welcome Back"}
            </h2>
            <p className="opacity-75">
              {forgotMode
                ? "Enter your email to reset your password"
                : "Login to access your Smart College dashboard"}
            </p>
          </div>

          {/* RIGHT PANEL */}
          <div className="col-md-7 bg-white p-4 p-md-5">

            <div className="text-center mb-4">
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-2"
                style={{ width: 70, height: 70, background: "#e6f3f7" }}
              >
                {forgotMode ? "🔐" : "👤"}
              </div>
              <h4 className="fw-bold">
                {forgotMode ? "FORGOT PASSWORD" : "LOGIN"}
              </h4>
            </div>

            {error && (
              <div className="alert alert-danger py-2 text-center">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success py-2 text-center">
                {successMsg}
              </div>
            )}

            <form onSubmit={submitHandler}>

              {/* EMAIL */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Email</label>
                <input
                  type="email"
                  className="form-control border-0 border-bottom rounded-0"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* PASSWORD (Only for Login) */}
              {!forgotMode && (
                <div className="mb-3">
                  <label className="form-label fw-semibold">Password</label>
                  <div className="input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control border-0 border-bottom rounded-0"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-between align-items-center mb-4">
                {!forgotMode ? (
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none"
                    onClick={() => {
                      setForgotMode(true);
                      setError("");
                      setSuccessMsg("");
                    }}
                  >
                    Forgot Password?
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none"
                    onClick={() => {
                      setForgotMode(false);
                      setError("");
                      setSuccessMsg("");
                    }}
                  >
                    Back to Login
                  </button>
                )}

                <button
                  className="btn text-white px-4 rounded-pill"
                  style={{ backgroundColor: "#1f6f8b" }}
                  disabled={loading}
                >
                  {loading
                    ? "Processing..."
                    : forgotMode
                    ? "SEND LINK"
                    : "LOGIN"}
                </button>
              </div>
            </form>

            {!forgotMode && (
              <div className="text-center">
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
            )}
          </div>
        </div>
      </div>

      {/* Animation */}
      <style>
        {`@keyframes fadeIn {
          from {opacity:0; transform: translateY(20px)}
          to {opacity:1; transform: translateY(0)}
        }`}
      </style>
    </div>
  );
}
