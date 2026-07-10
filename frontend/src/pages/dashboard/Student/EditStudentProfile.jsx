import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import "react-toastify/dist/ReactToastify.css";

import {
  FaUserEdit,
  FaSave,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaUniversity,
  FaCalendarAlt,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowLeft
} from "react-icons/fa";

// Authentication / session error codes that must NOT surface a toast.
// These are routed exclusively to ApiError for a friendly mapped screen.
const AUTH_ERROR_CODES = new Set([
  "TOKEN_MISSING",
  "TOKEN_EXPIRED",
  "INVALID_TOKEN",
  "TOKEN_BLACKLISTED",
  "TOKEN_INVALIDATED",
  "USER_NOT_FOUND",
  "ACCOUNT_DEACTIVATED",
  "UNAUTHORIZED",
]);

export default function EditStudentProfile() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    gender: "Male",
    dateOfBirth: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    department_id: "",
    course_id: "",
    admissionYear: "",
    currentSemester: ""
  });

  const [department, setDepartment] = useState(null);
  const [course, setCourse] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  const handleGoBack = () => {
    navigate("/student/profile");
  };

  /* ================= FETCH PROFILE ================= */
  const loadProfile = async () => {
    try {
      const res = await api.get("/students/my-profile");

      const { student, department, course } = res.data;

      setForm({
        fullName: student.fullName,
        email: student.email,
        mobileNumber: student.mobileNumber,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth?.slice(0, 10),
        addressLine: student.addressLine || "",
        city: student.city || "",
        state: student.state || "",
        pincode: student.pincode || "",
        department_id: department?._id,
        course_id: course?._id,
        admissionYear: student.admissionYear,
        currentSemester: student.currentSemester
      });

      setDepartment(department);
      setCourse(course);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;

      logger.error("Edit student profile load error:", {
        statusCode,
        errorCode,
        backendMessage,
        page: "EditStudentProfile",
        role: user?.role,
      });

      setError({
        message: "Failed to load profile. Please try again.",
        statusCode,
        errorCode,
      });

      const isAuthError =
        statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode));

      if (!isAuthError) {
        toast.error("Failed to load profile. Please try again.", {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= HANDLE RETRY ================= */
  const handleRetry = async () => {
    if (retryCount >= 3) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    await loadProfile();
    setIsRetrying(false);
  };

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    setSuccess("");

    try {
      await api.put(
        "/students/update-my-profile",
        form
      );

      setSuccess("Profile updated successfully");
      toast.success("Profile updated successfully!", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaCheckCircle />
      });

    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;

      logger.error("Edit student profile update error:", {
        statusCode,
        errorCode,
        backendMessage,
        page: "EditStudentProfile",
        role: user?.role,
      });

      const errorMsg = "Failed to update profile. Please try again.";
      setFormError(errorMsg);
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading Profile..." />;
  }

  if (error) {
    return (
      <ApiError
        title="Profile Load Error"
        message={error.message || "Failed to load profile. Please try again."}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        retryCount={retryCount}
        maxRetry={3}
        isRetryLoading={isRetrying}
      />
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="position-relative mb-4">
        <div className="gradient-header p-4 rounded-4 text-white shadow-lg">
          <h3 className="fw-bold mb-1">
            <FaUserEdit className="me-2 blink" />
            Edit My Profile
          </h3>
          <p className="opacity-75 mb-0">
            Update your personal & academic details
          </p>
        </div>
        <button
          className="btn btn-light d-flex align-items-center gap-2 position-absolute top-0 end-0 m-3"
          onClick={handleGoBack}
          aria-label="Back to profile"
        >
          <FaArrowLeft aria-hidden="true" /> Back
        </button>
      </div>

      {formError && (
        <div className="alert alert-danger text-center">
          {formError}
        </div>
      )}

      {success && (
        <div className="alert alert-success text-center">
          {success}
        </div>
      )}

      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4">

          <form onSubmit={handleSubmit} noValidate>

            {/* ========== PERSONAL ========== */}
            <h5 className="fw-bold mb-3">
              <FaUser className="me-2" />
              Personal Details
            </h5>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label>Full Name</label>
                <input
                  className="form-control"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  disabled
                />
              </div>

              <div className="col-md-6">
                <label>Email</label>
                <input
                  className="form-control"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  disabled
                />
              </div>

              <div className="col-md-6">
                <label>
                  <FaPhone className="me-1" />
                  Mobile Number
                </label>
                <input
                  className="form-control"
                  name="mobileNumber"
                  value={form.mobileNumber}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-3">
                <label>Gender</label>
                <select
                  className="form-select"
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  disabled
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="col-md-3">
                <label>
                  <FaCalendarAlt className="me-1" />
                  Date of Birth
                </label>
                <input
                  type="date"
                  className="form-control"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  disabled
                />
              </div>
            </div>

            {/* ========== ADDRESS ========== */}
            <h5 className="fw-bold mb-3">
              <FaMapMarkerAlt className="me-2" />
              Address
            </h5>

            <div className="row g-3 mb-4">
              <div className="col-md-12">
                <input
                  className="form-control"
                  name="addressLine"
                  placeholder="Address"
                  value={form.addressLine}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-4">
                <input
                  className="form-control"
                  name="city"
                  placeholder="City"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-4">
                <input
                  className="form-control"
                  name="state"
                  placeholder="State"
                  value={form.state}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-4">
                <input
                  className="form-control"
                  name="pincode"
                  placeholder="Pincode"
                  value={form.pincode}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* ========== ACADEMIC ========== */}
            <h5 className="fw-bold mb-3">
              <FaUniversity className="me-2" />
              Academic Details
            </h5>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label>Department</label>
                <input
                  className="form-control"
                  value={department?.name || ""}
                  disabled
                />
              </div>

              <div className="col-md-6">
                <label>Course</label>
                <input
                  className="form-control"
                  value={course?.name || ""}
                  disabled
                />
              </div>

              <div className="col-md-6">
                <label>Admission Year</label>
                <input
                  type="number"
                  className="form-control"
                  name="admissionYear"
                  value={form.admissionYear}
                  onChange={handleChange}
                  disabled
                />
              </div>

              <div className="col-md-6">
                <label>Current Semester</label>
                <input
                  type="number"
                  className="form-control"
                  name="currentSemester"
                  value={form.currentSemester}
                  onChange={handleChange}
                  disabled
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-success w-100"
              disabled={submitting}
            >
              <FaSave className="me-2" />
              {submitting ? "Updating..." : "Update Profile"}
            </button>

          </form>
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
