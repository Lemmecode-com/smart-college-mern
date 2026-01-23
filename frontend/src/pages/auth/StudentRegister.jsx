import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../../api/axios";
import { FaUniversity, FaUserGraduate, FaSpinner } from "react-icons/fa";

export default function StudentRegister() {
  const { collegeCode } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    mobileNumber: "",
    gender: "Female",
    dateOfBirth: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    department_id: "",
    course_id: "",
    admissionYear: new Date().getFullYear(),
    currentSemester: 1
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post(`/students/register/${collegeCode}`, form);
      alert("🎉 Registration successful! Wait for college approval.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (!collegeCode) {
    return (
      <div className="container mt-5 text-center">
        <h3>Invalid Registration Link</h3>
      </div>
    );
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0f3a4a, #134952)"
      }}
    >
      <div className="card shadow-lg p-4" style={{ width: "900px", borderRadius: "16px" }}>
        
        {/* Header */}
        <div className="text-center mb-4">
          <FaUniversity size={48} style={{ color: "#0f3a4a" }} className="mb-2 spin-slow" />
          <h3 className="fw-bold text-dark">Smart College Portal</h3>
          <p className="text-muted mb-1">Student Self Registration</p>
          <span className="badge bg-dark">{collegeCode}</span>
        </div>

        {error && (
          <div className="alert alert-danger text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <input className="form-control" name="fullName" placeholder="Full Name" onChange={handleChange} required />
            </div>
            <div className="col-md-6">
              <input className="form-control" name="email" placeholder="Email" onChange={handleChange} required />
            </div>
            <div className="col-md-6">
              <input type="password" className="form-control" name="password" placeholder="Password" onChange={handleChange} required />
            </div>
            <div className="col-md-6">
              <input className="form-control" name="mobileNumber" placeholder="Mobile Number" onChange={handleChange} required />
            </div>

            <div className="col-md-6">
              <select className="form-select" name="gender" onChange={handleChange}>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </div>
            <div className="col-md-6">
              <input type="date" className="form-control" name="dateOfBirth" onChange={handleChange} required />
            </div>

            <div className="col-md-12">
              <input className="form-control" name="addressLine" placeholder="Address" onChange={handleChange} required />
            </div>

            <div className="col-md-4">
              <input className="form-control" name="city" placeholder="City" onChange={handleChange} required />
            </div>
            <div className="col-md-4">
              <input className="form-control" name="state" placeholder="State" onChange={handleChange} required />
            </div>
            <div className="col-md-4">
              <input className="form-control" name="pincode" placeholder="Pincode" onChange={handleChange} required />
            </div>

            <div className="col-md-6">
              <input className="form-control" name="department_id" placeholder="Department ID" onChange={handleChange} required />
            </div>
            <div className="col-md-6">
              <input className="form-control" name="course_id" placeholder="Course ID" onChange={handleChange} required />
            </div>
          </div>

          <button
            className="btn btn-dark w-100 mt-4 d-flex align-items-center justify-content-center gap-2"
            disabled={loading}
          >
            {loading ? <FaSpinner className="spin" /> : "Register Now"}
          </button>
        </form>

        <div className="text-center mt-3 text-muted">
          <FaUserGraduate /> After registration, wait for admin approval.
        </div>
      </div>

      {/* Inline animations */}
      <style>
        {`
          .spin {
            animation: spin 1s linear infinite;
          }
          .spin-slow {
            animation: spin 6s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
