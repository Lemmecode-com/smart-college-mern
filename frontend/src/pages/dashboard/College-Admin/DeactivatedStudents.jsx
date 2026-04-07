import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import { toast } from "react-toastify";

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

export default function DeactivatedStudents() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH DEACTIVATED STUDENTS ================= */
  const fetchDeactivatedStudents = async () => {
    try {
      setLoading(true);
      setError("");
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
      setRetryCount(0);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load deactivated students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeactivatedStudents();
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount((prev) => prev + 1);
      fetchDeactivatedStudents();
    } else {
      setError("Maximum retry attempts reached. Please check your connection.");
    }
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

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <div className="erp-error-container">
        <div className="erp-error-icon"><FaExclamationTriangle /></div>
        <h3>Deactivated Students Error</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button className="erp-btn erp-btn-secondary" onClick={() => navigate(-1)}>
            <FaSyncAlt className="erp-btn-icon" /> Go Back
          </button>
          <button className="erp-btn erp-btn-primary" onClick={handleRetry} disabled={retryCount >= 3}>
            <FaSyncAlt className="erp-btn-icon" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading deactivated students..." />;
  }

  return (
    <div className="erp-container">
      <Breadcrumb items={[
        { label: "Dashboard", path: "/dashboard" },
        { label: "Deactivated Students" },
      ]} />

      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon"><FaUserTimes /></div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Deactivated Students</h1>
            <p className="erp-page-subtitle">View and reactivate students who have been deactivated</p>
          </div>
        </div>
      </div>

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

      {/* TABLE */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3><FaGraduationCap className="erp-card-icon" /> Deactivated Student Records</h3>
          <span className="record-count">{filteredStudents.length} {filteredStudents.length === 1 ? "Student" : "Students"}</span>
        </div>
        <div className="erp-card-body">
          {paginatedStudents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><FaUserTimes /></div>
              <h3>No Deactivated Students</h3>
              <p className="empty-description">
                {search ? "No deactivated students match your search." : "All students are currently active."}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th className="th-student">Student Name</th>
                    <th className="th-course">Course</th>
                    <th className="th-department">Department</th>
                    <th className="th-year">Admission Year</th>
                    <th className="th-status">Status</th>
                    <th className="th-actions text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((student) => (
                    <tr key={student._id} className="table-row">
                      <td className="cell-student">
                        <div className="student-info">
                          <span className="student-name-cell">{student.fullName}</span>
                          <span className="student-email">{student.email}</span>
                        </div>
                      </td>
                      <td className="cell-course">
                        <span className="badge badge-course">{student.course_id?.name || "N/A"}</span>
                      </td>
                      <td className="cell-department">
                        <span className="department-name">{student.department_id?.name || "N/A"}</span>
                      </td>
                      <td className="cell-year">
                        <span className="badge badge-graduation-year">
                          <FaCalendarAlt className="badge-icon" /> {student.admissionYear || "N/A"}
                        </span>
                      </td>
                      <td className="cell-status">
                        <span className="badge badge-status-deactivated">
                          <FaUserTimes className="badge-icon" /> DEACTIVATED
                        </span>
                      </td>
                      <td className="cell-actions">
                        <div className="action-buttons">
                          {student.user_id && (
                            <button
                              className="btn btn-action btn-reactivate-student"
                              onClick={() => handleReactivate(student)}
                              title="Reactivate Student"
                            >
                              <FaUserCheck />
                              <span className="btn-text">Reactivate</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="erp-pagination">
              <button className="page-btn" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>Prev</button>
              <span style={{ padding: "0 1rem" }}>Page {page} of {totalPages}</span>
              <button className="page-btn" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}>Next</button>
            </div>
          )}
        </div>
      </div>

      {/* STYLES */}
      <style>{`
        .erp-container { padding: 1.5rem; background: #f5f7fa; min-height: 100vh; }
        .erp-page-header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 1.75rem; border-radius: 16px; margin-bottom: 1.5rem; color: white; display: flex; align-items: center; gap: 1.25rem; }
        .erp-header-icon { width: 56px; height: 56px; background: rgba(255,255,255,0.15); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; }
        .erp-page-title { margin: 0; font-size: 1.75rem; font-weight: 700; }
        .erp-page-subtitle { margin: 0.375rem 0 0 0; opacity: 0.85; }
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
        .table-container { overflow-x: auto; }
        .erp-table { width: 100%; border-collapse: collapse; }
        .erp-table thead { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
        .erp-table th { padding: 16px 20px; text-align: left; font-size: 12px; font-weight: 600; color: white; text-transform: uppercase; letter-spacing: 1px; }
        .erp-table td { padding: 18px 20px; border-bottom: 1px solid #e2e8f0; }
        .erp-table tbody tr:hover { background: #f0f9ff; }
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
        .erp-pagination { display: flex; align-items: center; justify-content: center; padding: 1.5rem; gap: 0.5rem; }
        .page-btn { padding: 0.5rem 1rem; border: 1px solid #e2e8f0; background: white; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
