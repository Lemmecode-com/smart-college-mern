import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaBuilding,
  FaEdit,
  FaTrash,
  FaUserTie,
  FaSearch
} from "react-icons/fa";

export default function DepartmentList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH ================= */
  const fetchDepartments = async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(res.data);
    } catch {
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this department?")) return;
    await api.delete(`/departments/${id}`);
    fetchDepartments();
  };

  /* ================= FILTER ================= */
  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center mt-5">
        <h5>Loading departments...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* HEADER */}
      <div className="gradient-header p-4 rounded-4 text-white shadow mb-4 d-flex justify-content-between align-items-center">
        <h3>
          <FaBuilding className="blink me-2" />
          Department Management
        </h3>

        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="card glass-card shadow-lg">
        <div className="card-body p-0">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th>Sr.No</th>
                <th>Name</th>
                <th>Code</th>
                <th>Type</th>
                <th>Status</th>
                <th>Programs</th>
                <th>Start Year</th>
                <th>Faculty</th>
                <th>Students</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredDepartments.map((d, index) => (
                <tr key={d._id}>
                  <td>{index + 1}</td>
                  <td className="fw-semibold">{d.name}</td>
                  <td>{d.code}</td>
                  <td>{d.type}</td>
                  <td>
                    <span className={`badge ${d.status === "ACTIVE" ? "bg-success" : "bg-danger"}`}>
                      {d.status}
                    </span>
                  </td>
                  <td>{d.programsOffered.join(", ")}</td>
                  <td>{d.startYear}</td>
                  <td>{d.sanctionedFacultyCount}</td>
                  <td>{d.sanctionedStudentIntake}</td>
                  <td className="d-flex gap-2">

                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() =>
                        navigate(`/departments/edit/${d._id}`)
                      }
                    >
                      <FaEdit />
                    </button>

                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(d._id)}
                    >
                      <FaTrash />
                    </button>

                    <button
                      className="btn btn-sm btn-success"
                      onClick={() =>
                        navigate(`/departments/assign-hod/${d._id}`)
                      }
                    >
                      <FaUserTie />
                    </button>

                  </td>
                </tr>
              ))}

              {filteredDepartments.length === 0 && (
                <tr>
                  <td colSpan="10" className="text-center text-muted py-4">
                    No departments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(10px);
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0% {opacity:1}
          50% {opacity:0.4}
          100% {opacity:1}
        }

        .search-box {
          position: relative;
        }

        .search-box input {
          padding: 6px 12px 6px 32px;
          border-radius: 20px;
          border: none;
          outline: none;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #555;
        }

        table th, table td {
          vertical-align: middle;
        }

        .btn {
          transition: all 0.3s ease;
        }

        .btn:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
