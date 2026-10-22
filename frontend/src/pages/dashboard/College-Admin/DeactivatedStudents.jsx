import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import StandardListView from "../../../components/StandardListView/StandardListView";
import Pagination from "../../../components/Pagination";
import { toast } from "react-toastify";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";

import {
  FaSearch,
  FaUserTimes,
  FaUserCheck,
  FaGraduationCap,
  FaBuilding,
  FaBookOpen,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaSyncAlt,
  FaEye,
} from "react-icons/fa";

const PAGE_SIZE = 5;

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

export default function DeactivatedStudents({ admissionOfficerMode = false }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
<<<<<<< HEAD
  const [studentToReactivate, setStudentToReactivate] = useState(null);
const [reactivating, setReactivating] = useState(false);
=======
>>>>>>> origin/feature/exam-module
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (!admissionOfficerMode && user.role !== "COLLEGE_ADMIN") {
    return <Navigate to="/dashboard" />;
  }
  // When admissionOfficerMode is true, we allow ADMISSION_OFFICER (ProtectedRoute already validated)

  /* ================= FETCH DEACTIVATED STUDENTS ================= */
  const fetchDeactivatedStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/students/deactivated");

      let data;
      if (res.data.data) {
        data = res.data.data;
      } else if (Array.isArray(res.data)) {
        data = res.data;
      } else {
        data = [];
      }

      setStudents(data);

    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load deactivated students.";

      logger.error("Error fetching deactivated students:", statusCode, errorCode);

      setError({
        message: errorMessage,
        statusCode,
        errorCode,
      });

      const isAuthError =
        statusCode === 401 ||
        (errorCode && AUTH_ERROR_CODES.has(errorCode));

      if (!isAuthError) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeactivatedStudents();
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    fetchDeactivatedStudents();
  };

  /* ================= SEARCH ================= */
  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        `${s.fullName} ${s.email} ${s.department_id?.name || ""} ${s.course_id?.name || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    );
  }, [students, search]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const paginatedStudents = filteredStudents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  /* ================= REACTIVATE STUDENT ================= */
<<<<<<< HEAD
const handleReactivate = (student) => {
  setStudentToReactivate(student);
};

const confirmReactivate = async () => {
  if (!studentToReactivate || reactivating) return;

  const student = studentToReactivate;

  try {
    setReactivating(true);

    await api.put(`/users/${student.user_id}/reactivate`);

    toast.success(`${student.fullName} reactivated`, {
      position: "top-right",
      autoClose: 3000,
    });

    setStudentToReactivate(null);
    await fetchDeactivatedStudents();
  } catch (err) {
    toast.error(
      err.response?.data?.message || "Failed to reactivate",
      { position: "top-right", autoClose: 5000 }
    );
  } finally {
    setReactivating(false);
  }
};
=======
  const handleReactivate = async (student) => {
    if (!window.confirm(`Reactivate "${student.fullName}"? They will regain system access.`)) return;

    try {
      await api.put(`/users/${student.user_id}/reactivate`);
      toast.success(`${student.fullName} reactivated`, { position: "top-right", autoClose: 3000 });
      fetchDeactivatedStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reactivate", { position: "top-right", autoClose: 5000 });
    }
  };

>>>>>>> origin/feature/exam-module
const columns = [
  {
    key: "fullName",
    label: "Student Name",
    render: (student) => (
      <div className="student-info">
        <span className="student-name-cell">
          {student.fullName}
        </span>
        <span className="student-email">
          {student.email}
        </span>
      </div>
    ),
  },
  {
    key: "course",
    label: "Course",
    render: (student) => (
      <span className="badge badge-course">
        {student.course_id?.name || "N/A"}
      </span>
    ),
  },
  {
    key: "department",
    label: "Department",
    render: (student) => (
      <span className="department-name">
        {student.department_id?.name ||
          student.course_id?.name ||
          "N/A"}
      </span>
    ),
  },
  {
    key: "admissionYear",
    label: "Admission Year",
    render: (student) => (
      <span className="badge badge-graduation-year">
        <FaCalendarAlt className="badge-icon" />
        {student.admissionYear || "N/A"}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: () => (
      <span className="badge badge-status-deactivated">
        <FaUserTimes className="badge-icon" />
        DEACTIVATED
      </span>
    ),
  },
];
const tableActions = {
  label: "Actions",
  width: "180px",
  items: [
    {
      key: "reactivate",
      label: "Reactivate",
      text: "Reactivate",
      icon: FaUserCheck,
      className: "reactivate-btn",
      style: {
        fontSize: "12px",
        fontWeight: "500",
        width: "120px",
        gap: "8px",
        background: "linear-gradient(135deg, #3eac41 0%, #2e751f 100%)"
      },
      show: (student) => !!student.user_id,
      onClick: (student) => handleReactivate(student),
    },
  ],
};

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <ApiError
        title="Deactivated Students Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={handleRetry}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <div className="parent-portal-wrapper">
        <div
          className="parent-portal-container parent-loading-container"
          style={{ minHeight: "70vh" }}
        >
          <Loading
            size="md"
            color="primary"
            text="Loading deactivated students..."
          />
        </div>
      </div>
    );
  }

   return (
     <div className="erp-container" style={{ paddingTop: "0.5rem" }}>
       <Breadcrumb items={admissionOfficerMode
         ? [
             { label: "Dashboard", path: "/dashboard/admission" },
             { label: "Admissions", path: "/admission/applications" },
             { label: "Deactivated Students" },
           ]
         : [
             { label: "Dashboard", path: "/dashboard" },
             { label: "Students",},
             { label: "Deactivated Students" },
           ]
       } />

    <PageHeader
      icon={FaUserTimes}
      title="Deactivated Students"
      subtitle="View and reactivate students who have been deactivated"
    />

      {/* STATS */}
      <div className="stats-grid animate-fade-in">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)" }}>
            <FaUserTimes />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Deactivated</div>
            <div className="stat-card-value">{students.length}</div>
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-body">
          <div className="controls-container">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, email, department, or course..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* {Header} */}
      <StandardListView
        className="deactivated-students-list"
        title="Deactivated Student Records"
        icon={FaGraduationCap}
        count={filteredStudents.length}
        columns={columns}
        data={paginatedStudents}
        loading={false}
        emptyState={{
          icon: FaUserTimes,
          title: "No Deactivated Students",
          description: search
            ? "No deactivated students match your search."
            : "All students are currently active.",
        }}
        actions={tableActions}
      />
 
{totalPages > 1 && (
  <div style={{ marginBottom: "24px" }}>
    <Pagination
      page={page}
      totalPages={totalPages}
      setPage={setPage}
    />
  </div>
)}
<<<<<<< HEAD
{studentToReactivate && (
  <div
    className="reactivate-modal-overlay"
    onClick={() => {
      if (!reactivating) setStudentToReactivate(null);
    }}
  >
    <div
      className="reactivate-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reactivate-modal-title"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="reactivate-modal-close"
        onClick={() => setStudentToReactivate(null)}
        disabled={reactivating}
        aria-label="Close dialog"
      >
        &times;
      </button>

      <div className="reactivate-modal-heading">
        <div className="reactivate-modal-icon">
          <FaUserCheck />
        </div>

        <h2 id="reactivate-modal-title">
          Reactivate Student
        </h2>

        <p>
          Are you sure you want to reactivate{" "}
          <strong>{studentToReactivate.fullName}</strong>?
          They will regain system access.
        </p>
      </div>

      <div className="reactivate-modal-details">
        <div className="reactivate-detail-row">
          <span>Student Name</span>
          <strong>{studentToReactivate.fullName || "N/A"}</strong>
        </div>

        <div className="reactivate-detail-row">
          <span>Email</span>
          <strong>{studentToReactivate.email || "N/A"}</strong>
        </div>

        <div className="reactivate-detail-row">
          <span>Course</span>
          <strong>
            {studentToReactivate.course_id?.name || "N/A"}
          </strong>
        </div>

        <div className="reactivate-detail-row">
          <span>Department</span>
          <strong>
            {studentToReactivate.department_id?.name ||
              studentToReactivate.course_id?.name ||
              "N/A"}
          </strong>
        </div>
      </div>

      <div className="reactivate-modal-warning">
        <FaExclamationTriangle />
        <span>
          The student will regain access to the system after
          successful reactivation.
        </span>
      </div>

      <div className="reactivate-modal-footer">
        <button
          type="button"
          className="reactivate-cancel-btn"
          onClick={() => setStudentToReactivate(null)}
          disabled={reactivating}
        >
          Cancel
        </button>

        <button
          type="button"
          className="reactivate-confirm-btn"
          onClick={confirmReactivate}
          disabled={reactivating}
        >
          <FaUserCheck />
          {reactivating ? "Reactivating..." : "Reactivate Student"}
        </button>
      </div>
    </div>
  </div>
)}

      {/* STYLES */}
      <style>{`

        /* Reactivate Student Confirmation Modal */
        .reactivate-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 35, 50, 0.58);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }

        .reactivate-modal {
          position: relative;
          width: 100%;
          max-width: 500px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          padding: 34px 28px 0;
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
          color: #123b4b;
          animation: reactivate-modal-enter 180ms ease-out;
        }

        .reactivate-modal-close {
          position: absolute;
          top: 18px;
          right: 20px;
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #94a3b8;
          font-size: 28px;
          cursor: pointer;
        }

        .reactivate-modal-close:hover {
          background: #f1f5f9;
          color: #123b4b;
        }

        .reactivate-modal-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          border-radius: 18px;
          background: #e7f7ed;
          color: #16834a;
          font-size: 28px;
        }

        .reactivate-modal h2 {
          margin: 0;
          text-align: center;
          font-size: 24px;
          font-weight: 750;
          color: #123b4b;
        }

        .reactivate-modal-description {
          margin: 12px auto 22px;
          max-width: 390px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
          line-height: 1.65;
        }

        .reactivate-student-details {
          padding: 10px 18px;
          border-radius: 14px;
          background: #f0f5fa;
        }

        .reactivate-detail-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid #d6e0eb;
        }

        .reactivate-detail-row:last-child {
          border-bottom: 0;
        }

        .reactivate-detail-row span {
          flex-shrink: 0;
          color: #64748b;
          font-size: 13px;
        }

        .reactivate-detail-row strong {
          max-width: 65%;
          color: #123b4b;
          font-size: 13px;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .reactivate-modal-warning {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin: 18px 0 24px;
          padding: 14px;
          border: 1px solid #fed7aa;
          border-radius: 12px;
          background: #fff8ed;
          color: #9a5b08;
          font-size: 13px;
          line-height: 1.6;
        }

        .reactivate-modal-warning svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .reactivate-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin: 0 -28px;
          padding: 18px 28px;
          border-top: 1px solid #e2e8f0;
          background: #f1f5f9;
          border-radius: 0 0 20px 20px;
        }

        .reactivate-cancel-btn,
        .reactivate-confirm-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 44px;
          padding: 0 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
          transition: background 160ms ease, transform 160ms ease;
        }

        .reactivate-cancel-btn {
          border: 1px solid #d7e0ea;
          background: #fff;
          color: #334155;
        }

        .reactivate-cancel-btn:hover:not(:disabled) {
          background: #e8eef5;
        }

        .reactivate-confirm-btn {
          border: 1px solid #16834a;
          background: #16834a;
          color: #fff;
        }

        .reactivate-confirm-btn:hover:not(:disabled) {
          background: #116b3b;
          transform: translateY(-1px);
        }

        .reactivate-cancel-btn:disabled,
        .reactivate-confirm-btn:disabled,
        .reactivate-modal-close:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes reactivate-modal-enter {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 575px) {
          .reactivate-modal {
            padding: 28px 18px 0;
            border-radius: 16px;
          }

          .reactivate-modal-footer {
            margin: 0 -18px;
            padding: 14px 18px;
          }

          .reactivate-detail-row {
            gap: 10px;
          }

          .reactivate-detail-row span,
          .reactivate-detail-row strong {
            font-size: 12px;
          }

          .reactivate-cancel-btn,
          .reactivate-confirm-btn {
            padding: 0 13px;
          }
        }

