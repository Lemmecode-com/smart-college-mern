import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUsers,
  FaSearch,
  FaEye,
  FaCheckCircle
} from "react-icons/fa";

const PAGE_SIZE = 5;

export default function ApproveStudents() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH APPROVED STUDENTS ================= */
  const fetchApprovedStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/students/approved-students");
      setStudents(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load approved students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedStudents();
  }, []);

  /* ================= SEARCH ================= */
  const filteredStudents = useMemo(() => {
    return students.filter((s) =>
      `${s.fullName} ${s.email}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [students, search]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);

  const paginatedStudents = filteredStudents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Approved Students...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaCheckCircle className="me-2" />
          Approved Students
        </h3>
        <p className="opacity-75 mb-0">
          List of students approved by college admin
        </p>
      </div>

      {error && (
        <div className="alert alert-danger text-center">
          {error}
        </div>
      )}

      {/* ================= SEARCH ================= */}
      <div className="card shadow-sm mb-3">
        <div className="card-body d-flex justify-content-between flex-wrap gap-2">

          <div className="input-group" style={{ maxWidth: "320px" }}>
            <span className="input-group-text">
              <FaSearch />
            </span>
            <input
              className="form-control"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body table-responsive">

          <table className="table table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Course</th>
                <th>Admission Year</th>
                <th>Status</th>
                <th className="text-center">View</th>
              </tr>
            </thead>

            <tbody>
              {paginatedStudents.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center text-muted">
                    No approved students found
                  </td>
                </tr>
              )}

              {paginatedStudents.map((s, i) => (
                <tr key={s._id}>
                  <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td>{s.fullName}</td>
                  <td>{s.email}</td>
                  <td>{s.department_id?.name || "-"}</td>
                  <td>{s.course_id?.name || "-"}</td>
                  <td>{s.admissionYear}</td>
                  <td>
                    <span className="badge bg-success">
                      APPROVED
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() =>
                        navigate(`/college/view-approved-student/${s._id}`)
                      }
                    >
                      <FaEye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>

        </div>
      </div>

      {/* ================= PAGINATION ================= */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-3 gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              className={`btn btn-sm ${
                page === i + 1
                  ? "btn-primary"
                  : "btn-outline-primary"
              }`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
        }
        `}
      </style>

    </div>
  );
}
