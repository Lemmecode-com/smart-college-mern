import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import {
  FaLayerGroup,
  FaGraduationCap,
  FaMapMarkerAlt,
  FaUsers,
  FaArrowLeft,
  FaChalkboardTeacher
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function HodDepartment() {
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartment();
  }, []);

  const fetchDepartment = async () => {
    try {
      const res = await api.get("/hod/department");
      setDepartment(res.data?.department || null);
    } catch (error) {
      console.error("Error fetching department:", error);
      toast.error(error.response?.data?.message || "Failed to load department");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (!department) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">No department found.</p>
        <button className="btn btn-outline-primary mt-2" onClick={() => navigate("/hod/dashboard")}>
          <FaArrowLeft className="me-1" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="hod-department">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1"><FaLayerGroup className="me-2 text-primary" />Department Information</h2>
          <p className="text-muted mb-0">{department.name} ({department.code})</p>
        </div>
        <button className="btn btn-outline-primary" onClick={() => navigate("/hod/dashboard")}>
          <FaArrowLeft className="me-1" /> Back
        </button>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <h5 className="fw-bold mb-3"><FaChalkboardTeacher className="me-2 text-primary" />HOD Details</h5>
              <div className="mb-2"><strong>Name:</strong> {department.hod_id?.name || "N/A"}</div>
              <div className="mb-2"><strong>Employee ID:</strong> {department.hod_id?.employeeId || "N/A"}</div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <h5 className="fw-bold mb-3"><FaUsers className="me-2 text-success" />Teachers ({department.teachers?.length || 0})</h5>
              <div>
                {department.teachers?.length > 0
                  ? department.teachers.map((t) => (
                      <div key={t._id} className="d-flex align-items-center gap-2 mb-2">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center text-white"
                          style={{ width: 28, height: 28, background: "#1a4b6d", fontSize: "0.75rem", flexShrink: 0 }}
                        >
                          {t.name?.charAt(0).toUpperCase() || "T"}
                        </div>
                        <div><strong>{t.name}</strong> <small className="text-muted">({t.employeeId})</small></div>
                      </div>
                    ))
                  : <span className="text-muted">No teachers assigned.</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
