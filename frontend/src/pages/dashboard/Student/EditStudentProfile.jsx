import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { motion } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
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
  FaExclamationTriangle
} from "react-icons/fa";

export default function EditStudentProfile() {
  const { user } = useContext(AuthContext);

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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
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
        console.error(err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.put(
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
      console.error(err);
      const errorMsg = err.response?.data?.message || "Failed to update profile";
      setError(errorMsg);
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
    return (
      <div className="edit-profile-loading">
        <ToastContainer position="top-right" />
        <motion.div
          className="loading-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <FaSpinner className="spin-icon" />
          <h3>Loading Profile...</h3>
          <p>Fetching your personal and academic information</p>
          <div className="loading-progress-bar">
            <div className="loading-progress"></div>
          </div>
        </motion.div>
        <style>{`
          .edit-profile-loading {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%);
          }
          .loading-content {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          }
          .spin-icon {
            font-size: 4rem;
            color: #1a4b6d;
            animation: spin 1s linear infinite;
            margin-bottom: 1.5rem;
          }
          .loading-content h3 {
            margin: 0 0 0.5rem 0;
            color: #1e293b;
            font-weight: 700;
          }
          .loading-content p {
            color: #64748b;
            margin: 0 0 1.5rem 0;
          }
          .loading-progress-bar {
            width: 200px;
            height: 4px;
            background: #e0e0e0;
            border-radius: 2px;
            margin: 0 auto;
            overflow: hidden;
          }
          .loading-progress {
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, #1a4b6d, #2d6f8f);
            animation: loading 1.5s ease-in-out infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaUserEdit className="me-2 blink" />
          Edit My Profile
        </h3>
        <p className="opacity-75 mb-0">
          Update your personal & academic details
        </p>
      </div>

      {error && (
        <div className="alert alert-danger text-center">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success text-center">
          {success}
        </div>
      )}

      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4">

          <form onSubmit={handleSubmit}>

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
                  required
                />
              </div>

              <div className="col-md-6">
                <label>Email</label>
                <input
                  className="form-control"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
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
