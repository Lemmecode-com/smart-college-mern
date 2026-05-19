import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import {
  FaUsers,
  FaUserTie,
  FaEnvelope,
  FaPhone,
  FaGraduationCap,
  FaBriefcase,
  FaMapMarkerAlt,
  FaArrowLeft,
  FaSearch
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function HodTeachers() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/hod/teachers");
      setTeachers(res.data || []);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error(error.response?.data?.message || "Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  const filtered = teachers.filter(
    (t) =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.employeeId?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  return (
    <div className="hod-teachers">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1"><FaUsers className="me-2 text-primary" />Department Teachers</h2>
          <p className="text-muted mb-0">{filtered.length} teacher{filtered.length !== 1 ? "s" : ""} found</p>
        </div>
        <button className="btn btn-outline-primary" onClick={() => navigate("/hod/dashboard")}>
          <FaArrowLeft className="me-1" /> Back
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="input-group">
            <span className="input-group-text"><FaSearch /></span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, email, or Employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">No teachers found.</div>
      ) : (
        <div className="row g-3">
          {filtered.map((teacher) => (
            <div className="col-md-6 col-lg-4" key={teacher._id}>
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                      style={{ width: 48, height: 48, background: "#1a4b6d", fontSize: "1.1rem" }}
                    >
                      {teacher.name?.charAt(0).toUpperCase() || "T"}
                    </div>
                    <div>
                      <h5 className="fw-bold mb-0">{teacher.name}</h5>
                      <small className="text-muted">{teacher.employeeId}</small>
                    </div>
                  </div>
                  <div className="mb-2"><FaEnvelope className="me-2 text-muted" />{teacher.email}</div>
                  {teacher.phone && <div className="mb-2"><FaPhone className="me-2 text-muted" />{teacher.phone}</div>}
                  {teacher.specialization && <div className="mb-2"><FaGraduationCap className="me-2 text-muted" />{teacher.specialization}</div>}
                  {teacher.qualification && <div className="mb-2"><FaBriefcase className="me-2 text-muted" />{teacher.qualification}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
