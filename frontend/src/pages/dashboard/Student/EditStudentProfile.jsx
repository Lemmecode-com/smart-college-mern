import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import ChangeEmailModal from "../../../components/ChangeEmailModal";
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
    currentSemester: "",
    bloodGroup: "",
    religion: "",
    nationality: "",
    hasDisability: "no",
    disabilityType: "",
    pwdDisability: "",
    fatherName: "",
    fatherMobile: "",
    fatherEmail: "",
    motherName: "",
    motherMobile: "",
    motherEmail: "",
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
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/student/dashboard" />;

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
        currentSemester: student.currentSemester,
        bloodGroup: student.bloodGroup || "",
        religion: student.religion || "",
        nationality: student.nationality || "",
        hasDisability: student.hasDisability ? "yes" : "no",
        disabilityType: student.disabilityType || "",
        pwdDisability: student.pwdDisability || "",
        fatherName: student.fatherName || "",
        fatherMobile: student.fatherMobile || "",
        fatherEmail: student.fatherEmail || "",
        motherName: student.motherName || "",
        motherMobile: student.motherMobile || "",
        motherEmail: student.motherEmail || "",
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
      const { email: _email, ...profileData } = form;
      await api.put("/students/update-my-profile", profileData);

      setSuccess("Profile updated successfully");
      toast.success("Profile updated successfully!", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaCheckCircle />
      });

      setTimeout(() => {
        navigate("/student/profile");
      }, 1500);
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

      let errorMsg;
      if (
        err.response?.data?.errors &&
        Array.isArray(err.response.data.errors)
      ) {
        const v = err.response.data.errors[0];
        errorMsg = `${v.field}: ${v.message}`;
      } else if (err.response?.data?.error?.message) {
        errorMsg = err.response.data.error.message;
      } else {
        errorMsg = backendMessage || "Failed to update profile. Please try again.";
      }
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
                  disabled
                  readOnly
                  style={{
                    backgroundColor: "#f8fafc",
                    color: "#64748b",
                    cursor: "not-allowed",
                  }}
                />
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm mt-2"
                  onClick={() => setShowChangeEmailModal(true)}
                  disabled={submitting}
                >
                  Change Email
                </button>
                <small
                  style={{
                    display: "block",
                    color: "#64748b",
                    fontSize: "0.8rem",
                    marginTop: "0.25rem",
                  }}
                >
                  Use "Change Email" to update your email with verification.
                </small>
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
                />
              </div>

              <div className="col-md-4">
                <label>Blood Group</label>
                <select
                  className="form-select"
                  name="bloodGroup"
                  value={form.bloodGroup}
                  onChange={handleChange}
                >
                  <option value="">Select Blood Group</option>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label>Religion</label>
                <input
                  className="form-control"
                  name="religion"
                  placeholder="e.g. Hindu, Muslim, Christian"
                  value={form.religion}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-4">
                <label>Nationality</label>
                <input
                  className="form-control"
                  name="nationality"
                  placeholder="e.g. Indian"
                  value={form.nationality}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-4">
                <label>Disability</label>
                <select
                  className="form-select"
                  name="hasDisability"
                  value={form.hasDisability}
                  onChange={handleChange}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              {form.hasDisability === "yes" && (
                <>
                  <div className="col-md-4">
                    <label>Disability Type</label>
                    <select
                      className="form-select"
                      name="disabilityType"
                      value={form.disabilityType}
                      onChange={handleChange}
                    >
                      <option value="">— Select Type —</option>
                      <option value="Visual">Visual Impairment</option>
                      <option value="Hearing">Hearing Impairment</option>
                      <option value="Locomotor">Locomotor Disability</option>
                      <option value="Intellectual">Intellectual Disability</option>
                      <option value="Mental">Mental Illness</option>
                      <option value="Multiple">Multiple Disabilities</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label>Disability Percentage (%)</label>
                    <input
                      className="form-control"
                      name="pwdDisability"
                      placeholder="e.g. 40"
                      value={form.pwdDisability}
                      onChange={handleChange}
                      type="number"
                      min="1"
                      max="100"
                    />
                  </div>
                </>
              )}
            </div>

            {/* ========== PARENT / GUARDIAN ========== */}
            <h5 className="fw-bold mb-3">
              <FaUser className="me-2" />
              Parent / Guardian Details
            </h5>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label>Father's Name</label>
                <input
                  className="form-control"
                  name="fatherName"
                  placeholder="Father's full name"
                  value={form.fatherName}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-6">
                <label>Father's Mobile</label>
                <input
                  className="form-control"
                  name="fatherMobile"
                  placeholder="10-digit mobile"
                  value={form.fatherMobile}
                  onChange={handleChange}
                  maxLength="10"
                />
              </div>

              <div className="col-md-6">
                <label>Father's Email</label>
                <input
                  type="email"
                  className="form-control"
                  name="fatherEmail"
                  placeholder="father@example.com"
                  value={form.fatherEmail}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-6">
                <label>Mother's Name</label>
                <input
                  className="form-control"
                  name="motherName"
                  placeholder="Mother's full name"
                  value={form.motherName}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-6">
                <label>Mother's Mobile</label>
                <input
                  className="form-control"
                  name="motherMobile"
                  placeholder="10-digit mobile"
                  value={form.motherMobile}
                  onChange={handleChange}
                  maxLength="10"
                />
              </div>

              <div className="col-md-6">
                <label>Mother's Email</label>
                <input
                  type="email"
                  className="form-control"
                  name="motherEmail"
                  placeholder="mother@example.com"
                  value={form.motherEmail}
                  onChange={handleChange}
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

      <ChangeEmailModal
        show={showChangeEmailModal}
        onClose={() => setShowChangeEmailModal(false)}
        userRole={user?.role}
        currentEmail={form.email}
      />

      <ChangeEmailModal
        show={showChangeEmailModal}
        onClose={() => setShowChangeEmailModal(false)}
        userRole={user?.role}
        currentEmail={form.email}
      />

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
