import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUniversity,
  FaCheckCircle,
  FaTimesCircle,
  FaEnvelope,
  FaPhone,
  FaSearch,
  FaEye,
  FaEdit,
  FaToggleOn,
  FaToggleOff
} from "react-icons/fa";

export default function CollegeList() {
  const { user } = useContext(AuthContext);

  const [colleges, setColleges] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedCollege, setSelectedCollege] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "SUPER_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH COLLEGES ================= */
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await api.get("/master/get/colleges");
        setColleges(res.data);
        setFiltered(res.data);
      } catch {
        setError("Failed to load colleges");
      } finally {
        setLoading(false);
      }
    };
    fetchColleges();
  }, []);

  /* ================= SEARCH + FILTER ================= */
  useEffect(() => {
    let data = colleges;

    if (search) {
      data = data.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filterStatus !== "ALL") {
      data = data.filter((c) =>
        filterStatus === "ACTIVE"
          ? c.isActive
          : !c.isActive
      );
    }

    setFiltered(data);
  }, [search, filterStatus, colleges]);

  /* ================= TOGGLE STATUS ================= */
  const toggleStatus = async (id) => {
    try {
      await api.put(`/master/toggle/college/${id}`);
      setColleges((prev) =>
        prev.map((c) =>
          c._id === id ? { ...c, isActive: !c.isActive } : c
        )
      );
    } catch {
      alert("Toggle failed (backend not ready)");
    }
  };

  return (
    <div className="container-fluid">

      {/* HEADER */}
      <div className="mb-4 p-4 rounded-4 text-white gradient-header">
        <h3 className="fw-bold mb-1">
          <FaUniversity className="blink me-2" />
          Colleges Management
        </h3>
        <p className="opacity-75 mb-0">
          Search, filter, view and manage all colleges
        </p>
      </div>

      {/* SEARCH + FILTER */}
      <div className="row mb-3 g-3">
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text">
              <FaSearch />
            </span>
            <input
              className="form-control"
              placeholder="Search college..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* LOADING */}
      {loading && <p>Loading...</p>}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* COLLEGE CARDS */}
      <div className="row g-4">
        {filtered.map((college) => (
          <div className="col-lg-4 col-md-6" key={college._id}>
            <div className="card college-card border-0 shadow-sm">

              <div className="card-header gradient-header text-white">
                <FaUniversity className="blink me-2" />
                {college.name}
              </div>

              <div className="card-body">
                <p><strong>Code:</strong> {college.code}</p>
                <p className="d-flex gap-2">
                  <FaEnvelope /> {college.email}
                </p>
                <p className="d-flex gap-2">
                  <FaPhone /> {college.contactNumber}
                </p>
                <p><strong>Year:</strong> {college.establishedYear}</p>
              </div>

              <div className="card-footer d-flex justify-content-between align-items-center bg-white border-0">

                <span
                  className={`badge ${
                    college.isActive ? "bg-success" : "bg-danger"
                  }`}
                >
                  {college.isActive ? "Active" : "Inactive"}
                </span>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => setSelectedCollege(college)}
                  >
                    <FaEye />
                  </button>

                  <button
                    className="btn btn-sm btn-outline-secondary"
                  >
                    <FaEdit />
                  </button>

                  <button
                    className="btn btn-sm btn-outline-success"
                    onClick={() => toggleStatus(college._id)}
                  >
                    {college.isActive ? (
                      <FaToggleOn />
                    ) : (
                      <FaToggleOff />
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* VIEW MODAL */}
      {selectedCollege && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header gradient-header text-white">
                <h5 className="modal-title">
                  {selectedCollege.name}
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setSelectedCollege(null)}
                />
              </div>
              <div className="modal-body">
                <p><strong>Email:</strong> {selectedCollege.email}</p>
                <p><strong>Contact:</strong> {selectedCollege.contactNumber}</p>
                <p><strong>Address:</strong> {selectedCollege.address}</p>
                <p><strong>Established:</strong> {selectedCollege.establishedYear}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .college-card {
          transition: all 0.3s ease;
        }

        .college-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
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
