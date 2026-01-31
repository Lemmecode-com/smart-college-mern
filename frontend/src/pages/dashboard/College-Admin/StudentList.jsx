import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUsers,
  FaSearch,
  FaCheck,
  FaTimes,
  FaEye,
  FaFileExcel,
  FaFilePdf
} from "react-icons/fa";

const PAGE_SIZE = 5;

export default function StudentList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH STUDENTS ================= */
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get("/students/registered");
      setStudents(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  /* ================= FILTER + SEARCH ================= */
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) =>
        `${s.fullName} ${s.email}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .filter((s) =>
        statusFilter === "ALL" ? true : s.status === statusFilter
      );
  }, [students, search, statusFilter]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);

  const paginatedStudents = filteredStudents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  /* ================= ACTIONS ================= */
  const approveStudent = async (id) => {
    await api.put(`/students/${id}/approve`);
    fetchStudents();
  };

  const rejectStudent = async (id) => {
    const reason = prompt("Enter rejection reason");
    if (!reason) return;
    await api.put(`/students/${id}/reject`, { reason });
    fetchStudents();
  };

  /* ================= EXPORT CSV ================= */
  const exportCSV = () => {
    const headers = ["Name", "Email", "Department", "Course", "Status"];
    const rows = filteredStudents.map((s) => [
      s.fullName,
      s.email,
      s.department_id?.name || "",
      s.course_id?.name || "",
      s.status
    ]);

    let csv = headers.join(",") + "\n";
    rows.forEach((r) => (csv += r.join(",") + "\n"));

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "students.csv";
    link.click();
  };

  /* ================= EXPORT PDF ================= */
  const exportPDF = () => {
    window.print();
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Students...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaUsers className="me-2" />
          Student List
        </h3>
        <p className="opacity-75 mb-0">
          Search, filter, approve & manage students
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* ================= CONTROLS ================= */}
      <div className="card shadow-sm mb-3">
        <div className="card-body d-flex flex-wrap gap-2 justify-content-between">

          <div className="d-flex gap-2">
            <div className="input-group">
              <span className="input-group-text">
                <FaSearch />
              </span>
              <input
                className="form-control"
                placeholder="Search name or email"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-outline-success" onClick={exportCSV}>
              <FaFileExcel /> Excel
            </button>
            <button className="btn btn-outline-danger" onClick={exportPDF}>
              <FaFilePdf /> PDF
            </button>
          </div>

        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="card shadow-lg glass-card">
        <div className="card-body table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Course</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-muted">
                    No students found
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
                  <td>
                    <span
                      className={`badge ${
                        s.status === "APPROVED"
                          ? "bg-success"
                          : s.status === "REJECTED"
                          ? "bg-danger"
                          : "bg-warning text-dark"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="text-center">
                    {/* ✅ ONLY CHANGE IS HERE */}
                    <button
                      className="btn btn-sm btn-info me-1"
                      onClick={() =>
                        navigate(`/college/view-student/${s._id}`)
                      }
                    >
                      <FaEye />
                    </button>

                    {s.status === "PENDING" && (
                      <>
                        <button
                          className="btn btn-sm btn-success me-1"
                          onClick={() => approveStudent(s._id)}
                        >
                          <FaCheck />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => rejectStudent(s._id)}
                        >
                          <FaTimes />
                        </button>
                      </>
                    )}
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
                page === i + 1 ? "btn-primary" : "btn-outline-primary"
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
        @media print {
          button, input, select {
            display: none !important;
          }
        }
        `}
      </style>

    </div>
  );
}
