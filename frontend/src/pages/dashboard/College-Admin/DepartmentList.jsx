import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaBuilding,
  FaEdit,
  FaTrash,
  FaPlusCircle,
  FaSave,
  FaTimes
} from "react-icons/fa";

export default function DepartmentList() {
  const { user } = useContext(AuthContext);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editDept, setEditDept] = useState(null);

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

  /* ================= UPDATE ================= */
  const handleUpdate = async () => {
    await api.put(`/departments/${editDept._id}`, {
      name: editDept.name,
      code: editDept.code,
      type: editDept.type,
      status: editDept.status,
      programsOffered: editDept.programsOffered,
      startYear: editDept.startYear,
      sanctionedFacultyCount: editDept.sanctionedFacultyCount,
      sanctionedStudentIntake: editDept.sanctionedStudentIntake
    });

    setEditDept(null);
    fetchDepartments();
  };

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
      <div className="gradient-header p-4 rounded-4 text-white shadow mb-4 d-flex justify-content-between">
        <h3>
          <FaBuilding className="blink me-2" />
          Departments
        </h3>
      </div>

      <div className="row g-4">
        {departments.map((d) => (
          <div className="col-md-4" key={d._id}>
            <div className="card glass-card shadow-lg dept-card">
              <div className="card-body">
                <h5 className="fw-bold">{d.name}</h5>
                <p>Code: {d.code}</p>
                <p>Status: {d.status}</p>
                <p>Programs: {d.programsOffered.join(", ")}</p>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setEditDept(d)}
                  >
                    <FaEdit /> Edit
                  </button>

                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(d._id)}
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ================= EDIT MODAL ================= */}
      {editDept && (
        <div className="modal-backdrop-custom">
          <div className="modal-box">
            <h5>Edit Department</h5>

            <input
              className="form-control mb-2"
              value={editDept.name}
              onChange={(e) =>
                setEditDept({ ...editDept, name: e.target.value })
              }
            />

            <input
              className="form-control mb-2"
              value={editDept.code}
              onChange={(e) =>
                setEditDept({ ...editDept, code: e.target.value })
              }
            />

            <select
              className="form-control mb-2"
              value={editDept.status}
              onChange={(e) =>
                setEditDept({ ...editDept, status: e.target.value })
              }
            >
              <option>ACTIVE</option>
              <option>INACTIVE</option>
            </select>

            <input
              className="form-control mb-2"
              type="number"
              value={editDept.startYear}
              onChange={(e) =>
                setEditDept({ ...editDept, startYear: e.target.value })
              }
            />

            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => setEditDept(null)}
              >
                <FaTimes /> Cancel
              </button>

              <button
                className="btn btn-success"
                onClick={handleUpdate}
              >
                <FaSave /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CSS ================= */}
      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(10px);
        }

        .dept-card {
          transition: all 0.3s ease;
        }

        .dept-card:hover {
          transform: translateY(-6px);
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0% {opacity:1}
          50% {opacity:0.4}
          100% {opacity:1}
        }

        .modal-backdrop-custom {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 999;
        }

        .modal-box {
          background: white;
          padding: 25px;
          border-radius: 12px;
          width: 400px;
        }
      `}</style>
    </div>
  );
}