=======


      {/* STYLES */}
      <style>{`
>>>>>>> origin/feature/exam-module
        .erp-container { padding: 1.5rem; background: #f5f7fa; min-height: 100vh; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }
        .stat-card { background: white; padding: 1.5rem; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); display: flex; align-items: center; gap: 1.25rem; }
        .stat-card-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; }
        .stat-card-label { font-size: 0.95rem; color: #666; font-weight: 600; }
        .stat-card-value { font-size: 2rem; font-weight: 800; color: #1a4b6d; }
        .erp-card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 1.5rem; }
        .erp-card-header { padding: 1.5rem 1.75rem; background: #f8f9fa; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; }
        .erp-card-header h3 { margin: 0; font-size: 1.35rem; font-weight: 700; color: #1a4b6d; display: flex; align-items: center; gap: 0.75rem; }
        .record-count { background: rgba(107,114,128,0.1); color: #6b7280; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem; font-weight: 600; }
        .erp-card-body { padding: 0; }
        .controls-container { padding: 1.25rem 1.75rem; }
        .search-box { position: relative; max-width: 500px; }
        .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #666; }
        .search-box input { width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem; border: 2px solid #e9ecef; border-radius: 10px; font-size: 0.95rem; }
        .search-box input:focus { border-color: #6b7280; outline: none; }
       
       
        .student-info { display: flex; flex-direction: column; gap: 6px; }
        .student-name-cell { font-weight: 700; color: #0f3a4a; }
        .student-email { font-size: 13px; color: #64748b; }
        .badge { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 24px; font-size: 12px; font-weight: 700; }
        .badge-icon { font-size: 12px; }
        .badge-course { background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%); color: white; }
        .badge-graduation-year { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; }
        .badge-status-deactivated { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; }
        .department-name { color: #475569; font-weight: 600; }
        .text-center { text-align: center; }
        .action-buttons { display: flex; gap: 8px; justify-content: center; }
        .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
        .btn:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
        .btn-reactivate-student { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; }
        .btn-reactivate-student:hover { background: linear-gradient(135deg, #059669 0%, #10b981 100%); }
        .empty-state { text-align: center; padding: 3rem; color: #64748b; }
        .empty-icon { font-size: 3rem; margin-bottom: 1rem; color: #94a3b8; }

        

        /* ================= RESPONSIVE - TABLET ================= */

@media (min-width: 576px) and (max-width: 991px) {
  .erp-container {
    padding: 1.1rem;
  }

  /* Banner */
  .erp-page-header {
    padding: 1.5rem 1.6rem;
    min-height: 150px;
    border-radius: 15px;
    margin-bottom: 1.2rem;
  }

  .erp-header-icon {
    width: 52px;
    height: 52px;
    border-radius: 13px;
    font-size: 1.5rem;
  }

  .erp-page-title {
    font-size: 1.5rem;
    line-height: 1.25;
  }

  .erp-page-subtitle {
    font-size: 0.9rem;
    line-height: 1.5;
    max-width: 500px;
  }

  /* Stats */
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 1.2rem;
  }

  .stat-card {
    padding: 1.1rem 1.3rem;
    border-radius: 14px;
  }

  .stat-card-icon {
    width: 48px;
    height: 48px;
    font-size: 1.3rem;
  }

  .stat-card-value {
    font-size: 1.8rem;
  }

  /* Search */
  .controls-container {
    padding: 1.1rem 1.3rem;
  }

  .search-box {
    max-width: 100%;
  }

  .search-box input {
    height: 48px;
    font-size: 0.9rem;
  }

  /* Records card */
  .erp-card-header {
    padding: 1.2rem 1.3rem;
  }

  .erp-card-header h3 {
    font-size: 1.15rem;
  }

  .erp-table th {
    padding: 13px 14px;
    font-size: 11px;
  }

  .erp-table td {
    padding: 14px;
  }
}


/* ================= RESPONSIVE - MOBILE ================= */

@media (max-width: 575px) {
  .erp-container {
    padding: 0.75rem;
  }

  /* ---------- BANNER ---------- */

  .erp-page-header {
    padding: 1.25rem;
    min-height: 0;
    border-radius: 15px;
    margin-bottom: 1rem;
    gap: 0.85rem;
    align-items: flex-start;
  }

  .erp-header-icon {
    width: 48px;
    height: 48px;
    min-width: 48px;
    border-radius: 12px;
    font-size: 1.35rem;
  }

  .erp-header-text {
    min-width: 0;
  }

  .erp-page-title {
    font-size: 1.3rem;
    line-height: 1.2;
    margin: 0;
  }

  .erp-page-subtitle {
    font-size: 0.82rem;
    line-height: 1.45;
    margin-top: 0.4rem;
  }


  /* ---------- STATS ---------- */

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.8rem;
    margin-bottom: 1rem;
  }

  .stat-card {
    padding: 1rem 1.1rem;
    min-height: 82px;
    border-radius: 13px;
    gap: 0.9rem;
  }

  .stat-card-icon {
    width: 46px;
    height: 46px;
    min-width: 46px;
    border-radius: 12px;
    font-size: 1.25rem;
  }

  .stat-card-label {
    font-size: 0.85rem;
  }

  .stat-card-value {
    font-size: 1.7rem;
    line-height: 1.1;
  }


  /* ---------- SEARCH ---------- */

  .erp-card {
    border-radius: 14px;
    margin-bottom: 1rem;
  }

  .controls-container {
    padding: 1rem;
  }

  .search-box {
    width: 100%;
    max-width: none;
  }

  .search-icon {
    left: 0.9rem;
    font-size: 1rem;
  }

  .search-box input {
    width: 100%;
    height: 48px;
    padding: 0.7rem 0.8rem 0.7rem 2.5rem;
    font-size: 0.84rem;
    border-radius: 10px;
  }


  /* ---------- RECORDS HEADER ---------- */

  .erp-card-header {
    padding: 1rem;
    gap: 0.75rem;
    align-items: center;
  }

  .erp-card-header h3 {
    font-size: 1rem;
    line-height: 1.3;
    gap: 0.5rem;
  }

  .erp-card-icon {
    flex-shrink: 0;
  }

  .record-count {
    padding: 0.35rem 0.65rem;
    font-size: 0.72rem;
    white-space: nowrap;
  }


  /* ---------- MOBILE TABLE ---------- */

  .erp-card-body {
    overflow: hidden;
  }

  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .erp-table {
    min-width: 650px;
  }

  .erp-table th {
    padding: 12px 14px;
    font-size: 10.5px;
  }

  .erp-table td {
    padding: 13px 14px;
    font-size: 0.85rem;
  }

  .student-name-cell {
    font-size: 0.86rem;
  }

  .student-email {
    font-size: 11.5px;
  }

  .badge {
    padding: 6px 10px;
    font-size: 10.5px;
  }

  .btn {
    padding: 8px 11px;
    font-size: 11.5px;
  }


  /* ---------- PAGINATION ---------- */

  .erp-pagination {
    padding: 1rem 0.75rem;
    flex-wrap: wrap;
    font-size: 0.82rem;
  }

  .page-btn {
    padding: 0.45rem 0.8rem;
    font-size: 0.8rem;
  }
}
      `}</style>
    </div>
  );
}
