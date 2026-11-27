import { useContext, useEffect, useState, useCallback } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import ApiError from "../../../components/ApiError";
import Loading from "../../../components/Loading";
import { logger } from "../../../utils/logger";

import {
  FaUserTie,
  FaUniversity,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaInfoCircle,
} from "react-icons/fa";

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

export default function AssignHod() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { departmentId } = useParams();

  /* ================= STATE ================= */
  const [department, setDepartment] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /* ================= LOAD DATA ================= */
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    setLoadError(null);
    setSubmitError("");
    setSuccessMessage("");

    try {
      // 1. Fetch Department Details
      const deptRes = await api.get(`/departments/${departmentId}`);
      const deptData = deptRes.data?.department || deptRes.data;
      if (!deptData || !deptData._id) {
        throw new Error("Department not found");
      }
      setDepartment(deptData);

      // 2. Fetch Department's Active Teachers
      // Try dedicated department endpoint first, fallback to query parameters with safe limit
      let teachersList = [];
      try {
        const teacherRes = await api.get(`/teachers/department/${departmentId}`);
        teachersList = Array.isArray(teacherRes.data?.teachers)
          ? teacherRes.data.teachers
          : Array.isArray(teacherRes.data)
            ? teacherRes.data
            : [];
      } catch (deptTeacherErr) {
        logger.warn("Failed fetching via /teachers/department, using fallback", deptTeacherErr);
        const fallbackRes = await api.get("/teachers", {
          params: { department_id: departmentId, status: "ACTIVE", limit: 500 },
        });
        teachersList = Array.isArray(fallbackRes.data?.data)
          ? fallbackRes.data.data
          : Array.isArray(fallbackRes.data)
            ? fallbackRes.data
            : [];
      }

      // 3. Exclude the current HOD from the selectable list
      const currentHodId = deptData.hod_id
        ? (typeof deptData.hod_id === "object" ? deptData.hod_id._id : deptData.hod_id)
        : null;

      const eligibleTeachers = teachersList.filter(
        (t) => String(t._id) !== String(currentHodId)
      );

      setTeachers(eligibleTeachers);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage =
        err.response?.data?.message || err.response?.data?.error?.message || err.message;
      const errorMessage =
        statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))
          ? "Authentication error occurred."
          : backendMessage || "Failed to load department or teachers";

      logger.error("Error fetching assign HOD data:", statusCode, errorCode);
      setLoadError({
        message: errorMessage,
        statusCode,
        errorCode,
      });
    } finally {
      setLoadingData(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= ASSIGN HOD ================= */
  const handleAssign = async () => {
    if (!teacherId) {
      setSubmitError("Please select a teacher to assign as HOD.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSuccessMessage("");

    try {
      const res = await api.put(`/departments/${departmentId}/assign-hod`, {
        teacher_id: teacherId,
      });

      const backendMessage =
        res.data?.message || "HOD assigned successfully.";

      setSuccessMessage(
        `${backendMessage} Note: The promoted teacher has been logged out of all active sessions and must sign in again.`
      );

      setTimeout(() => {
        navigate("/departments");
      }, 2000);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code || err.response?.data?.error?.code;
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        logger.error("Auth error assigning HOD:", statusCode, errorCode);
        setSubmitError("Authentication error occurred. Please login again.");
      } else {
        const backendMessage =
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          "Failed to assign HOD.";
        setSubmitError(backendMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="container-fluid py-5 d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <Loading size="lg" color="primary" text="Loading department and teachers..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container-fluid py-4">
        <ApiError
          title="Assign HOD Error"
          message={loadError.message}
          statusCode={loadError.statusCode}
          errorCode={loadError.errorCode}
          onRetry={fetchData}
          onGoBack={() => navigate(-1)}
        />
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      {/* ================= HEADER ================= */}
      <div className="gradient-header mb-4 p-4 rounded-4 text-white shadow-sm">
        <h3 className="fw-bold mb-1 d-flex align-items-center">
          <FaUserTie className="me-2" />
          Assign Head Of Department
        </h3>
        <p className="opacity-75 mb-0">
          Select an active faculty member of this department to assign as HOD
        </p>
      </div>

      {/* ================= ALERTS ================= */}
      {submitError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 shadow-sm" role="alert">
          <FaExclamationTriangle className="flex-shrink-0" />
          <div>{submitError}</div>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success d-flex align-items-start gap-2 mb-4 shadow-sm" role="alert">
          <FaCheckCircle className="flex-shrink-0 mt-1" />
          <div>
            <strong>Success:</strong> {successMessage}
          </div>
        </div>
      )}

      {/* ================= CARD ================= */}
      {department && (
        <div className="card shadow-sm border-0 rounded-4 glass-card mb-4">
          <div className="card-body p-4">
            {/* Department Info */}
            <h5 className="fw-semibold mb-3 d-flex align-items-center gap-2 text-dark">
              <FaUniversity />
              Department Details
            </h5>

            <div className="row g-3 mb-4 p-3 bg-light rounded-3 border">
              <div className="col-md-6">
                <p className="mb-1"><strong>Name:</strong> {department.name}</p>
                <p className="mb-0"><strong>Code:</strong> {department.code}</p>
              </div>
              <div className="col-md-6">
                <p className="mb-1">
                  <strong>Status:</strong>{" "}
                  <span className={`badge ${department.status === "ACTIVE" ? "bg-success" : "bg-secondary"}`}>
                    {department.status}
                  </span>
                </p>
                <p className="mb-0">
                  <strong>Current HOD:</strong>{" "}
                  {department.hod_id ? (
                    typeof department.hod_id === "object"
                      ? `${department.hod_id.name} (${department.hod_id.email || "No email"})`
                      : "Assigned"
                  ) : (
                    <span className="text-muted fst-italic">Not Assigned</span>
                  )}
                </p>
              </div>
            </div>

            {/* Teacher Selection */}
            <div className="mb-2">
              <h5 className="fw-semibold mb-3 d-flex align-items-center gap-2 text-dark">
                <FaUserTie />
                Select New HOD
              </h5>

              {teachers.length === 0 ? (
                <div className="alert alert-warning d-flex align-items-center gap-2 mb-0" role="alert">
                  <FaInfoCircle className="flex-shrink-0" />
                  <div>
                    No eligible teachers found in this department. A teacher must belong to this department and be active to be assigned as HOD.
                  </div>
                </div>
              ) : (
                <div className="col-md-7 col-lg-6">
                  <label htmlFor="teacherSelect" className="form-label fw-semibold">
                    Eligible Faculty Members ({teachers.length}) <span className="text-danger">*</span>
                  </label>
                  <select
                    id="teacherSelect"
                    className="form-select form-select-lg"
                    value={teacherId}
                    onChange={(e) => {
                      setTeacherId(e.target.value);
                      setSubmitError("");
                    }}
                    disabled={submitting}
                  >
                    <option value="">-- Select a teacher --</option>
                    {teachers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} {t.designation ? `— ${t.designation}` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="form-text text-muted">
                    Only faculty assigned to this department are eligible.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================= FOOTER ================= */}
          <div className="card-footer bg-white border-top d-flex justify-content-between align-items-center p-3 rounded-bottom-4">
            <button
              type="button"
              className="btn btn-outline-secondary d-inline-flex align-items-center gap-1"
              onClick={() => navigate("/departments")}
              disabled={submitting}
            >
              <FaArrowLeft className="me-1" />
              Back to Departments
            </button>

            <button
              type="button"
              className="btn btn-success px-4 rounded-pill d-inline-flex align-items-center gap-2"
              disabled={submitting || !teacherId || teachers.length === 0}
              onClick={handleAssign}
            >
              {submitting && <FaSpinner className="spinner-border-sm fa-spin" />}
              {submitting ? "Assigning HOD..." : "Assign HOD"}
            </button>
          </div>
        </div>
      )}

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a4b6d 100%);
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.98);
        }

        .form-select:focus {
          box-shadow: 0 0 0 0.2rem rgba(15, 58, 74, 0.25);
          border-color: #0f3a4a;
        }

        .fa-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        `}
      </style>
    </div>
  );
}
