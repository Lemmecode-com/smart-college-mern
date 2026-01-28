import { useContext, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaLock,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaCheckCircle
} from "react-icons/fa";

export default function ChangePassword() {
  const { user } = useContext(AuthContext);

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= VALIDATION ================= */
  const validate = () => {
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      return "All fields are required";
    }

    if (form.newPassword.length < 6) {
      return "New password must be at least 6 characters";
    }

    if (form.newPassword !== form.confirmPassword) {
      return "New password and confirm password do not match";
    }

    if (form.oldPassword === form.newPassword) {
      return "New password cannot be same as old password";
    }

    return null;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // 🔥 SaaS API (you can create later)
      await api.put("/auth/change-password", {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword
      });

      setSuccess("Password changed successfully!");
      setForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
      });

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to change password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaLock className="me-2 blink" />
          Change Password
        </h3>
        <p className="opacity-75 mb-0">
          Keep your account secure
        </p>
      </div>

      <div className="row justify-content-center">
        <div className="col-md-6">

          <div className="card shadow-lg border-0 rounded-4 glass-card">
            <div className="card-body p-4">

              {error && (
                <div className="alert alert-danger text-center">
                  {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success text-center">
                  <FaCheckCircle className="me-2" />
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit}>

                {/* OLD PASSWORD */}
                <div className="mb-3">
                  <label className="fw-semibold">
                    <FaKey className="me-2" />
                    Old Password
                  </label>
                  <div className="input-group">
                    <input
                      type={showOld ? "text" : "password"}
                      className="form-control"
                      name="oldPassword"
                      value={form.oldPassword}
                      onChange={handleChange}
                      placeholder="Enter old password"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowOld(!showOld)}
                    >
                      {showOld ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {/* NEW PASSWORD */}
                <div className="mb-3">
                  <label className="fw-semibold">
                    <FaKey className="me-2" />
                    New Password
                  </label>
                  <div className="input-group">
                    <input
                      type={showNew ? "text" : "password"}
                      className="form-control"
                      name="newPassword"
                      value={form.newPassword}
                      onChange={handleChange}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowNew(!showNew)}
                    >
                      {showNew ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <small className="text-muted">
                    Minimum 6 characters
                  </small>
                </div>

                {/* CONFIRM PASSWORD */}
                <div className="mb-4">
                  <label className="fw-semibold">
                    <FaKey className="me-2" />
                    Confirm New Password
                  </label>
                  <div className="input-group">
                    <input
                      type={showConfirm ? "text" : "password"}
                      className="form-control"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-success w-100"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Change Password"}
                </button>

              </form>

            </div>
          </div>

        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(8px);
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0% {opacity:1}
          50% {opacity:0.4}
          100% {opacity:1}
        }
        `}
      </style>
    </div>
  );
}
